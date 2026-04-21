// lib/schwab-api.ts
const BASE = "https://api.schwabapi.com/marketdata/v1";

export async function fetchSpot(token: string, symbol: string): Promise<number | null> {
  const resp = await fetch(`${BASE}/quotes?symbols=${encodeURIComponent(symbol)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const entry = data[symbol];
  if (!entry) return null;
  return (
    entry.quote?.lastPrice ??
    entry.quote?.mark ??
    entry.regular?.regularMarketLastPrice ??
    null
  );
}

export async function fetchVix(token: string) {
  const resp = await fetch(`${BASE}/quotes?symbols=%24VIX`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const entry = data["$VIX"];
  if (!entry) return null;
  const last = entry.quote?.lastPrice ?? entry.quote?.mark;
  const prev = entry.quote?.closePrice;
  if (last == null) return null;
  const change = prev != null ? last - prev : 0;
  const changePct = prev ? (change / prev) * 100 : 0;
  return { last, change, changePct };
}

export async function fetchChain(
  token: string,
  symbol: string,
  spot: number,
  opts: { maxDte?: number; strikePct?: number } = {}
) {
  const maxDte = opts.maxDte ?? 45;
  const strikePct = opts.strikePct ?? 0.08;
  const today = new Date();
  const toDate = new Date(today.getTime() + maxDte * 86400_000);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const params = new URLSearchParams({
    symbol,
    contractType: "ALL",
    includeQuotes: "TRUE",
    optionType: "ALL",
    range: "ALL",
    fromDate: fmt(today),
    toDate: fmt(toDate),
    strikePriceAbove: (spot * (1 - strikePct)).toFixed(2),
    strikePriceBelow: (spot * (1 + strikePct)).toFixed(2),
  });

  // Retry on 429/5xx up to 3x
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await fetch(`${BASE}/chains?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (resp.ok) return resp.json();
    if ([429, 502, 503, 504].includes(resp.status) && attempt < 2) {
      await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
      continue;
    }
    const text = await resp.text();
    throw new Error(`Chain fetch failed ${resp.status}: ${text.slice(0, 200)}`);
  }
  throw new Error("Chain fetch exhausted retries");
}
