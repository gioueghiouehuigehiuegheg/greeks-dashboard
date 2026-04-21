"use client";
import { fmtMoney, fmtPct, fmtTime } from "@/lib/format";

interface Props {
  symbol: string;
  setSymbol: (s: string) => void;
  expiry: string;
  setExpiry: (e: string) => void;
  dteMax: number;
  setDteMax: (d: number) => void;
  strikePct: number;
  setStrikePct: (p: number) => void;

  expiries: string[];
  spot: number;
  vix: any;
  fetchedAt: string;
  secondsUntilRefresh: number;
  loading: boolean;
  demoMode: boolean;
  authStatus: "ok" | "required" | "demo";
}

const TICKERS = ["SPY", "QQQ", "DIA", "IWM", "AAPL", "NVDA", "TSLA", "META", "MSFT", "GOOGL", "AMZN"];
const DTE_OPTIONS: { label: string; value: number }[] = [
  { label: "0DTE", value: 1 },
  { label: "0-7",  value: 7 },
  { label: "0-21", value: 21 },
  { label: "0-45", value: 45 },
];
const RANGE_OPTIONS: { label: string; value: number }[] = [
  { label: "±3%", value: 0.03 },
  { label: "±5%", value: 0.05 },
  { label: "±8%", value: 0.08 },
];

export default function ControlBar(props: Props) {
  const {
    symbol, setSymbol, expiry, setExpiry, dteMax, setDteMax,
    strikePct, setStrikePct, expiries, spot, vix, fetchedAt,
    secondsUntilRefresh, loading, demoMode, authStatus,
  } = props;

  const countdownStr = (() => {
    const s = Math.max(0, Math.floor(secondsUntilRefresh));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  })();

  const statusColor = loading
    ? "#f59e0b"
    : secondsUntilRefresh < 30
    ? "#fbbf24"
    : "#2dd4a4";
  const statusClass = loading ? "pulse-warn" : secondsUntilRefresh < 30 ? "pulse-warn" : "pulse-live";

  return (
    <header className="border border-border rounded-xl bg-panel hex-mesh p-4 mb-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Brand */}
        <div className="flex items-baseline gap-3 mr-2">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            <span className="italic text-gamma">γ</span>
            <span className="ml-1.5 text-text">greeks</span>
          </h1>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-subtext">
            second-order exposure
          </span>
        </div>

        {/* Symbol */}
        <Field label="Ticker">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-elevated border border-border rounded-md px-3 py-1.5 text-sm font-mono font-semibold text-text focus:outline-none focus:border-gamma/60 min-w-[90px]"
          >
            {TICKERS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        {/* Expiry */}
        <Field label="Expiry">
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="bg-elevated border border-border rounded-md px-3 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-gamma/60 min-w-[130px]"
          >
            <option value="ALL">All Expiries</option>
            {expiries.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </Field>

        {/* DTE */}
        <Field label="DTE">
          <ToggleGroup
            options={DTE_OPTIONS.map(o => ({ label: o.label, value: String(o.value) }))}
            value={String(dteMax)}
            onChange={(v) => setDteMax(parseInt(v, 10))}
          />
        </Field>

        {/* Strike range */}
        <Field label="Range">
          <ToggleGroup
            options={RANGE_OPTIONS.map(o => ({ label: o.label, value: String(o.value) }))}
            value={String(strikePct)}
            onChange={(v) => setStrikePct(parseFloat(v))}
          />
        </Field>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Spot + VIX */}
        <div className="flex items-center gap-5 font-mono text-sm">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-subtext">spot</span>
            <span className="font-semibold text-gamma text-base tabular-nums">{fmtMoney(spot)}</span>
          </div>
          {vix && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-subtext">vix</span>
              <span className="font-semibold text-text tabular-nums">{vix.last?.toFixed(2) ?? "—"}</span>
              {vix.changePct != null && (
                <span className={`text-[11px] tabular-nums ${vix.change >= 0 ? "text-pos" : "text-neg"}`}>
                  {vix.change >= 0 ? "▲" : "▼"} {fmtPct(vix.changePct)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2.5 pl-4 border-l border-border">
          <span
            className={`w-2 h-2 rounded-full ${statusClass}`}
            style={{ background: statusColor }}
          />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-subtext">
              {demoMode ? "demo" : loading ? "fetching" : "live"}
            </span>
            <span className="text-[10px] font-mono text-subtext tabular-nums">
              {loading ? "updating…" : `next in ${countdownStr}`}
            </span>
          </div>
        </div>

        {/* Fetched time */}
        <div className="text-[10px] font-mono text-subtext">
          {fetchedAt ? fmtTime(fetchedAt) : ""}
        </div>
      </div>

      {authStatus === "required" && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
          <span className="text-accent">
            Schwab authentication required — running in demo mode with synthetic data.
          </span>
          <a
            href="/api/auth/login"
            className="font-mono uppercase tracking-wider text-[10px] bg-accent/10 border border-accent/40 text-accent px-3 py-1 rounded hover:bg-accent/20 transition-colors"
          >
            connect schwab →
          </a>
        </div>
      )}
    </header>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-subtext">
        {label}
      </span>
      {children}
    </div>
  );
}

function ToggleGroup({
  options, value, onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center bg-elevated border border-border rounded-md p-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
            value === opt.value
              ? "bg-gamma/15 text-gamma"
              : "text-subtext hover:text-text"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
