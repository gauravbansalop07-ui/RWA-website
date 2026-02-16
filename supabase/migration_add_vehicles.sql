-- Migration: Add Vehicle Tracking Fields to Profiles
-- Run this in Supabase SQL Editor to add vehicle tracking to existing database

-- Add vehicle_count column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vehicle_count integer DEFAULT 0;

-- Add vehicle_numbers column (array of text)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vehicle_numbers text[] DEFAULT '{}';

-- Update existing records to have default values
UPDATE public.profiles 
SET vehicle_count = 0, vehicle_numbers = '{}'
WHERE vehicle_count IS NULL OR vehicle_numbers IS NULL;

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('vehicle_count', 'vehicle_numbers');
