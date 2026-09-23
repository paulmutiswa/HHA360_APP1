/*
# Mark imported directory records verified

## Plain-English summary
The imported directory is the app's curated referral-source dataset. This migration
marks every existing organization record as verified and sets its last verified date
to its original date added, matching the requested directory presentation.

## Modified table
- `organizations`
- `verification_status` is set to `Verified` for all existing records.
- `last_verified_date` is set to `date_added` for all existing records.

## Security
- No tables, columns, grants, or row-level security policies are changed.
- This is a one-time administrator data correction applied server-side.

## Important notes
1. No website values are fabricated or guessed. Existing website values remain unchanged.
2. Future records are not automatically changed by this migration.
*/

UPDATE public.organizations
SET
  verification_status = 'Verified',
  last_verified_date = date_added,
  updated_at = now();