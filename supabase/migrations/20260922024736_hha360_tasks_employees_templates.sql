/*
# HHA360 Tasks, Employees, Credentials, Verifications, Templates

1. New Tables (all tenant-scoped via agency_id unless noted)
- `tasks`: Tasks and reminders for agency users.
- `employees`: Agency employee/caregiver profiles.
- `employee_credentials`: Compliance documents per employee with expiration tracking.
- `contact_verifications`: Crowdsourced contact correction queue (public submit, admin review).
- `template_library`: Platform-wide template documents managed by admins.

2. Security
- RLS on all tables.
- Tenant-scoped tables: only agency members access their data.
- contact_verifications: any authenticated user can submit; only platform admins can review/resolve.
- template_library: public read; admin write.
*/

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_date date,
  priority text NOT NULL DEFAULT 'Medium',
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  completed boolean NOT NULL DEFAULT false,
  recurring text NOT NULL DEFAULT '',
  related_crm_id uuid REFERENCES crm_records(id) ON DELETE SET NULL,
  related_org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Caregiver',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  hire_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Employee credentials
CREATE TABLE IF NOT EXISTS employee_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  credential_type text NOT NULL,
  issue_date date,
  expiration_date date,
  verification_status text NOT NULL DEFAULT 'Pending',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Contact verifications (crowdsourced corrections)
CREATE TABLE IF NOT EXISTS contact_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  professional_contact_id uuid REFERENCES professional_contacts(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  original_value text NOT NULL DEFAULT '',
  suggested_value text NOT NULL DEFAULT '',
  correction_type text NOT NULL DEFAULT 'Wrong information',
  submitted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  evidence text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text NOT NULL DEFAULT ''
);

-- Template library (platform-wide)
CREATE TABLE IF NOT EXISTS template_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_agency_idx ON tasks(agency_id);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);
CREATE INDEX IF NOT EXISTS employees_agency_idx ON employees(agency_id);
CREATE INDEX IF NOT EXISTS employee_credentials_emp_idx ON employee_credentials(employee_id);
CREATE INDEX IF NOT EXISTS employee_credentials_exp_idx ON employee_credentials(expiration_date);
CREATE INDEX IF NOT EXISTS contact_verifications_status_idx ON contact_verifications(status);
CREATE INDEX IF NOT EXISTS template_library_category_idx ON template_library(category);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_library ENABLE ROW LEVEL SECURITY;

-- Tasks: agency CRUD
DROP POLICY IF EXISTS "agency_read_tasks" ON tasks;
CREATE POLICY "agency_read_tasks" ON tasks FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());
DROP POLICY IF EXISTS "agency_insert_tasks" ON tasks;
CREATE POLICY "agency_insert_tasks" ON tasks FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id());
DROP POLICY IF EXISTS "agency_update_tasks" ON tasks;
CREATE POLICY "agency_update_tasks" ON tasks FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());
DROP POLICY IF EXISTS "agency_delete_tasks" ON tasks;
CREATE POLICY "agency_delete_tasks" ON tasks FOR DELETE TO authenticated
  USING (agency_id = public.current_agency_id());

-- Employees: agency CRUD
DROP POLICY IF EXISTS "agency_read_employees" ON employees;
CREATE POLICY "agency_read_employees" ON employees FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());
DROP POLICY IF EXISTS "agency_insert_employees" ON employees;
CREATE POLICY "agency_insert_employees" ON employees FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id());
DROP POLICY IF EXISTS "agency_update_employees" ON employees;
CREATE POLICY "agency_update_employees" ON employees FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());
DROP POLICY IF EXISTS "agency_delete_employees" ON employees;
CREATE POLICY "agency_delete_employees" ON employees FOR DELETE TO authenticated
  USING (agency_id = public.current_agency_id());

-- Employee credentials: agency CRUD
DROP POLICY IF EXISTS "agency_read_credentials" ON employee_credentials;
CREATE POLICY "agency_read_credentials" ON employee_credentials FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());
DROP POLICY IF EXISTS "agency_insert_credentials" ON employee_credentials;
CREATE POLICY "agency_insert_credentials" ON employee_credentials FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id());
DROP POLICY IF EXISTS "agency_update_credentials" ON employee_credentials;
CREATE POLICY "agency_update_credentials" ON employee_credentials FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());
DROP POLICY IF EXISTS "agency_delete_credentials" ON employee_credentials;
CREATE POLICY "agency_delete_credentials" ON employee_credentials FOR DELETE TO authenticated
  USING (agency_id = public.current_agency_id());

-- Contact verifications: any authenticated user can submit; admins review
DROP POLICY IF EXISTS "auth_read_own_verifications" ON contact_verifications;
CREATE POLICY "auth_read_own_verifications" ON contact_verifications FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_admin = true));

DROP POLICY IF EXISTS "auth_submit_verification" ON contact_verifications;
CREATE POLICY "auth_submit_verification" ON contact_verifications FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "admin_update_verifications" ON contact_verifications;
CREATE POLICY "admin_update_verifications" ON contact_verifications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_admin = true));

-- Template library: public read, admin write
DROP POLICY IF EXISTS "public_read_templates" ON template_library;
CREATE POLICY "public_read_templates" ON template_library FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_templates" ON template_library;
CREATE POLICY "admin_write_templates" ON template_library FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_admin = true));