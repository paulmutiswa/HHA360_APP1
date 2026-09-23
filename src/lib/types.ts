export type UserRole =
  | 'Agency Owner'
  | 'Agency Administrator'
  | 'Business Development'
  | 'Compliance/HR'
  | 'Caregiver'
  | 'Entrepreneur'
  | 'Platform Administrator';

export type SubscriptionTier = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export interface Profile {
  id: string;
  agency_id: string | null;
  email: string;
  display_name: string;
  role: UserRole;
  is_platform_admin: boolean;
  active: boolean;
}

export interface Agency {
  id: string;
  name: string;
  agency_type: string;
  state: string;
  city: string;
  address: string;
  zip: string;
  phone: string;
  website: string;
  services: string[];
  service_counties: string[];
  service_zip_codes: string[];
  service_radius_miles: number;
  current_capacity: number;
  max_capacity: number;
  medicare_certified: boolean;
  medicaid_provider: boolean;
  private_pay: boolean;
  subscription_tier: SubscriptionTier;
  onboarding_complete: boolean;
}

export interface Organization {
  id: string;
  name: string;
  facility_type: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  department: string;
  referral_phone: string;
  referral_fax: string;
  general_email: string;
  referral_email: string;
  contact_person: string;
  contact_title: string;
  contact_email: string;
  contact_phone: string;
  referral_instructions: string;
  notes: string;
  source_url: string;
  source_label: string;
  latitude: number | null;
  longitude: number | null;
  verification_status: string;
  date_added: string | null;
  last_verified_date: string | null;
}

export interface ProfessionalContact {
  id: string;
  organization_id: string | null;
  name: string;
  title: string;
  department: string;
  phone: string;
  email: string;
  source_label: string;
  verification_status: string;
}

export type CrmStage =
  | 'Not Contacted'
  | 'Attempted Contact'
  | 'Contacted'
  | 'Follow-Up Required'
  | 'Relationship Building'
  | 'Referral Partner'
  | 'Referral Received'
  | 'Converted'
  | 'Inactive';

export const CRM_STAGES: CrmStage[] = [
  'Not Contacted', 'Attempted Contact', 'Contacted', 'Follow-Up Required',
  'Relationship Building', 'Referral Partner', 'Referral Received', 'Converted', 'Inactive',
];

export interface CrmRecord {
  id: string;
  agency_id: string;
  organization_id: string | null;
  stage: CrmStage;
  assigned_to: string | null;
  notes: string;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmActivity {
  id: string;
  crm_record_id: string;
  agency_id: string;
  activity_type: string;
  summary: string;
  created_by: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  crm_record_id: string;
  agency_id: string;
  referral_date: string;
  status: string;
  notes: string;
}

export interface Task {
  id: string;
  agency_id: string;
  title: string;
  description: string;
  due_date: string | null;
  due_time: string | null;
  reminder_enabled: boolean;
  priority: string;
  assigned_to: string | null;
  completed: boolean;
  recurring: string;
  related_crm_id: string | null;
  related_org_id: string | null;
}

export interface Employee {
  id: string;
  agency_id: string;
  full_name: string;
  role: string;
  phone: string;
  email: string;
  hire_date: string | null;
  active: boolean;
}

export interface EmployeeCredential {
  id: string;
  employee_id: string;
  agency_id: string;
  credential_type: string;
  issue_date: string | null;
  expiration_date: string | null;
  verification_status: string;
  notes: string;
}

export interface ContactVerification {
  id: string;
  organization_id: string | null;
  field_name: string;
  original_value: string;
  suggested_value: string;
  correction_type: string;
  submitted_by: string | null;
  submitted_at: string;
  evidence: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string;
}

export interface TemplateItem {
  id: string;
  title: string;
  category: string;
  description: string;
  body: string;
  sort_order: number;
}

export type RoadmapStatus = 'Not Started' | 'In Progress' | 'Needs Attention' | 'Completed';

export interface RoadmapProgress {
  id: string;
  agency_id: string;
  step_key: string;
  status: RoadmapStatus;
  updated_at: string;
}
