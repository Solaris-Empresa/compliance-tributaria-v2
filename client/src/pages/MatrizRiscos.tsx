import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Edit2, History, Loader2, Plus, Sparkles, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { COSO_COMPONENTS } from "@shared/translations";

const RISK_LEVELS = {
  baixo: { label: "Baixo", color: "bg-green-100 text-green-800 border-green-200" },
  medio: { label: "Médio", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  alto: { label: "Alto", color: "bg-orange-100 text-orange-800 border-orange-200" },
  critico: { label: "Crítico", color: "bg-red-100 text-red-800 border-red-200" },
};

const PROBABILITY_LEVELS = [
  { value: "muito_baixa", label: "Muito Baixa" },
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

const IMPACT_LEVELS = [
  { value: "muito_baixo", label: "Muito Baixo" },
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
];

export default function MatrizRiscos() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0");
  
  const [showNewRiskDialog, setShowNewRiskDialog] = useState(false);
  const [showEditPromptDialog, setShowEditPromptDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [filterComponent, setFilterComponent] = useState<string>("todos");
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>("todos");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    component: "ambiente_controle" as any,
    probability: "media" as any,
    impact: "medio" as any,
    prompt: "",
  });

  const [editedPrompt, setEditedPrompt] = useState("");

  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: risks, refetch } = trpc.riskMatrix.listByProject.useQuery({ projectId });
  const { data: promptHistory } = trpc.riskMatrix.getPromptHistory.useQuery(
    { riskId: selectedRisk?.id || 0 },
    { enabled: !!selectedRisk?.id }
  );

  const createRisk = trpc.riskMatrix.create.useMutation({
    onSuccess: () => {
      setShowNewRiskDialog(false);
      refetch();
      toast.success("Risco cadastrado com sucesso!");
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar risco: ${error.message}`);
    },
  });

  const updatePrompt = trpc.riskMatrix.updatePrompt.useMutation({
    onSuccess: () => {
      setShowEditPromptDialog(false);
      refetch();
      toast.success("Prompt atualizado e descrição regenerada!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar prompt: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      component: "ambiente_controle",
      probability: "media",
      impact: "medio",
      prompt: "",
    });
  };

  const handleCreateRisk = () => {
    if (!formData.title || !formData.description) {
      toast.error("Preencha título e descrição");
      return;
    }

    createRisk.mutate({
      projectId,
      ...formData,
    });
  };

  const handleUpdatePrompt = () => {
    if (!selectedRisk) return;
    updatePrompt.mutate({
      riskId: selectedRisk.id,
      newPrompt: editedPrompt,
    });
  };

  const calculateRiskLevel = (probability: string, impact: string): string => {
    const probValue = PROBABILITY_LEVELS.findIndex((p) => p.value === probability);
    const impactValue = IMPACT_LEVELS.findIndex((i) => i.value === impact);
    const score = probValue + impactValue;

    if (score >= 5) return "critico";
    if (score >= 4) return "alto";
    if (score >= 2) return "medio";
    return "baixo";
  };

  const filteredRisks = risks?.filter((risk) => {
    if (filterComponent !== "todos" && risk.component !== filterComponent) return false;
    if (filterRiskLevel !== "todos" && risk.riskLevel !== filterRiskLevel) return false;
    return true;
  });

  const risksByComponent = risks?.reduce((acc: any, risk) => {
    if (!acc[risk.component]) acc[risk.component] = [];
    acc[risk.component].push(risk);
    return acc;
  }, {});

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
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href={`/projetos/${projectId}`}>
              <a className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar para Projeto
              </a>
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Matriz de Riscos</h1>
              <p className="text-muted-foreground mt-1">{project.name}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Identificação e análise de riscos por componente COSO
              </p>
            </div>
            <Button onClick={() => setShowNewRiskDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Risco
            </Button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <span>Assessment</span>
              <span>→</span>
              <span>Briefing</span>
              <span>→</span>
              <span className="font-medium text-primary">Matriz de Riscos</span>
              <span>→</span>
              <span>Plano de Ação</span>
              <span>→</span>
              <span>Execução</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: "60%" }}></div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Componente COSO</Label>
                <Select value={filterComponent} onValueChange={setFilterComponent}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {Object.entries(COSO_COMPONENTS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Nível de Risco</Label>
                <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {Object.entries(RISK_LEVELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(RISK_LEVELS).map(([level, { label, color }]) => {
            const count = risks?.filter((r) => r.riskLevel === level).length || 0;
            return (
              <Card key={level}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <Badge className={color}>{label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Risks by Component */}
        {Object.entries(COSO_COMPONENTS).map(([componentKey, componentLabel]) => {
          const componentRisks = risksByComponent?.[componentKey] || [];
          if (filterComponent !== "todos" && filterComponent !== componentKey) return null;
          if (componentRisks.length === 0) return null;

          return (
            <Card key={componentKey} className="mb-6">
              <CardHeader>
                <CardTitle>{componentLabel}</CardTitle>
                <CardDescription>{componentRisks.length} risco(s) identificado(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {componentRisks
                    .filter((risk) => filterRiskLevel === "todos" || risk.riskLevel === filterRiskLevel)
                    .map((risk: any) => (
                      <Card key={risk.id} className="border-l-4" style={{
                        borderLeftColor: risk.riskLevel === "critico" ? "#dc2626" :
                          risk.riskLevel === "alto" ? "#ea580c" :
                          risk.riskLevel === "medio" ? "#ca8a04" : "#16a34a"
                      }}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-base">{risk.title}</CardTitle>
                                <Badge className={RISK_LEVELS[risk.riskLevel as keyof typeof RISK_LEVELS].color}>
                                  {RISK_LEVELS[risk.riskLevel as keyof typeof RISK_LEVELS].label}
                                </Badge>
                              </div>
                              <CardDescription>{risk.description}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRisk(risk);
                                  setShowHistoryDialog(true);
                                }}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRisk(risk);
                                  setEditedPrompt(risk.prompt || "");
                                  setShowEditPromptDialog(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Probabilidade:</span>{" "}
                              <span className="font-medium">
                                {PROBABILITY_LEVELS.find((p) => p.value === risk.probability)?.label}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Impacto:</span>{" "}
                              <span className="font-medium">
                                {IMPACT_LEVELS.find((i) => i.value === risk.impact)?.label}
                              </span>
                            </div>
                          </div>
                          {risk.prompt && (
                            <div className="mt-4 p-3 bg-muted rounded text-xs font-mono">
                              <strong>Prompt:</strong> {risk.prompt.substring(0, 100)}...
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Empty State */}
        {(!risks || risks.length === 0) && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum risco cadastrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Comece identificando os riscos do projeto baseado no briefing
              </p>
              <Button onClick={() => setShowNewRiskDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Risco
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {risks && risks.length > 0 && (
          <div className="flex justify-end mt-6">
            <Button onClick={() => setLocation(`/projetos/${projectId}/plano-acao`)}>
              Gerar Plano de Ação
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* New Risk Dialog */}
        <Dialog open={showNewRiskDialog} onOpenChange={setShowNewRiskDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Risco</DialogTitle>
              <DialogDescription>
                Cadastre um novo risco identificado no projeto
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Título do Risco</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Falta de documentação fiscal"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descreva o risco em detalhes..."
                />
              </div>
              <div>
                <Label>Componente COSO</Label>
                <Select
                  value={formData.component}
                  onValueChange={(value) => setFormData({ ...formData, component: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COSO_COMPONENTS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Probabilidade</Label>
                  <Select
                    value={formData.probability}
                    onValueChange={(value) => setFormData({ ...formData, probability: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROBABILITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impacto</Label>
                  <Select
                    value={formData.impact}
                    onValueChange={(value) => setFormData({ ...formData, impact: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMPACT_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Prompt (Opcional)</Label>
                <Textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  rows={3}
                  placeholder="Instruções para IA refinar a descrição do risco..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se fornecido, a IA usará este prompt para gerar uma descrição mais detalhada
                </p>
              </div>
              <div className="p-3 bg-muted rounded">
                <p className="text-sm">
                  <strong>Nível de Risco Calculado:</strong>{" "}
                  <Badge className={RISK_LEVELS[calculateRiskLevel(formData.probability, formData.impact) as keyof typeof RISK_LEVELS].color}>
                    {RISK_LEVELS[calculateRiskLevel(formData.probability, formData.impact) as keyof typeof RISK_LEVELS].label}
                  </Badge>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewRiskDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateRisk} disabled={createRisk.isPending}>
                {createRisk.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Cadastrar Risco"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Prompt Dialog */}
        <Dialog open={showEditPromptDialog} onOpenChange={setShowEditPromptDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Prompt do Risco</DialogTitle>
              <DialogDescription>
                Atualize as instruções para a IA refinar a descrição
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                placeholder="Digite as instruções para refinar a descrição..."
              />
              <p className="text-xs text-muted-foreground">
                Ao salvar, a descrição do risco será regenerada automaticamente com base no novo prompt.
                O histórico de versões será mantido.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditPromptDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdatePrompt} disabled={updatePrompt.isPending}>
                {updatePrompt.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando e Regenerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Salvar e Regenerar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico de Versões do Prompt</DialogTitle>
              <DialogDescription>
                Todas as versões anteriores do prompt para este risco
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {promptHistory?.map((history, index) => (
                <Card key={history.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Versão {promptHistory.length - index}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {new Date(history.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded text-xs font-mono whitespace-pre-wrap">
                      {history.promptText}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!promptHistory || promptHistory.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum histórico de prompt disponível
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ComplianceLayout>
  );
}
