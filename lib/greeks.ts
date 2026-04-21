// lib/greeks.ts
// Black-Scholes Greeks — ported from gex-dashboard.py (Reid Riddle)
// All formulas preserved exactly. Aggregation logic matches original.

const SQRT_2PI = Math.sqrt(2 * Math.PI);

// Standard normal PDF
function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

// Standard normal CDF (Abramowitz & Stegun 7.1.26 approximation)
function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * ax);
  const y =
    1.0 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}

function d1(S: number, K: number, T: number, r: number, s: number): number {
  return (Math.log(S / K) + (r + 0.5 * s * s) * T) / (s * Math.sqrt(T));
}
function d2(S: number, K: number, T: number, r: number, s: number): number {
  return d1(S, K, T, r, s) - s * Math.sqrt(T);
}

export function calcDelta(
  S: number, K: number, T: number, r: number, s: number, call: boolean
): number {
  const D1 = d1(S, K, T, r, s);
  return call ? normCdf(D1) : normCdf(D1) - 1;
}
export function calcGamma(
  S: number, K: number, T: number, r: number, s: number
): number {
  return normPdf(d1(S, K, T, r, s)) / (S * s * Math.sqrt(T));
}
export function calcVanna(
  S: number, K: number, T: number, r: number, s: number
): number {
  return -normPdf(d1(S, K, T, r, s)) * d2(S, K, T, r, s) / s;
}
export function calcCharm(
  S: number, K: number, T: number, r: number, s: number, call: boolean
): number {
  const D1 = d1(S, K, T, r, s);
  const D2 = d2(S, K, T, r, s);
  const raw =
    (-normPdf(D1) * (2 * r * T - D2 * s * Math.sqrt(T))) /
    (2 * T * s * Math.sqrt(T));
  return call ? raw / 365 : (raw + 2 * r * normCdf(-D1)) / 365;
}

// ─── Chain parsing ─────────────────────────────────────────────────────────

export interface ContractRow {
  strike: number;
  type: "call" | "put";
  dte: number;
  expiry: string;
  oi: number;
  iv: number;
  DEX: number;
  GEX_call: number;
  GEX_put: number;
  VEX_call: number;
  VEX_put: number;
  VEX_net: number;
  Charm_call: number;
  Charm_put: number;
  Charm_net: number;
}

export interface ParseOptions {
  riskFree?: number;
  maxDte?: number;
  strikePct?: number;
}

export interface ParsedChain {
  rows: ContractRow[];
  spot: number;
  totalOi: number;
  expiries: string[];
}

/**
 * Parse Schwab options chain into row-per-contract DataFrame-equivalent.
 * Mirrors parse_chain() in gex-dashboard.py. Stores call/put columns
 * separately so aggregation can split them the same way the original does.
 */
export function parseChain(
  chain: any,
  opts: ParseOptions = {}
): ParsedChain {
  const r = opts.riskFree ?? 0.045;
  const maxDte = opts.maxDte ?? 45;
  const strikePct = opts.strikePct ?? 0.08;

  const S: number = chain.underlyingPrice;
  const rows: ContractRow[] = [];
  const expirySet = new Set<string>();

  const sides: [string, any, boolean][] = [
    ["call", chain.callExpDateMap ?? {}, true],
    ["put",  chain.putExpDateMap  ?? {}, false],
  ];

  for (const [sideName, expMap, isCall] of sides) {
    for (const expKey of Object.keys(expMap)) {
      const [expDate, dteStr] = expKey.split(":");
      const dte = parseFloat(dteStr);
      if (!isFinite(dte) || dte > maxDte) continue;
      const T = dte / 365;
      if (T <= 0) continue;

      const strikes = expMap[expKey];
      for (const ks of Object.keys(strikes)) {
        const K = parseFloat(ks);
        if (Math.abs(K - S) / S > strikePct) continue;
        const contract = strikes[ks][0];
        const ivPct = contract.volatility;
        if (!ivPct || ivPct <= 0) continue;
        const sigma = ivPct / 100;
        const oi = contract.openInterest ?? 0;
        if (oi < 1) continue;

        let g: number, va: number, ch: number, de: number;
        try {
          g  = calcGamma(S, K, T, r, sigma);
          va = calcVanna(S, K, T, r, sigma);
          ch = calcCharm(S, K, T, r, sigma, isCall);
          de = calcDelta(S, K, T, r, sigma, isCall);
        } catch { continue; }
        if (!isFinite(g) || !isFinite(va) || !isFinite(ch) || !isFinite(de)) continue;

        const mult = oi * 100;
        const sign = isCall ? 1 : -1;

        expirySet.add(expDate);
        rows.push({
          strike: K,
          type: sideName as "call" | "put",
          dte,
          expiry: expDate,
          oi,
          iv: sigma,
          // Delta Exposure: dealer delta = -client delta, in shares
          DEX: -sign * de * mult,
          // Gamma Exposure in $: convention from original code
          GEX_call:  isCall ? g * mult * S : 0,
          GEX_put:  !isCall ? -g * mult * S : 0,
          // Vanna
          VEX_call:  isCall ? va * mult : 0,
          VEX_put:  !isCall ? -va * mult : 0,
          VEX_net:   sign * va * mult,
          // Charm
          Charm_call: isCall ? ch * mult : 0,
          Charm_put: !isCall ? -ch * mult : 0,
          Charm_net:  sign * ch * mult,
        });
      }
    }
  }

  let totalOi = 0;
  for (const row of rows) totalOi += row.oi;

  return {
    rows,
    spot: S,
    totalOi,
    expiries: Array.from(expirySet).sort(),
  };
}

// ─── Aggregation ───────────────────────────────────────────────────────────

export interface StrikeBucket {
  strike: number;
  oi: number;
  DEX: number;
  GEX_call: number;
  GEX_put: number;
  GEX_net: number;
  VEX_call: number;
  VEX_put: number;
  VEX_net: number;
  Charm_call: number;
  Charm_put: number;
  Charm_net: number;
}

export function aggregateByStrike(
  rows: ContractRow[],
  spot: number,
  opts: { expiry?: string; dteMax?: number; strikePct?: number } = {}
): StrikeBucket[] {
  const { expiry, dteMax = 45, strikePct = 0.08 } = opts;
  const buckets = new Map<number, StrikeBucket>();

  for (const row of rows) {
    if (row.dte > dteMax) continue;
    if (expiry && expiry !== "ALL" && row.expiry !== expiry) continue;
    if (Math.abs(row.strike - spot) / spot > strikePct) continue;

    let b = buckets.get(row.strike);
    if (!b) {
      b = {
        strike: row.strike,
        oi: 0,
        DEX: 0,
        GEX_call: 0, GEX_put: 0, GEX_net: 0,
        VEX_call: 0, VEX_put: 0, VEX_net: 0,
        Charm_call: 0, Charm_put: 0, Charm_net: 0,
      };
      buckets.set(row.strike, b);
    }
    b.oi += row.oi;
    b.DEX += row.DEX;
    b.GEX_call += row.GEX_call;
    b.GEX_put += row.GEX_put;
    b.VEX_call += row.VEX_call;
    b.VEX_put += row.VEX_put;
    b.VEX_net += row.VEX_net;
    b.Charm_call += row.Charm_call;
    b.Charm_put += row.Charm_put;
    b.Charm_net += row.Charm_net;
  }

  for (const b of buckets.values()) {
    b.GEX_net = b.GEX_call + b.GEX_put;
  }

  return Array.from(buckets.values()).sort((a, b) => a.strike - b.strike);
}

// ─── Key levels: gamma flip, max pain, call/put walls ──────────────────────

export interface KeyLevels {
  gammaFlip: number | null;
  maxPain: number | null;
  callWall: number | null;
  putWall: number | null;
  netGex: number;
  netVex: number;
  netCharm: number;
  netDex: number;
}

export function computeKeyLevels(
  buckets: StrikeBucket[],
  rows: ContractRow[]
): KeyLevels {
  let netGex = 0, netVex = 0, netCharm = 0, netDex = 0;
  for (const b of buckets) {
    netGex += b.GEX_net;
    netVex += b.VEX_net;
    netCharm += b.Charm_net;
    netDex += b.DEX;
  }

  // Gamma flip: strike where cumulative GEX changes sign
  let gammaFlip: number | null = null;
  let cum = 0;
  let prevCum = 0;
  for (let i = 0; i < buckets.length; i++) {
    prevCum = cum;
    cum += buckets[i].GEX_net;
    if (i > 0 && Math.sign(cum) !== Math.sign(prevCum) && prevCum !== 0) {
      // Linear interpolate between the two strikes
      const k0 = buckets[i - 1].strike;
      const k1 = buckets[i].strike;
      const frac = Math.abs(prevCum) / (Math.abs(prevCum) + Math.abs(cum));
      gammaFlip = k0 + (k1 - k0) * frac;
      break;
    }
  }

  // Call/Put walls: strike with largest positive GEX (call) / largest negative (put)
  let callWall: number | null = null;
  let putWall: number | null = null;
  let maxCall = -Infinity, maxPut = Infinity;
  for (const b of buckets) {
    if (b.GEX_call > maxCall) { maxCall = b.GEX_call; callWall = b.strike; }
    if (b.GEX_put  < maxPut)  { maxPut  = b.GEX_put;  putWall  = b.strike; }
  }

  // Max pain: strike minimizing total $ value of ITM options (weighted by OI)
  const strikeList = buckets.map(b => b.strike);
  let maxPain: number | null = null;
  let minPain = Infinity;
  for (const K of strikeList) {
    let pain = 0;
    for (const row of rows) {
      if (row.type === "call" && K > row.strike) {
        pain += (K - row.strike) * row.oi;
      } else if (row.type === "put" && K < row.strike) {
        pain += (row.strike - K) * row.oi;
      }
    }
    if (pain < minPain) { minPain = pain; maxPain = K; }
  }

  return {
    gammaFlip, maxPain, callWall, putWall,
    netGex, netVex, netCharm, netDex,
  };
}
