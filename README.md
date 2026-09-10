# Yala BDR Personality Assessment

A production-ready personality assessment application for evaluating junior BDR candidates against underlying personality traits that are difficult to train.

## Overview

This application allows Yala to:

1. Create candidate profiles and generate unique assessment links
2. Administer a 72-question personality assessment
3. Calculate nine trait scores server-side
4. Designate a benchmark candidate (known star BDR)
5. Compare all candidates against the benchmark
6. Review response quality signals

The assessment identifies personality traits that predict BDR success, not job-specific sales skills.

## Tech Stack

- **Frontend:** Vite, React, TypeScript, React Router, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Visualization:** Recharts
- **Icons:** Lucide React

## Local Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI (optional, for migrations)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yala-technologies/personality-test.git
cd personality-test
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://sbbfsvdzeaxiypiokhqi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

### Running Locally

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## Supabase Setup

### Database Migration

The application requires the `personality_candidates` table. Apply the migration:

```bash
cd supabase
supabase db push
```

Or manually run the SQL in `supabase/migrations/20260910000000_create_personality_candidates.sql` via the Supabase dashboard.

### Edge Function Deployment

Deploy the `personality-api` Edge Function:

```bash
supabase functions deploy personality-api
```

The Edge Function handles:
- Admin authentication
- Candidate CRUD operations
- Score calculation
- Benchmark management
- Response quality analysis

### Environment Variables

The Edge Function requires:
- `SUPABASE_URL` (auto-configured)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-configured)
- `ADMIN_SECRET` (optional, for custom JWT signing)

## Application Routes

| Route | Purpose |
|-------|---------|
| `/` | Redirects to `/admin` |
| `/admin` | Admin login + dashboard |
| `/assessment/:token` | Candidate assessment |
| `/assessment/:token/complete` | Completion confirmation |

## Admin Access

### Temporary Password Gate

The admin dashboard uses a temporary password-based session system:

**Password:** Contact admin for credentials

The password is **never** stored in the frontend bundle. The plaintext password is hashed (SHA-256) and verified server-side in the Edge Function. On successful login, the backend returns a signed session token valid for 10 hours.

The frontend stores only the session token in `sessionStorage`.

### Replacing with Supabase Auth

To replace the temporary password gate with proper Supabase Auth:

1. Enable Email Auth in Supabase dashboard
2. Create an `admins` table with email whitelist
3. Update the Edge Function to verify Supabase JWT instead of custom tokens
4. Update `AdminLogin.tsx` to use `supabase.auth.signInWithPassword()`
5. Update `AdminRoute.tsx` to check `supabase.auth.getSession()`

The application is structured to make this transition straightforward.

## Assessment Terminology

The application uses precise, neutral language:

**Use:**
- "Personality Assessment"
- "Similarity to benchmark"
- "Response quality"

**Do not use:**
- "Perfect candidate"
- "Ideal personality"
- "Hire / Don't hire"
- "Success probability"

The assessment measures trait profiles, not hiring decisions. Human judgment remains essential.

## Testing

Run the test suite:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

The tests cover:
- Reverse scoring logic
- All nine trait calculations
- Similarity calculations
- Response validation
- Quality signal detection
- Question 45 dual contribution (assertiveness + interpersonal orientation)

## Security

### Frontend
- No secrets in environment variables (only publishable key)
- No client-side scoring or calculation
- Session tokens stored in `sessionStorage` (cleared on logout/expiry)
- Admin password hash never exposed to browser

### Backend
- RLS enabled on `personality_candidates`
- All direct table access denied
- All operations go through Edge Function
- Candidate endpoints return only candidate's own data
- Admin endpoints require valid session token
- Scores, benchmarks, and other candidates never exposed to candidate endpoints

### Database
- Single benchmark constraint enforced at DB level
- Completed assessments cannot be edited (enforced server-side)
- Raw responses retained permanently after completion

## Migrations

All database schema changes must be:

1. Created as migration files in `supabase/migrations/`
2. Named with timestamp: `YYYYMMDDHHMMSS_description.sql`
3. Idempotent where possible (use `IF NOT EXISTS`, etc.)
4. Never duplicate already-applied migrations

To check migration status:
```bash
supabase migration list
```

To create a new migration:
```bash
supabase migration new migration_name
```

## Known Limitations

### V1 Scope

This is V1. Not included:

- Email notifications (assessment links must be manually shared)
- Candidate invitation tracking
- Bulk candidate import
- Historical benchmark comparisons
- Multi-tenant support
- Mobile app

### Assessment Limitations

- The assessment is **not** a clinically validated Big Five instrument
- It measures underlying traits, not job-specific skills
- Trait labels are descriptive, not diagnostic
- Results should inform, not replace, human judgment in hiring

### Response Quality

The quality signals (straight-line rate, consistency, duration) are **informational only**. They do not:

- Automatically disqualify candidates
- Adjust scores
- Generate hiring recommendations

Human review is required for flagged responses.

## Development Notes

### Component Structure

```
src/
├── components/          # Reusable UI components
│   ├── AdminRoute.tsx
│   ├── CandidateDetailsModal.tsx
│   ├── CandidateTable.tsx
│   ├── CreateCandidateModal.tsx
│   ├── OverviewCards.tsx
│   └── TraitVisualization.tsx
├── lib/                 # Core logic and utilities
│   ├── api.ts          # API client
│   ├── auth.ts         # Session management
│   ├── questions.ts    # Assessment questions
│   ├── scoring.ts      # Scoring algorithms
│   ├── supabase.ts     # Supabase client
│   ├── types.ts        # TypeScript types
│   └── utils.ts        # Helpers
├── pages/               # Route pages
│   ├── AdminDashboard.tsx
│   ├── AdminLogin.tsx
│   ├── Assessment.tsx
│   └── Complete.tsx
└── test/                # Test files
    ├── setup.ts
    └── scoring.test.ts
```

### Scoring Algorithm

Each trait is scored 0–100 based on a subset of the 72 questions. Some questions are reverse-scored. The formula:

```
score = ((mean - 1) / 4) × 100
```

Where `mean` is the average response (after reverse scoring) for that trait's questions.

### Benchmark Similarity

```
traitSimilarity = 100 - |candidateScore - benchmarkScore|
overallSimilarity = average of all nine trait similarities
```

### Question Ordering

Each candidate receives a randomized question order, generated once when the candidate is created. The order remains stable for that candidate to support resume functionality.

## Deployment

The frontend can be deployed to:

- Vercel
- Netlify
- Cloudflare Pages
- Any static hosting provider

Set the environment variables in your hosting provider's dashboard.

The Edge Function is already deployed to Supabase.

## Support

For questions about this repository, contact the Yala engineering team.

## License

Proprietary. For internal Yala use only.
