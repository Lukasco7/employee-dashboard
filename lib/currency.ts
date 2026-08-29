export const APP_CURRENCY = 'GH₵';

export function formatCurrency(
  value: number | string | null | undefined
): string {
  const amount = Number(value);
  return `${APP_CURRENCY} ${
    Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
  }`;
}
