import { useState } from "react";
import { Filter, X, User, Clock, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import DemoLayout from "./DemoLayout";
import {
  getScenario,
  DOMAIN_LABELS_DEMO,
  PRIORITY_LABELS,
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

type FlatTask = {
  taskCode: string;
  title: string;
  responsible: string;
  estimatedDays: number;
  executionOrder: number;
  requirementCode: string;
  requirementName: string;
  domain: string;
  priority: string;
};

export default function DemoTarefas() {
  const scenario = useScenario();
  const DEMO = getScenario(scenario);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");

  // Flatten all tasks
  const allTasks: FlatTask[] = DEMO.requirements.flatMap(req =>
    req.tasks.map(t => ({
      ...t,
      requirementCode: req.code,
      requirementName: req.name,
      domain: req.domain,
      priority: req.action.priority,
    }))
  ).sort((a, b) => {
    const order = { imediata: 0, curto_prazo: 1, medio_prazo: 2, planejamento: 3 };
    const pa = order[a.priority as keyof typeof order] ?? 9;
    const pb = order[b.priority as keyof typeof order] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.executionOrder - b.executionOrder;
  });

  const domains = Array.from(new Set(DEMO.requirements.map(r => r.domain)));

  const filtered = allTasks.filter(t => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterDomain !== "all" && t.domain !== filterDomain) return false;
    return true;
  });

  // Group by requirement
  const grouped = filtered.reduce((acc, t) => {
    if (!acc[t.requirementCode]) {
      acc[t.requirementCode] = {
        code: t.requirementCode,
        name: t.requirementName,
        domain: t.domain,
        priority: t.priority,
        tasks: [],
      };
    }
    acc[t.requirementCode].tasks.push(t);
    return acc;
  }, {} as Record<string, { code: string; name: string; domain: string; priority: string; tasks: FlatTask[] }>);

  const groups = Object.values(grouped);

  const totalTasks = allTasks.length;
  const responsibles = Array.from(new Set(allTasks.map(t => t.responsible)));

  return (
    <DemoLayout
      title="Tarefas Atômicas"
      subtitle="Tarefas granulares geradas automaticamente por tipo de gap, com ordem de execução global"
    >
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-600">{totalTasks}</p>
          <p className="text-sm text-blue-700 font-medium">Total de Tarefas</p>
          <p className="text-xs text-blue-500 mt-0.5">Geradas pelo motor v3</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-600">{groups.length}</p>
          <p className="text-sm text-slate-700 font-medium">Requisitos com Tarefas</p>
          <p className="text-xs text-slate-500 mt-0.5">de {DEMO.totalRequirements} total</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-600">{responsibles.length}</p>
          <p className="text-sm text-purple-700 font-medium">Perfis Responsáveis</p>
          <p className="text-xs text-purple-500 mt-0.5">Equipes envolvidas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Todas as prioridades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            <SelectItem value="imediata">Imediata</SelectItem>
            <SelectItem value="curto_prazo">Curto Prazo</SelectItem>
            <SelectItem value="medio_prazo">Médio Prazo</SelectItem>
            <SelectItem value="planejamento">Planejamento</SelectItem>
          </SelectContent>
        </Select>
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
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} tarefa(s)</span>
      </div>

      {/* Grouped task list */}
      <div className="space-y-4">
        {groups.map(group => (
          <Card key={group.code}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-slate-400">{group.code}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[group.priority] ?? ""}`}>
                      {PRIORITY_LABELS[group.priority] ?? group.priority}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-900">{group.name}</CardTitle>
                  <p className="text-xs text-slate-500">{DOMAIN_LABELS_DEMO[group.domain] ?? group.domain}</p>
                </div>
                <span className="text-xs text-slate-400">{group.tasks.length} tarefa(s)</span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {group.tasks.map(task => (
                  <div
                    key={task.taskCode}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    {/* Order badge */}
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-slate-600">{task.executionOrder}</span>
                    </div>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900">{task.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <User className="w-3 h-3" />
                          {task.responsible}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {task.estimatedDays}d
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                          <Hash className="w-3 h-3" />
                          {task.taskCode}
                        </span>
                      </div>
                    </div>

                    {/* Status placeholder */}
                    <div className="shrink-0">
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Não iniciado
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Responsible summary */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Distribuição por Responsável</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {responsibles.map(resp => {
              const count = allTasks.filter(t => t.responsible === resp).length;
              return (
                <div key={resp} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{resp}</p>
                    <p className="text-xs text-slate-400">{count} tarefa(s)</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </DemoLayout>
  );
}
