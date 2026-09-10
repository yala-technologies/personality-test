import type { Candidate } from './types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/personality-api`;

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function adminLogin(password: string): Promise<{ token: string; expires_at: number }> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'admin.login',
      password,
    }),
  });

  const result: ApiResponse<{ token: string; expires_at: number }> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Login failed');
  }

  return result.data;
}

export async function adminListCandidates(sessionToken: string): Promise<Candidate[]> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      operation: 'admin.list',
    }),
  });

  const result: ApiResponse<Candidate[]> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch candidates');
  }

  return result.data;
}

export async function adminCreateCandidate(
  sessionToken: string,
  name: string,
  email?: string
): Promise<Candidate> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      operation: 'admin.create',
      name,
      email,
    }),
  });

  const result: ApiResponse<Candidate> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create candidate');
  }

  return result.data;
}

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
      operation: 'admin.benchmark',
      candidate_id: candidateId,
    }),
  });

  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to set benchmark');
  }
}

export async function candidateGet(accessToken: string): Promise<Candidate> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation: 'candidate.get',
      access_token: accessToken,
    }),
  });

  const result: ApiResponse<Candidate> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch candidate');
  }

  return result.data;
}

export async function candidateSave(
  accessToken: string,
  responses: Record<number, number>,
  isComplete: boolean
): Promise<Candidate> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation: 'candidate.save',
      access_token: accessToken,
      responses,
      is_complete: isComplete,
    }),
  });

  const result: ApiResponse<Candidate> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to save responses');
  }

  return result.data;
}
