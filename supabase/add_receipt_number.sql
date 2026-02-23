-- Run this once in the Supabase SQL Editor to add receipt number support
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS receipt_number text;

-- Optional: Allow all authenticated users to update their own payment's receipt_number
-- (needed when citizen pays via Razorpay and writes the receipt_number back)
-- The existing update policies should cover this, but if not, run:
-- CREATE POLICY "Users can update own payments" ON public.payments
--   FOR UPDATE USING (auth.uid() = user_id);
