-- Hide assessment results from the main admin results view.
-- Hidden rows stay in the table and are listed on the Hidden tab.

ALTER TABLE personality_candidates
ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN personality_candidates.hidden IS 'When true, the result is hidden from the main admin results view and listed on the Hidden tab';

CREATE INDEX IF NOT EXISTS idx_personality_candidates_hidden
  ON personality_candidates(hidden)
  WHERE hidden = true;
