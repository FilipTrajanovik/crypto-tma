export type DiscountType = "percent" | "fixed";

export type DiscountedFee = {
  originalAmount: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  finalAmount: number;
  savings: number;
};

/**
 * Applies an admin-configured discount to a release fee. "percent" takes a
 * value like 20 to mean 20% off; "fixed" subtracts the value directly. The
 * result never goes below 0.
 */
export function computeDiscountedFee(
  amount: number,
  discountType: DiscountType | null | undefined,
  discountValue: number | null | undefined
): DiscountedFee {
  const originalAmount = amount;
  if (!discountType || !discountValue || discountValue <= 0) {
    return { originalAmount, discountType: null, discountValue: null, finalAmount: originalAmount, savings: 0 };
  }

  const rawFinal = discountType === "percent" ? originalAmount - originalAmount * (discountValue / 100) : originalAmount - discountValue;
  const finalAmount = Math.max(0, Math.round(rawFinal * 100) / 100);

  return {
    originalAmount,
    discountType,
    discountValue,
    finalAmount,
    savings: Math.round((originalAmount - finalAmount) * 100) / 100,
  };
}
