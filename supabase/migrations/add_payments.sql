-- ─────────────────────────────────────────
--  Payments table
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID           NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id       UUID           REFERENCES invoices(id) ON DELETE SET NULL,
  amount           DECIMAL(12,2)  NOT NULL CHECK (amount > 0),
  payment_date     DATE           NOT NULL,
  transaction_ref  TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ    DEFAULT NOW(),
  created_by       UUID           REFERENCES auth.users(id)
);

-- Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payments"
  ON payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete payments"
  ON payments FOR DELETE TO authenticated USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx  ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_customer_id_idx ON payments(customer_id);
