import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity, can, canManageAdmins } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-log";
import { sendTelegramMessage } from "@/lib/telegram";
import { validPaymentLink, parseFee, ensureFeeColumns } from "@/lib/withdrawal-fee";
import { computeDiscountedFee } from "@/lib/fee";

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
           release_fee_title, release_fee_note, release_fee_amount, release_fee_currency,
           release_fee_discount_type, release_fee_discount_value, release_payment_link, withdrawal_fee_type, withdrawal_fee_value, release_deadline, created_at
    FROM users WHERE id = ${userId}
  `;
  if (userRows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const target = userRows[0];
  if (!identity.isSuperAdmin && target.assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this user" }, { status: 403 });
  }

  const [balanceRows, transactionRows, withdrawalRows] = await Promise.all([
    sql`SELECT btc_amount, eth_amount, usd_cash, gold_amount, updated_at FROM balances WHERE user_id = ${userId}`,
    sql`SELECT id, type, amount, currency, status, note, created_at FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`,
    sql`SELECT id, amount, currency, wallet_address, status, admin_note, created_at FROM withdrawal_requests WHERE user_id = ${userId} ORDER BY created_at DESC`,
  ]);

  return NextResponse.json({
    user: target,
    balance: balanceRows[0] ?? { btc_amount: "0", eth_amount: "0", usd_cash: "0", gold_amount: "0" },
    transactions: transactionRows,
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

  const ownerCheck = await sql`
    SELECT assigned_admin_id, release_fee_amount, release_fee_currency, release_fee_discount_type, release_fee_discount_value
    FROM users WHERE id = ${userId}
  `;
  if (ownerCheck.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!can(identity, "edit_users") && ownerCheck[0].assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this user" }, { status: 403 });
  }
  const existingFee = ownerCheck[0];

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
    releaseFeeDiscountType,
    releaseFeeDiscountValue,
    releasePaymentLink,
    withdrawalFeeType,
    withdrawalFeeValue,
    releaseDeadline,
    btcAmount,
    ethAmount,
    usdCash,
    goldAmount,
    note,
  } = body;

  // Only a super-admin can grant or revoke plain admin access...
  const adminChange = can(identity, "edit_users") ? makeAdmin : undefined;
  // ...and only the owner or an unrestricted super-admin can grant or revoke super-admin status (never on themselves).
  const superAdminChange = canManageAdmins(identity) && identity.userId !== userId ? makeSuperAdmin : undefined;

  // Only a super-admin can directly (re)assign or unassign a user's claiming admin.
  let assignedAdminChange: number | null | undefined = undefined;
  if (can(identity, "edit_users") && assignedAdminId !== undefined) {
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

  if (releasePaymentLink !== undefined && releasePaymentLink !== null) {
    const valid = validPaymentLink(releasePaymentLink);
    if (!valid) {
      return NextResponse.json({ error: "Payment link must be a valid http(s) URL" }, { status: 400 });
    }
  }

  let withdrawalFee: ReturnType<typeof parseFee> | null = null;
  if (withdrawalFeeType !== undefined) {
    withdrawalFee = parseFee(withdrawalFeeType, withdrawalFeeValue);
    if (!withdrawalFee.ok) return NextResponse.json({ error: withdrawalFee.error }, { status: 400 });
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
    releaseFeeDiscountType !== undefined ||
    releaseFeeDiscountValue !== undefined ||
    releasePaymentLink !== undefined ||
    withdrawalFeeType !== undefined ||
    releaseDeadline !== undefined ||
    assignedAdminChange !== undefined
  ) {
    // New super-admins start with no extra rights (granted on the Admins page); demotion clears them.
    if (withdrawalFee) await ensureFeeColumns();
    if (superAdminChange === true) {
      await sql`UPDATE users SET permissions = '[]'::jsonb WHERE id = ${userId} AND is_super_admin = false`;
    } else if (superAdminChange === false) {
      await sql`UPDATE users SET permissions = NULL WHERE id = ${userId}`;
    }
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
        release_fee_discount_type = CASE WHEN ${releaseFeeDiscountType !== undefined} THEN ${releaseFeeDiscountType ?? null} ELSE release_fee_discount_type END,
        release_fee_discount_value = CASE WHEN ${releaseFeeDiscountValue !== undefined} THEN ${releaseFeeDiscountValue ?? null} ELSE release_fee_discount_value END,
        release_payment_link = CASE WHEN ${releasePaymentLink !== undefined} THEN ${releasePaymentLink ?? null} ELSE release_payment_link END,
        withdrawal_fee_type = CASE WHEN ${withdrawalFee !== null} THEN ${withdrawalFee?.ok ? withdrawalFee.config.type : null} ELSE withdrawal_fee_type END,
        withdrawal_fee_value = CASE WHEN ${withdrawalFee !== null} THEN ${withdrawalFee?.ok && withdrawalFee.config.type ? withdrawalFee.config.value : null} ELSE withdrawal_fee_value END,
        release_deadline = CASE WHEN ${releaseDeadline !== undefined} THEN ${releaseDeadline ?? null} ELSE release_deadline END,
        assigned_admin_id = CASE WHEN ${assignedAdminChange !== undefined} THEN ${assignedAdminChange ?? null} ELSE assigned_admin_id END
      WHERE id = ${userId}
    `;

    const logs: [string, string?][] = [];
    if (firstName !== undefined || lastName !== undefined || phone !== undefined) logs.push(["Edited profile details"]);
    if (isActive !== undefined) logs.push([isActive ? "Reactivated the account" : "Deactivated the account"]);
    if (adminChange !== undefined) logs.push([adminChange ? "Added an admin" : "Removed an admin"]);
    if (superAdminChange !== undefined) logs.push([superAdminChange ? "Made a super admin" : "Removed super admin access"]);
    if (releasePaid !== undefined) logs.push([releasePaid ? "Marked release fee as paid" : "Marked release fee as unpaid"]);
    if (supportContact !== undefined || btcAddress !== undefined || ethAddress !== undefined) logs.push(["Updated deposit addresses or support contact"]);
    if (
      releaseFeeTitle !== undefined ||
      releaseFeeNote !== undefined ||
      releaseFeeAmount !== undefined ||
      releaseFeeCurrency !== undefined ||
      releaseFeeDiscountType !== undefined ||
      releaseFeeDiscountValue !== undefined
    ) {
      logs.push([
        releaseFeeAmount === null ? "Cleared the release fee" : "Updated the release fee",
        releaseFeeAmount ? `${releaseFeeAmount} ${releaseFeeCurrency || "USD"}` : undefined,
      ]);
    }
    if (releasePaymentLink !== undefined) {
      logs.push([releasePaymentLink === null ? "Removed the release payment link" : "Set the release payment link", releasePaymentLink ?? undefined]);
    }
    if (withdrawalFee?.ok) {
      const c = withdrawalFee.config;
      logs.push(["Set the withdrawal fee", c.type ? (c.type === "percent" ? `${c.value}%` : `$${c.value}`) : "none"]);
    }
    if (releaseDeadline !== undefined) {
      logs.push([releaseDeadline === null ? "Cleared the release deadline" : "Set the release deadline", releaseDeadline ? new Date(releaseDeadline).toISOString() : undefined]);
    }
    if (assignedAdminChange !== undefined) logs.push([assignedAdminChange === null ? "Unassigned the client" : "Reassigned the client"]);
    for (const [action, details] of logs) await logAdminAction(identity, action, { targetUserId: userId, details });

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
      notifications.push("Your release fee has been confirmed. Withdrawals are now unlocked.");
    }
    if (releaseFeeAmount !== undefined && releaseFeeAmount !== null) {
      notifications.push(
        `A release fee of ${releaseFeeAmount} ${releaseFeeCurrency || "USD"} has been set on your account. Check the Release Funds page for details.`
      );
    }
    if (releaseFeeDiscountType !== undefined || releaseFeeDiscountValue !== undefined) {
      const effectiveAmount = releaseFeeAmount !== undefined ? Number(releaseFeeAmount) : Number(existingFee.release_fee_amount ?? 0);
      const effectiveCurrency = releaseFeeCurrency !== undefined ? releaseFeeCurrency || "USD" : existingFee.release_fee_currency || "USD";
      const effectiveType = releaseFeeDiscountType !== undefined ? releaseFeeDiscountType : existingFee.release_fee_discount_type;
      const effectiveValue = releaseFeeDiscountValue !== undefined ? releaseFeeDiscountValue : existingFee.release_fee_discount_value;
      if (effectiveType && effectiveValue && effectiveAmount) {
        const { finalAmount } = computeDiscountedFee(effectiveAmount, effectiveType, Number(effectiveValue));
        const discountLabel = effectiveType === "percent" ? `${effectiveValue}% off` : `${effectiveValue} ${effectiveCurrency} off`;
        notifications.push(
          `A discount has been applied to your release fee: ${discountLabel}. Original fee ${effectiveAmount} ${effectiveCurrency}, new fee ${finalAmount} ${effectiveCurrency}. Check the Release Funds page for details.`
        );
      }
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
    await logAdminAction(identity, "Updated balances", {
      targetUserId: userId,
      details: `BTC ${Number(existing[0]?.btc_amount ?? 0)} → ${newBtc}, ETH ${Number(existing[0]?.eth_amount ?? 0)} → ${newEth}, Gold ${Number(existing[0]?.gold_amount ?? 0)} → ${newGold}, Cash ${Number(existing[0]?.usd_cash ?? 0)} → ${newUsd}`,
    });

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
  if (!can(identity, "delete_users")) {
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

  await logAdminAction(identity, "Deleted a client", { targetUserId: userId });
  await sql`UPDATE users SET assigned_admin_id = NULL WHERE assigned_admin_id = ${userId}`;
  await sql`DELETE FROM user_documents WHERE user_id = ${userId} OR uploaded_by_admin_id = ${userId}`;
  await sql`DELETE FROM transactions WHERE user_id = ${userId}`;
  await sql`DELETE FROM withdrawal_requests WHERE user_id = ${userId}`;
  await sql`DELETE FROM balances WHERE user_id = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;

  return NextResponse.json({ success: true });
}
