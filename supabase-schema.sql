-- Supabase Schema for Clothes Shop Manager
-- Run this SQL in your Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  gst_number TEXT,
  address TEXT,
  upi_id TEXT,
  upi_qr_code TEXT,
  profile_picture TEXT,
  notes TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  item_name TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_mode TEXT DEFAULT 'upi',
  due_date DATE,
  paid_date TIMESTAMPTZ,
  payments JSONB DEFAULT '[]',
  notes TEXT,
  bill_images JSONB DEFAULT '[]',
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table (for Udhar/Lending)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  profile_picture TEXT,
  khata_photo TEXT,
  khata_photos JSONB DEFAULT '[]',
  total_pending DECIMAL(12,2) DEFAULT 0,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Udhar (Lending) table
CREATE TABLE IF NOT EXISTS udhar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(12,2) DEFAULT 0,
  cash_amount DECIMAL(12,2) DEFAULT 0,
  online_amount DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  paid_cash DECIMAL(12,2) DEFAULT 0,
  paid_online DECIMAL(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payments JSONB DEFAULT '[]',
  khata_photos JSONB DEFAULT '[]',
  item_description TEXT,
  notes TEXT,
  paid_date TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Income table
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  type TEXT DEFAULT 'daily',
  amount DECIMAL(12,2) DEFAULT 0,
  cash_amount DECIMAL(12,2) DEFAULT 0,
  online_amount DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);

CREATE INDEX IF NOT EXISTS idx_udhar_customer_id ON udhar(customer_id);
CREATE INDEX IF NOT EXISTS idx_udhar_date ON udhar(date);
CREATE INDEX IF NOT EXISTS idx_udhar_payment_status ON udhar(payment_status);

CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_income_type ON income(type);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATION
-- =====================================================
-- 
-- SECURITY MODEL:
-- - All data tables are protected with RLS enabled
-- - The anon key (used in browser) has NO access to data tables
-- - Only the service_role key (used in API routes) can access data
-- - This means all database operations MUST go through our API routes
--   which have authentication middleware protecting them
--
-- This is more secure than the previous "allow all" policies because:
-- 1. The anon key exposed in NEXT_PUBLIC_ env vars cannot read data directly
-- 2. All requests must go through our authenticated API endpoints
-- 3. Even if someone extracts the anon key, they cannot access data
-- =====================================================

-- Enable Row Level Security on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE udhar ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies if they exist
DROP POLICY IF EXISTS "Allow all operations on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations on customers" ON customers;
DROP POLICY IF EXISTS "Allow all operations on udhar" ON udhar;
DROP POLICY IF EXISTS "Allow all operations on income" ON income;

-- Create restrictive policies that DENY access to anon key
-- The service_role key bypasses RLS entirely, so API routes still work
-- No explicit policies needed - RLS enabled with no policies = no access for anon

-- App Settings table for storing PIN and session version
-- This also needs RLS but should allow read for app_pin verification
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on app_settings" ON app_settings;

-- Note: With no policies and RLS enabled, only service_role can access these tables
-- If you need anon key access for specific operations, add targeted policies below

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_udhar_updated_at BEFORE UPDATE ON udhar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_income_updated_at BEFORE UPDATE ON income FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
