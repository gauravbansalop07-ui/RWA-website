-- Add created_at timestamp to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Update existing records to have a created_at timestamp
UPDATE public.profiles 
SET created_at = now()
WHERE created_at IS NULL;
