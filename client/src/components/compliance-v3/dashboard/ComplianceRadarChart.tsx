import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { DOMAIN_LABELS } from "@/types/compliance-v3";

type Props = {
  radar: Record<string, number>;
  criticalDomains?: string[];
  height?: number;
};

export function ComplianceRadarChart({ radar, criticalDomains = [], height = 340 }: Props) {
  const data = Object.entries(radar).map(([domain, score]) => ({
    domain: DOMAIN_LABELS[domain] ?? domain.replace(/_/g, " "),
    score,
    fullMark: 100,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Nenhum dado de radar disponível
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="domain"
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value: number) => [`${value}/100`, "Score"]}
            contentStyle={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
      {criticalDomains.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {criticalDomains.map(d => (
            <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
              ⚠ {DOMAIN_LABELS[d] ?? d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
