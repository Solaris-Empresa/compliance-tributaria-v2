import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { FolderKanban, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { PROJECT_STATUS, STATUS_COLORS } from "@shared/translations";

export default function Projetos() {
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = projects?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
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
              <Link key={project.id} href={`/projetos/${project.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FolderKanban className="h-8 w-8 text-primary" />
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[project.status as keyof typeof STATUS_COLORS] || "text-gray-600 bg-gray-50"
                        }`}
                      >
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
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "Tente buscar com outros termos"
                  : "Comece criando seu primeiro projeto de compliance"}
              </p>
              {!searchTerm && (
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
