-- Additional RLS Policy to Prevent Role Escalation
-- This ensures users cannot update their own role to admin

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Create new update policy that prevents role changes
CREATE POLICY "Users can update own profile except role" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- Verify the policy was created
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';
