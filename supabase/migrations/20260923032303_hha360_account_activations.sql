/*
# Account Activation Codes

## Purpose
Stores 6-digit activation codes for new account sign-ups. When a user creates
an account, a code is generated and emailed to them. They must enter the code
to activate their account before they can sign in.

## New Tables
- `account_activations`
  - `id` (uuid, primary key)
  - `email` (text, unique per pending activation)
  - `code_hash` (text, hashed code — never store raw codes)
  - `full_name` (text, carried over from sign-up to profile creation)
  - `password_hash` (text, hashed password — carried over for account creation on verify)
  - `expires_at` (timestamptz, 15 minutes from creation)
  - `verified_at` (timestamptz, set when code is confirmed)
  - `created_at` (timestamptz)

## Security
- RLS enabled.
- No policies: the table is ONLY accessed via SECURITY DEFINER functions
  and the service-role key from edge functions. No direct anon/authenticated access.
*/

CREATE TABLE IF NOT EXISTS public.account_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  password_hash text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_activations_email_idx ON public.account_activations(email);
CREATE INDEX IF NOT EXISTS account_activations_expires_idx ON public.account_activations(expires_at);

ALTER TABLE public.account_activations ENABLE ROW LEVEL SECURITY;

-- No policies: only SECURITY DEFINER functions and service role can access.

-- Function to store a new activation code (called by edge function via service role)
CREATE OR REPLACE FUNCTION public.create_activation(
  p_email text,
  p_code_hash text,
  p_full_name text,
  p_password_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Delete any prior unverified activation for this email
  DELETE FROM public.account_activations
    WHERE email = lower(p_email) AND verified_at IS NULL;

  INSERT INTO public.account_activations (email, code_hash, full_name, password_hash)
  VALUES (lower(p_email), p_code_hash, p_full_name, p_password_hash)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Function to verify a code (called by edge function via service role)
-- Returns the stored full_name and password_hash so the edge function can
-- create the auth user after successful verification.
CREATE OR REPLACE FUNCTION public.verify_activation_code(
  p_email text,
  p_code_hash text
)
RETURNS TABLE(full_name text, password_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record record;
BEGIN
  SELECT * INTO v_record
    FROM public.account_activations
    WHERE email = lower(p_email)
      AND code_hash = p_code_hash
      AND verified_at IS NULL
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired activation code';
  END IF;

  UPDATE public.account_activations
    SET verified_at = now()
    WHERE id = v_record.id;

  RETURN QUERY SELECT v_record.full_name, v_record.password_hash;
END;
$$;

-- Function to check if an email has a verified activation
CREATE OR REPLACE FUNCTION public.is_activation_verified(
  p_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.account_activations
    WHERE email = lower(p_email)
      AND verified_at IS NOT NULL
      AND verified_at > now() - interval '30 minutes'
  ) INTO v_verified;

  RETURN v_verified;
END;
$$;

REVOKE ALL ON FUNCTION public.create_activation(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_activation_code(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_activation_verified(text) FROM PUBLIC;