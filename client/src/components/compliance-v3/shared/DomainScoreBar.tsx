import { DOMAIN_LABELS } from "@/types/compliance-v3";

type Props = {
  radar: Record<string, number>;
  criticalDomains?: string[];
};

function getBarColor(score: number): string {
  if (score >= 85) return "bg-green-500";
  if (score >= 60) return "bg-yellow-400";
  if (score >= 40) return "bg-orange-400";
  return "bg-red-500";
}

export function DomainScoreBar({ radar, criticalDomains = [] }: Props) {
  const sorted = Object.entries(radar).sort(([, a], [, b]) => a - b);

  return (
    <div className="space-y-2.5">
      {sorted.map(([domain, score]) => {
        const isCritical = criticalDomains.includes(domain);
        return (
          <div key={domain} className="flex items-center gap-3">
            <div className="w-44 shrink-0 text-xs text-muted-foreground truncate text-right">
              {DOMAIN_LABELS[domain] ?? domain}
              {isCritical && <span className="ml-1 text-red-500">⚠</span>}
            </div>
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="w-10 text-xs font-semibold text-right tabular-nums">
              {score}
            </div>
          </div>
        );
      })}
    </div>
  );
}
