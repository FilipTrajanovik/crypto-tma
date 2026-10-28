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
-- NULL = unrestricted super-admin; otherwise a JSON array of permission keys (see lib/permissions.ts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;
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
ALTER TABLE users ADD COLUMN IF NOT EXISTS release_payment_link TEXT; -- per-client override
-- Per-client withdrawal fee, set by the admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_fee_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_fee_value DECIMAL(18,8);


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

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(18,8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  wallet_address TEXT,
  fee_type TEXT, -- fixed (USD) or percent, copied from settings when created
  fee_value DECIMAL(18,8),
  fee_amount DECIMAL(18,8) NOT NULL DEFAULT 0, -- in the withdrawal currency, deducted from the amount
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
  withdrawal_fee_type TEXT, -- fixed (USD) or percent; NULL = no fee
  withdrawal_fee_value DECIMAL(18,8),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balances_user_id ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_assigned_admin_id ON users(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);


INSERT INTO release_conditions (title, description, fee_amount, fee_currency, is_active)
SELECT 'Standard Release', 'Funds can be released after a network processing fee is paid to cover blockchain gas costs.', 50, 'USD', true
WHERE NOT EXISTS (SELECT 1 FROM release_conditions);

INSERT INTO settings (support_contact)
SELECT ''
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Audit trail of admin actions (also created on demand by lib/admin-log.ts).
CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL, -- owner, super_admin, admin
  action TEXT NOT NULL,
  target_user_id INTEGER,
  target_name TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_actor ON admin_logs(actor_user_id);

-- Shop (also created on demand by lib/shop.ts). Prices are USD; there is no stock.
CREATE TABLE IF NOT EXISTS shop_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(18,2) NOT NULL,
  image_mime TEXT,
  image_data TEXT, -- base64-encoded photo
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  list_price DECIMAL(18,2) NOT NULL, -- product price when ordered
  price DECIMAL(18,2) NOT NULL, -- what this customer pays, admin can change it
  status TEXT NOT NULL DEFAULT 'pending', -- pending, awaiting_payment, paid, cancelled
  pay_currency TEXT, -- BTC or ETH, set when the admin requests payment
  pay_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS product_description TEXT; -- copied from the product when ordered
CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id ON shop_orders(user_id);
