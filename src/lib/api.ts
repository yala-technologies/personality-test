import type { AdminCandidate, CandidateAssessment, AdminSession, TraitScores } from './types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/personality-api`;

/**
 * Admin login
 * Backend expects: { action: 'admin.login', password: string }
 * Backend returns: { session: string, expiresAt: string }
 */
export async function adminLogin(password: string): Promise<AdminSession> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'admin.login',
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || 'Login failed');
  }

  const result = await response.json();
  
  // Translate backend response to frontend session format
  return {
    token: result.session,
    expires_at: new Date(result.expiresAt).getTime(),
  };
}

/**
 * Admin list candidates
 * Backend expects: { action: 'admin.list' }
 * Backend returns: { candidates: AdminCandidate[] }
 */
export async function adminListCandidates(sessionToken: string): Promise<AdminCandidate[]> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      action: 'admin.list',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch candidates' }));
    throw new Error(error.error || 'Failed to fetch candidates');
  }

  const result = await response.json();
  return result.candidates;
}

/**
 * Admin create candidate
 * Backend expects: { action: 'admin.create', name: string, email?: string }
 * Backend returns: { candidate: AdminCandidate }
 */
export async function adminCreateCandidate(
  sessionToken: string,
  name: string,
  email?: string
): Promise<AdminCandidate> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      action: 'admin.create',
      name,
      email,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create candidate' }));
    throw new Error(error.error || 'Failed to create candidate');
  }

  const result = await response.json();
  return result.candidate;
}

/**
 * Admin set benchmark
 * Backend expects: { action: 'admin.benchmark', id: string }
 * Backend returns: { ok: true }
 */
export async function adminSetBenchmark(
  sessionToken: string,
  candidateId: string
): Promise<void> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      action: 'admin.benchmark',
      id: candidateId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to set benchmark' }));
    throw new Error(error.error || 'Failed to set benchmark');
  }
}

/**
 * Candidate get assessment
 * Backend expects: { action: 'candidate.get', token: string }
 * Backend returns: { candidate: CandidateAssessment }
 */
export async function candidateGet(accessToken: string): Promise<CandidateAssessment> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'candidate.get',
      token: accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch assessment' }));
    throw new Error(error.error || 'Failed to fetch assessment');
  }

  const result = await response.json();
  return result.candidate;
}

/**
 * Candidate save responses
 * Backend expects: { action: 'candidate.save', token: string, responses: {}, completed: boolean }
 * Backend returns: { candidate: CandidateAssessment }
 */
export async function candidateSave(
  accessToken: string,
  responses: Record<number, number>,
  isComplete: boolean
): Promise<CandidateAssessment> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'candidate.save',
      token: accessToken,
      responses,
      completed: isComplete,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to save responses' }));
    throw new Error(error.error || 'Failed to save responses');
  }

  const result = await response.json();
  return result.candidate;
}

/**
 * Candidate get results (scores only)
 * Backend expects: { action: 'candidate.results', token: string }
 * Backend returns: { scores: TraitScores }
 * 
 * Response deliberately limited to candidate's own nine trait scores.
 * Does NOT include: quality_signals, similarity_score, benchmark data, or other candidates.
 */
export async function candidateResults(accessToken: string): Promise<{
  scores: TraitScores | null;
}> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'candidate.results',
      token: accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch results' }));
    throw new Error(error.error || 'Failed to fetch results');
  }

  const result = await response.json();
  return result;
}
