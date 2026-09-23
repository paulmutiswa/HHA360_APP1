/*
# HHA360 Secure Onboarding Function

Creates a SECURITY DEFINER function that lets a signed-in user
create their agency and owner profile in one atomic call.
Role and platform-admin flags are set by the database, not the browser.
*/

CREATE OR REPLACE FUNCTION public.create_agency_onboarding(
  p_name text,
  p_agency_type text,
  p_state text,
  p_city text,
  p_phone text,
  p_services text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND agency_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Agency already configured';
  END IF;

  IF nullif(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Agency name is required';
  END IF;

  INSERT INTO agencies (name, agency_type, state, city, phone, services, onboarding_complete)
  VALUES (
    trim(p_name),
    coalesce(nullif(trim(p_agency_type), ''), 'Home Health'),
    coalesce(p_state, ''),
    coalesce(p_city, ''),
    coalesce(p_phone, ''),
    coalesce(p_services, '{}'),
    true
  )
  RETURNING id INTO v_agency_id;

  INSERT INTO profiles (id, agency_id, email, display_name, role)
  SELECT auth.uid(), v_agency_id, email, coalesce(raw_user_meta_data->>'full_name', ''), 'Agency Owner'
  FROM auth.users
  WHERE id = auth.uid();

  RETURN v_agency_id;
END;
$$;