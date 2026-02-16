-- Add multimedia support to announcements
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT; -- 'image', 'video', 'pdf', 'doc'
