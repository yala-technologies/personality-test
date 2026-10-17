-- Hide candidates from the main admin results list without deleting them.
-- Hidden rows stay available on the Hidden tab and can be restored.

ALTER TABLE personality_candidates
ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN personality_candidates.hidden IS 'When true, the candidate is omitted from the main admin results list and shown on the Hidden tab.';

CREATE INDEX IF NOT EXISTS idx_personality_candidates_hidden
ON personality_candidates(hidden)
WHERE hidden = true;
