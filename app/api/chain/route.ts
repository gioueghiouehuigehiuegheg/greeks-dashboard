import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/schwab-auth";
import { fetchSpot, fetchChain, fetchVix } from "@/lib/schwab-api";
import { parseChain, aggregateByStrike, computeKeyLevels } from "@/lib/greeks";
import { buildDemoChain, buildDemoVix } from "@/lib/demo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Valid tickers - add more as needed
const ALLOWED = new Set([
  "SPY", "QQQ", "DIA", "IWM",
  "AAPL", "NVDA", "TSLA", "META", "MSFT", "GOOGL", "AMZN",
]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = (sp.get("symbol") ?? "SPY").toUpperCase();
  const expiry = sp.get("expiry") ?? "ALL";
  const dteMax = parseInt(sp.get("dte") ?? "45", 10);
  const strikePct = parseFloat(sp.get("strikePct") ?? "0.05");
  const forceDemo = sp.get("demo") === "1";

  if (!ALLOWED.has(symbol)) {
    return NextResponse.json({ error: `Symbol ${symbol} not allowed` }, { status: 400 });
  }

  const hasCreds = !!process.env.SCHWAB_CLIENT_ID && !!process.env.SCHWAB_CLIENT_SECRET;
  const useDemo = forceDemo || !hasCreds;

  try {
    let chain: any;
    let spot: number;
    let vix: any;
    let demoMode = false;
    let authStatus: "ok" | "required" | "demo" = "ok";

    if (useDemo) {
      chain = buildDemoChain(symbol);
      spot = chain.underlyingPrice;
      vix = buildDemoVix();
      demoMode = true;
      authStatus = "demo";
    } else {
      try {
        const token = await getValidAccessToken();
        const [spotVal, vixVal] = await Promise.all([
          fetchSpot(token, symbol),
          fetchVix(token).catch(() => null),
        ]);
        if (spotVal == null) throw new Error(`No spot for ${symbol}`);
        spot = spotVal;
        vix = vixVal;
        chain = await fetchChain(token, symbol, spot, { maxDte: 45, strikePct: 0.08 });
      } catch (e: any) {
        const msg = e.message || "";
        if (msg.startsWith("NOT_AUTHENTICATED") || msg.startsWith("REFRESH_EXPIRED")) {
          // Fall back to demo so the UI still renders, surface auth flag to client
          chain = buildDemoChain(symbol);
          spot = chain.underlyingPrice;
          vix = buildDemoVix();
          demoMode = true;
          authStatus = "required";
        } else {
          throw e;
        }
      }
    }

    const parsed = parseChain(chain, { riskFree: 0.045, maxDte: 45, strikePct: 0.08 });
    const buckets = aggregateByStrike(parsed.rows, parsed.spot, {
      expiry,
      dteMax,
      strikePct,
    });
    const levels = computeKeyLevels(buckets, parsed.rows.filter(r => {
      if (expiry && expiry !== "ALL" && r.expiry !== expiry) return false;
      if (r.dte > dteMax) return false;
      return true;
    }));

    return NextResponse.json({
      symbol,
      spot: parsed.spot,
      totalOi: parsed.totalOi,
      expiries: parsed.expiries,
      buckets,
      levels,
      vix,
      demoMode,
      authStatus,
      fetchedAt: new Date().toISOString(),
      filter: { expiry, dteMax, strikePct },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Chain request failed", detail: e.message ?? String(e) },
      { status: 500 }
    );
  }
}
