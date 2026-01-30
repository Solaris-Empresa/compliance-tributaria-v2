// @ts-nocheck
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, AlertTriangle, Plus, Trash2, Loader2, ArrowRight, Sparkles, RefreshCw, History, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MatrizRiscos() {
  const params = useParams();
  const projectId = parseInt(params.id || "0");
  const [novoRisco, setNovoRisco] = useState({ titulo: "", descricao: "" });
  const [editando, setEditando] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [selectedVersion1, setSelectedVersion1] = useState<string>("");
  const [selectedVersion2, setSelectedVersion2] = useState<string>("");

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

  const generateRisks = trpc.riskMatrix.generate.useMutation({
    onSuccess: () => {
      console.log('[MatrizRiscos] Riscos gerados com sucesso');
      setIsGenerating(false);
      refetch();
      toast.success("Riscos identificados com sucesso!");
    },
    onError: (error: any) => {
      console.error('[MatrizRiscos] Erro ao gerar riscos:', error);
      setIsGenerating(false);
      toast.error(`Erro ao gerar riscos: ${error.message}`);
    },
  });

  // Queries para histórico de versões
  const { data: versions } = trpc.riskMatrix.listVersions.useQuery(
    { projectId },
    { enabled: projectId > 0 && showHistoryDialog }
  );

  const { data: comparison } = trpc.riskMatrix.compareVersions.useQuery(
    {
      projectId,
      version1: parseInt(selectedVersion1),
      version2: parseInt(selectedVersion2),
    },
    {
      enabled: projectId > 0 && showCompareDialog && !!selectedVersion1 && !!selectedVersion2,
    }
  );

  const advanceToActionPlan = trpc.projects.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Avançando para Plano de Ação...");
      window.location.href = `/projetos/${projectId}/plano-acao`;
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Gerar riscos automaticamente se não existirem
  useEffect(() => {
    if (project && riscos && riscos.length === 0 && !generateRisks.isLoading && projectId > 0) {
      console.log('[MatrizRiscos] Iniciando geração automática de riscos. projectId:', projectId);
      setIsGenerating(true);
      generateRisks.mutate({ projectId });
    }
  }, [project, riscos, projectId]);

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

  const handleRegenerarRiscos = () => {
    if (!confirm("Tem certeza que deseja regenerar os riscos? Todos os riscos atuais serão substituídos por uma nova análise da IA.")) {
      return;
    }
    
    console.log('[MatrizRiscos] Iniciando regeneração de riscos. projectId:', projectId);
    setIsGenerating(true);
    generateRisks.mutate({ projectId });
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <h1 className="text-3xl font-bold">Matriz de Riscos</h1>
            </div>
            {riscos && riscos.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowHistoryDialog(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <History className="h-4 w-4" />
                  Ver Histórico
                </Button>
                <Button
                  onClick={handleRegenerarRiscos}
                  disabled={isGenerating}
                  variant="outline"
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Regenerando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Regenerar Riscos
                    </>
                  )}
                </Button>
              </div>
            )}
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

        {/* Indicador de Geração */}
        {isGenerating && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div>
                  <p className="font-medium text-blue-900">Gerando Riscos com IA...</p>
                  <p className="text-sm text-blue-700">Analisando o briefing e identificando riscos de conformidade. Isso pode levar alguns segundos.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Botão Avançar para Plano de Ação */}
        {riscos && riscos.length > 0 && (
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => advanceToActionPlan.mutate({ projectId, status: "em_andamento" })}
              disabled={advanceToActionPlan.isPending}
              size="lg"
              className="gap-2"
            >
              {advanceToActionPlan.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Avançando...
                </>
              ) : (
                <>
                  Avançar para Plano de Ação
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

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

        {/* Dialog de Histórico de Versões */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Versões da Matriz de Riscos
              </DialogTitle>
              <DialogDescription>
                Visualize e compare versões anteriores da matriz de riscos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {versions && versions.length > 0 ? (
                <>
                  {/* Botão Comparar Versões */}
                  <div className="flex gap-4 items-end p-4 bg-muted rounded-lg">
                    <div className="flex-1">
                      <Label>Versão 1</Label>
                      <Select value={selectedVersion1} onValueChange={setSelectedVersion1}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione versão" />
                        </SelectTrigger>
                        <SelectContent>
                          {versions.map((v) => (
                            <SelectItem key={v.id} value={v.versionNumber.toString()}>
                              Versão {v.versionNumber} - {new Date(v.createdAt).toLocaleDateString('pt-BR')} ({v.riskCount} riscos)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label>Versão 2</Label>
                      <Select value={selectedVersion2} onValueChange={setSelectedVersion2}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione versão" />
                        </SelectTrigger>
                        <SelectContent>
                          {versions.map((v) => (
                            <SelectItem key={v.id} value={v.versionNumber.toString()}>
                              Versão {v.versionNumber} - {new Date(v.createdAt).toLocaleDateString('pt-BR')} ({v.riskCount} riscos)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => {
                        if (selectedVersion1 && selectedVersion2) {
                          setShowHistoryDialog(false);
                          setShowCompareDialog(true);
                        } else {
                          toast.error("Selecione duas versões para comparar");
                        }
                      }}
                      disabled={!selectedVersion1 || !selectedVersion2}
                    >
                      Comparar
                    </Button>
                  </div>

                  {/* Lista de Versões */}
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <Card key={version.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">Versão {version.versionNumber}</CardTitle>
                              <CardDescription className="mt-1">
                                {new Date(version.createdAt).toLocaleString('pt-BR')} • {version.createdByName} • {version.riskCount} riscos
                              </CardDescription>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-muted">
                              {version.triggerType === 'auto_generation' && 'Geração Automática'}
                              {version.triggerType === 'manual_regeneration' && 'Regeneração Manual'}
                              {version.triggerType === 'prompt_edit' && 'Edição via Prompt'}
                            </span>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma versão anterior encontrada</p>
                  <p className="text-sm mt-1">O histórico será criado após a primeira regeneração</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Comparação de Versões */}
        <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Comparação de Versões
              </DialogTitle>
              <DialogDescription>
                Versão {selectedVersion1} vs Versão {selectedVersion2}
              </DialogDescription>
            </DialogHeader>

            {comparison && (
              <div className="space-y-6 mt-4">
                {/* Resumo */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-green-700">{comparison.comparison.added.length}</div>
                      <div className="text-sm text-green-600">Adicionados</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-red-700">{comparison.comparison.removed.length}</div>
                      <div className="text-sm text-red-600">Removidos</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-yellow-700">{comparison.comparison.modified.length}</div>
                      <div className="text-sm text-yellow-600">Modificados</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-gray-700">{comparison.comparison.unchanged.length}</div>
                      <div className="text-sm text-gray-600">Inalterados</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Riscos Adicionados */}
                {comparison.comparison.added.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-700">Riscos Adicionados</h3>
                    <div className="space-y-2">
                      {comparison.comparison.added.map((risk: any, idx: number) => (
                        <Card key={idx} className="border-green-200 bg-green-50">
                          <CardContent className="pt-4">
                            <p className="font-medium">{risk.title || risk.riskDescription}</p>
                            {risk.description && <p className="text-sm text-muted-foreground mt-1">{risk.description}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Riscos Removidos */}
                {comparison.comparison.removed.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-red-700">Riscos Removidos</h3>
                    <div className="space-y-2">
                      {comparison.comparison.removed.map((risk: any, idx: number) => (
                        <Card key={idx} className="border-red-200 bg-red-50">
                          <CardContent className="pt-4">
                            <p className="font-medium">{risk.title || risk.riskDescription}</p>
                            {risk.description && <p className="text-sm text-muted-foreground mt-1">{risk.description}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Riscos Modificados */}
                {comparison.comparison.modified.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-yellow-700">Riscos Modificados</h3>
                    <div className="space-y-2">
                      {comparison.comparison.modified.map((risk: any, idx: number) => (
                        <Card key={idx} className="border-yellow-200 bg-yellow-50">
                          <CardContent className="pt-4">
                            <p className="font-medium">{risk.title || risk.riskDescription}</p>
                            {risk.description && <p className="text-sm text-muted-foreground mt-1">{risk.description}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ComplianceLayout>
  );
}
