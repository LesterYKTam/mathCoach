"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  attempt: number;    // attempt number (1-based)
  date: string;       // formatted date label
  scorePct: number;   // 0–100
}

interface ScoreTrendChartProps {
  data: DataPoint[];
  passThreshold: number;   // 0–100
  goodThreshold: number;
  masterThreshold: number;
}

/**
 * Recharts line chart showing score % over attempts.
 * Reference lines show Pass / Good / Master thresholds.
 */
export default function ScoreTrendChart({
  data,
  passThreshold,
  goodThreshold,
  masterThreshold,
}: ScoreTrendChartProps) {
  if (data.length === 0) {
    return <p className="text-neutral-500 text-sm">No attempts yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis
          dataKey="attempt"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Attempt #", position: "insideBottomRight", offset: -4, fill: "#6b7280", fontSize: 11 }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f1f1f", border: "1px solid #333", borderRadius: 6 }}
          labelStyle={{ color: "#9ca3af", fontSize: 11 }}
          formatter={(value: number | undefined) => [`${value ?? 0}%`, "Score"]}
          labelFormatter={(label) => `Attempt #${label}`}
        />
        {/* Threshold reference lines */}
        <ReferenceLine y={masterThreshold} stroke="#eab308" strokeDasharray="4 2" label={{ value: "Master", fill: "#eab308", fontSize: 10, position: "right" }} />
        <ReferenceLine y={goodThreshold}   stroke="#38bdf8" strokeDasharray="4 2" label={{ value: "Good",   fill: "#38bdf8", fontSize: 10, position: "right" }} />
        <ReferenceLine y={passThreshold}   stroke="#4ade80" strokeDasharray="4 2" label={{ value: "Pass",   fill: "#4ade80", fontSize: 10, position: "right" }} />
        {/* Score line */}
        <Line
          type="monotone"
          dataKey="scorePct"
          stroke="#38bdf8"
          strokeWidth={2}
          dot={{ fill: "#38bdf8", r: 3 }}
          activeDot={{ r: 5 }}
          name="Score"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
