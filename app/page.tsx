"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import ControlBar from "@/components/ControlBar";
import GexChart from "@/components/GexChart";
import BarChartPanel from "@/components/BarChartPanel";
import LineChartPanel from "@/components/LineChartPanel";
import StatsFooter from "@/components/StatsFooter";
import type { StrikeBucket, KeyLevels } from "@/lib/greeks";

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

interface ChainResponse {
  symbol: string;
  spot: number;
  totalOi: number;
  expiries: string[];
  buckets: StrikeBucket[];
  levels: KeyLevels;
  vix: any;
  demoMode: boolean;
  authStatus: "ok" | "required" | "demo";
  fetchedAt: string;
}

export default function Page() {
  const [symbol, setSymbol] = useState("SPY");
  const [expiry, setExpiry] = useState("ALL");
  const [dteMax, setDteMax] = useState(45);
  const [strikePct, setStrikePct] = useState(0.05);

  const [data, setData] = useState<ChainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_MS / 1000);

  const lastFetchRef = useRef<number>(0);

  const fetchChain = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        symbol,
        expiry,
        dte: String(dteMax),
        strikePct: String(strikePct),
      });
      const resp = await fetch(`/api/chain?${params.toString()}`, { cache: "no-store" });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${resp.status}`);
      }
      const json: ChainResponse = await resp.json();
      setData(json);
      lastFetchRef.current = Date.now();
      setSecondsLeft(REFRESH_MS / 1000);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [symbol, expiry, dteMax, strikePct]);

  // Refetch on any filter change
  useEffect(() => { fetchChain(); }, [fetchChain]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const iv = setInterval(() => { fetchChain(); }, REFRESH_MS);
    return () => clearInterval(iv);
  }, [fetchChain]);

  // Countdown timer (1 Hz)
  useEffect(() => {
    const iv = setInterval(() => {
      if (lastFetchRef.current === 0) return;
      const elapsed = (Date.now() - lastFetchRef.current) / 1000;
      setSecondsLeft(Math.max(0, REFRESH_MS / 1000 - elapsed));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // If selected expiry is no longer in the new list (ticker change), reset to ALL
  useEffect(() => {
    if (!data) return;
    if (expiry !== "ALL" && !data.expiries.includes(expiry)) {
      setExpiry("ALL");
    }
  }, [data, expiry]);

  return (
    <main className="min-h-screen p-4 lg:p-5 max-w-[1800px] mx-auto">
      <ControlBar
        symbol={symbol}
        setSymbol={setSymbol}
        expiry={expiry}
        setExpiry={setExpiry}
        dteMax={dteMax}
        setDteMax={setDteMax}
        strikePct={strikePct}
        setStrikePct={setStrikePct}
        expiries={data?.expiries ?? []}
        spot={data?.spot ?? 0}
        vix={data?.vix}
        fetchedAt={data?.fetchedAt ?? ""}
        secondsUntilRefresh={secondsLeft}
        loading={loading}
        demoMode={data?.demoMode ?? false}
        authStatus={data?.authStatus ?? "demo"}
      />

      {error && (
        <div className="mb-4 border border-neg/40 bg-neg/10 rounded-xl p-3 font-mono text-xs text-neg">
          {error}
        </div>
      )}

      {!data ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/*
            Layout:
              Row 1 (tall):  GEX (horizontal bars) | DEX (bars top) / VEX (bars bottom)
              Row 2 (short): Vanna (line curves)   | Charm (line curves)
          */}

          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 mb-4" style={{ height: "min(720px, calc(100vh - 240px))", minHeight: 560 }}>
            {/* LEFT: GEX big panel */}
            <div className="border border-border rounded-xl bg-panel hex-mesh p-5 min-h-[400px]">
              <GexChart
                buckets={data.buckets}
                spot={data.spot}
                levels={data.levels}
                symbol={data.symbol}
              />
            </div>

            {/* RIGHT: stacked DEX / VEX bar charts */}
            <div className="grid grid-rows-2 gap-4 min-h-[480px]">
              <div className="border border-border rounded-xl bg-panel hex-mesh p-5">
                <BarChartPanel
                  title={`${data.symbol} Delta Exposure`}
                  accent="#38bdf8"
                  accentLabel="DEX"
                  buckets={data.buckets}
                  valueKey="DEX"
                  spot={data.spot}
                  positiveColor="#2dd4a4"
                  negativeColor="#f87171"
                  yLabel="shares"
                />
              </div>
              <div className="border border-border rounded-xl bg-panel hex-mesh p-5">
                <BarChartPanel
                  title={`${data.symbol} Vanna Exposure`}
                  accent="#c084fc"
                  accentLabel="VEX"
                  buckets={data.buckets}
                  valueKey="VEX_net"
                  spot={data.spot}
                  positiveColor="#2dd4a4"
                  negativeColor="#f87171"
                  yLabel="per vol pt"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Vanna + Charm smooth line curves, side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: 420 }}>
            <div className="border border-border rounded-xl bg-panel hex-mesh p-5">
              <LineChartPanel
                title={`${data.symbol} Vanna Exposure`}
                accent="#c084fc"
                accentLabel="Vanna"
                buckets={data.buckets}
                callKey="VEX_call"
                putKey="VEX_put"
                netKey="VEX_net"
                spot={data.spot}
                callColor="#2dd4a4"
                putColor="#f87171"
                netColor="#c084fc"
                yLabel="per vol pt"
              />
            </div>
            <div className="border border-border rounded-xl bg-panel hex-mesh p-5">
              <LineChartPanel
                title={`${data.symbol} Charm Exposure`}
                accent="#f472b6"
                accentLabel="Charm"
                buckets={data.buckets}
                callKey="Charm_call"
                putKey="Charm_put"
                netKey="Charm_net"
                spot={data.spot}
                callColor="#2dd4a4"
                putColor="#f87171"
                netColor="#f472b6"
                yLabel="per day"
              />
            </div>
          </div>

          <StatsFooter
            symbol={data.symbol}
            totalOi={data.totalOi}
            levels={data.levels}
          />

          <footer className="mt-4 flex items-center justify-between text-[10px] font-mono text-subtext">
            <div>
              Black-Scholes · r = 4.5% · data: {data.demoMode ? "synthetic demo" : "Schwab API"}
            </div>
            <div>
              refresh every 5 min · strikes ±{(strikePct * 100).toFixed(0)}% · max DTE {dteMax}
            </div>
          </footer>
        </>
      )}
    </main>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 mb-4" style={{ height: "min(720px, calc(100vh - 240px))", minHeight: 560 }}>
        <div className="border border-border rounded-xl bg-panel animate-pulse" />
        <div className="grid grid-rows-2 gap-4">
          <div className="border border-border rounded-xl bg-panel animate-pulse" />
          <div className="border border-border rounded-xl bg-panel animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: 420 }}>
        <div className="border border-border rounded-xl bg-panel animate-pulse" />
        <div className="border border-border rounded-xl bg-panel animate-pulse" />
      </div>
    </>
  );
}
