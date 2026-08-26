import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const sql = neon(process.env.DATABASE_URL);

export type DbUser = {
  id: number;
  telegram_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_admin: boolean;
  release_paid: boolean;
  assigned_admin_id: number | null;
  support_contact: string | null;
  btc_address: string | null;
  eth_address: string | null;
  created_at: string;
};

export type DbSettings = {
  id: number;
  support_contact: string | null;
  btc_address: string | null;
  eth_address: string | null;
  updated_at: string;
};

export type DbBalance = {
  id: number;
  user_id: number;
  btc_amount: string;
  eth_amount: string;
  usd_cash: string;
  updated_at: string;
};

export type DbTransaction = {
  id: number;
  user_id: number;
  type: string;
  amount: string;
  currency: string;
  status: string;
  note: string | null;
  created_at: string;
};

export type DbInvestmentPlan = {
  id: number;
  name: string;
  description: string | null;
  min_amount: string;
  roi_percent: string;
  duration_days: number;
  currency: string;
  is_active: boolean;
};

export type DbInvestment = {
  id: number;
  user_id: number;
  plan_id: number;
  amount: string;
  currency: string;
  status: string;
  started_at: string;
  matures_at: string | null;
};

export type DbWithdrawalRequest = {
  id: number;
  user_id: number;
  amount: string;
  currency: string;
  wallet_address: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

export type DbReleaseCondition = {
  id: number;
  title: string;
  description: string | null;
  fee_amount: string;
  fee_currency: string;
  is_active: boolean;
};
