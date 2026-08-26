import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { validateTelegramInitData, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const initData: string = body?.initData;

    if (!initData || typeof initData !== "string") {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 });
    }

    const parsed = validateTelegramInitData(initData);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid initData" }, { status: 401 });
    }

    const { user } = parsed;

    const rows = await sql`
      INSERT INTO users (telegram_id, first_name, last_name, username, avatar_url)
      VALUES (${user.id}, ${user.first_name ?? null}, ${user.last_name ?? null}, ${user.username ?? null}, ${user.photo_url ?? null})
      ON CONFLICT (telegram_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url
      RETURNING id, telegram_id, first_name, last_name, username, phone, avatar_url, is_active, created_at
    `;

    const dbUser = rows[0];

    const existingBalance = await sql`SELECT id FROM balances WHERE user_id = ${dbUser.id} LIMIT 1`;
    if (existingBalance.length === 0) {
      await sql`INSERT INTO balances (user_id, btc_amount, eth_amount, usd_cash) VALUES (${dbUser.id}, 0, 0, 0)`;
    }

    const token = createSessionToken({ userId: dbUser.id, telegramId: Number(dbUser.telegram_id) });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: dbUser.id,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        username: dbUser.username,
        phone: dbUser.phone,
        avatarUrl: dbUser.avatar_url,
        needsPhone: !dbUser.phone,
      },
    });
  } catch (err) {
    console.error("Telegram auth error:", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
