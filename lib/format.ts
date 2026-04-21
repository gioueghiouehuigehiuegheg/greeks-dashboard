// lib/format.ts
export function fmtK(n: number, digits = 1): string {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1e9).toFixed(digits) + "B";
  if (abs >= 1_000_000)     return (n / 1e6).toFixed(digits) + "M";
  if (abs >= 1_000)         return (n / 1e3).toFixed(digits) + "K";
  return n.toFixed(0);
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(n: number, digits = 2): string {
  const sign = n > 0 ? "+" : "";
  return sign + n.toFixed(digits) + "%";
}

export function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return "—"; }
}
