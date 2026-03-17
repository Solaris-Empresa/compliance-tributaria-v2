import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { FolderKanban, Plus, Search, Zap, Filter, X } from "lucide-react";
import { useState } from "react";
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

export default function Projetos() {
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [, setLocation] = useLocation();

  const filteredProjects = projects?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hasActiveFilter = searchTerm || statusFilter !== "todos";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("todos");
  };

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Projetos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todos os projetos de compliance tributário
            </p>
          </div>
          <Button asChild>
            <Link href="/projetos/novo">
              <Plus className="h-4 w-4" />
              Novo Projeto
            </Link>
          </Button>
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
            {hasActiveFilter && (
              <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Contador de resultados */}
        {!isLoading && filteredProjects && (
          <p className="text-sm text-muted-foreground mb-4">
            {filteredProjects.length === 0
              ? "Nenhum projeto encontrado"
              : `${filteredProjects.length} projeto${filteredProjects.length !== 1 ? "s" : ""} encontrado${filteredProjects.length !== 1 ? "s" : ""}`}
            {hasActiveFilter && " (com filtros ativos)"}
          </p>
        )}

        {/* Projects Grid */}
        {isLoading ? (
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
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
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
                    <CardDescription>
                      Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {project.planPeriodMonths && (
                      <p className="text-sm text-muted-foreground">
                        Período: {project.planPeriodMonths} meses
                      </p>
                    )}
                  </CardContent>
                </Link>
                <div className="px-6 pb-5 pt-2">
                  <Button
                    className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm"
                    size="sm"
                    onClick={() => setLocation(`/projetos/${project.id}/questionario-v3`)}
                  >
                    <Zap className="h-4 w-4" />
                    Iniciar Fluxo v3
                  </Button>
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
      </div>
    </ComplianceLayout>
  );
}
