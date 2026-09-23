/*
# HHA360 Admin Agency Creation

Lets a platform administrator create a new agency and optionally
link it to their own profile. Unlike the onboarding function,
this does not reject users who already have a profile row —
it updates the existing row instead.
*/

CREATE OR REPLACE FUNCTION public.create_agency_admin(
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

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
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

  -- Link the admin to this agency so they can manage it
  UPDATE profiles SET agency_id = v_agency_id WHERE id = auth.uid();

  RETURN v_agency_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_agency_admin FROM anon;
GRANT EXECUTE ON FUNCTION public.create_agency_admin TO authenticated;