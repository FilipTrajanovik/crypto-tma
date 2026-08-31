-- crypto-wallet-tma database schema
-- Run this against your Neon Postgres database before starting the app.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  is_super_admin BOOLEAN DEFAULT false,
  release_paid BOOLEAN DEFAULT false,
  assigned_admin_id INTEGER REFERENCES users(id),
  support_contact TEXT,
  btc_address TEXT,
  eth_address TEXT,
  email TEXT,
  home_address TEXT,
  release_fee_title TEXT,
  release_fee_note TEXT,
  release_fee_amount DECIMAL(18,2),
  release_fee_currency TEXT,
  notifications_allowed BOOLEAN DEFAULT false,
  release_deadline TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Idempotent for databases created before these columns existed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS release_fee_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS release_fee_note TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS release_fee_amount DECIMAL(18,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS release_fee_currency TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_allowed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS release_deadline TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS release_fee_discount_type TEXT; -- 'percent' or 'fixed'
ALTER TABLE users ADD COLUMN IF NOT EXISTS release_fee_discount_value DECIMAL(18,2);

CREATE TABLE IF NOT EXISTS balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  btc_amount DECIMAL(18,8) DEFAULT 0,
  eth_amount DECIMAL(18,8) DEFAULT 0,
  usd_cash DECIMAL(18,2) DEFAULT 0,
  gold_amount DECIMAL(18,4) DEFAULT 0, -- troy ounces
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE balances ADD COLUMN IF NOT EXISTS gold_amount DECIMAL(18,4) DEFAULT 0;

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL, -- deposit, withdrawal, invest, release, adjustment
  amount DECIMAL(18,8) NOT NULL,
  currency TEXT NOT NULL, -- BTC, ETH, USD
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investment_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  min_amount DECIMAL(18,2) NOT NULL,
  roi_percent DECIMAL(5,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  currency TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS investments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  plan_id INTEGER REFERENCES investment_plans(id),
  amount DECIMAL(18,8) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  started_at TIMESTAMP DEFAULT NOW(),
  matures_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(18,8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  wallet_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS release_conditions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  fee_amount DECIMAL(18,2) DEFAULT 0,
  fee_currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  uploaded_by_admin_id INTEGER REFERENCES users(id),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  data TEXT NOT NULL, -- base64-encoded file contents
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  support_contact TEXT,
  btc_address TEXT,
  eth_address TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balances_user_id ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_assigned_admin_id ON users(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);

-- Seed a couple of default investment plans and a release condition (optional)
INSERT INTO investment_plans (name, description, min_amount, roi_percent, duration_days, currency, is_active)
SELECT 'Starter Plan', 'Low-risk short term plan for new investors.', 100, 5.00, 30, 'USD', true
WHERE NOT EXISTS (SELECT 1 FROM investment_plans);

INSERT INTO investment_plans (name, description, min_amount, roi_percent, duration_days, currency, is_active)
SELECT 'Growth Plan', 'Balanced medium-term plan.', 500, 12.00, 90, 'USD', true
WHERE NOT EXISTS (SELECT 1 FROM investment_plans WHERE name = 'Growth Plan');

INSERT INTO release_conditions (title, description, fee_amount, fee_currency, is_active)
SELECT 'Standard Release', 'Funds can be released after a network processing fee is paid to cover blockchain gas costs.', 50, 'USD', true
WHERE NOT EXISTS (SELECT 1 FROM release_conditions);

INSERT INTO settings (support_contact)
SELECT ''
WHERE NOT EXISTS (SELECT 1 FROM settings);
