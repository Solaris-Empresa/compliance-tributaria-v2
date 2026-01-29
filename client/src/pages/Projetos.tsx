import { useAuth } from "@/_core/hooks/useAuth";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, FolderKanban, ArrowRight, Search } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Projetos() {
  const { user } = useAuth();
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Rascunho", variant: "outline" },
      assessment_phase1: { label: "Assessment Fase 1", variant: "secondary" },
      assessment_phase2: { label: "Assessment Fase 2", variant: "secondary" },
      briefing: { label: "Briefing", variant: "secondary" },
      planning: { label: "Planejamento", variant: "default" },
      execution: { label: "Em Execução", variant: "default" },
      completed: { label: "Concluído", variant: "default" },
      archived: { label: "Arquivado", variant: "outline" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredProjects = projects?.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Projetos</h1>
            <p className="text-muted-foreground">
              Gerencie todos os projetos de compliance
            </p>
          </div>
          {user?.role === "admin" && (
            <Button asChild>
              <Link href="/projetos/novo">
                <a className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Projeto
                </a>
              </Link>
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando projetos...
          </div>
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <FolderKanban className="w-8 h-8 text-primary" />
                    {getStatusBadge(project.status)}
                  </div>
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <CardDescription>
                    Criado em {new Date(project.createdAt).toLocaleDateString("pt-BR")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/projetos/${project.id}`}>
                      <a className="flex items-center justify-center gap-2">
                        Ver Detalhes
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "Nenhum projeto encontrado" : "Nenhum projeto cadastrado"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "Tente ajustar os termos de busca"
                  : user?.role === "admin"
                  ? "Comece criando seu primeiro projeto de compliance"
                  : "Você ainda não foi adicionado a nenhum projeto"}
              </p>
              {user?.role === "admin" && !searchTerm && (
                <Button asChild>
                  <Link href="/projetos/novo">
                    <a className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Criar Primeiro Projeto
                    </a>
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ComplianceLayout>
  );
}
