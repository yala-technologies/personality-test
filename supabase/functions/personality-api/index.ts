import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Assessment version constant
export const ASSESSMENT_VERSION = 'YALA_BDR_PERSONALITY_V1';

// Admin password hash (SHA-256) - Contact admin for password rotation
const ADMIN_PASSWORD_HASH = '11d16afc298bebd8153b31234beda426bca99b74a759978979b7193c0f56bf19';

// HMAC secret for signing admin sessions
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
  straightLineRate: number;
  consistencyScore: number;
  durationSeconds: number | null;
}

// Trait mapping (preserve existing scoring model exactly)
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
    { id: 45, reverse: false },  // positive toward Assertiveness
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
    { id: 45, reverse: true },  // reverse/negative toward Interpersonal Orientation
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
  // Preserve exact formula: facet score = ((mean - 1) / 4) × 100
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
    // Preserve formula: 100 - abs(candidate - benchmark)
    const traitSimilarity = 100 - Math.abs(candidateScores[trait] - benchmarkScores[trait]);
    totalSimilarity += traitSimilarity;
  }
  // Overall similarity = arithmetic mean
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
    straightLineRate: Math.round(straightLineRate * 10) / 10,
    consistencyScore,
    durationSeconds,
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

/**
 * Create HMAC-signed admin session token
 * Format: base64(payload).hmac-sha256-signature
 */
async function createAdminSession(): Promise<{ session: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10 hours
  const payload = {
    role: 'admin',
    exp: expiresAt.getTime(),
  };
  
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = btoa(payloadStr);
  
  // Sign with HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ADMIN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadB64)
  );
  
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const session = `${payloadB64}.${signatureHex}`;
  
  return {
    session,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Verify HMAC-signed admin session token
 */
async function verifyAdminSession(session: string): Promise<boolean> {
  try {
    const parts = session.split('.');
    if (parts.length !== 2) return false;
    
    const [payloadB64, signatureHex] = parts;
    
    // Verify signature
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ADMIN_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signature = new Uint8Array(
      signatureHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(payloadB64)
    );
    
    if (!valid) return false;
    
    // Verify expiry
    const payload = JSON.parse(atob(payloadB64));
    if (payload.role !== 'admin') return false;
    if (payload.exp <= Date.now()) return false;
    
    return true;
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
    const { action } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing action field' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Admin login
    if (action === 'admin.login') {
      const { password } = body;
      if (!password) {
        return new Response(
          JSON.stringify({ error: 'Missing password' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }
      
      const hash = await hashPassword(password);
      
      if (hash !== ADMIN_PASSWORD_HASH) {
        return new Response(
          JSON.stringify({ error: 'Invalid password' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const sessionData = await createAdminSession();

      return new Response(
        JSON.stringify(sessionData),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Verify admin session for protected endpoints
    if (action.startsWith('admin.') && action !== 'admin.login') {
      const authHeader = req.headers.get('Authorization');
      const session = authHeader?.replace('Bearer ', '');
      
      if (!session || !(await verifyAdminSession(session))) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }
    }

    // Admin list candidates
    if (action === 'admin.list') {
      const { data, error } = await supabase
        .from('personality_candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ candidates: data }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Admin create candidate
    if (action === 'admin.create') {
      const { name, email } = body;
      
      if (!name) {
        return new Response(
          JSON.stringify({ error: 'Name is required' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const questionOrder = generateQuestionOrder();

      const { data, error } = await supabase
        .from('personality_candidates')
        .insert({
          name,
          email,
          question_order: questionOrder,
          assessment_version: ASSESSMENT_VERSION,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ candidate: data }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Admin set benchmark
    if (action === 'admin.benchmark') {
      const { id } = body;
      
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Candidate ID is required' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      // Verify candidate exists and is completed
      const { data: candidate, error: fetchError } = await supabase
        .from('personality_candidates')
        .select('id, status, scores')
        .eq('id', id)
        .single();

      if (fetchError || !candidate) {
        return new Response(
          JSON.stringify({ error: 'Candidate not found' }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      if (candidate.status !== 'completed') {
        return new Response(
          JSON.stringify({ error: 'Only completed assessments can be set as benchmark' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      // Remove previous benchmark
      await supabase
        .from('personality_candidates')
        .update({ is_benchmark: false })
        .eq('is_benchmark', true);

      // Set new benchmark
      const { error: updateError } = await supabase
        .from('personality_candidates')
        .update({ is_benchmark: true })
        .eq('id', id);

      if (updateError) throw updateError;

      // Recalculate similarity for all completed candidates
      const { data: completedCandidates, error: listError } = await supabase
        .from('personality_candidates')
        .select('id, scores')
        .eq('status', 'completed');

      if (listError) throw listError;

      const benchmarkScores = candidate.scores as TraitScores;

      for (const c of completedCandidates || []) {
        if (c.id === id) {
          // Benchmark itself - no similarity score needed
          await supabase
            .from('personality_candidates')
            .update({ similarity_score: null })
            .eq('id', c.id);
        } else if (c.scores) {
          const similarity = calculateSimilarity(c.scores as TraitScores, benchmarkScores);
          await supabase
            .from('personality_candidates')
            .update({ similarity_score: similarity })
            .eq('id', c.id);
        }
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Candidate get
    if (action === 'candidate.get') {
      const { token } = body;
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token is required' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const { data, error } = await supabase
        .from('personality_candidates')
        .select('id, name, status, responses, question_order, started_at, completed_at, assessment_version')
        .eq('access_token', token)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Assessment not found' }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      // Do NOT return scores, similarity, benchmark data to candidates
      return new Response(
        JSON.stringify({ candidate: data }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Candidate save
    if (action === 'candidate.save') {
      const { token, responses, completed } = body;
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token is required' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      if (!responses || typeof responses !== 'object') {
        return new Response(
          JSON.stringify({ error: 'Responses are required' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      // Fetch candidate
      const { data: candidate, error: fetchError } = await supabase
        .from('personality_candidates')
        .select('*')
        .eq('access_token', token)
        .single();

      if (fetchError || !candidate) {
        return new Response(
          JSON.stringify({ error: 'Assessment not found' }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      if (candidate.status === 'completed') {
        return new Response(
          JSON.stringify({ error: 'Assessment already completed' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      // Validate response values
      for (const [key, value] of Object.entries(responses)) {
        const questionId = parseInt(key);
        if (isNaN(questionId) || questionId < 1 || questionId > 72) {
          return new Response(
            JSON.stringify({ error: `Invalid question ID: ${key}` }),
            { 
              status: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            }
          );
        }
        if (typeof value !== 'number' || value < 1 || value > 5 || !Number.isInteger(value)) {
          return new Response(
            JSON.stringify({ error: `Invalid response value for question ${key}: must be integer 1-5` }),
            { 
              status: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            }
          );
        }
      }

      const startedAt = candidate.started_at ? new Date(candidate.started_at) : new Date();
      const now = new Date();

      let updateData: Record<string, unknown> = {
        responses,
        started_at: candidate.started_at || now.toISOString(),
      };

      // Update status
      if (completed) {
        // Require all 72 responses
        if (Object.keys(responses).length !== 72) {
          return new Response(
            JSON.stringify({ error: 'All 72 questions must be answered to complete assessment' }),
            { 
              status: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            }
          );
        }

        const scores = calculateScores(responses);
        const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const quality = calculateQuality(responses, durationSeconds);

        updateData = {
          ...updateData,
          status: 'completed',
          completed_at: now.toISOString(),
          assessment_duration_seconds: durationSeconds,
          scores,
          quality_signals: quality,
        };

        // Calculate similarity if benchmark exists
        const { data: benchmark } = await supabase
          .from('personality_candidates')
          .select('scores')
          .eq('is_benchmark', true)
          .single();

        if (benchmark && benchmark.scores) {
          const similarity = calculateSimilarity(scores, benchmark.scores as TraitScores);
          updateData.similarity_score = similarity;
        }
      } else {
        updateData.status = Object.keys(responses).length > 0 ? 'in_progress' : 'invited';
      }

      const { data: updated, error: updateError } = await supabase
        .from('personality_candidates')
        .update(updateData)
        .eq('access_token', token)
        .select('id, name, status, responses, question_order, started_at, completed_at, assessment_version')
        .single();

      if (updateError) throw updateError;

      // Do NOT return scores/similarity to candidate
      return new Response(
        JSON.stringify({ candidate: updated }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});
