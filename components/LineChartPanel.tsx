"use client";
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { fmtK, fmtMoney } from "@/lib/format";
import type { StrikeBucket } from "@/lib/greeks";

interface Props {
  title: string;
  accent: string;            // color for the "(Vanna)" / "(Charm)" tag
  accentLabel: string;
  buckets: StrikeBucket[];
  callKey: keyof StrikeBucket;
  putKey:  keyof StrikeBucket;
  netKey:  keyof StrikeBucket;
  spot: number;
  callColor: string;
  putColor:  string;
  netColor:  string;
  yLabel?: string;
}

export default function LineChartPanel({
  title, accent, accentLabel,
  buckets, callKey, putKey, netKey, spot,
  callColor, putColor, netColor, yLabel,
}: Props) {
  const data = buckets.map(b => ({
    strike: b.strike,
    call: b[callKey] as number,
    put:  b[putKey]  as number,
    net:  b[netKey]  as number,
  }));

  const strikes = data.map(d => d.strike);
  const tickStep = Math.max(1, Math.ceil(strikes.length / 14));
  const ticks = strikes.filter((_, i) => i % tickStep === 0);

  // Unique IDs per panel so recharts gradients don't collide
  const uid = `ln-${accentLabel.toLowerCase()}`;

  return (
    <div className="fade-up flex flex-col h-full">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-lg font-semibold text-text tracking-tight">
            {title}
          </h3>
          <span className="text-xs font-mono" style={{ color: accent }}>
            ({accentLabel})
          </span>
        </div>

        <div className="flex gap-4 text-[10px] font-mono uppercase tracking-wider">
          <LegendDot color={callColor} label={`Call ${accentLabel}`} />
          <LegendDot color={putColor}  label={`Put ${accentLabel}`} />
          <LegendDot color={netColor}  label={`Net ${accentLabel}`} />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 12, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id={`${uid}-net`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={netColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={netColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#1a232f" strokeDasharray="2 4" vertical={false} />

            <XAxis
              dataKey="strike"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tick={{ fill: "#7d8590", fontSize: 11, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={{ stroke: "#1e2732" }}
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
              cursor={{ stroke: netColor, strokeOpacity: 0.35, strokeWidth: 1 }}
              contentStyle={{
                background: "#0d1117",
                border: "1px solid #1e2732",
                borderRadius: 8,
                fontFamily: "JetBrains Mono",
                fontSize: 12,
              }}
              labelStyle={{ color: "#e6edf3", marginBottom: 4 }}
              itemStyle={{ color: "#e6edf3" }}
              formatter={(v: number, name: string) => [fmtK(v, 2), name]}
              labelFormatter={(l) => `Strike ${fmtMoney(Number(l))}`}
            />

            <ReferenceLine y={0} stroke="#e6edf3" strokeOpacity={0.3} />
            <ReferenceLine
              x={spot}
              stroke="#ffffff"
              strokeOpacity={0.45}
              strokeWidth={1}
              label={{
                value: fmtMoney(spot),
                position: "top",
                fill: "#2dd4a4",
                fontSize: 11,
                fontFamily: "JetBrains Mono",
                fontWeight: 600,
              }}
            />

            {/* Net has a subtle area fill underneath for emphasis */}
            <Area
              type="monotone"
              dataKey="net"
              name="Net"
              stroke={netColor}
              strokeWidth={2.5}
              fill={`url(#${uid}-net)`}
              dot={false}
              activeDot={{ r: 4, stroke: netColor, fill: "#0d1117", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="call"
              name="Call"
              stroke={callColor}
              strokeWidth={1.75}
              fill="transparent"
              dot={false}
              activeDot={{ r: 3, stroke: callColor, fill: "#0d1117", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="put"
              name="Put"
              stroke={putColor}
              strokeWidth={1.75}
              fill="transparent"
              dot={false}
              activeDot={{ r: 3, stroke: putColor, fill: "#0d1117", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-subtext">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
