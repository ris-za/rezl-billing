-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tpin TEXT,
  address TEXT,
  service_number TEXT UNIQUE NOT NULL,
  tariff_rate DECIMAL(10, 4) NOT NULL,
  contract_start_date DATE NOT NULL,
  contract_duration_months INTEGER NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Computed contract end date via view
CREATE VIEW customers_with_expiry AS
SELECT
  *,
  (contract_start_date + (contract_duration_months || ' months')::INTERVAL)::DATE AS contract_end_date,
  CASE
    WHEN (contract_start_date + (contract_duration_months || ' months')::INTERVAL)::DATE <= CURRENT_DATE THEN 'expired'
    WHEN (contract_start_date + (contract_duration_months || ' months')::INTERVAL)::DATE <= (CURRENT_DATE + INTERVAL '2 months') THEN 'expiring_soon'
    ELSE 'active'
  END AS contract_status
FROM customers
WHERE is_active = TRUE;

-- Invoices
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  billing_period TEXT NOT NULL,
  billing_month DATE NOT NULL,
  previous_reading DECIMAL(15, 2),
  current_reading DECIMAL(15, 2),
  consumption_kwh DECIMAL(15, 2) NOT NULL,
  tariff_rate DECIMAL(10, 4) NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  electricity_levy DECIMAL(15, 2) NOT NULL,
  vat DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read own, admins can read all
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Customers: all authenticated users can read, only admins can write
CREATE POLICY "Authenticated users can read customers" ON customers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins can insert customers" ON customers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update customers" ON customers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete customers" ON customers FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Invoices: all authenticated users can read, only admins can write
CREATE POLICY "Authenticated users can read invoices" ON invoices FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins can insert invoices" ON invoices FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update invoices" ON invoices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
