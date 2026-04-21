// lib/demo-data.ts
// Synthetic Schwab-format options chain for demo mode (no API creds required).
// Shape matches what Schwab /chains returns so parseChain() works unchanged.

const PROFILES: Record<string, { spot: number; baseOi: number }> = {
  SPY:  { spot: 706.26, baseOi: 8000 },
  QQQ:  { spot: 611.50, baseOi: 5500 },
  DIA:  { spot: 479.40, baseOi: 800  },
  IWM:  { spot: 245.30, baseOi: 1200 },
  AAPL: { spot: 232.15, baseOi: 4500 },
  NVDA: { spot: 178.90, baseOi: 7000 },
  TSLA: { spot: 418.70, baseOi: 6200 },
  META: { spot: 695.40, baseOi: 2100 },
};

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function daysFromNow(offset: number): { dateStr: string; dte: number } {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return { dateStr: d.toISOString().split("T")[0], dte: offset };
}

export function buildDemoChain(symbol: string): any {
  const profile = PROFILES[symbol] ?? PROFILES.SPY;
  const S = profile.spot;
  const rand = seedRandom(symbol.charCodeAt(0) * 7919);

  // Strikes: $1 increments within ±4%
  const step = symbol === "SPY" || symbol === "QQQ" || symbol === "META" ? 1 : 2.5;
  const strikes: number[] = [];
  const lo = S * 0.96, hi = S * 1.04;
  for (let k = Math.floor(lo / step) * step; k <= hi; k += step) {
    strikes.push(Math.round(k * 100) / 100);
  }

  // Expiries: 0, 1, 3, 7, 14, 21, 30, 45 DTE
  const expirySchedule = [0, 1, 3, 7, 14, 21, 30, 45];

  const callExpDateMap: any = {};
  const putExpDateMap: any  = {};

  for (const offset of expirySchedule) {
    const { dateStr, dte } = daysFromNow(offset);
    const key = `${dateStr}:${dte}`;
    callExpDateMap[key] = {};
    putExpDateMap[key] = {};

    for (const K of strikes) {
      const moneyness = (K - S) / S;
      // Volatility skew: puts higher, concave smile
      const baseIv = 0.16 + 0.08 * Math.abs(moneyness) * 6 + 0.02 * rand();
      const callIv = (baseIv - 0.02 * moneyness) * 100;
      const putIv  = (baseIv + 0.04 * moneyness * -1 + 0.01) * 100;

      // OI concentration: peaks at round strikes near spot
      const distScore = Math.exp(-Math.pow(moneyness * 25, 2));
      const roundBonus = K % 5 === 0 ? 1.6 : 1.0;
      const dteBonus = offset === 0 ? 1.8 : offset <= 7 ? 1.3 : offset <= 21 ? 1.0 : 0.6;
      const callOi = Math.floor(profile.baseOi * distScore * roundBonus * dteBonus * (0.5 + rand()));
      const putOi  = Math.floor(profile.baseOi * distScore * roundBonus * dteBonus * (0.5 + rand()) * 1.15);

      callExpDateMap[key][K.toFixed(2)] = [{
        volatility: callIv,
        openInterest: callOi,
        strikePrice: K,
      }];
      putExpDateMap[key][K.toFixed(2)] = [{
        volatility: putIv,
        openInterest: putOi,
        strikePrice: K,
      }];
    }
  }

  return {
    symbol,
    underlyingPrice: S,
    callExpDateMap,
    putExpDateMap,
    _demo: true,
  };
}

export function buildDemoVix() {
  return { last: 18.50, change: 0, changePct: 0, _demo: true };
}
