export type DiscountLine = { type: string; totalAmount: number }

export function sumOrderDiscounts(lines: DiscountLine[]): number {
  const cents = lines
    .filter(line => line.type === 'DISCOUNT' && line.totalAmount < 0)
    .reduce((total, line) => total + Math.round(Math.abs(line.totalAmount) * 100), 0)
  return cents / 100
}
