/*
# HHA360 Core Schema — Agencies, Profiles, Organizations

1. New Tables
- `agencies`: Multi-tenant agency accounts (name, type, address, service area, capacity, etc.)
- `profiles`: Extends auth.users with role, agency_id, display_name
- `organizations`: Shared national referral-source directory (hospitals, VA, SNF, etc.)
- `organization_locations`: Addresses for organizations
- `professional_contacts`: Public contacts at organizations (name, title, phone, email, department)

2. Security
- RLS on all tables.
- `agencies`: authenticated users can read/update their own agency.
- `profiles`: authenticated users read own profile; agency members read each other's profiles.
- `organizations` / `organization_locations` / `professional_contacts`: public read (anon, authenticated); only platform admins write.

3. Important Notes
- Multi-tenant: every agency-scoped table will use agency_id for isolation.
- `profiles.role` stores the user's role within their agency.
- `profiles.is_platform_admin` flags HHA360 platform administrators.
- Organizations directory is shared/public — not tenant-scoped.
*/

-- Agencies (tenant root)
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  agency_type text NOT NULL DEFAULT 'Home Health',
  state text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  services text[] NOT NULL DEFAULT '{}',
  service_counties text[] NOT NULL DEFAULT '{}',
  service_zip_codes text[] NOT NULL DEFAULT '{}',
  service_radius_miles integer NOT NULL DEFAULT 25,
  current_capacity integer NOT NULL DEFAULT 0,
  max_capacity integer NOT NULL DEFAULT 0,
  medicare_certified boolean NOT NULL DEFAULT false,
  medicaid_provider boolean NOT NULL DEFAULT false,
  private_pay boolean NOT NULL DEFAULT false,
  subscription_tier text NOT NULL DEFAULT 'FREE',
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'Agency Owner',
  is_platform_admin boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Organizations (shared directory)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  facility_type text NOT NULL DEFAULT 'Hospital',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  county text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  referral_phone text NOT NULL DEFAULT '',
  referral_fax text NOT NULL DEFAULT '',
  general_email text NOT NULL DEFAULT '',
  referral_email text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  contact_title text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  referral_instructions text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  source_label text NOT NULL DEFAULT '',
  latitude numeric(9,6),
  longitude numeric(9,6),
  verification_status text NOT NULL DEFAULT 'Needs Verification',
  date_added date,
  last_verified_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Organization locations (for multi-location orgs)
CREATE TABLE IF NOT EXISTS organization_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  county text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Professional contacts (public, shared)
CREATE TABLE IF NOT EXISTS professional_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  source_label text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  verification_status text NOT NULL DEFAULT 'Needs Verification',
  last_verified_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS profiles_agency_id_idx ON profiles(agency_id);
CREATE INDEX IF NOT EXISTS organizations_state_idx ON organizations(state);
CREATE INDEX IF NOT EXISTS organizations_city_idx ON organizations(city);
CREATE INDEX IF NOT EXISTS organizations_facility_type_idx ON organizations(facility_type);
CREATE INDEX IF NOT EXISTS organizations_name_idx ON organizations(name);
CREATE INDEX IF NOT EXISTS organization_locations_org_idx ON organization_locations(organization_id);
CREATE INDEX IF NOT EXISTS professional_contacts_org_idx ON professional_contacts(organization_id);

-- RLS
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_contacts ENABLE ROW LEVEL SECURITY;

-- Agencies: members can read/update their own agency
DROP POLICY IF EXISTS "read_own_agency" ON agencies;
CREATE POLICY "read_own_agency" ON agencies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.agency_id = agencies.id));

DROP POLICY IF EXISTS "update_own_agency" ON agencies;
CREATE POLICY "update_own_agency" ON agencies FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.agency_id = agencies.id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.agency_id = agencies.id));

-- Profiles: read own, read agency peers
DROP POLICY IF EXISTS "read_own_profile" ON profiles;
CREATE POLICY "read_own_profile" ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.agency_id = profiles.agency_id));

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Organizations: public read, admin write
DROP POLICY IF EXISTS "public_read_organizations" ON organizations;
CREATE POLICY "public_read_organizations" ON organizations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_organizations" ON organizations;
CREATE POLICY "admin_write_organizations" ON organizations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true));

-- Organization locations: public read, admin write
DROP POLICY IF EXISTS "public_read_org_locations" ON organization_locations;
CREATE POLICY "public_read_org_locations" ON organization_locations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_org_locations" ON organization_locations;
CREATE POLICY "admin_write_org_locations" ON organization_locations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true));

-- Professional contacts: public read, admin write
DROP POLICY IF EXISTS "public_read_contacts" ON professional_contacts;
CREATE POLICY "public_read_contacts" ON professional_contacts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_contacts" ON professional_contacts;
CREATE POLICY "admin_write_contacts" ON professional_contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true));