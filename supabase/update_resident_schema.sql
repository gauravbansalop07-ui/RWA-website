-- ============================================================
-- RWA App: Resident Schema Update
-- Run once in Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS floor_number   integer,
  ADD COLUMN IF NOT EXISTS composite_flat_id text,
  ADD COLUMN IF NOT EXISTS approval_status  text NOT NULL DEFAULT 'approved';

-- 2. Grandfather ALL existing residents as approved (so nobody gets locked out)
UPDATE public.profiles
  SET approval_status = 'approved'
  WHERE approval_status IS NULL OR approval_status = '';

-- 3. Populate composite_flat_id for any existing rows that have both columns
UPDATE public.profiles
  SET composite_flat_id = floor_number::text || '-' || flat_number
  WHERE floor_number IS NOT NULL
    AND flat_number IS NOT NULL
    AND composite_flat_id IS NULL;

-- 4. Unique constraint on composite_flat_id (nullable = allows NULL for old rows)
--    PostgreSQL UNIQUE constraints ignore NULLs, so existing NULL rows won't conflict.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_composite_flat_id_unique'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_composite_flat_id_unique UNIQUE (composite_flat_id);
  END IF;
END $$;

-- Note: mobile uniqueness is validated at the application layer only,
-- because legacy data may have duplicate/missing mobile numbers.
-- You can enable this once data is clean:
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_mobile_unique UNIQUE (mobile);

-- 5. SECURITY DEFINER function: check if a floor+flat is already taken
--    Called from the signup form before creating auth user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_flat_availability(p_floor integer, p_flat text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE composite_flat_id = p_floor::text || '-' || p_flat
  );
$$;

-- Grant execute to anon (called before signup, user is not yet authenticated)
GRANT EXECUTE ON FUNCTION public.check_flat_availability(integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_flat_availability(integer, text) TO authenticated;

-- 6. SECURITY DEFINER function: check if a phone number is already registered
CREATE OR REPLACE FUNCTION public.check_phone_availability(p_phone text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE mobile = p_phone
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_phone_availability(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_phone_availability(text) TO authenticated;
