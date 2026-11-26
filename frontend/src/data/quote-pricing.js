export function moneyCents(amount) {
  const [whole, fraction = ""] = String(amount).split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function allocatedPriceCents(fullPrice, quantity, requestedQuantity) {
  const divisor = BigInt(requestedQuantity);
  const numerator = moneyCents(fullPrice) * BigInt(quantity);
  return (numerator * 2n + divisor) / (2n * divisor);
}

export function decimalFromCents(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}
