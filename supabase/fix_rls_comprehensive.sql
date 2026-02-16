-- Step 1: Check existing policies on profiles table
-- Run this first to see what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Step 2: If you see the policy already exists, drop and recreate it
-- DROP POLICY IF EXISTS "Authenticated users can insert profiles." ON public.profiles;

-- Step 3: Alternative approach - Make the existing policy more permissive
-- Drop the restrictive policy first
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;

-- Step 4: Create a new, more permissive insert policy
CREATE POLICY "Allow authenticated users to insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Step 5: Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles';
