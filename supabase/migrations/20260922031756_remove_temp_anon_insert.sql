/*
# Remove temporary anon INSERT policy on organizations

The bulk import is complete. Remove the temporary policy that allowed anon inserts.
Only platform admins can write to organizations going forward.
*/

DROP POLICY IF EXISTS "temp_anon_insert_organizations" ON organizations;