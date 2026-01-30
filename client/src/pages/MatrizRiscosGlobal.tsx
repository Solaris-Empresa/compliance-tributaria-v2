// @ts-nocheck
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Loader2, Search, ExternalLink, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";

export default function MatrizRiscosGlobal() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const { data: allRisks, isLoading } = trpc.riskMatrix.listAll.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();

  // Filtrar riscos
  const filteredRisks = useMemo(() => {
    if (!allRisks) return [];

    return allRisks.filter((risk) => {
      // Filtro de busca por texto
      const matchesSearch =
        searchTerm === "" ||
        risk.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.projectName?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por projeto
      const matchesProject = selectedProject === null || risk.projectId === selectedProject;

      return matchesSearch && matchesProject;
    });
  }, [allRisks, searchTerm, selectedProject]);

  // Estatísticas
  const stats = useMemo(() => {
    if (!allRisks) return { total: 0, aiGenerated: 0, manual: 0, projectsWithRisks: 0 };

    const projectIds = new Set(allRisks.map((r) => r.projectId));

    return {
      total: allRisks.length,
      aiGenerated: allRisks.filter((r) => r.generatedByAI).length,
      manual: allRisks.filter((r) => !r.generatedByAI).length,
      projectsWithRisks: projectIds.size,
    };
  }, [allRisks]);

  if (isLoading) {
    return (
      <ComplianceLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ComplianceLayout>
    );
  }

  return (
    <ComplianceLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Matriz de Riscos Consolidada</h1>
          <p className="text-muted-foreground">
            Visualização de todos os riscos identificados em todos os projetos
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Riscos</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Gerados por IA</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {stats.aiGenerated}
                <Sparkles className="h-5 w-5 text-purple-500" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Adicionados Manualmente</CardDescription>
              <CardTitle className="text-3xl">{stats.manual}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Projetos com Riscos</CardDescription>
              <CardTitle className="text-3xl">{stats.projectsWithRisks}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Busca por texto */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, descrição ou projeto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filtro por projeto */}
              <div className="md:w-64">
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={selectedProject || ""}
                  onChange={(e) => setSelectedProject(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Todos os projetos</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão limpar filtros */}
              {(searchTerm || selectedProject) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedProject(null);
                  }}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Riscos */}
        <Card>
          <CardHeader>
            <CardTitle>Riscos Identificados ({filteredRisks.length})</CardTitle>
            <CardDescription>
              {filteredRisks.length === 0
                ? "Nenhum risco encontrado com os filtros aplicados"
                : "Clique em um risco para ver detalhes do projeto"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRisks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum risco encontrado</h3>
                <p className="text-muted-foreground max-w-md">
                  {allRisks?.length === 0
                    ? "Ainda não há riscos cadastrados em nenhum projeto."
                    : "Tente ajustar os filtros para encontrar riscos."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRisks.map((risk, index) => (
                  <div
                    key={risk.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          {risk.generatedByAI && (
                            <Badge variant="secondary" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              IA
                            </Badge>
                          )}
                          <Badge variant="outline">{risk.projectName}</Badge>
                        </div>
                        <h4 className="font-semibold mb-1">{risk.title}</h4>
                        {risk.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {risk.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Criado em {new Date(risk.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/projetos/${risk.projectId}/matriz-riscos`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ComplianceLayout>
  );
}
