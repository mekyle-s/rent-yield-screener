// Deterministic thousands-separator formatting for display. No Intl/toLocaleString
// (repo convention — zero uses across src/; output must not vary by build locale).
export function formatInt(n: number): string {
  const rounded = Math.round(Math.abs(n));
  const sign = n < 0 ? "-" : "";
  return sign + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
