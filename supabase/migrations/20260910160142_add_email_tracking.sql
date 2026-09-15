-- Add email tracking columns to personality_candidates
-- Tracks when invite emails are sent and their status

ALTER TABLE personality_candidates
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS invite_email_status TEXT NULL CHECK (invite_email_status IN ('sent', 'failed')),
ADD COLUMN IF NOT EXISTS invite_email_error TEXT NULL;

COMMENT ON COLUMN personality_candidates.invite_sent_at IS 'Timestamp when the invitation email was successfully sent';
COMMENT ON COLUMN personality_candidates.invite_email_status IS 'Status of the invitation email: sent or failed';
COMMENT ON COLUMN personality_candidates.invite_email_error IS 'Brief error message if email sending failed (no sensitive data)';

-- Index for querying by email status
CREATE INDEX IF NOT EXISTS idx_personality_candidates_email_status 
ON personality_candidates(invite_email_status) 
WHERE invite_email_status IS NOT NULL;
