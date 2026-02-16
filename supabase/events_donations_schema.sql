-- Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  target_amount numeric DEFAULT 0,
  collected_amount numeric DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Donations Table
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  transaction_id text,
  status payment_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- RLS Policies for Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone" 
ON public.events FOR SELECT USING (true);

CREATE POLICY "Only admins can insert/update/delete events" 
ON public.events FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'treasurer', 'collector')));

-- RLS Policies for Donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own donations" 
ON public.donations FOR SELECT 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'treasurer', 'collector')));

CREATE POLICY "Users can insert their own donations" 
ON public.donations FOR INSERT 
WITH CHECK (auth.uid() = user_id);
