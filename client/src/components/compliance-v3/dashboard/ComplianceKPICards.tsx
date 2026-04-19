import { ShieldCheck, AlertTriangle, Zap, TrendingUp } from "lucide-react";

type Props = {
  complianceScore: number;
  criticalRisks: number;
  immediateActions: number;
  progressPercent: number;
};

type KPICardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  bgColor: string;
};

function KPICard({ icon, label, value, sub, color, bgColor }: KPICardProps) {
  return (
    <div className="bg-card border rounded-xl p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${bgColor}`}>
        <div className={`w-5 h-5 ${color}`}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className={`text-3xl font-bold mt-0.5 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function ComplianceKPICards({ complianceScore, criticalRisks, immediateActions, progressPercent }: Props) {
  const scoreColor =
    complianceScore >= 85 ? "text-green-600" :
    complianceScore >= 60 ? "text-yellow-600" :
    complianceScore >= 40 ? "text-orange-600" : "text-red-600";

  const scoreBg =
    complianceScore >= 85 ? "bg-green-50" :
    complianceScore >= 60 ? "bg-yellow-50" :
    complianceScore >= 40 ? "bg-orange-50" : "bg-red-50";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        icon={<ShieldCheck className="w-5 h-5" />}
        label="Exposição ao Risco de Compliance"
        value={`${complianceScore}/100`}
        sub={
          complianceScore >= 85 ? "Adequado" :
          complianceScore >= 60 ? "Em Progresso" :
          complianceScore >= 40 ? "Atenção" : "Crítico"
        }
        color={scoreColor}
        bgColor={scoreBg}
      />
      <KPICard
        icon={<AlertTriangle className="w-5 h-5" />}
        label="Riscos Críticos"
        value={criticalRisks}
        sub={criticalRisks === 0 ? "Nenhum risco crítico" : "Requerem ação imediata"}
        color={criticalRisks > 0 ? "text-red-600" : "text-green-600"}
        bgColor={criticalRisks > 0 ? "bg-red-50" : "bg-green-50"}
      />
      <KPICard
        icon={<Zap className="w-5 h-5" />}
        label="Ações Imediatas"
        value={immediateActions}
        sub={immediateActions > 0 ? "Prazo: 15 dias" : "Sem ações urgentes"}
        color={immediateActions > 0 ? "text-orange-600" : "text-green-600"}
        bgColor={immediateActions > 0 ? "bg-orange-50" : "bg-green-50"}
      />
      <KPICard
        icon={<TrendingUp className="w-5 h-5" />}
        label="Progresso Geral"
        value={`${progressPercent}%`}
        sub="Tarefas concluídas"
        color="text-blue-600"
        bgColor="bg-blue-50"
      />
    </div>
  );
}
