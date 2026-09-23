/*
# Temporary: Allow anon INSERT on organizations for bulk import

This adds a temporary INSERT policy for the anon role to enable bulk data import.
After import is complete, this policy will be dropped.
*/

DROP POLICY IF EXISTS "temp_anon_insert_organizations" ON organizations;
CREATE POLICY "temp_anon_insert_organizations" ON organizations FOR INSERT
TO anon, authenticated WITH CHECK (true);