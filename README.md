# Crypto Wallet TMA

A Telegram Mini App that works like a managed crypto wallet. Balances (BTC/ETH/USD) are set manually
by an admin, while the app shows live USD portfolio value using real-time CoinGecko prices. Users
authenticate through Telegram WebApp `initData` (HMAC-SHA256 validated) and share their phone number
on first open.

## Tech Stack

- Next.js 14 (App Router)
- Neon serverless Postgres (`@neondatabase/serverless`)
- Tailwind CSS
- `@telegram-apps/sdk-react` / Telegram WebApp JS bridge
- Telegraf (Telegram bot)
- Vercel deployment
- CoinGecko free API for live BTC/ETH prices

## 1. Create your Telegram bot

1. Open a chat with [@BotFather](https://t.me/BotFather) in Telegram.
2. Run `/newbot` and follow the prompts to create your bot.
3. Copy the bot token — this is your `BOT_TOKEN`.
4. Note your bot's username — this is `NEXT_PUBLIC_BOT_USERNAME` (without the `@`).

## 2. Set up Neon Postgres

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the pooled connection string — this is your `DATABASE_URL`.
3. Run the schema against your database:

   ```bash
   psql "$DATABASE_URL" -f lib/schema.sql
   ```

   Or paste the contents of `lib/schema.sql` into the Neon SQL editor and run it. This creates all
   tables (`users`, `balances`, `transactions`, `investment_plans`, `investments`,
   `withdrawal_requests`, `user_documents`) and seeds two default investment plans. The release fee
   shown to each user (title, note, amount, currency) is configured per user by an admin — there's
   no platform-wide release fee.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `BOT_TOKEN` | Token from BotFather |
| `ADMIN_PASSWORD` | Password used to log into `/admin` |
| `SESSION_SECRET` | Random secret used to sign user session JWTs |
| `NEXTAUTH_SECRET` | Fallback secret (used if `SESSION_SECRET` is unset) |
| `NEXT_PUBLIC_BOT_USERNAME` | Your bot's username, used for the "Contact Support" link |
| `NEXT_PUBLIC_BTC_ADDRESS` | (Optional) static BTC deposit address shown on the Deposit page |
| `NEXT_PUBLIC_ETH_ADDRESS` | (Optional) static ETH deposit address shown on the Deposit page |
| `NEXT_PUBLIC_APP_URL` | Your deployed Vercel URL, used by the bot script's "Open Wallet" button |

Generate strong secrets, e.g.:

```bash
openssl rand -base64 32
```

## 4. Install dependencies and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Note: the Telegram auth flow requires the app to
actually be opened from inside Telegram (via the bot's menu button or a Mini App link), since it reads
`window.Telegram.WebApp.initData`. Outside of Telegram, the app will show an "Open in Telegram" screen.

To run the bot locally (for local testing of `/start`, `/wallet`, `/support`):

```bash
npm run bot
```

## 5. Deploy to Vercel

1. Push this project to a Git repository.
2. Import it into [Vercel](https://vercel.com/new).
3. Add all the environment variables from step 3 in the Vercel project settings.
4. Deploy. Note your production URL (e.g. `https://your-app.vercel.app`).
5. Set `NEXT_PUBLIC_APP_URL` to that URL and redeploy (or set it before the first deploy).

The bot itself (`bot/index.ts`) is a long-running polling process and is not deployed to Vercel's
serverless functions — run it on a small always-on host (e.g. a VPS, Railway, Fly.io) with
`npm run bot`, or adapt it to a webhook-based Vercel API route if you prefer serverless.

## 6. Configure the bot's menu button

1. In BotFather, run `/mybots` and select your bot.
2. Go to **Bot Settings → Menu Button → Configure Menu Button**.
3. Set the URL to your Vercel domain (e.g. `https://your-app.vercel.app`).
4. Optionally set a title like "Open Wallet".

Now opening your bot in Telegram and tapping the menu button (or the "Open Wallet" inline button from
`/start`) launches the Mini App.

## Project structure

```
/app
  /page.tsx                      redirects to /wallet or /auth
  /auth/page.tsx                 Telegram auth + phone connect flow
  /wallet/page.tsx                main dashboard
  /wallet/deposit/page.tsx        BTC/ETH deposit addresses + QR codes
  /wallet/withdraw/page.tsx       withdrawal request form + history
  /wallet/invest/page.tsx         investment plans + user investments
  /wallet/release/page.tsx        per-user release fee + contact support
  /wallet/history/page.tsx        paginated, filterable transaction history
  /wallet/profile/page.tsx        user profile + logout
  /admin/page.tsx                 admin login
  /admin/dashboard/page.tsx       stats + user list/search
  /admin/users/[id]/page.tsx      edit balances, view activity, add notes
  /admin/withdrawals/page.tsx     approve/reject withdrawal requests
  /admin/plans/page.tsx           manage investment plans
  /admin/release/page.tsx         manage release fund conditions
/app/api                         route handlers backing all pages above
/lib
  /db.ts                          Neon client + row types
  /auth.ts                        initData HMAC validation + session helpers
  /prices.ts                      CoinGecko fetch with 60s in-memory cache
  /schema.sql                     full database schema
/bot/index.ts                     Telegraf bot (menu button, /start, /support)
```

## Admin panel

Go to `/admin`, sign in with `ADMIN_PASSWORD`. From there you can:

- View total users, BTC/ETH under management, and pending withdrawal count.
- Search and click into any user to edit their BTC/ETH/USD balances directly, add manual notes, and
  view their transactions, investments, and withdrawal requests.
- Approve or reject withdrawal requests (approving deducts the balance and logs a completed
  transaction; rejecting logs a rejected transaction without touching the balance).
- Create, edit, and deactivate investment plans.
- Create, edit, and deactivate release fund conditions.

## Notes

- Deposits are always confirmed manually by an admin adjusting the user's balance — there is no
  on-chain deposit detection.
- Withdrawals are requested by the user and must be approved or rejected by an admin before any
  balance changes take effect.
- Prices are cached in-memory for 60 seconds per server instance to stay within CoinGecko's free tier
  rate limits.
