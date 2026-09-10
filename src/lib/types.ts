export type AssessmentStatus = 'invited' | 'in_progress' | 'completed';

export interface TraitScores {
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

export interface QualitySignals {
  status: string;
  flags: string[];
  straightLineRate: number;
  consistencyScore: number;
  durationSeconds: number | null;
}

/**
 * Candidate assessment data returned to candidate-facing API
 * Does NOT include scores, similarity, or benchmark information
 */
export interface CandidateAssessment {
  id: string;
  name: string;
  status: AssessmentStatus;
  responses: Record<number, number> | null;
  question_order: number[] | null;
  started_at: string | null;
  completed_at: string | null;
  assessment_version: string;
}

/**
 * Full candidate record returned to admin API
 * Includes all fields including scores and similarity
 */
export interface AdminCandidate {
  id: string;
  name: string;
  email: string | null;
  access_token: string;
  status: AssessmentStatus;
  is_benchmark: boolean;
  responses: Record<number, number> | null;
  question_order: number[] | null;
  scores: TraitScores | null;
  similarity_score: number | null;
  quality_signals: QualitySignals | null;
  assessment_duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assessment_version: string;
}

/**
 * Legacy alias for backward compatibility in frontend code
 * Use AdminCandidate for new code
 */
export type Candidate = AdminCandidate;

/**
 * Admin session returned from login
 */
export interface AdminSession {
  token: string;
  expires_at: number;
}
