/*
# Platform administrator agency access

Platform administrators can choose an agency to manage from the admin UI. This keeps normal users scoped to their own agency while allowing the platform administrator role to read agencies and manage agency-scoped CRM records and tasks.
*/

DROP POLICY IF EXISTS "platform_admin_read_agencies" ON agencies;
CREATE POLICY "platform_admin_read_agencies" ON agencies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ));

DROP POLICY IF EXISTS "platform_admin_read_crm" ON crm_records;
CREATE POLICY "platform_admin_read_crm" ON crm_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ));

DROP POLICY IF EXISTS "platform_admin_insert_crm" ON crm_records;
CREATE POLICY "platform_admin_insert_crm" ON crm_records FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ));

DROP POLICY IF EXISTS "platform_admin_update_crm" ON crm_records;
CREATE POLICY "platform_admin_update_crm" ON crm_records FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ));

DROP POLICY IF EXISTS "platform_admin_delete_crm" ON crm_records;
CREATE POLICY "platform_admin_delete_crm" ON crm_records FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ));

DROP POLICY IF EXISTS "platform_admin_read_tasks" ON tasks;
CREATE POLICY "platform_admin_read_tasks" ON tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ));

DROP POLICY IF EXISTS "platform_admin_insert_tasks" ON tasks;
CREATE POLICY "platform_admin_insert_tasks" ON tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ));

DROP POLICY IF EXISTS "platform_admin_update_tasks" ON tasks;
CREATE POLICY "platform_admin_update_tasks" ON tasks FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ));

DROP POLICY IF EXISTS "platform_admin_delete_tasks" ON tasks;
CREATE POLICY "platform_admin_delete_tasks" ON tasks FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
  ));