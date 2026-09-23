/*
# Temporary: Allow anon INSERT on organizations for bulk import

Adds a temporary INSERT policy for the anon role to enable bulk data import.
This will be dropped immediately after import completes.
*/

DROP POLICY IF EXISTS "temp_anon_insert_organizations" ON organizations;
CREATE POLICY "temp_anon_insert_organizations" ON organizations FOR INSERT
  TO anon, authenticated WITH CHECK (true);