"use client";
import {
  BarChart, Bar, XAxis, YAxis, ReferenceLine, Cell,
  ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { fmtK, fmtMoney } from "@/lib/format";
import type { StrikeBucket } from "@/lib/greeks";

interface Props {
  title: string;
  accent: string;           // tailwind-like color for the title dot
  accentLabel?: string;
  buckets: StrikeBucket[];
  valueKey: keyof StrikeBucket;
  spot: number;
  positiveColor?: string;
  negativeColor?: string;
  yLabel?: string;
}

export default function BarChartPanel({
  title,
  accent,
  accentLabel,
  buckets,
  valueKey,
  spot,
  positiveColor = "#2dd4a4",
  negativeColor = "#f87171",
  yLabel,
}: Props) {
  const data = buckets.map(b => ({
    strike: b.strike,
    value: b[valueKey] as number,
  }));

  // Strike tick labels: show every Nth so axis doesn't overlap
  const strikes = data.map(d => d.strike);
  const tickStep = Math.max(1, Math.ceil(strikes.length / 14));
  const ticks = strikes.filter((_, i) => i % tickStep === 0);

  return (
    <div className="fade-up flex flex-col h-full">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-lg font-semibold text-text tracking-tight">
            {title}
          </h3>
          {accentLabel && (
            <span className="text-xs font-mono" style={{ color: accent }}>
              ({accentLabel})
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid
              stroke="#1a232f"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="strike"
              ticks={ticks}
              tick={{ fill: "#7d8590", fontSize: 11, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={{ stroke: "#1e2732" }}
              interval={0}
            />
            <YAxis
              tickFormatter={(v) => fmtK(v, 1)}
              tick={{ fill: "#7d8590", fontSize: 11, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={false}
              width={56}
              label={yLabel ? {
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                style: { fill: "#7d8590", fontSize: 10, fontFamily: "JetBrains Mono" }
              } : undefined}
            />
            <Tooltip
              cursor={{ fill: "rgba(45, 212, 164, 0.05)" }}
              contentStyle={{
                background: "#0d1117",
                border: "1px solid #1e2732",
                borderRadius: 8,
                fontFamily: "JetBrains Mono",
                fontSize: 12,
              }}
              labelStyle={{ color: "#e6edf3" }}
              itemStyle={{ color: "#e6edf3" }}
              formatter={(v: number) => [fmtK(v, 2), title]}
              labelFormatter={(l) => `Strike ${fmtMoney(Number(l))}`}
            />
            <ReferenceLine
              x={spot}
              stroke="#e6edf3"
              strokeOpacity={0.6}
              strokeWidth={1}
              strokeDasharray="3 3"
              label={{
                value: fmtMoney(spot),
                position: "top",
                fill: "#2dd4a4",
                fontSize: 11,
                fontFamily: "JetBrains Mono",
                fontWeight: 600,
              }}
            />
            <ReferenceLine y={0} stroke="#e6edf3" strokeOpacity={0.3} />
            <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={14}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.value >= 0 ? positiveColor : negativeColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
