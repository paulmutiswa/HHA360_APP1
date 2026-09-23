/*
# Fix infinite recursion in profiles + organizations RLS policies

## Problem
1. The `read_own_profile` SELECT policy on `profiles` contains a self-referential
   subquery (`SELECT 1 FROM profiles p WHERE ...`). When PostgreSQL evaluates
   the SELECT policy on `profiles`, it must evaluate the subquery, which
   triggers the same SELECT policy again — infinite recursion.

2. The `admin_write_organizations` policy was created as `FOR ALL`, which
   includes SELECT. When an authenticated user reads `organizations`,
   PostgreSQL evaluates this policy's `USING` clause, which queries
   `profiles`, triggering the recursive profiles SELECT policy.

## Fix
1. Replace `read_own_profile` with a simple `auth.uid() = id` — users can
   read their own profile only. This eliminates the self-reference.
   (Agency-based colleague reads are not needed by the app today.)

2. Drop `admin_write_organizations` (FOR ALL) and replace it with three
   separate INSERT/UPDATE/DELETE policies scoped to platform admins.
   SELECT is already handled by `public_read_organizations` (USING true),
   so no admin SELECT policy is needed.

## Security impact
- Users can still read their own profile (no change in practice).
- Platform admins can still write to organizations (same check, split into 3 policies).
- All other policies unchanged.
*/

-- 1. Fix profiles SELECT policy (remove self-reference)
DROP POLICY IF EXISTS "read_own_profile" ON profiles;
CREATE POLICY "read_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- 2. Fix organizations: drop FOR ALL, replace with per-command policies
DROP POLICY IF EXISTS "admin_write_organizations" ON organizations;

CREATE POLICY "admin_insert_organizations" ON organizations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true)
  );

CREATE POLICY "admin_update_organizations" ON organizations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true)
  );

CREATE POLICY "admin_delete_organizations" ON organizations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true)
  );