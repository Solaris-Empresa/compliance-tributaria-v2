/**
 * ProjectHistoryTimeline — #766 Trilha de Auditoria do projeto
 *
 * Página dedicada em /projetos/:id/historico.
 * Exibe a timeline unificada (auditLog camelCase + audit_log snake) consolidada
 * pela procedure `trpc.audit.getProjectTimeline`.
 *
 * Decisões de UX:
 * - Página dedicada (não tab) porque a Reforma Tributária corre até 2031 e o
 *   volume de eventos crescerá. Tab sobrecarregaria a tela de projeto.
 * - Agrupamento por DIA com cabeçalho legível ("Hoje", "Ontem", "18/04/2026").
 * - Filtros inline no topo: busca texto, categorias como pills, período preset.
 * - Banner de stats compacto (total, usuários únicos, período coberto).
 * - Cada entrada: ícone colorido por categoria, texto humanizado, horário
 *   relativo ("há 5 min"), expansão para ver metadata bruta.
 * - Export CSV (auditoria formal exige).
 */
import { useMemo, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  Download,
  Clock,
  FileText,
  Shield,
  AlertTriangle,
  ListChecks,
  CheckSquare,
  FolderKanban,
  KeyRound,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Calendar,
  Users,
  Activity,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type Category =
  | "projeto"
  | "briefing"
  | "risco"
  | "plano"
  | "tarefa"
  | "pergunta"
  | "permissao"
  | "outro";

interface TimelineEntry {
  id: string;
  timestamp: number;
  userId: number | null;
  userName: string;
  userRole?: string | null;
  projectId: number;
  category: Category;
  entity: string;
  entityId: string;
  actionLabel: string;
  description: string;
  rawAction: string;
  event?: string | null;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  reason?: string | null;
  source: "auditLog" | "audit_log";
}

// ─── Metadados de categoria ──────────────────────────────────────────────────

const CATEGORY_META: Record<
  Category,
  { label: string; Icon: typeof FileText; colorClass: string; bgClass: string; borderClass: string }
> = {
  projeto: {
    label: "Projeto",
    Icon: FolderKanban,
    colorClass: "text-slate-700 dark:text-slate-300",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    borderClass: "border-slate-300 dark:border-slate-700",
  },
  briefing: {
    label: "Briefing",
    Icon: FileText,
    colorClass: "text-blue-700 dark:text-blue-300",
    bgClass: "bg-blue-50 dark:bg-blue-950/40",
    borderClass: "border-blue-300 dark:border-blue-800",
  },
  risco: {
    label: "Riscos",
    Icon: AlertTriangle,
    colorClass: "text-amber-700 dark:text-amber-300",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    borderClass: "border-amber-300 dark:border-amber-800",
  },
  plano: {
    label: "Planos",
    Icon: ListChecks,
    colorClass: "text-violet-700 dark:text-violet-300",
    bgClass: "bg-violet-50 dark:bg-violet-950/40",
    borderClass: "border-violet-300 dark:border-violet-800",
  },
  tarefa: {
    label: "Tarefas",
    Icon: CheckSquare,
    colorClass: "text-emerald-700 dark:text-emerald-300",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    borderClass: "border-emerald-300 dark:border-emerald-800",
  },
  pergunta: {
    label: "Questionários",
    Icon: MessageSquare,
    colorClass: "text-cyan-700 dark:text-cyan-300",
    bgClass: "bg-cyan-50 dark:bg-cyan-950/40",
    borderClass: "border-cyan-300 dark:border-cyan-800",
  },
  permissao: {
    label: "Permissões",
    Icon: KeyRound,
    colorClass: "text-rose-700 dark:text-rose-300",
    bgClass: "bg-rose-50 dark:bg-rose-950/40",
    borderClass: "border-rose-300 dark:border-rose-800",
  },
  outro: {
    label: "Outros",
    Icon: Shield,
    colorClass: "text-zinc-700 dark:text-zinc-300",
    bgClass: "bg-zinc-100 dark:bg-zinc-800",
    borderClass: "border-zinc-300 dark:border-zinc-700",
  },
};

const CATEGORY_ORDER: Category[] = [
  "projeto", "briefing", "risco", "plano", "tarefa", "pergunta", "permissao", "outro",
];

type PeriodPreset = "24h" | "7d" | "30d" | "6m" | "all";

const PERIOD_PRESETS: Array<{ key: PeriodPreset; label: string; ms: number | null }> = [
  { key: "24h", label: "24 horas", ms: 24 * 60 * 60 * 1000 },
  { key: "7d",  label: "7 dias",   ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30 dias",  ms: 30 * 24 * 60 * 60 * 1000 },
  { key: "6m",  label: "6 meses",  ms: 180 * 24 * 60 * 60 * 1000 },
  { key: "all", label: "Tudo",     ms: null },
];

// ─── Agrupamento por dia ────────────────────────────────────────────────────

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayLabel(dayStart: number): string {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = today.getTime() - 24 * 60 * 60 * 1000;

  if (dayStart === today.getTime()) return "Hoje";
  if (dayStart === yesterday) return "Ontem";

  const d = new Date(dayStart);
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
    weekday: "long",
  });
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `há ${Math.floor(diff / 3_600_000)}h`;
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatTimeOfDay(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── CSV export ─────────────────────────────────────────────────────────────

function exportCsv(entries: TimelineEntry[], projectName: string) {
  const rows = [
    ["timestamp_iso", "data_hora_br", "usuario", "categoria", "entidade", "acao", "descricao", "event", "entity_id", "source"],
    ...entries.map((e) => [
      new Date(e.timestamp).toISOString(),
      new Date(e.timestamp).toLocaleString("pt-BR"),
      e.userName,
      CATEGORY_META[e.category].label,
      e.entity,
      e.rawAction,
      e.description.replace(/"/g, '""'),
      e.event ?? "",
      e.entityId,
      e.source,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const bom = "\uFEFF"; // BOM para Excel detectar UTF-8
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trilha-auditoria-${projectName.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Componente principal ──────────────────────────────────────────────────

export default function ProjectHistoryTimeline() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params?.id ?? "0", 10);
  const [, navigate] = useLocation();

  const [searchText, setSearchText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(new Set());
  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fromTimestamp = useMemo(() => {
    const preset = PERIOD_PRESETS.find((p) => p.key === period);
    if (!preset || preset.ms === null) return undefined;
    return Date.now() - preset.ms;
  }, [period]);

  const { data: projectData } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );
  const projectName = (projectData as any)?.name ?? `Projeto #${projectId}`;

  const { data: timeline, isLoading, refetch } = trpc.audit.getProjectTimeline.useQuery(
    {
      projectId,
      categories: selectedCategories.size > 0 ? Array.from(selectedCategories) : undefined,
      fromTimestamp,
      searchText: searchText.trim() || undefined,
      limit: 500,
    },
    { enabled: projectId > 0 }
  );

  const entries = (timeline?.entries ?? []) as TimelineEntry[];
  const stats = timeline?.stats;

  // Agrupar por dia
  const groupedByDay = useMemo(() => {
    const map = new Map<number, TimelineEntry[]>();
    for (const e of entries) {
      const key = startOfDay(e.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [entries]);

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ComplianceLayout>
      <div className="container mx-auto px-4 py-6 space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <Link
              href={`/projetos/${projectId}`}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Voltar ao projeto
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6" /> Trilha de Auditoria
            </h1>
            <p className="text-sm text-muted-foreground">
              Histórico permanente de todas as alterações em <strong>{projectName}</strong>.
              Registros imutáveis para conformidade com a Reforma Tributária.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="btn-refresh-timeline"
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Atualizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportCsv(entries, projectName)}
              disabled={entries.length === 0}
              data-testid="btn-export-timeline-csv"
              className="gap-1.5"
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </div>

        {/* Stats banner */}
        {stats && (
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox
                icon={Activity}
                label="Eventos registrados"
                value={stats.totalEntries.toLocaleString("pt-BR")}
                subtitle={
                  timeline!.totalBeforeFilter !== stats.totalEntries
                    ? `${timeline!.totalBeforeFilter.toLocaleString("pt-BR")} no total`
                    : "no período selecionado"
                }
              />
              <StatBox
                icon={Users}
                label="Usuários ativos"
                value={stats.uniqueUsers.toString()}
                subtitle={stats.uniqueUsers === 1 ? "pessoa" : "pessoas"}
              />
              <StatBox
                icon={Calendar}
                label="Primeiro registro"
                value={stats.firstTimestamp ? new Date(stats.firstTimestamp).toLocaleDateString("pt-BR") : "—"}
                subtitle={stats.firstTimestamp ? relativeTime(stats.firstTimestamp) : ""}
              />
              <StatBox
                icon={Clock}
                label="Último registro"
                value={stats.lastTimestamp ? new Date(stats.lastTimestamp).toLocaleDateString("pt-BR") : "—"}
                subtitle={stats.lastTimestamp ? relativeTime(stats.lastTimestamp) : ""}
              />
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por usuário, descrição, ação..."
                className="pl-9"
                data-testid="input-timeline-search"
              />
            </div>

            {/* Categorias */}
            <div className="flex flex-wrap gap-1.5" data-testid="filter-categories">
              {CATEGORY_ORDER.map((cat) => {
                const meta = CATEGORY_META[cat];
                const active = selectedCategories.has(cat);
                const count = stats?.byCategory?.[cat] ?? 0;
                const Icon = meta.Icon;
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    data-testid={`filter-category-${cat}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                      active
                        ? cn(meta.bgClass, meta.colorClass, meta.borderClass)
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                    {count > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px] font-mono">
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Período */}
            <div className="flex flex-wrap gap-1.5" data-testid="filter-period">
              <span className="text-xs text-muted-foreground self-center mr-1">Período:</span>
              {PERIOD_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  data-testid={`filter-period-${p.key}`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    period === p.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Carregando trilha...
          </div>
        ) : groupedByDay.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-2">
              <Shield className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm">
                {searchText || selectedCategories.size > 0 || period !== "all"
                  ? "Nenhum evento encontrado com os filtros aplicados."
                  : "Ainda não há eventos registrados neste projeto."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6" data-testid="timeline-content">
            {groupedByDay.map(([dayStart, dayEntries]) => (
              <div key={dayStart} className="space-y-2" data-testid={`timeline-day-${dayStart}`}>
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-1 flex items-baseline gap-2 border-b">
                  <h3 className="text-sm font-semibold capitalize">{dayLabel(dayStart)}</h3>
                  <span className="text-xs text-muted-foreground">
                    {dayEntries.length} {dayEntries.length === 1 ? "evento" : "eventos"}
                  </span>
                </div>
                <div className="space-y-1.5 pl-1">
                  {dayEntries.map((entry) => (
                    <TimelineEntryRow
                      key={entry.id}
                      entry={entry}
                      expanded={expandedIds.has(entry.id)}
                      onToggle={() => toggleExpanded(entry.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ComplianceLayout>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function StatBox({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

function TimelineEntryRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: TimelineEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = CATEGORY_META[entry.category];
  const Icon = meta.Icon;
  const hasDetails =
    (entry.metadata && Object.keys(entry.metadata).length > 0) ||
    (entry.changes && Object.keys(entry.changes).length > 0) ||
    !!entry.reason;

  return (
    <div
      className={cn(
        "rounded-lg border transition",
        meta.borderClass,
        expanded ? meta.bgClass : "bg-card hover:bg-muted/30"
      )}
      data-testid={`timeline-entry-${entry.id}`}
    >
      <button
        onClick={hasDetails ? onToggle : undefined}
        disabled={!hasDetails}
        className={cn(
          "w-full text-left px-3 py-2 flex items-start gap-3",
          hasDetails && "cursor-pointer"
        )}
      >
        <div className={cn("mt-0.5 rounded p-1.5", meta.bgClass, meta.colorClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm leading-snug">{entry.description}</span>
            {entry.event && (
              <Badge variant="outline" className="text-[10px] font-mono h-4 px-1">
                {entry.event}
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>{formatTimeOfDay(entry.timestamp)}</span>
            <span>·</span>
            <span>{relativeTime(entry.timestamp)}</span>
            <span>·</span>
            <span>{meta.label}</span>
            <span>·</span>
            <span className="font-mono text-[10px] opacity-70">{entry.entity}#{entry.entityId}</span>
          </div>
        </div>
        {hasDetails && (
          <span className={cn("mt-1 shrink-0", meta.colorClass)}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
      </button>
      {expanded && hasDetails && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/50 mt-0" data-testid={`timeline-details-${entry.id}`}>
          {entry.reason && (
            <div className="pt-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Motivo</div>
              <div className="text-xs">{entry.reason}</div>
            </div>
          )}
          {entry.changes && Object.keys(entry.changes).length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Alterações</div>
              <pre className="text-[11px] bg-muted/50 rounded p-2 overflow-auto max-h-48">
                {JSON.stringify(entry.changes, null, 2)}
              </pre>
            </div>
          )}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Metadata</div>
              <pre className="text-[11px] bg-muted/50 rounded p-2 overflow-auto max-h-64">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
