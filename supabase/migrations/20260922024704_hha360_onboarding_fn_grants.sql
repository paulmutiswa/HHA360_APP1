/*
# HHA360 Onboarding Function Grants and Profile Insert Policy

1. Revoke public execute on the onboarding function.
2. Grant execute to authenticated users only.
3. Add an INSERT policy on profiles so the onboarding function can insert the owner row.
*/

REVOKE ALL ON FUNCTION public.create_agency_onboarding(p_name text, p_agency_type text, p_state text, p_city text, p_phone text, p_services text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_agency_onboarding(p_name text, p_agency_type text, p_state text, p_city text, p_phone text, p_services text[]) TO authenticated;

DROP POLICY IF EXISTS "insert_profile_onboarding" ON profiles;
CREATE POLICY "insert_profile_onboarding" ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'Agency Owner' AND is_platform_admin = false);