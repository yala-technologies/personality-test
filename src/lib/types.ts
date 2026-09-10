export type AssessmentStatus = 'invited' | 'in_progress' | 'completed';

export type QualityStatus = 'Good' | 'Review' | 'Low consistency';

export interface Candidate {
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
}

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
  status: QualityStatus;
  flags: string[];
  straight_line_rate: number;
  consistency_score: number;
}

export interface AdminSession {
  token: string;
  expires_at: number;
}
