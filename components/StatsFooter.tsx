"use client";
import { fmtK, fmtMoney } from "@/lib/format";
import type { KeyLevels } from "@/lib/greeks";

interface Props {
  symbol: string;
  totalOi: number;
  levels: KeyLevels;
}

export default function StatsFooter({ symbol, totalOi, levels }: Props) {
  return (
    <div className="mt-4 border border-border rounded-xl bg-panel hex-mesh p-4 fade-up">
      <div className="flex items-baseline justify-between mb-3">
        <div className="font-display text-sm font-semibold text-text">
          {symbol} Aggregate
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-subtext">
          net dealer exposure
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Stat label="Open Interest" value={totalOi.toLocaleString()} unit="contracts" />
        <Stat
          label="Net GEX"
          value={"$" + fmtK(levels.netGex, 2)}
          unit={levels.netGex >= 0 ? "positive γ" : "negative γ"}
          accent={levels.netGex >= 0 ? "pos" : "neg"}
        />
        <Stat
          label="Net DEX"
          value={fmtK(levels.netDex, 2)}
          unit="shares"
          accent={levels.netDex >= 0 ? "pos" : "neg"}
        />
        <Stat
          label="Net VEX"
          value={fmtK(levels.netVex, 2)}
          unit="per vol pt"
          accent="vanna"
        />
        <Stat
          label="Net Charm"
          value={fmtK(levels.netCharm, 2)}
          unit="per day"
          accent="charm"
        />
        <Stat
          label="Gamma Flip"
          value={levels.gammaFlip != null ? fmtMoney(levels.gammaFlip) : "—"}
          unit="flip level"
        />
        <Stat
          label="Max Pain"
          value={levels.maxPain != null ? fmtMoney(levels.maxPain) : "—"}
          unit="OI center"
        />
      </div>
    </div>
  );
}

function Stat({
  label, value, unit, accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: "pos" | "neg" | "vanna" | "charm";
}) {
  const color =
    accent === "pos"   ? "text-pos"   :
    accent === "neg"   ? "text-neg"   :
    accent === "vanna" ? "text-vanna" :
    accent === "charm" ? "text-charm" : "text-text";

  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-subtext mb-1">
        {label}
      </span>
      <span className={`font-display text-xl font-semibold tabular-nums ${color}`}>
        {value}
      </span>
      {unit && (
        <span className="text-[10px] font-mono text-subtext mt-0.5">
          {unit}
        </span>
      )}
    </div>
  );
}
