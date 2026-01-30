// @ts-nocheck
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, AlertTriangle, Plus, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function MatrizRiscos() {
  const params = useParams();
  const projectId = parseInt(params.id || "0");
  const [novoRisco, setNovoRisco] = useState({ titulo: "", descricao: "" });
  const [editando, setEditando] = useState<number | null>(null);

  const { data: project } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );

  const { data: riscos, isLoading, refetch } = trpc.riskMatrix.list.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const createRisk = trpc.riskMatrix.create.useMutation({
    onSuccess: () => {
      toast.success("Risco adicionado com sucesso!");
      setNovoRisco({ titulo: "", descricao: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar risco: ${error.message}`);
    },
  });

  const deleteRisk = trpc.riskMatrix.delete.useMutation({
    onSuccess: () => {
      toast.success("Risco removido com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao remover risco: ${error.message}`);
    },
  });

  const handleAdicionarRisco = () => {
    if (!novoRisco.titulo.trim()) {
      toast.error("O título do risco é obrigatório");
      return;
    }

    createRisk.mutate({
      projectId,
      title: novoRisco.titulo,
      description: novoRisco.descricao,
    });
  };

  const handleRemoverRisco = (riskId: number) => {
    if (confirm("Tem certeza que deseja remover este risco?")) {
      deleteRisk.mutate({ id: riskId });
    }
  };

  if (!project) {
    return (
      <ComplianceLayout>
        <div className="p-8">
          <p>Carregando projeto...</p>
        </div>
      </ComplianceLayout>
    );
  }

  return (
    <ComplianceLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href={`/projetos/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
              Voltar para Projeto
            </Link>
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <h1 className="text-3xl font-bold">Matriz de Riscos</h1>
          </div>
          <p className="text-muted-foreground">
            {project.name}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Lista simplificada de riscos identificados para o projeto
          </p>
        </div>

        {/* Formulário de Novo Risco */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Novo Risco
            </CardTitle>
            <CardDescription>
              Identifique e documente riscos relacionados à adequação tributária
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título do Risco *</Label>
              <Input
                id="titulo"
                placeholder="Ex: Falta de documentação fiscal completa"
                value={novoRisco.titulo}
                onChange={(e) => setNovoRisco({ ...novoRisco, titulo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição Detalhada</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o risco em detalhes: contexto, possíveis consequências e observações relevantes"
                value={novoRisco.descricao}
                onChange={(e) => setNovoRisco({ ...novoRisco, descricao: e.target.value })}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleAdicionarRisco}
              disabled={createRisk.isPending}
              className="w-full sm:w-auto"
            >
              {createRisk.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Adicionar Risco
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Riscos */}
        <Card>
          <CardHeader>
            <CardTitle>Riscos Identificados</CardTitle>
            <CardDescription>
              {isLoading ? "Carregando riscos..." : `${riscos?.length || 0} risco(s) identificado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : riscos && riscos.length > 0 ? (
              <div className="space-y-4">
                {riscos.map((risco, index) => (
                  <div
                    key={risco.id}
                    className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                            {index + 1}
                          </span>
                          <h3 className="font-semibold text-lg">{risco.title}</h3>
                        </div>
                        {risco.description && (
                          <p className="text-muted-foreground text-sm ml-8">
                            {risco.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 ml-8 text-xs text-muted-foreground">
                          <span>
                            Criado em: {new Date(risco.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoverRisco(risco.id)}
                        disabled={deleteRisk.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Nenhum risco identificado ainda</p>
                <p className="text-sm text-muted-foreground">
                  Adicione riscos usando o formulário acima
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Sobre a Matriz de Riscos Simplificada</p>
                <p className="text-blue-700">
                  Esta matriz foi simplificada para focar apenas na identificação e documentação de riscos.
                  Não inclui classificação por probabilidade, impacto ou metodologia COSO.
                  O objetivo é manter um registro claro e objetivo dos riscos identificados durante o processo de adequação tributária.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ComplianceLayout>
  );
}
