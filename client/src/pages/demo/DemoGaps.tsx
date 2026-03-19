import { useState } from "react";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DemoLayout from "./DemoLayout";
import {
  getScenario,
  DOMAIN_LABELS_DEMO,
  GAP_TYPE_LABELS,
  GAP_LEVEL_LABELS,
  CRITICALITY_LABELS,
  type ScenarioKey,
} from "@/lib/demo-engine";

function useScenario(): ScenarioKey {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const s = params.get("scenario");
  if (s === "simples" || s === "medio" || s === "complexo") return s;
  return "complexo";
}

const GAP_LEVEL_COLORS: Record<string, string> = {
  nao_atendido: "text-red-600 bg-red-50 border-red-200",
  parcial: "text-yellow-600 bg-yellow-50 border-yellow-200",
  atendido: "text-green-600 bg-green-50 border-green-200",
};

const CRITICALITY_COLORS: Record<string, string> = {
  critica: "text-red-600 bg-red-50",
  alta: "text-orange-600 bg-orange-50",
  media: "text-yellow-600 bg-yellow-50",
  baixa: "text-green-600 bg-green-50",
};

const EVIDENCE_STATUS_COLORS: Record<string, string> = {
  ausente: "text-red-600 bg-red-50",
  parcial: "text-yellow-600 bg-yellow-50",
  completa: "text-green-600 bg-green-50",
};

const EVIDENCE_STATUS_LABELS: Record<string, string> = {
  ausente: "Ausente",
  parcial: "Parcial",
  completa: "Completa",
};

export default function DemoGaps() {
  const scenario = useScenario();
  const DEMO = getScenario(scenario);
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const domains = Array.from(new Set(DEMO.requirements.map(r => r.domain)));

  const filtered = DEMO.requirements.filter(r => {
    if (filterDomain !== "all" && r.domain !== filterDomain) return false;
    if (filterLevel !== "all" && r.gap.gapLevel !== filterLevel) return false;
    return true;
  }).sort((a, b) => b.gap.priorityScore - a.gap.priorityScore);

  const counts = {
    nao_atendido: DEMO.requirements.filter(r => r.gap.gapLevel === "nao_atendido").length,
    parcial: DEMO.requirements.filter(r => r.gap.gapLevel === "parcial").length,
    atendido: DEMO.requirements.filter(r => r.gap.gapLevel === "atendido").length,
  };

  return (
    <DemoLayout
      title="Gaps de Compliance"
      subtitle="Requisitos não atendidos ou parcialmente atendidos, ordenados por prioridade"
    >
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-600">{counts.nao_atendido}</p>
          <p className="text-sm text-red-700 font-medium">Não Atendidos</p>
          <p className="text-xs text-red-500 mt-0.5">Ação imediata necessária</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-600">{counts.parcial}</p>
          <p className="text-sm text-yellow-700 font-medium">Parcialmente Atendidos</p>
          <p className="text-xs text-yellow-500 mt-0.5">Requerem complementação</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-600">{counts.atendido}</p>
          <p className="text-sm text-green-700 font-medium">Atendidos</p>
          <p className="text-xs text-green-500 mt-0.5">Em conformidade</p>
        </div>
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
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Todos os níveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="nao_atendido">Não Atendido</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="atendido">Atendido</SelectItem>
          </SelectContent>
        </Select>
        {(filterDomain !== "all" || filterLevel !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => { setFilterDomain("all"); setFilterLevel("all"); }}
          >
            <X className="w-3 h-3" /> Limpar filtros
          </Button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} requisito(s)</span>
      </div>

      {/* Gap list */}
      <div className="space-y-2">
        {filtered.map(req => {
          const isExpanded = expandedId === req.code;
          return (
            <Card key={req.code} className="overflow-hidden">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpandedId(isExpanded ? null : req.code)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Priority score */}
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-700">{Math.round(req.gap.priorityScore)}</span>
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-400">{req.code}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${GAP_LEVEL_COLORS[req.gap.gapLevel] ?? ""}`}>
                          {GAP_LEVEL_LABELS[req.gap.gapLevel] ?? req.gap.gapLevel}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CRITICALITY_COLORS[req.score.effectiveCriticality] ?? ""}`}>
                          {CRITICALITY_LABELS[req.score.effectiveCriticality] ?? req.score.effectiveCriticality}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{req.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {DOMAIN_LABELS_DEMO[req.domain] ?? req.domain} · Tipo: {GAP_TYPE_LABELS[req.gap.gapType] ?? req.gap.gapType}
                      </p>
                    </div>

                    {/* Score + expand */}
                    <div className="shrink-0 flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          req.score.finalScore >= 80 ? "text-green-600" :
                          req.score.finalScore >= 60 ? "text-yellow-600" :
                          req.score.finalScore >= 40 ? "text-orange-600" : "text-red-600"
                        }`}>{req.score.finalScore}</p>
                        <p className="text-xs text-slate-400">score</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Unmet criteria */}
                    {req.gap.unmetCriteria.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-2">Critérios Não Atendidos</p>
                        <ul className="space-y-1">
                          {req.gap.unmetCriteria.map(c => (
                            <li key={c} className="flex items-center gap-1.5 text-xs text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                              {c.replace(/_/g, " ")}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended actions */}
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2">Ações Recomendadas</p>
                      <ul className="space-y-1">
                        {req.gap.recommendedActions.filter(Boolean).map((a, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Evidence status */}
                  <div className="mt-3 flex items-center gap-4">
                    <div>
                      <span className="text-xs text-slate-500">Evidências: </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${EVIDENCE_STATUS_COLORS[req.gap.evidenceStatus] ?? ""}`}>
                        {EVIDENCE_STATUS_LABELS[req.gap.evidenceStatus] ?? req.gap.evidenceStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Impacto financeiro: </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {(req.risk.estimatedFinancialImpact.revenuePercent * 100).toFixed(0)}% da receita
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </DemoLayout>
  );
}
