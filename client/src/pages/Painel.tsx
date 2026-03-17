import { useState } from "react";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Clock, FolderKanban, Plus, Search } from "lucide-react";
import { Link } from "wouter";
import { PROJECT_STATUS, STATUS_COLORS } from "@shared/translations";
import { Input } from "@/components/ui/input";

type FilterKey = "all" | "em_andamento" | "em_avaliacao" | "aprovado" | "rascunho";

const FILTER_CHIPS: { key: FilterKey; label: string; color: string; activeColor: string }[] = [
  { key: "all",          label: "Todos",                color: "bg-muted text-muted-foreground hover:bg-muted/80",          activeColor: "bg-slate-700 text-white" },
  { key: "em_andamento", label: "Em Andamento",         color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200",   activeColor: "bg-blue-600 text-white" },
  { key: "em_avaliacao", label: "Aguardando Aprovação", color: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200", activeColor: "bg-yellow-500 text-white" },
  { key: "aprovado",     label: "Aprovados",            color: "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200",  activeColor: "bg-green-600 text-white" },
  { key: "rascunho",     label: "Rascunho",             color: "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200",     activeColor: "bg-gray-500 text-white" },
];

const EM_ANDAMENTO_STATUSES = [
  "assessment_fase1", "assessment_fase2", "briefing", "matriz_riscos", "plano_acao",
  "questionario", "etapa1", "etapa2", "etapa3", "etapa4", "etapa5",
];

function matchesFilter(project: any, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "em_andamento") return EM_ANDAMENTO_STATUSES.includes(project.status);
  if (filter === "em_avaliacao") return project.status === "em_avaliacao";
  if (filter === "aprovado") return project.status === "aprovado" || project.status === "concluido";
  if (filter === "rascunho") return project.status === "rascunho" || project.status === "draft";
  return true;
}

export default function Painel() {
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const stats = {
    total: projects?.length || 0,
    emAndamento: projects?.filter(p => EM_ANDAMENTO_STATUSES.includes(p.status)).length || 0,
    emAvaliacao: projects?.filter(p => p.status === "em_avaliacao").length || 0,
    aprovados: projects?.filter(p => p.status === "aprovado" || p.status === "concluido").length || 0,
  };

  const filteredProjects = (projects || []).filter(p => {
    const matchFilter = matchesFilter(p, activeFilter);
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const filterCount = (key: FilterKey) => {
    if (!projects) return 0;
    return projects.filter(p => matchesFilter(p, key)).length;
  };

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Painel</h1>
            <p className="text-muted-foreground mt-1">
              Visão geral dos projetos de compliance tributário
            </p>
          </div>
          <Button asChild>
            <Link href="/projetos/novo">
              <Plus className="h-4 w-4" />
              Novo Projeto
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card
            className={`cursor-pointer transition-all ${activeFilter === "all" ? "ring-2 ring-slate-700" : "hover:shadow-md"}`}
            onClick={() => setActiveFilter("all")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Todos os projetos</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${activeFilter === "em_andamento" ? "ring-2 ring-blue-600" : "hover:shadow-md"}`}
            onClick={() => setActiveFilter("em_andamento")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.emAndamento}</div>
              <p className="text-xs text-muted-foreground mt-1">Assessment e planejamento</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${activeFilter === "em_avaliacao" ? "ring-2 ring-yellow-500" : "hover:shadow-md"}`}
            onClick={() => setActiveFilter("em_avaliacao")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Avaliação</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.emAvaliacao}</div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando aprovação jurídica</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${activeFilter === "aprovado" ? "ring-2 ring-green-600" : "hover:shadow-md"}`}
            onClick={() => setActiveFilter("aprovado")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.aprovados}</div>
              <p className="text-xs text-muted-foreground mt-1">Prontos para execução</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Projetos Recentes</CardTitle>
                <CardDescription>
                  {activeFilter === "all"
                    ? "Últimos projetos criados ou atualizados"
                    : `Filtrando por: ${FILTER_CHIPS.find(f => f.key === activeFilter)?.label}`}
                </CardDescription>
              </div>
              {/* Busca */}
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar projeto..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>

            {/* Chips de filtro */}
            <div className="flex flex-wrap gap-2 mt-3">
              {FILTER_CHIPS.map(chip => (
                <button
                  key={chip.key}
                  onClick={() => setActiveFilter(chip.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    activeFilter === chip.key ? chip.activeColor : chip.color
                  }`}
                >
                  {chip.label}
                  <Badge
                    variant="secondary"
                    className={`h-4 min-w-4 px-1 text-[10px] font-bold ${
                      activeFilter === chip.key ? "bg-white/20 text-white" : "bg-background"
                    }`}
                  >
                    {filterCount(chip.key)}
                  </Badge>
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando projetos...
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="space-y-3">
                {filteredProjects.slice(0, 10).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projetos/${project.id}`}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{project.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Criado em {new Date(project.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span
                      className={`ml-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        STATUS_COLORS[project.status as keyof typeof STATUS_COLORS] || "text-gray-600 bg-gray-50"
                      }`}
                    >
                      {PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS] || project.status}
                    </span>
                  </Link>
                ))}
                {filteredProjects.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    Exibindo 10 de {filteredProjects.length} projetos
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                {search ? (
                  <>
                    <h3 className="text-lg font-medium mb-2">Nenhum projeto encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      Nenhum projeto corresponde à busca "{search}"
                    </p>
                    <Button variant="outline" onClick={() => setSearch("")}>
                      Limpar busca
                    </Button>
                  </>
                ) : activeFilter !== "all" ? (
                  <>
                    <h3 className="text-lg font-medium mb-2">Nenhum projeto nesta categoria</h3>
                    <p className="text-muted-foreground mb-4">
                      Não há projetos com o status "{FILTER_CHIPS.find(f => f.key === activeFilter)?.label}"
                    </p>
                    <Button variant="outline" onClick={() => setActiveFilter("all")}>
                      Ver todos os projetos
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium mb-2">Nenhum projeto ainda</h3>
                    <p className="text-muted-foreground mb-4">
                      Comece criando seu primeiro projeto de compliance
                    </p>
                    <Button asChild>
                      <Link href="/projetos/novo">Criar Primeiro Projeto</Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ComplianceLayout>
  );
}
