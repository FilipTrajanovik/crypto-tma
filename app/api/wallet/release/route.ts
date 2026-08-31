import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSupportContactForUser } from "@/lib/support";
import { computeDiscountedFee } from "@/lib/fee";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [userRows, supportContact] = await Promise.all([
    sql`
      SELECT release_fee_title, release_fee_note, release_fee_amount, release_fee_currency,
             release_fee_discount_type, release_fee_discount_value, release_paid, release_deadline
      FROM users WHERE id = ${session.userId}
    `,
    getSupportContactForUser(session.userId),
  ]);

  const user = userRows[0];
  const fee =
    user?.release_fee_amount != null
      ? (() => {
          const discounted = computeDiscountedFee(
            Number(user.release_fee_amount),
            user.release_fee_discount_type,
            user.release_fee_discount_value != null ? Number(user.release_fee_discount_value) : null
          );
          return {
            title: user.release_fee_title || "Release Fee",
            note: user.release_fee_note,
            currency: user.release_fee_currency || "USD",
            amount: discounted.finalAmount,
            originalAmount: discounted.originalAmount,
            discountType: discounted.discountType,
            discountValue: discounted.discountValue,
            savings: discounted.savings,
          };
        })()
      : null;

  return NextResponse.json({
    fee,
    releasePaid: user?.release_paid === true,
    releaseDeadline: user?.release_deadline ?? null,
    supportContact,
  });
}
