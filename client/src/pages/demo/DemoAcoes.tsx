import { useState } from "react";
import { Filter, X, Clock, AlertTriangle, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import DemoLayout from "./DemoLayout";
import {
  getScenario,
  DOMAIN_LABELS_DEMO,
  GAP_TYPE_LABELS,
  PRIORITY_LABELS,
  RISK_LEVEL_LABELS,
  type ScenarioKey,
} from "@/lib/demo-engine";

function useScenario(): ScenarioKey {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const s = params.get("scenario");
  if (s === "simples" || s === "medio" || s === "complexo") return s;
  return "complexo";
}

const PRIORITY_COLORS: Record<string, string> = {
  imediata: "text-red-600 bg-red-50 border-red-200",
  curto_prazo: "text-orange-600 bg-orange-50 border-orange-200",
  medio_prazo: "text-yellow-600 bg-yellow-50 border-yellow-200",
  planejamento: "text-blue-600 bg-blue-50 border-blue-200",
};

const PRIORITY_DAYS: Record<string, string> = {
  imediata: "≤ 15 dias",
  curto_prazo: "≤ 45 dias",
  medio_prazo: "≤ 90 dias",
  planejamento: "≤ 180 dias",
};

const RISK_COLORS: Record<string, string> = {
  critico: "text-red-600 bg-red-50",
  alto: "text-orange-600 bg-orange-50",
  medio: "text-yellow-600 bg-yellow-50",
  baixo: "text-green-600 bg-green-50",
};

export default function DemoAcoes() {
  const scenario = useScenario();
  const DEMO = getScenario(scenario);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");

  const domains = Array.from(new Set(DEMO.requirements.map(r => r.domain)));

  const filtered = DEMO.requirements
    .filter(r => {
      if (filterPriority !== "all" && r.action.priority !== filterPriority) return false;
      if (filterDomain !== "all" && r.domain !== filterDomain) return false;
      return true;
    })
    .sort((a, b) => {
      const order = { imediata: 0, curto_prazo: 1, medio_prazo: 2, planejamento: 3 };
      return (order[a.action.priority as keyof typeof order] ?? 9) - (order[b.action.priority as keyof typeof order] ?? 9);
    });

  const counts = {
    imediata: DEMO.requirements.filter(r => r.action.priority === "imediata").length,
    curto_prazo: DEMO.requirements.filter(r => r.action.priority === "curto_prazo").length,
    medio_prazo: DEMO.requirements.filter(r => r.action.priority === "medio_prazo").length,
    planejamento: DEMO.requirements.filter(r => r.action.priority === "planejamento").length,
  };

  return (
    <DemoLayout
      title="Plano de Ação"
      subtitle="Ações estruturadas por prioridade, geradas automaticamente pelo motor v3"
    >
      {/* Priority summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(counts).map(([priority, count]) => (
          <button
            key={priority}
            type="button"
            onClick={() => setFilterPriority(filterPriority === priority ? "all" : priority)}
            className={`rounded-xl p-4 border text-left transition-all ${
              PRIORITY_COLORS[priority] ?? ""
            } ${filterPriority === priority ? "ring-2 ring-offset-1 ring-blue-500" : "hover:opacity-90"}`}
          >
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm font-medium">{PRIORITY_LABELS[priority] ?? priority}</p>
            <p className="text-xs opacity-70 mt-0.5">{PRIORITY_DAYS[priority]}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select value={filterDomain} onValueChange={setFilterDomain}>
          <SelectTrigger className="w-52 h-8 text-xs">
            <SelectValue placeholder="Todos os domínios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os domínios</SelectItem>
            {domains.map(d => (
              <SelectItem key={d} value={d}>{DOMAIN_LABELS_DEMO[d] ?? d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterPriority !== "all" || filterDomain !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => { setFilterPriority("all"); setFilterDomain("all"); }}
          >
            <X className="w-3 h-3" /> Limpar filtros
          </Button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} ação(ões)</span>
      </div>

      {/* Action list */}
      <div className="space-y-3">
        {filtered.map(req => (
          <Card key={req.code} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Priority badge */}
                <div className="shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${PRIORITY_COLORS[req.action.priority] ?? ""}`}>
                    {PRIORITY_LABELS[req.action.priority] ?? req.action.priority}
                  </span>
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{req.action.actionCode}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${RISK_COLORS[req.risk.riskLevel] ?? ""}`}>
                      {RISK_LEVEL_LABELS[req.risk.riskLevel] ?? req.risk.riskLevel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{req.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {DOMAIN_LABELS_DEMO[req.domain] ?? req.domain} · Tipo: {GAP_TYPE_LABELS[req.gap.gapType] ?? req.gap.gapType}
                  </p>

                  {/* Description */}
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-600 leading-relaxed">{req.action.description}</p>
                  </div>
                </div>

                {/* Days */}
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold text-slate-700">{req.action.estimatedDays}d</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">prazo</p>
                </div>
              </div>

              {/* Tasks preview */}
              {req.tasks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    {req.tasks.length} tarefa(s) atômica(s)
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {req.tasks.map(task => (
                      <div
                        key={task.taskCode}
                        className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-1"
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                          {task.executionOrder}
                        </span>
                        <span className="truncate max-w-[160px]">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline summary */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Cronograma Estimado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Fase 1 — Ações Imediatas", days: "0–15 dias", count: counts.imediata, color: "bg-red-500" },
              { label: "Fase 2 — Curto Prazo", days: "15–45 dias", count: counts.curto_prazo, color: "bg-orange-500" },
              { label: "Fase 3 — Médio Prazo", days: "45–90 dias", count: counts.medio_prazo, color: "bg-yellow-500" },
              { label: "Fase 4 — Planejamento", days: "90–180 dias", count: counts.planejamento, color: "bg-blue-500" },
            ].map(phase => (
              <div key={phase.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${phase.color} shrink-0`} />
                <span className="text-sm text-slate-700 flex-1">{phase.label}</span>
                <span className="text-xs text-slate-400">{phase.days}</span>
                <span className="text-xs font-bold text-slate-600 w-16 text-right">{phase.count} ação(ões)</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DemoLayout>
  );
}
