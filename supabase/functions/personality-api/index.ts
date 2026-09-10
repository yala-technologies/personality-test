import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Password hash for "Yala123" (SHA-256)
const ADMIN_PASSWORD_HASH = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

// Simple JWT signing (for demo purposes - consider using a library in production)
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') || 'change-me-in-production';

interface TraitScores {
  industriousness: number;
  assertiveness: number;
  emotionalStability: number;
  openness: number;
  interpersonalOrientation: number;
  achievementDrive: number;
  persistence: number;
  agency: number;
  sociability: number;
}

interface QualitySignals {
  status: string;
  flags: string[];
  straight_line_rate: number;
  consistency_score: number;
}

// Trait mapping
const TRAIT_QUESTIONS: Record<keyof TraitScores, Array<{ id: number; reverse: boolean }>> = {
  industriousness: [
    { id: 1, reverse: false },
    { id: 9, reverse: true },
    { id: 17, reverse: false },
    { id: 25, reverse: false },
    { id: 33, reverse: false },
    { id: 41, reverse: true },
    { id: 49, reverse: false },
    { id: 57, reverse: false },
    { id: 65, reverse: false },
  ],
  assertiveness: [
    { id: 10, reverse: false },
    { id: 18, reverse: false },
    { id: 26, reverse: true },
    { id: 34, reverse: false },
    { id: 42, reverse: false },
    { id: 45, reverse: false },
    { id: 66, reverse: false },
  ],
  emotionalStability: [
    { id: 3, reverse: false },
    { id: 11, reverse: true },
    { id: 19, reverse: false },
    { id: 27, reverse: false },
    { id: 35, reverse: true },
    { id: 43, reverse: false },
    { id: 51, reverse: true },
    { id: 59, reverse: false },
    { id: 67, reverse: true },
  ],
  openness: [
    { id: 4, reverse: false },
    { id: 12, reverse: false },
    { id: 20, reverse: true },
    { id: 28, reverse: false },
    { id: 36, reverse: false },
    { id: 44, reverse: false },
    { id: 52, reverse: false },
    { id: 60, reverse: false },
    { id: 68, reverse: false },
  ],
  interpersonalOrientation: [
    { id: 5, reverse: false },
    { id: 13, reverse: true },
    { id: 21, reverse: false },
    { id: 29, reverse: false },
    { id: 37, reverse: false },
    { id: 45, reverse: true },
    { id: 53, reverse: false },
    { id: 61, reverse: false },
    { id: 69, reverse: false },
  ],
  achievementDrive: [
    { id: 6, reverse: false },
    { id: 14, reverse: false },
    { id: 22, reverse: true },
    { id: 30, reverse: false },
    { id: 38, reverse: false },
    { id: 46, reverse: true },
    { id: 54, reverse: false },
    { id: 62, reverse: true },
    { id: 70, reverse: false },
  ],
  persistence: [
    { id: 7, reverse: false },
    { id: 15, reverse: true },
    { id: 23, reverse: false },
    { id: 31, reverse: true },
    { id: 39, reverse: false },
    { id: 47, reverse: false },
    { id: 55, reverse: false },
    { id: 63, reverse: false },
    { id: 71, reverse: false },
  ],
  agency: [
    { id: 8, reverse: false },
    { id: 16, reverse: true },
    { id: 24, reverse: false },
    { id: 32, reverse: false },
    { id: 40, reverse: false },
    { id: 48, reverse: true },
    { id: 56, reverse: false },
    { id: 64, reverse: false },
    { id: 72, reverse: false },
  ],
  sociability: [
    { id: 2, reverse: false },
    { id: 50, reverse: false },
    { id: 58, reverse: true },
  ],
};

const OPPOSING_PAIRS: Array<[number, number]> = [
  [1, 9], [7, 31], [8, 48], [17, 41], [19, 67], [23, 15],
  [32, 16], [38, 62], [43, 35], [47, 31], [49, 9], [52, 20],
  [54, 22], [63, 15], [64, 48], [70, 22], [71, 15], [72, 16],
];

function reverseScore(value: number): number {
  return 6 - value;
}

function calculateTraitScore(
  responses: Record<number, number>,
  questions: Array<{ id: number; reverse: boolean }>
): number {
  let sum = 0;
  for (const { id, reverse } of questions) {
    const response = responses[id];
    if (response === undefined) {
      throw new Error(`Missing response for question ${id}`);
    }
    sum += reverse ? reverseScore(response) : response;
  }
  const mean = sum / questions.length;
  const score = ((mean - 1) / 4) * 100;
  return Math.round(score * 10) / 10;
}

function calculateScores(responses: Record<number, number>): TraitScores {
  const scores: TraitScores = {
    industriousness: 0,
    assertiveness: 0,
    emotionalStability: 0,
    openness: 0,
    interpersonalOrientation: 0,
    achievementDrive: 0,
    persistence: 0,
    agency: 0,
    sociability: 0,
  };

  for (const [trait, questions] of Object.entries(TRAIT_QUESTIONS)) {
    scores[trait as keyof TraitScores] = calculateTraitScore(responses, questions);
  }

  return scores;
}

function calculateSimilarity(
  candidateScores: TraitScores,
  benchmarkScores: TraitScores
): number {
  const traits = Object.keys(candidateScores) as Array<keyof TraitScores>;
  let totalSimilarity = 0;
  for (const trait of traits) {
    const traitSimilarity = 100 - Math.abs(candidateScores[trait] - benchmarkScores[trait]);
    totalSimilarity += traitSimilarity;
  }
  return Math.round((totalSimilarity / traits.length) * 10) / 10;
}

function calculateQuality(
  responses: Record<number, number>,
  durationSeconds: number | null
): QualitySignals {
  const flags: string[] = [];
  
  const responseCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const value of Object.values(responses)) {
    if (value >= 1 && value <= 5) {
      responseCounts[value]++;
    }
  }
  
  const maxCount = Math.max(...Object.values(responseCounts));
  const straightLineRate = (maxCount / 72) * 100;
  
  if (straightLineRate >= 70) {
    flags.push(`High straight-line rate (${Math.round(straightLineRate)}%)`);
  }
  
  if (durationSeconds !== null && durationSeconds < 240) {
    flags.push(`Very fast completion (${Math.round(durationSeconds / 60)} minutes)`);
  }
  
  let consistentPairs = 0;
  let totalPairs = 0;
  
  for (const [q1, q2] of OPPOSING_PAIRS) {
    if (responses[q1] !== undefined && responses[q2] !== undefined) {
      totalPairs++;
      const sum = responses[q1] + responses[q2];
      if (sum >= 5 && sum <= 7) {
        consistentPairs++;
      }
    }
  }
  
  const consistencyScore = totalPairs > 0 
    ? Math.round((consistentPairs / totalPairs) * 100) 
    : 100;
  
  if (consistencyScore < 50) {
    flags.push(`Low consistency score (${consistencyScore}%)`);
  }
  
  let status = 'Good';
  if (consistencyScore < 50) {
    status = 'Low consistency';
  } else if (flags.length > 0) {
    status = 'Review';
  }
  
  return {
    status,
    flags,
    straight_line_rate: Math.round(straightLineRate * 10) / 10,
    consistency_score: consistencyScore,
  };
}

function generateQuestionOrder(): number[] {
  const order = Array.from({ length: 72 }, (_, i) => i + 1);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function createAdminToken(): string {
  const payload = {
    role: 'admin',
    exp: Date.now() + 10 * 60 * 60 * 1000, // 10 hours
  };
  // Simple base64 encoding (replace with proper JWT in production)
  return btoa(JSON.stringify(payload));
}

function verifyAdminToken(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token));
    return payload.role === 'admin' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { operation } = body;

    // Admin endpoints
    if (operation === 'admin.login') {
      const { password } = body;
      const hash = await hashPassword(password);
      
      if (hash !== ADMIN_PASSWORD_HASH) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid password' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const token = createAdminToken();
      const expiresAt = Date.now() + 10 * 60 * 60 * 1000;

      return new Response(
        JSON.stringify({ success: true, data: { token, expires_at: expiresAt } }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Verify admin token for protected endpoints
    if (operation.startsWith('admin.') && operation !== 'admin.login') {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token || !verifyAdminToken(token)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }
    }

    if (operation === 'admin.list') {
      const { data, error } = await supabase
        .from('personality_candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (operation === 'admin.create') {
      const { name, email } = body;
      
      const questionOrder = generateQuestionOrder();

      const { data, error } = await supabase
        .from('personality_candidates')
        .insert({
          name,
          email: email || null,
          access_token: crypto.randomUUID(),
          status: 'invited',
          question_order: questionOrder,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (operation === 'admin.benchmark') {
      const { candidate_id } = body;

      // Get the candidate
      const { data: candidate, error: fetchError } = await supabase
        .from('personality_candidates')
        .select('*')
        .eq('id', candidate_id)
        .single();

      if (fetchError || !candidate) {
        throw new Error('Candidate not found');
      }

      if (candidate.status !== 'completed' || !candidate.scores) {
        throw new Error('Only completed candidates with scores can be set as benchmark');
      }

      // Remove existing benchmark
      await supabase
        .from('personality_candidates')
        .update({ is_benchmark: false })
        .eq('is_benchmark', true);

      // Set new benchmark
      await supabase
        .from('personality_candidates')
        .update({ is_benchmark: true })
        .eq('id', candidate_id);

      // Recalculate similarities for all completed candidates
      const { data: allCandidates } = await supabase
        .from('personality_candidates')
        .select('*')
        .eq('status', 'completed')
        .neq('id', candidate_id);

      if (allCandidates) {
        for (const c of allCandidates) {
          if (c.scores) {
            const similarity = calculateSimilarity(c.scores, candidate.scores);
            await supabase
              .from('personality_candidates')
              .update({ similarity_score: similarity })
              .eq('id', c.id);
          }
        }
      }

      // Clear similarity for the benchmark itself
      await supabase
        .from('personality_candidates')
        .update({ similarity_score: null })
        .eq('id', candidate_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Candidate endpoints
    if (operation === 'candidate.get') {
      const { access_token } = body;

      const { data, error } = await supabase
        .from('personality_candidates')
        .select('id, name, email, access_token, status, responses, question_order, started_at, completed_at, created_at')
        .eq('access_token', access_token)
        .single();

      if (error || !data) {
        throw new Error('Candidate not found');
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (operation === 'candidate.save') {
      const { access_token, responses, is_complete } = body;

      // Get candidate
      const { data: candidate, error: fetchError } = await supabase
        .from('personality_candidates')
        .select('*')
        .eq('access_token', access_token)
        .single();

      if (fetchError || !candidate) {
        throw new Error('Candidate not found');
      }

      if (candidate.status === 'completed') {
        throw new Error('Assessment already completed');
      }

      const updates: any = { responses };

      // Set started_at if this is the first save
      if (!candidate.started_at) {
        updates.started_at = new Date().toISOString();
        updates.status = 'in_progress';
      }

      if (is_complete) {
        // Validate all 72 questions answered
        const questionIds = Array.from({ length: 72 }, (_, i) => i + 1);
        for (const id of questionIds) {
          if (responses[id] === undefined || responses[id] < 1 || responses[id] > 5) {
            throw new Error(`Invalid or missing response for question ${id}`);
          }
        }

        // Calculate duration
        const startedAt = new Date(candidate.started_at || Date.now());
        const completedAt = new Date();
        const durationSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

        // Calculate scores
        const scores = calculateScores(responses);

        // Calculate quality
        const quality = calculateQuality(responses, durationSeconds);

        // Calculate similarity if there's a benchmark
        let similarityScore = null;
        const { data: benchmark } = await supabase
          .from('personality_candidates')
          .select('scores')
          .eq('is_benchmark', true)
          .single();

        if (benchmark && benchmark.scores) {
          similarityScore = calculateSimilarity(scores, benchmark.scores);
        }

        updates.status = 'completed';
        updates.completed_at = completedAt.toISOString();
        updates.scores = scores;
        updates.quality_signals = quality;
        updates.assessment_duration_seconds = durationSeconds;
        updates.similarity_score = similarityScore;
      }

      updates.updated_at = new Date().toISOString();

      const { data: updated, error: updateError } = await supabase
        .from('personality_candidates')
        .update(updates)
        .eq('access_token', access_token)
        .select('id, name, email, access_token, status, responses, question_order, started_at, completed_at, created_at')
        .single();

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, data: updated }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Unknown operation' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});
