import { useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge, StatusBadge, RiskLevelBadge } from "@/components/compliance-v3/shared/Badges";
import { useActionPlan } from "@/hooks/compliance-v3/useActionPlan";
import { DOMAIN_LABELS } from "@/types/compliance-v3";
import type { ActionPlanItem } from "@/types/compliance-v3";

const PRIORITY_COLUMNS = [
  { key: "imediata", label: "⚡ Imediata", color: "border-red-400 bg-red-50/50" },
  { key: "curto_prazo", label: "🔥 Curto Prazo", color: "border-orange-400 bg-orange-50/50" },
  { key: "medio_prazo", label: "📅 Médio Prazo", color: "border-yellow-400 bg-yellow-50/50" },
  { key: "planejamento", label: "📌 Planejamento", color: "border-blue-400 bg-blue-50/50" },
];

function ActionCard({ action, onStatusChange }: { action: ActionPlanItem; onStatusChange: (id: number, status: string) => void }) {
  return (
    <div className="bg-card border rounded-lg p-3 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-snug">{action.actionName}</p>
        <StatusBadge value={action.status} />
      </div>
      <p className="text-xs text-muted-foreground">{DOMAIN_LABELS[action.domain] ?? action.domain}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PriorityBadge value={action.actionPriority} />
        {action.estimatedDays && (
          <span className="text-xs text-muted-foreground">{action.estimatedDays}d</span>
        )}
      </div>
      {action.status !== "concluido" && action.status !== "cancelado" && (
        <div className="flex gap-1 pt-1">
          {action.status === "nao_iniciado" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => onStatusChange(action.id, "em_andamento")}
            >
              Iniciar
            </Button>
          )}
          {action.status === "em_andamento" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => onStatusChange(action.id, "concluido")}
            >
              Concluir
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ActionsV3() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { actions, groupedByPriority: grouped, isLoading, updateStatus } = useActionPlan(projectId);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <Link href={`/projetos/${projectId}/compliance-v3`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Plano de Ação</h1>
          <p className="text-xs text-muted-foreground">{actions.length} ações no plano</p>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-96" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PRIORITY_COLUMNS.map(({ key, label, color }) => {
              const colActions = (grouped[key] ?? []) as ActionPlanItem[];
              return (
                <div key={key} className={`rounded-xl border-2 ${color} p-3 min-h-64`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">{label}</h3>
                    <Badge variant="secondary" className="text-xs">{colActions.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {colActions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">Sem ações</p>
                    ) : (
                      colActions.map((action, idx) => (
                        <ActionCard
                          key={action.id ?? idx}
                          action={action}
                          onStatusChange={updateStatus}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
