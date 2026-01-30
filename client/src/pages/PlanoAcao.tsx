// @ts-nocheck
// @ts-ignore - Type mismatches due to incomplete implementation
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Download, Edit2, Eye, FileText, History, Loader2, Sparkles, XCircle, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PlanoAcao() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0");
  const { user } = useAuth();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalAction, setApprovalAction] = useState<"aprovar" | "rejeitar">("aprovar");
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showTemplateSelectionDialog, setShowTemplateSelectionDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null);
  const [templateData, setTemplateData] = useState({
    name: "",
    description: "",
    taxRegime: "" as "simples_nacional" | "lucro_presumido" | "lucro_real" | "mei" | "",
    businessType: "",
    companySize: "" as "mei" | "pequena" | "media" | "grande" | "",
  });

  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: actionPlan, refetch } = trpc.actionPlan.get.useQuery({ projectId });
  const { data: promptHistory } = trpc.actionPlan.get.useQuery(
    { planId: actionPlan?.id || 0 },
    { enabled: !!actionPlan?.id }
  );
  const { data: compatibleTemplates = [] } = trpc.templates.search.useQuery(
    {
      taxRegime: project?.taxRegime || undefined,
      companySize: project?.companySize || undefined,
    },
    { enabled: !!project && showTemplateSelectionDialog }
  );

  const { data: previewTemplate } = trpc.templates.getById.useQuery(
    { id: previewTemplateId || 0 },
    { enabled: !!previewTemplateId && showTemplatePreview }
  );

  const generatePlan = trpc.actionPlan.generate.useMutation({
    onSuccess: () => {
      setIsGenerating(false);
      refetch();
      toast.success("Plano de ação gerado com sucesso!");
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast.error(`Erro ao gerar plano: ${error.message}`);
    },
  });

  const updatePrompt = trpc.actionPlan.create.useMutation({
    onSuccess: () => {
      setIsEditingPrompt(false);
      refetch();
      toast.success("Prompt atualizado e plano regenerado!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar prompt: ${error.message}`);
    },
  });

  const approvePlan = trpc.actionPlan.approve.useMutation({
    onSuccess: (data) => {
      setShowApprovalDialog(false);
      refetch();
      const tasksMsg = data.tasksCreated > 0 
        ? ` ${data.tasksCreated} tarefa(s) criada(s) no Kanban.`
        : '';
      toast.success(`Plano aprovado com sucesso!${tasksMsg}`);
      setTimeout(() => {
        setLocation(`/projetos/${projectId}/kanban`);
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(`Erro ao aprovar plano: ${error.message}`);
    },
  });

  const rejectPlan = trpc.actionPlan.reject.useMutation({
    onSuccess: () => {
      setShowApprovalDialog(false);
      refetch();
      toast.success("Plano rejeitado. Solicitação de ajustes enviada.");
    },
    onError: (error: any) => {
      toast.error(`Erro ao rejeitar plano: ${error.message}`);
    },
  });

  const saveAsTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      setShowSaveTemplateDialog(false);
      toast.success("Template criado com sucesso!");
      setTemplateData({
        name: "",
        description: "",
        taxRegime: "",
        businessType: "",
        companySize: "",
      });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });

  const applyTemplate = trpc.templates.applyTemplate.useMutation({
    onSuccess: () => {
      setShowTemplateSelectionDialog(false);
      setIsGenerating(false);
      refetch();
      toast.success("Template aplicado com sucesso!");
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast.error(`Erro ao aplicar template: ${error.message}`);
    },
  });

  // Buscar briefing para verificar se está disponível
  const { data: briefing } = trpc.briefing.get.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  useEffect(() => {
    console.log('[PlanoAcao useEffect] Verificando condições:', {
      hasProject: !!project,
      hasActionPlan: !!actionPlan,
      isGenerating,
      hasBriefing: !!briefing,
      projectId,
    });
    
    if (project && !actionPlan && !isGenerating && briefing) {
      console.log('[PlanoAcao] Iniciando geração automática do plano...');
      setIsGenerating(true);
      generatePlan.mutate({ projectId });
    } else {
      console.log('[PlanoAcao] Condições não atendidas para geração automática');
    }
  }, [project, actionPlan, projectId, isGenerating, briefing]);

  useEffect(() => {
    if (actionPlan && !editedPrompt) {
      setEditedPrompt(actionPlan.prompt || "");
    }
  }, [actionPlan, editedPrompt]);

  const handleSavePrompt = () => {
    if (!actionPlan) return;
    updatePrompt.mutate({
      planId: actionPlan.id,
      newPrompt: editedPrompt,
    });
  };

  const handleApprovalSubmit = () => {
    if (!actionPlan) return;
    
    if (approvalAction === "aprovar") {
      approvePlan.mutate({
        planId: actionPlan.id,
        comment: approvalComment,
      });
    } else {
      rejectPlan.mutate({
        planId: actionPlan.id,
        comment: approvalComment,
      });
    }
  };

  const handleOpenSaveTemplate = () => {
    if (project) {
      setTemplateData({
        name: `Template - ${project.name}`,
        description: `Template baseado no projeto ${project.name}`,
        taxRegime: (project as any).taxRegime || "",
        businessType: (project as any).businessType || "",
        companySize: (project as any).companySize || "",
      });
    }
    setShowSaveTemplateDialog(true);
  };

  const handleSaveTemplate = () => {
    if (!templateData.name.trim()) {
      toast.error("Nome do template é obrigatório");
      return;
    }

    if (!actionPlan?.planData) {
      toast.error("Nenhum plano disponível para salvar");
      return;
    }

    saveAsTemplate.mutate({
      name: templateData.name,
      description: templateData.description || undefined,
      taxRegime: templateData.taxRegime || undefined,
      businessType: templateData.businessType || undefined,
      companySize: templateData.companySize || undefined,
      templateData: actionPlan.planData,
    });
  };

  const handleGenerateWithAI = () => {
    setShowTemplateSelectionDialog(false);
    setIsGenerating(true);
    generatePlan.mutate({ projectId });
  };

  const exportPdfMutation = trpc.templates.exportToPdf.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF exportado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao exportar PDF: ${error.message}`);
    },
  });

  const handleExportPreviewPdf = (templateId: number) => {
    toast.info('Gerando PDF...');
    exportPdfMutation.mutate({ id: templateId });
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplateId) {
      toast.error("Selecione um template");
      return;
    }
    setIsGenerating(true);
    applyTemplate.mutate({
      templateId: selectedTemplateId,
      projectId,
    });
  };

  const isAdvogado = user?.role === "advogado_senior";
  const canApprove = isAdvogado && actionPlan?.approvalStatus === "pendente";

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
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href={`/projetos/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
                Voltar para Projeto
              </Link>
          </Button>
          <h1 className="text-3xl font-bold">Plano de Ação</h1>
          <p className="text-muted-foreground mt-1">{project.name}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Plano detalhado de ações para adequação à reforma tributária
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <span>Assessment</span>
              <span>→</span>
              <span>Levantamento Inicial</span>
              <span>→</span>
              <span>Matriz de Riscos</span>
              <span>→</span>
              <span className="font-medium text-primary">Plano de Ação</span>
              <span>→</span>
              <span>Execução</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: "80%" }}></div>
          </div>
        </div>

        {isGenerating && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-center justify-center">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <p className="text-muted-foreground">
                  Gerando plano de ação detalhado com base no Levantamento Inicial e Matriz de Riscos...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {actionPlan && (
          <>
            {actionPlan.approvalStatus && (
              <Card className={`mb-6 ${
                actionPlan.approvalStatus === "aprovado" 
                  ? "bg-green-50 border-green-200" 
                  : actionPlan.approvalStatus === "rejeitado"
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    {actionPlan.approvalStatus === "aprovado" && (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900">Plano Aprovado</p>
                          <p className="text-sm text-green-700">
                            Aprovado em {actionPlan.approvedAt ? new Date(actionPlan.approvedAt).toLocaleDateString() : "N/A"}
                          </p>
                          {actionPlan.approvalComment && (
                            <p className="text-sm text-green-700 mt-1">
                              <strong>Comentário:</strong> {actionPlan.approvalComment}
                            </p>
                          )}
                        </div>
                        {(user?.role === "equipe_solaris" || user?.role === "advogado_senior") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenSaveTemplate}
                            className="bg-white hover:bg-green-50"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar como Template
                          </Button>
                        )}
                      </>
                    )}
                    {actionPlan.approvalStatus === "rejeitado" && (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <div className="flex-1">
                          <p className="font-medium text-red-900">Plano Rejeitado</p>
                          <p className="text-sm text-red-700">
                            Rejeitado em {actionPlan.approvedAt ? new Date(actionPlan.approvedAt).toLocaleDateString() : "N/A"}
                          </p>
                          {actionPlan.approvalComment && (
                            <p className="text-sm text-red-700 mt-1">
                              <strong>Motivo:</strong> {actionPlan.approvalComment}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                    {actionPlan.approvalStatus === "pendente" && (
                      <>
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <div className="flex-1">
                          <p className="font-medium text-yellow-900">Aguardando Aprovação Jurídica</p>
                          <p className="text-sm text-yellow-700">
                            Este plano precisa ser aprovado por um Advogado Sênior antes de prosseguir para execução.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Prompt do Plano</CardTitle>
                    <CardDescription>
                      Instruções base para geração do plano de ação
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {promptHistory && promptHistory.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHistory(true)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        Histórico ({promptHistory.length})
                      </Button>
                    )}
                    {!isEditingPrompt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingPrompt(true)}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditingPrompt ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                      placeholder="Digite as instruções para o plano de ação..."
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSavePrompt}
                        disabled={updatePrompt.isPending}
                      >
                        {updatePrompt.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando e Regenerando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Salvar e Regenerar Plano
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingPrompt(false);
                          setEditedPrompt(actionPlan.prompt || "");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ao salvar, o plano será regenerado automaticamente com base no novo prompt.
                      O histórico de versões será mantido.
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                    {actionPlan.prompt || "Nenhum prompt definido"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Plano Detalhado</CardTitle>
                <CardDescription>
                  Ações, cronograma e responsabilidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{actionPlan.content}</Streamdown>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              {canApprove && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setApprovalAction("rejeitar");
                      setShowApprovalDialog(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar Plano
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setApprovalAction("aprovar");
                      setShowApprovalDialog(true);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aprovar Plano
                  </Button>
                </>
              )}
              {!canApprove && actionPlan.approvalStatus === "aprovado" && (
                <Button
                  className="flex-1"
                  onClick={() => setLocation(`/projetos/${projectId}`)}
                >
                  Ir para Execução
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {!canApprove && actionPlan.approvalStatus === "pendente" && !isAdvogado && (
                <div className="flex-1 text-center text-sm text-muted-foreground">
                  Aguardando aprovação do Advogado Sênior
                </div>
              )}
            </div>

            {actionPlan.approvalStatus === "aprovado" && (
              <Card className="mt-6 bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>Próximo passo:</strong> Com o plano aprovado, você pode iniciar a execução
                    criando tarefas, atribuindo responsáveis e acompanhando o progresso.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {approvalAction === "aprovar" ? "Aprovar Plano de Ação" : "Rejeitar Plano de Ação"}
              </DialogTitle>
              <DialogDescription>
                {approvalAction === "aprovar"
                  ? "Confirme a aprovação do plano de ação. Você pode adicionar comentários opcionais."
                  : "Informe o motivo da rejeição e as alterações necessárias."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={4}
                placeholder={
                  approvalAction === "aprovar"
                    ? "Comentários opcionais..."
                    : "Descreva as alterações necessárias..."
                }
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowApprovalDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleApprovalSubmit}
                disabled={approvePlan.isPending || rejectPlan.isPending}
                className={approvalAction === "rejeitar" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {(approvePlan.isPending || rejectPlan.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {approvalAction === "aprovar" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico de Versões do Prompt</DialogTitle>
              <DialogDescription>
                Todas as versões anteriores do prompt
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {promptHistory?.map((history: any, index: any) => (
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
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showTemplateSelectionDialog} onOpenChange={setShowTemplateSelectionDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Como deseja criar o Plano de Ação?</DialogTitle>
              <DialogDescription>
                Escolha entre gerar um novo plano com IA ou aplicar um template existente
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-3 p-6"
                  onClick={handleGenerateWithAI}
                  disabled={isGenerating}
                >
                  <Sparkles className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="font-semibold">Gerar com IA</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criar plano personalizado usando inteligência artificial
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-3 p-6"
                  onClick={() => {}}
                  disabled
                >
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-semibold">Usar Template</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aplicar template pré-configurado
                    </p>
                  </div>
                </Button>
              </div>

              {compatibleTemplates.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Templates Compatíveis</Label>
                    <span className="text-sm text-muted-foreground">
                      {compatibleTemplates.length} template(s) encontrado(s)
                    </span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {compatibleTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all ${
                          selectedTemplateId === template.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedTemplateId(template.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-semibold">{template.name}</h4>
                              {template.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {template.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {template.taxRegime && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {template.taxRegime === "simples_nacional" && "Simples Nacional"}
                                    {template.taxRegime === "lucro_presumido" && "Lucro Presumido"}
                                    {template.taxRegime === "lucro_real" && "Lucro Real"}
                                    {template.taxRegime === "mei" && "MEI"}
                                  </span>
                                )}
                                {template.companySize && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                    {template.companySize === "mei" && "MEI"}
                                    {template.companySize === "pequena" && "Pequena"}
                                    {template.companySize === "media" && "Média"}
                                    {template.companySize === "grande" && "Grande"}
                                  </span>
                                )}
                                {template.businessType && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    {template.businessType}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <p className="text-xs text-muted-foreground">
                                  Usado {template.usageCount} vez(es)
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewTemplateId(template.id);
                                    setShowTemplatePreview(true);
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Visualizar Aplicação
                                </Button>
                              </div>
                            </div>
                            {selectedTemplateId === template.id && (
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {compatibleTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum template compatível encontrado</p>
                  <p className="text-sm mt-1">
                    Gere um plano com IA e salve-o como template para uso futuro
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTemplateSelectionDialog(false)}
              >
                Cancelar
              </Button>
              {selectedTemplateId && (
                <Button
                  onClick={handleApplyTemplate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Aplicar Template
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Salvar como Template</DialogTitle>
              <DialogDescription>
                Salve este plano aprovado como template para reutilizar em projetos futuros
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nome do Template *</Label>
                <Input
                  id="template-name"
                  value={templateData.name}
                  onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                  placeholder="Ex: Template Reforma Tributária - Comércio Varejista"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Descrição</Label>
                <Textarea
                  id="template-description"
                  value={templateData.description}
                  onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
                  placeholder="Descreva quando este template deve ser usado..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Regime Tributário</Label>
                  <Select
                    value={templateData.taxRegime || "none"}
                    onValueChange={(value) => setTemplateData({ ...templateData, taxRegime: value === "none" ? "" : value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                      <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                      <SelectItem value="mei">MEI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Porte da Empresa</Label>
                  <Select
                    value={templateData.companySize || "none"}
                    onValueChange={(value) => setTemplateData({ ...templateData, companySize: value === "none" ? "" : value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="mei">MEI</SelectItem>
                      <SelectItem value="pequena">Pequena</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="grande">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-business-type">Tipo de Negócio</Label>
                <Input
                  id="template-business-type"
                  value={templateData.businessType}
                  onChange={(e) => setTemplateData({ ...templateData, businessType: e.target.value })}
                  placeholder="Ex: Comércio Varejista, Indústria, Serviços..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSaveTemplateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={saveAsTemplate.isPending}
              >
                {saveAsTemplate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Template
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Preview do Template */}
        <Dialog open={showTemplatePreview} onOpenChange={setShowTemplatePreview}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualização do Template</DialogTitle>
              <DialogDescription>
                Estrutura do plano de ação que será criado ao aplicar este template
              </DialogDescription>
            </DialogHeader>
            {previewTemplate && (() => {
              try {
                const planData = JSON.parse(previewTemplate.templateData);
                const fases = planData.fases || [];
                const acoes = planData.acoes || [];
                const tarefas = planData.tarefas || [];

                return (
                  <div className="space-y-6 py-4">
                    {/* Informações do Template */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">{previewTemplate.name}</CardTitle>
                        {previewTemplate.description && (
                          <CardDescription>{previewTemplate.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {previewTemplate.taxRegime && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {previewTemplate.taxRegime === "simples_nacional" && "Simples Nacional"}
                              {previewTemplate.taxRegime === "lucro_presumido" && "Lucro Presumido"}
                              {previewTemplate.taxRegime === "lucro_real" && "Lucro Real"}
                              {previewTemplate.taxRegime === "mei" && "MEI"}
                            </span>
                          )}
                          {previewTemplate.companySize && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              {previewTemplate.companySize === "mei" && "MEI"}
                              {previewTemplate.companySize === "pequena" && "Pequena"}
                              {previewTemplate.companySize === "media" && "Média"}
                              {previewTemplate.companySize === "grande" && "Grande"}
                            </span>
                          )}
                          {previewTemplate.businessType && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {previewTemplate.businessType}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-3xl font-bold text-blue-600">{fases.length}</p>
                            <p className="text-sm text-muted-foreground mt-1">Fases</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-3xl font-bold text-green-600">{acoes.length}</p>
                            <p className="text-sm text-muted-foreground mt-1">Ações</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-3xl font-bold text-purple-600">{tarefas.length}</p>
                            <p className="text-sm text-muted-foreground mt-1">Tarefas</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Estrutura do Plano */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Estrutura do Plano</h3>
                      {fases.map((fase: any, faseIdx: number) => {
                        const faseTarefas = tarefas.filter((t: any) => t.faseId === fase.id);
                        const faseAcoes = acoes.filter((a: any) => a.faseId === fase.id);
                        
                        return (
                          <Card key={faseIdx}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                  Fase {faseIdx + 1}: {fase.nome}
                                </CardTitle>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span>{faseAcoes.length} ações</span>
                                  <span>•</span>
                                  <span>{faseTarefas.length} tarefas</span>
                                </div>
                              </div>
                              {fase.descricao && (
                                <CardDescription className="mt-2">{fase.descricao}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              {faseAcoes.length > 0 && (
                                <div className="space-y-3">
                                  {faseAcoes.map((acao: any, acaoIdx: number) => {
                                    const acaoTarefas = tarefas.filter((t: any) => t.acaoId === acao.id);
                                    
                                    return (
                                      <div key={acaoIdx} className="pl-4 border-l-2 border-gray-200">
                                        <div className="flex items-start justify-between mb-2">
                                          <p className="font-medium text-sm">
                                            {acaoIdx + 1}. {acao.titulo}
                                          </p>
                                          <span className="text-xs text-muted-foreground">
                                            {acaoTarefas.length} tarefa(s)
                                          </span>
                                        </div>
                                        {acao.descricao && (
                                          <p className="text-sm text-muted-foreground mb-2">{acao.descricao}</p>
                                        )}
                                        {acaoTarefas.length > 0 && (
                                          <div className="space-y-2 mt-2">
                                            {acaoTarefas.map((tarefa: any, tarefaIdx: number) => (
                                              <div key={tarefaIdx} className="pl-4 py-2 bg-gray-50 rounded text-sm">
                                                <div className="flex items-start justify-between">
                                                  <p className="font-medium">{tarefa.titulo}</p>
                                                  {tarefa.prioridade && (
                                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                                      tarefa.prioridade === "alta" ? "bg-red-100 text-red-700" :
                                                      tarefa.prioridade === "media" ? "bg-yellow-100 text-yellow-700" :
                                                      "bg-green-100 text-green-700"
                                                    }`}>
                                                      {tarefa.prioridade === "alta" && "Alta"}
                                                      {tarefa.prioridade === "media" && "Média"}
                                                      {tarefa.prioridade === "baixa" && "Baixa"}
                                                    </span>
                                                  )}
                                                </div>
                                                {tarefa.descricao && (
                                                  <p className="text-muted-foreground mt-1">{tarefa.descricao}</p>
                                                )}
                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                  {tarefa.responsavel && (
                                                    <span>👤 {tarefa.responsavel}</span>
                                                  )}
                                                  {tarefa.prazo && (
                                                    <span>📅 {tarefa.prazo}</span>
                                                  )}
                                                  {tarefa.horasEstimadas && (
                                                    <span>⏱️ {tarefa.horasEstimadas}h</span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              } catch (error) {
                return (
                  <div className="py-8 text-center text-red-600">
                    <p>Erro ao processar template. Formato inválido.</p>
                  </div>
                );
              }
            })()}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTemplatePreview(false)}
              >
                Fechar
              </Button>
              {previewTemplateId && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleExportPreviewPdf(previewTemplateId)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedTemplateId(previewTemplateId);
                      setShowTemplatePreview(false);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Selecionar este Template
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ComplianceLayout>
  );
}
