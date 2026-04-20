import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
// fix(#741): ExposicaoRiscoBadge substitui o antigo CpieScoreBadge (deletado no PR #737, Z-22 Wave A.2+B).
import { ExposicaoRiscoBadge } from "@/components/ExposicaoRiscoBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { FolderKanban, Plus, Search, Zap, Filter, X, Eye, Play, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { PROJECT_STATUS, STATUS_COLORS } from "@shared/translations";

// Opções de filtro de status com rótulos em português
const STATUS_FILTER_OPTIONS = [
  { value: "todos",           label: "Todos os status" },
  { value: "rascunho",        label: "Rascunho" },
  { value: "assessment_fase1",label: "Questionário (Fase 1)" },
  { value: "assessment_fase2",label: "Questionário (Fase 2)" },
  { value: "matriz_riscos",   label: "Matrizes de Riscos" },
  { value: "plano_acao",      label: "Plano de Ação" },
  { value: "em_avaliacao",    label: "Aguardando Aprovação" },
  { value: "aprovado",        label: "Aprovado" },
  { value: "em_andamento",    label: "Em Andamento" },
  { value: "parado",          label: "Pausado" },
  { value: "concluido",       label: "Concluído" },
  { value: "arquivado",       label: "Arquivado" },
];

// Indicador colorido por status (ponto colorido)
const STATUS_DOT: Record<string, string> = {
  rascunho:         "bg-gray-400",
  assessment_fase1: "bg-blue-500",
  assessment_fase2: "bg-blue-500",
  matriz_riscos:    "bg-orange-500",
  plano_acao:       "bg-purple-500",
  em_avaliacao:     "bg-yellow-500",
  aprovado:         "bg-green-500",
  em_andamento:     "bg-emerald-500",
  parado:           "bg-red-500",
  concluido:        "bg-teal-500",
  arquivado:        "bg-gray-300",
};

/** Retorna o CTA correto para o card de projeto conforme o status */
function ProjectCTA({ projectId, status }: { projectId: number; status: string }) {
  const [, setLocation] = useLocation();
  const isDone = ["aprovado", "concluido", "arquivado"].includes(status);
  const isInProgress = [
    "assessment_fase1", "assessment_fase2", "matriz_riscos",
    "plano_acao", "em_avaliacao", "em_andamento", "parado",
  ].includes(status);

  if (isDone) {
    return (
      <Button
        className="w-full gap-2"
        variant="outline"
        size="sm"
        onClick={() => setLocation(`/projetos/${projectId}`)}
      >
        <Eye className="h-4 w-4" />
        Ver Resultados
      </Button>
    );
  }

  if (isInProgress) {
    return (
      <Button
        className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm"
        size="sm"
        onClick={() => setLocation(`/projetos/${projectId}`)}
      >
        <Play className="h-4 w-4" />
        Continuar Fluxo
      </Button>
    );
  }

  // rascunho — ainda não iniciado
  return (
    <Button
      className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm"
      size="sm"
      onClick={() => setLocation(`/projetos/${projectId}`)}
    >
      <Zap className="h-4 w-4" />
      Ver o fluxo
    </Button>
  );
}

// fix(#742): SCORE_FILTER_OPTIONS, matchesScoreFilter e ScoreIaBadge removidos —
// dependiam de `projects.profileCompleteness` que foi dropada na migration 0088
// (PR #737, Sprint Z-22 Wave A.2+B). Filtro órfão eliminado.
// Reintrodução com engine v4 será feita em #741 (badge nos cards).

// fix(#760): paginação servidor-side + busca/filtro servidor-side
const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

export default function Projetos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [offset, setOffset] = useState(0);

  // Debounce da busca (300ms) — evita query a cada tecla
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset paginação quando busca ou filtro mudam
  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, statusFilter]);

  const queryInput = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      search: debouncedSearch.trim() || undefined,
      statusFilter: statusFilter !== "todos" ? statusFilter : undefined,
    }),
    [offset, debouncedSearch, statusFilter]
  );

  const { data, isLoading, isFetching } = trpc.projects.listPaginated.useQuery(queryInput, {
    keepPreviousData: true,
  } as any);

  // Acumulação via offset: quando offset=0 reseta, senão anexa
  const [accumulated, setAccumulated] = useState<any[]>([]);
  useEffect(() => {
    if (!data) return;
    if (offset === 0) {
      setAccumulated((data as any).projects ?? []);
    } else {
      setAccumulated((prev) => [...prev, ...((data as any).projects ?? [])]);
    }
  }, [data, offset]);

  const total: number = (data as any)?.total ?? 0;
  const hasMore: boolean = (data as any)?.hasMore ?? false;

  const hasActiveFilter = !!searchTerm || statusFilter !== "todos";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("todos");
    setOffset(0);
  };

  const handleLoadMore = () => {
    setOffset((o) => o + PAGE_SIZE);
  };

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os projetos de compliance tributário
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      {opt.value !== "todos" && (
                        <span className={`w-2 h-2 rounded-full inline-block ${STATUS_DOT[opt.value] ?? "bg-gray-400"}`} />
                      )}
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* fix(#742): Select "Filtrar por Score IA" removido — filtro órfão (profileCompleteness dropada na migration 0088). */}
            {hasActiveFilter && (
              <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Contador de resultados — mostra paginação do total */}
        {!isLoading && data && (
          <p className="text-sm text-muted-foreground mb-4" data-testid="projetos-count">
            {total === 0
              ? "Nenhum projeto encontrado"
              : `${accumulated.length} de ${total} projeto${total !== 1 ? "s" : ""}`}
            {hasActiveFilter && " (com filtros ativos)"}
          </p>
        )}

        {/* Projects Grid */}
        {isLoading && accumulated.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-8 w-8 bg-muted rounded" />
                  <div className="h-5 bg-muted rounded w-3/4 mt-4" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : accumulated.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accumulated.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
                <Link href={`/projetos/${project.id}`} className="flex-1 block">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FolderKanban className="h-8 w-8 text-primary" />
                      {/* Badge de status com indicador colorido */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[project.status as keyof typeof STATUS_COLORS] || "text-gray-600 bg-gray-50"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${STATUS_DOT[project.status] ?? "bg-gray-400"}`} />
                        {PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS] || project.status}
                      </span>
                    </div>
                    <CardTitle className="mt-4">{project.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 flex-wrap">
                      <span>Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* fix(#741): Badge de Exposição ao Risco — engine v4 (lê projects.scoringData) */}
                    <ExposicaoRiscoBadge scoringData={(project as any).scoringData} showScore />
                    {project.planPeriodMonths && (
                      <p className="text-sm text-muted-foreground">
                        Prazo do plano: {project.planPeriodMonths} meses
                      </p>
                    )}
                  </CardContent>
                </Link>
                <div className="px-6 pb-5 pt-2">
                  <ProjectCTA projectId={project.id} status={project.status} />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {hasActiveFilter ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilter
                  ? "Tente ajustar os filtros de busca"
                  : "Comece criando seu primeiro projeto de compliance"}
              </p>
              {hasActiveFilter ? (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/projetos/novo">Criar Primeiro Projeto</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* fix(#760): botão "Carregar mais" — paginação progressiva */}
        {hasMore && accumulated.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isFetching}
              data-testid="btn-carregar-mais"
              className="gap-2"
            >
              {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
              {isFetching
                ? "Carregando..."
                : `Carregar mais (${Math.min(PAGE_SIZE, total - accumulated.length)} de ${total - accumulated.length} restantes)`}
            </Button>
          </div>
        )}
      </div>
    </ComplianceLayout>
  );
}
