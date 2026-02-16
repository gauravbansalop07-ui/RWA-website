-- Refine Roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'complaint_manager';

-- Refine Payment Statuses
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'paid_online';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'cash_collected';

-- RSVPs Table
CREATE TABLE IF NOT EXISTS public.rsvps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('yes', 'no', 'maybe')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own RSVPs" 
ON public.rsvps FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view RSVPs" 
ON public.rsvps FOR SELECT USING (true);

-- Galleries Table
CREATE TABLE IF NOT EXISTS public.galleries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Galleries are viewable by everyone" 
ON public.galleries FOR SELECT USING (true);

CREATE POLICY "Admins can manage galleries" 
ON public.galleries FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'treasurer')));

-- Gallery Images Table
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id uuid REFERENCES public.galleries(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery images are viewable by everyone" 
ON public.gallery_images FOR SELECT USING (true);

-- Financial Reports Table
CREATE TABLE IF NOT EXISTS public.financial_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id uuid REFERENCES public.maintenance_periods(id),
  title text NOT NULL,
  description text,
  report_url text, -- PDF report
  bills_metadata jsonb, -- Array of bill URLs and titles
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financial reports are viewable by everyone" 
ON public.financial_reports FOR SELECT USING (true);

CREATE POLICY "Admins can manage financial reports" 
ON public.financial_reports FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'treasurer')));
