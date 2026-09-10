-- Create personality_candidates table
CREATE TABLE IF NOT EXISTS personality_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  access_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'in_progress', 'completed')),
  is_benchmark BOOLEAN NOT NULL DEFAULT false,
  responses JSONB,
  question_order JSONB,
  scores JSONB,
  similarity_score NUMERIC(5, 2),
  quality_signals JSONB,
  assessment_duration_seconds INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on access_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_personality_candidates_access_token 
  ON personality_candidates(access_token);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_personality_candidates_status 
  ON personality_candidates(status);

-- Create index on is_benchmark for fast benchmark lookup
CREATE INDEX IF NOT EXISTS idx_personality_candidates_is_benchmark 
  ON personality_candidates(is_benchmark) WHERE is_benchmark = true;

-- Enable RLS
ALTER TABLE personality_candidates ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (idempotent)
DROP POLICY IF EXISTS "No direct access" ON personality_candidates;

-- Create policy that denies all direct access
CREATE POLICY "No direct access"
  ON personality_candidates
  FOR ALL
  USING (false);

-- Add constraint to ensure only one benchmark exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_personality_candidates_single_benchmark
  ON personality_candidates(is_benchmark)
  WHERE is_benchmark = true;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_personality_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_personality_candidates_updated_at 
  ON personality_candidates;

CREATE TRIGGER update_personality_candidates_updated_at
  BEFORE UPDATE ON personality_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_personality_candidates_updated_at();
