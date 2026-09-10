# V1.0.1 Deployment Guide

## Summary

This release hardens the personality assessment application with secure HMAC-signed admin sessions, API contract fixes, assessment versioning, and race-condition-free autosave.

**Commit:** `85bd6c1` - "fix: harden personality assessment V1 API and persistence"

---

## Pre-Deployment Checklist

- [ ] Code committed and pushed to `main`
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm test` (35/35 passed)
- [ ] No secrets in committed code
- [ ] Edge Function contains HMAC-signed session implementation
- [ ] Migration file created: `20260910000001_add_assessment_version.sql`

---

## Deployment Steps

### 1. Apply Database Migration

```bash
cd /path/to/personality-test
supabase db push --project-ref sbbfsvdzeaxiypiokhqi
```

Or apply manually via Supabase Dashboard → SQL Editor:

```sql
-- Add assessment_version column
ALTER TABLE personality_candidates
ADD COLUMN IF NOT EXISTS assessment_version TEXT DEFAULT 'YALA_BDR_PERSONALITY_V1';

-- Backfill existing rows
UPDATE personality_candidates
SET assessment_version = 'YALA_BDR_PERSONALITY_V1'
WHERE assessment_version IS NULL;

-- Make it non-null
ALTER TABLE personality_candidates
ALTER COLUMN assessment_version SET NOT NULL;
```

### 2. Deploy Edge Function

**Option A: Via Supabase CLI**

```bash
cd /path/to/personality-test
supabase login
supabase functions deploy personality-api --project-ref sbbfsvdzeaxiypiokhqi
```

**Option B: Via Supabase Dashboard**

1. Go to Supabase Dashboard → Edge Functions
2. Select `personality-api`
3. Upload new version from `supabase/functions/personality-api/index.ts`

### 3. Verify Environment Variables

Ensure these are set in Supabase Dashboard → Edge Functions → personality-api → Settings:

- `ADMIN_SECRET`: Should use `SUPABASE_SERVICE_ROLE_KEY` if not set
- `SUPABASE_URL`: Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY`: Auto-provided

### 4. Trigger Frontend Deployment

AWS Amplify will auto-deploy from the `main` branch push.

Monitor: https://console.aws.amazon.com/amplify/home?region=us-east-1#/d31y0y97m8bhwt

---

## Manual Verification

### Admin Flow

```bash
# 1. Login with wrong password (should fail)
curl -X POST https://sbbfsvdzeaxiypiokhqi.supabase.co/functions/v1/personality-api \
  -H "Content-Type: application/json" \
  -d '{"action":"admin.login","password":"wrong"}'

# Expected: {"error":"Invalid password"}

# 2. Login with correct password
curl -X POST https://sbbfsvdzeaxiypiokhqi.supabase.co/functions/v1/personality-api \
  -H "Content-Type: application/json" \
  -d '{"action":"admin.login","password":"Yala123"}'

# Expected: {"session":"<base64>.<hmac>","expiresAt":"..."}
# Save the session token

# 3. List candidates (with valid session)
SESSION="<session-from-step-2>"
curl -X POST https://sbbfsvdzeaxiypiokhqi.supabase.co/functions/v1/personality-api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION" \
  -d '{"action":"admin.list"}'

# Expected: {"candidates":[...]}

# 4. List candidates (with forged session)
curl -X POST https://sbbfsvdzeaxiypiokhqi.supabase.co/functions/v1/personality-api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake.token" \
  -d '{"action":"admin.list"}'

# Expected: {"error":"Unauthorized"}

# 5. Create candidate
curl -X POST https://sbbfsvdzeaxiypiokhqi.supabase.co/functions/v1/personality-api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION" \
  -d '{"action":"admin.create","name":"Test Candidate","email":"test@example.com"}'

# Expected: {"candidate":{...,"assessment_version":"YALA_BDR_PERSONALITY_V1"}}
# Save the candidate access_token
```

### Candidate Flow

```bash
TOKEN="<access_token-from-create>"

# 1. Get assessment
curl -X POST https://sbbfsvdzeaxiypiokhqi.supabase.co/functions/v1/personality-api \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"candidate.get\",\"token\":\"$TOKEN\"}"

# Expected: {"candidate":{...,"assessment_version":"YALA_BDR_PERSONALITY_V1"}}
# Should NOT include scores, similarity_score, or benchmark data

# 2. Save partial responses
curl -X POST https://sbbfsvdzeaxiypiokhqi.supabase.co/functions/v1/personality-api \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"candidate.save\",\"token\":\"$TOKEN\",\"responses\":{\"1\":3,\"2\":4},\"completed\":false}"

# Expected: {"candidate":{..., "status":"in_progress"}}

# 3. Try invalid response value (should fail)
curl -X POST https://sbbfsvdzeaxiypiokhqi.supabase.co/functions/v1/personality-api \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"candidate.save\",\"token\":\"$TOKEN\",\"responses\":{\"1\":6},\"completed\":false}"

# Expected: {"error":"Invalid response value for question 1: must be integer 1-5"}

# 4. Try to complete without all 72 responses (should fail)
curl -X POST https://sbbfsvdzeaxiypiokhqi.supabase.co/functions/v1/personality-api \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"candidate.save\",\"token\":\"$TOKEN\",\"responses\":{\"1\":3,\"2\":4},\"completed\":true}"

# Expected: {"error":"All 72 questions must be answered to complete assessment"}
```

### UI Verification

1. **Admin Dashboard**: https://big5.useyala.com/admin
   - Login with password: `Yala123`
   - Wrong password should be rejected
   - Create test candidate
   - Verify assessment_version is displayed

2. **Assessment Flow**: Open candidate link
   - Answer ~10 questions
   - Refresh browser
   - Verify answers are saved
   - Test rapid keyboard responses (1-5 keys)
   - Complete all 72 questions
   - Verify completion page

3. **Dashboard**: Return to admin
   - Verify scores appear
   - Verify quality signals show (camelCase fields)
   - Set as benchmark
   - Create second candidate
   - Complete second assessment
   - Verify similarity score appears

4. **Security Tests**:
   - Try to edit completed assessment (should fail)
   - Try to access admin API without session (should fail)
   - Try to forge admin session (should fail)

---

## Breaking Changes

### API Contract Changes

**Before (insecure, v1.0.0):**
```json
{
  "operation": "admin.login",
  "password": "..."
}
```

**After (secure, v1.0.1):**
```json
{
  "action": "admin.login",
  "password": "..."
}
```

**Admin session before:**
```json
{
  "success": true,
  "data": {
    "token": "<base64-payload>",
    "expires_at": 123456789
  }
}
```

**Admin session after:**
```json
{
  "session": "<base64>.<hmac-signature>",
  "expiresAt": "2026-09-11T00:00:00.000Z"
}
```

### Quality Signals Field Naming

**Before (snake_case):**
```typescript
{
  straight_line_rate: number;
  consistency_score: number;
}
```

**After (camelCase):**
```typescript
{
  straightLineRate: number;
  consistencyScore: number;
}
```

---

## Rollback Plan

If critical issues are discovered:

1. **Database**: Migration is additive (adds column with default), safe to leave in place
2. **Edge Function**: Revert to previous version via Supabase Dashboard
3. **Frontend**: Revert git commit and force-push to trigger Amplify redeploy

```bash
git revert 85bd6c1
git push origin main --force
```

---

## Security Improvements

### Admin Session Security

**OLD (INSECURE):**
- Base64-encoded JSON payload
- No signature verification
- Anyone could forge admin sessions

**NEW (SECURE):**
- HMAC-SHA256 signed payload
- Server-side signature verification
- Forged tokens are rejected
- 10-hour expiry enforced

### Admin Password

**OLD:** Incorrect SHA-256 hash (claimed to be "Yala123" but wasn't)
**NEW:** Correct SHA-256 hash for "Yala123":
```
11d16afc298bebd8153b31234beda426bca99b74a759978979b7193c0f56bf19
```

### Candidate Data Protection

- Candidate-facing API **never** returns:
  - Trait scores
  - Similarity scores
  - Benchmark information
  - Other candidates' data
- Admin-only data isolated to authenticated endpoints

---

## Known Limitations

- Admin password still uses SHA-256 hash (acceptable for MVP, will be replaced with proper auth)
- Single admin account (no multi-admin support yet)
- No rate limiting on admin login attempts
- Assessment versioning is stored but not yet used for score interpretation

---

## Files Changed

```
src/components/CandidateDetailsModal.tsx    |   4 +-
src/lib/api.test.ts                         | 341 +++++++++
src/lib/api.ts                              | 130 ++--
src/lib/scoring.test.ts                     |   4 +-
src/lib/scoring.ts                          |   9 +-
src/lib/types.ts                            |  68 +++
src/pages/Assessment.tsx                    |   4 +-
src/pages/InteractiveAssessment.tsx         |  86 +++
src/test/setup.ts                           |   9 +
supabase/functions/personality-api/index.ts | 448 ++++++++++--
supabase/migrations/...add_assessment_version.sql |  15 +
vite.config.ts                              |   3 +
```

**Total:** 902 insertions, 219 deletions

---

## Post-Deployment Verification Checklist

- [ ] Migration applied successfully
- [ ] Edge Function deployed
- [ ] Wrong admin password rejected
- [ ] Correct admin password accepted
- [ ] Forged admin sessions rejected
- [ ] Modified admin sessions rejected
- [ ] Expired admin sessions rejected (wait 10 hours or modify test)
- [ ] Candidate cannot see scores/similarity
- [ ] Candidate cannot edit completed assessment
- [ ] Invalid response values rejected (e.g., 6 or 0)
- [ ] Partial submission requires all 72 responses
- [ ] assessment_version saved as "YALA_BDR_PERSONALITY_V1"
- [ ] Quality signals display correctly (camelCase fields)
- [ ] Rapid answers don't lose responses
- [ ] Browser refresh preserves answers
- [ ] Benchmark similarity calculated correctly
- [ ] Automated tests pass (35/35)
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Frontend redeployed successfully via Amplify

---

## Contact

For deployment issues, contact the development team or refer to:
- GitHub: `yala-technologies/personality-test`
- Supabase Project: `sbbfsvdzeaxiypiokhqi`
- AWS Amplify App: `d31y0y97m8bhwt`
