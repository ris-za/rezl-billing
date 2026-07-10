-- Invoice cancellation with audit trail
-- Run this in the Supabase SQL Editor.

-- 1. Allow the 'cancelled' status
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'cancelled'));

-- 2. Cancellation metadata on the invoice itself
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 3. Audit log: every status change is recorded here permanently
CREATE TABLE IF NOT EXISTS invoice_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,             -- 'status_change', 'cancelled', 'reinstated'
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,           -- snapshot of the user's name at the time
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_invoice
  ON invoice_audit_log(invoice_id, performed_at);

-- 4. RLS: authenticated users can read, nobody can update or delete entries
ALTER TABLE invoice_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit log" ON invoice_audit_log
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins can insert audit log" ON invoice_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
-- No UPDATE or DELETE policies on purpose: the log is append only.
