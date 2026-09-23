/*
# HHA360 CRM and Activity Tables

1. New Tables (all tenant-scoped via agency_id)
- `crm_records`: Private CRM entries linking an organization to an agency's pipeline.
- `crm_activities`: Activity log (calls, emails, visits, notes) per CRM record.
- `referrals`: Referral outcomes tracked per CRM record.

2. Security
- RLS on all tables.
- Only agency members can access their tenant's rows.
- agency_id defaults from the calling user's profile via a helper function.
*/

-- Helper: get current user's agency
CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM profiles WHERE id = auth.uid();
$$;

-- CRM records (private per agency)
CREATE TABLE IF NOT EXISTS crm_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'Not Contacted',
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  last_contacted_at timestamptz,
  next_follow_up date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CRM activities
CREATE TABLE IF NOT EXISTS crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_record_id uuid NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'Note',
  summary text NOT NULL DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_record_id uuid NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  referral_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'Received',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_records_agency_idx ON crm_records(agency_id);
CREATE INDEX IF NOT EXISTS crm_records_org_idx ON crm_records(organization_id);
CREATE INDEX IF NOT EXISTS crm_activities_crm_idx ON crm_activities(crm_record_id);
CREATE INDEX IF NOT EXISTS crm_activities_agency_idx ON crm_activities(agency_id);
CREATE INDEX IF NOT EXISTS referrals_crm_idx ON referrals(crm_record_id);
CREATE INDEX IF NOT EXISTS referrals_agency_idx ON referrals(agency_id);

ALTER TABLE crm_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- CRM records: agency members CRUD
DROP POLICY IF EXISTS "agency_read_crm" ON crm_records;
CREATE POLICY "agency_read_crm" ON crm_records FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_insert_crm" ON crm_records;
CREATE POLICY "agency_insert_crm" ON crm_records FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_update_crm" ON crm_records;
CREATE POLICY "agency_update_crm" ON crm_records FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_delete_crm" ON crm_records;
CREATE POLICY "agency_delete_crm" ON crm_records FOR DELETE TO authenticated
  USING (agency_id = public.current_agency_id());

-- CRM activities: agency members CRUD
DROP POLICY IF EXISTS "agency_read_activities" ON crm_activities;
CREATE POLICY "agency_read_activities" ON crm_activities FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_insert_activities" ON crm_activities;
CREATE POLICY "agency_insert_activities" ON crm_activities FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_delete_activities" ON crm_activities;
CREATE POLICY "agency_delete_activities" ON crm_activities FOR DELETE TO authenticated
  USING (agency_id = public.current_agency_id());

-- Referrals: agency members CRUD
DROP POLICY IF EXISTS "agency_read_referrals" ON referrals;
CREATE POLICY "agency_read_referrals" ON referrals FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_insert_referrals" ON referrals;
CREATE POLICY "agency_insert_referrals" ON referrals FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_update_referrals" ON referrals;
CREATE POLICY "agency_update_referrals" ON referrals FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_delete_referrals" ON referrals;
CREATE POLICY "agency_delete_referrals" ON referrals FOR DELETE TO authenticated
  USING (agency_id = public.current_agency_id());