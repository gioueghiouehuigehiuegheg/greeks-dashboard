"use client";
import {
  BarChart, Bar, XAxis, YAxis, ReferenceLine, Cell,
  ResponsiveContainer, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { fmtK, fmtMoney } from "@/lib/format";
import type { StrikeBucket, KeyLevels } from "@/lib/greeks";

interface Props {
  buckets: StrikeBucket[];
  spot: number;
  levels: KeyLevels;
  symbol: string;
}

export default function GexChart({ buckets, spot, levels, symbol }: Props) {
  // Data: one row per strike, with call (yellow) and put (purple) stacked
  // For a horizontal chart in recharts, use layout="vertical" — X = value, Y = strike.
  const data = buckets.map(b => ({
    strike: b.strike,
    callGex: b.GEX_call,
    putGex: b.GEX_put,
    netGex: b.GEX_net,
  }));

  // Reverse so highest strike is at top (normal axis orientation)
  data.reverse();

  const strikes = data.map(d => d.strike);
  const tickStep = Math.max(1, Math.ceil(strikes.length / 16));
  const ticks = strikes.filter((_, i) => i % tickStep === 0);

  return (
    <div className="fade-up flex flex-col h-full">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-lg font-semibold text-text tracking-tight">
            {symbol} Gamma Exposure
          </h3>
          <span className="text-xs font-mono text-gamma">(GEX)</span>
        </div>

        <div className="flex gap-4 text-[10px] font-mono uppercase tracking-wider">
          <LegendDot color="#fbbf24" label="Call γ" />
          <LegendDot color="#c084fc" label="Put γ" />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 90, left: 4, bottom: 8 }}
            stackOffset="sign"
          >
            <CartesianGrid
              stroke="#1a232f"
              strokeDasharray="2 4"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={(v) => fmtK(v, 1)}
              tick={{ fill: "#7d8590", fontSize: 11, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={{ stroke: "#1e2732" }}
            />
            <YAxis
              type="category"
              dataKey="strike"
              ticks={ticks}
              tick={{ fill: "#7d8590", fontSize: 11, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={{ stroke: "#1e2732" }}
              width={56}
              interval={0}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              cursor={{ fill: "rgba(251, 191, 36, 0.04)" }}
              contentStyle={{
                background: "#0d1117",
                border: "1px solid #1e2732",
                borderRadius: 8,
                fontFamily: "JetBrains Mono",
                fontSize: 12,
              }}
              labelStyle={{ color: "#e6edf3", marginBottom: 4 }}
              itemStyle={{ color: "#e6edf3" }}
              formatter={(v: number, name: string) => [
                fmtK(v, 2),
                name === "callGex" ? "Call GEX" : name === "putGex" ? "Put GEX" : "Net GEX",
              ]}
              labelFormatter={(l) => `Strike ${fmtMoney(Number(l))}`}
            />

            {/* Zero reference (vertical since layout is horizontal bars) */}
            <ReferenceLine x={0} stroke="#e6edf3" strokeOpacity={0.3} />

            {/* Spot */}
            <ReferenceLine
              y={findNearestStrike(strikes, spot)}
              stroke="#2dd4a4"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{
                value: `spot ${fmtMoney(spot)}`,
                position: "right",
                fill: "#2dd4a4",
                fontSize: 10,
                fontFamily: "JetBrains Mono",
                fontWeight: 600,
              }}
            />

            {/* Gamma flip */}
            {levels.gammaFlip != null && (
              <ReferenceLine
                y={findNearestStrike(strikes, levels.gammaFlip)}
                stroke="#f472b6"
                strokeWidth={1}
                strokeDasharray="2 3"
                strokeOpacity={0.7}
                label={{
                  value: `flip ${Math.round(levels.gammaFlip)}`,
                  position: "left",
                  fill: "#f472b6",
                  fontSize: 9,
                  fontFamily: "JetBrains Mono",
                }}
              />
            )}

            {/* Max pain */}
            {levels.maxPain != null && (
              <ReferenceLine
                y={findNearestStrike(strikes, levels.maxPain)}
                stroke="#f87171"
                strokeWidth={1}
                strokeDasharray="2 3"
                strokeOpacity={0.7}
                label={{
                  value: `max pain ${Math.round(levels.maxPain)}`,
                  position: "right",
                  fill: "#f87171",
                  fontSize: 9,
                  fontFamily: "JetBrains Mono",
                }}
              />
            )}

            <Bar dataKey="putGex"  stackId="gex" fill="#c084fc" maxBarSize={10} />
            <Bar dataKey="callGex" stackId="gex" fill="#fbbf24" maxBarSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-subtext">
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

// Snap target to nearest strike so recharts reference line aligns with a category tick
function findNearestStrike(strikes: number[], target: number): number {
  if (strikes.length === 0) return target;
  let best = strikes[0];
  let bestDist = Math.abs(best - target);
  for (const s of strikes) {
    const d = Math.abs(s - target);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best;
}
