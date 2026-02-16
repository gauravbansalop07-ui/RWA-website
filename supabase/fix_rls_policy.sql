-- Fix for RLS Policy Issue
-- Run this in Supabase SQL Editor to allow profile creation during signup

-- Add the missing policy to allow authenticated users to insert profiles
create policy "Authenticated users can insert profiles." 
on public.profiles 
for insert 
to authenticated 
with check (true);
