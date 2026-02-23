-- ============================================================
-- RWA App: Grace Period & Late Fee Schema
-- Run once in Supabase SQL Editor
-- ============================================================

-- 1. Add grace period config to maintenance_periods
ALTER TABLE public.maintenance_periods
  ADD COLUMN IF NOT EXISTS grace_period_days  integer  DEFAULT 3,
  ADD COLUMN IF NOT EXISTS late_fee_amount    numeric  DEFAULT 25,
  ADD COLUMN IF NOT EXISTS reminders_enabled  boolean  DEFAULT true;

-- 2. Add payment phase tracking to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_phase      text     DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS late_fee_applied   numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount_paid  numeric;

-- 3. Backfill total_amount_paid for existing paid rows
UPDATE public.payments
  SET total_amount_paid = amount,
      payment_phase = 'normal',
      late_fee_applied = 0
  WHERE status = 'paid' AND total_amount_paid IS NULL;
