-- Add assessment_version column to track which assessment definition was used
ALTER TABLE personality_candidates
ADD COLUMN IF NOT EXISTS assessment_version TEXT DEFAULT 'YALA_BDR_PERSONALITY_V1';

-- Backfill existing rows (all current rows are V1)
UPDATE personality_candidates
SET assessment_version = 'YALA_BDR_PERSONALITY_V1'
WHERE assessment_version IS NULL;

-- Make it non-null now that all rows have a value
ALTER TABLE personality_candidates
ALTER COLUMN assessment_version SET NOT NULL;

-- Add comment explaining immutability
COMMENT ON COLUMN personality_candidates.assessment_version IS 'Immutable assessment version (e.g., YALA_BDR_PERSONALITY_V1). Historical assessments must never be rescored using future assessment definitions.';
