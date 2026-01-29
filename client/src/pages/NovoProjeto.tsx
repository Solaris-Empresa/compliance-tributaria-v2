import { useState } from "react";
import { useLocation } from "wouter";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";

export default function NovoProjeto() {
  const [, setLocation] = useLocation();
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("Projeto criado com sucesso!");
      setLocation(`/projetos/${data.projectId}`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar projeto: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      toast.error("Por favor, informe o nome do projeto");
      return;
    }

    setIsSubmitting(true);
    createProjectMutation.mutate({ name: projectName.trim() });
  };

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/projetos">
            <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar para Projetos
            </a>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Novo Projeto</h1>
          <p className="text-muted-foreground">
            Crie um novo projeto de adequação à reforma tributária
          </p>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Informações do Projeto</CardTitle>
                <CardDescription>
                  Informe os dados básicos do projeto. Você poderá adicionar mais detalhes depois.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="projectName">
                    Nome do Projeto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="projectName"
                    type="text"
                    placeholder="Ex: Adequação Reforma Tributária - Empresa XYZ"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Escolha um nome descritivo que identifique claramente o projeto
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={isSubmitting || !projectName.trim()}
                      className="flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Criar Projeto
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      asChild
                    >
                      <Link href="/projetos">
                        <a>Cancelar</a>
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Info Card */}
          <Card className="mt-6 bg-muted/50">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Próximos Passos</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Adicionar participantes ao projeto</li>
                <li>Responder o assessment inicial (Fase 1)</li>
                <li>Completar o assessment detalhado (Fase 2)</li>
                <li>Revisar o briefing gerado automaticamente</li>
                <li>Aprovar o plano de ação</li>
                <li>Iniciar a execução do projeto</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </ComplianceLayout>
  );
}
