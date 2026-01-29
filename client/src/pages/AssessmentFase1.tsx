import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

export default function AssessmentFase1() {
  const [, params] = useRoute("/projetos/:id/assessment/fase1");
  const [, setLocation] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;

  const { data: project } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );

  const { data: existingAssessment } = trpc.assessment.getPhase1.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const [formData, setFormData] = useState({
    taxRegime: "",
    businessType: "",
    companySize: "",
    annualRevenue: "",
    employeeCount: "",
    mainActivity: "",
    hasInternationalOperations: "false",
    stateOperations: "",
  });

  useEffect(() => {
    if (existingAssessment) {
      setFormData({
        taxRegime: existingAssessment.taxRegime || "",
        businessType: existingAssessment.businessType || "",
        companySize: existingAssessment.companySize || "",
        annualRevenue: existingAssessment.annualRevenue?.toString() || "",
        employeeCount: existingAssessment.employeeCount?.toString() || "",
        mainActivity: existingAssessment.mainActivity || "",
        hasInternationalOperations: existingAssessment.hasInternationalOperations ? "true" : "false",
        stateOperations: existingAssessment.stateOperations || "",
      });
    }
  }, [existingAssessment]);

  const savePhase1Mutation = trpc.assessment.savePhase1.useMutation({
    onSuccess: () => {
      toast.success("Assessment Fase 1 salvo com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const completePhase1Mutation = trpc.assessment.completePhase1.useMutation({
    onSuccess: () => {
      toast.success("Assessment Fase 1 concluído! Gerando perguntas personalizadas...");
      setLocation(`/projetos/${projectId}/assessment/fase2`);
    },
    onError: (error) => {
      toast.error(`Erro ao concluir: ${error.message}`);
    },
  });

  const handleSave = () => {
    savePhase1Mutation.mutate({
      projectId,
      taxRegime: formData.taxRegime as any,
      businessType: formData.businessType,
      companySize: formData.companySize as any,
      annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue.replace(/[^0-9.]/g, '')) : undefined,
      employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : undefined,
      mainActivity: formData.mainActivity,
      hasInternationalOperations: formData.hasInternationalOperations === "true",
      stateOperations: formData.stateOperations,
    });
  };

  const handleComplete = () => {
    if (!formData.taxRegime || !formData.businessType || !formData.companySize) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    completePhase1Mutation.mutate({
      projectId,
    });
  };

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href={`/projetos/${projectId}`}>
            <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar para Projeto
            </a>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Assessment - Fase 1</h1>
          <p className="text-muted-foreground">
            Responda as perguntas básicas sobre a empresa e o projeto
          </p>
        </div>

        {/* Form */}
        <div className="max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Tributárias</CardTitle>
              <CardDescription>Dados sobre o regime tributário e porte da empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="taxRegime">
                  Regime Tributário <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.taxRegime} onValueChange={(value) => setFormData({ ...formData, taxRegime: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o regime tributário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                    <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    <SelectItem value="mei">MEI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySize">
                  Porte da Empresa <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.companySize} onValueChange={(value) => setFormData({ ...formData, companySize: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o porte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mei">MEI</SelectItem>
                    <SelectItem value="micro">Microempresa</SelectItem>
                    <SelectItem value="pequena">Pequena Empresa</SelectItem>
                    <SelectItem value="media">Média Empresa</SelectItem>
                    <SelectItem value="grande">Grande Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="annualRevenue">Faturamento Anual Estimado</Label>
                <Input
                  id="annualRevenue"
                  type="text"
                  placeholder="Ex: R$ 5.000.000,00"
                  value={formData.annualRevenue}
                  onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeCount">Número de Funcionários</Label>
                <Input
                  id="employeeCount"
                  type="number"
                  placeholder="Ex: 50"
                  value={formData.employeeCount}
                  onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Negócio</CardTitle>
              <CardDescription>Dados sobre a atividade e estrutura da empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="businessType">
                  Tipo de Negócio <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.businessType} onValueChange={(value) => setFormData({ ...formData, businessType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de negócio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="industria">Indústria</SelectItem>
                    <SelectItem value="comercio">Comércio</SelectItem>
                    <SelectItem value="servicos">Serviços</SelectItem>
                    <SelectItem value="transporte">Transporte e Logística</SelectItem>
                    <SelectItem value="tecnologia">Tecnologia</SelectItem>
                    <SelectItem value="saude">Saúde</SelectItem>
                    <SelectItem value="educacao">Educação</SelectItem>
                    <SelectItem value="construcao">Construção Civil</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mainActivity">Atividade Principal</Label>
                <Textarea
                  id="mainActivity"
                  placeholder="Descreva brevemente a atividade principal da empresa"
                  value={formData.mainActivity}
                  onChange={(e) => setFormData({ ...formData, mainActivity: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hasInternationalOperations">Possui Operações Internacionais?</Label>
                <Select value={formData.hasInternationalOperations} onValueChange={(value) => setFormData({ ...formData, hasInternationalOperations: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stateOperations">Estados de Operação</Label>
                <Textarea
                  id="stateOperations"
                  placeholder="Liste os estados onde a empresa opera (ex: SP, RJ, MG)"
                  value={formData.stateOperations}
                  onChange={(e) => setFormData({ ...formData, stateOperations: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={savePhase1Mutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Rascunho
            </Button>
            <Button
              onClick={handleComplete}
              disabled={completePhase1Mutation.isPending || !formData.taxRegime || !formData.businessType || !formData.companySize}
              className="flex items-center gap-2"
            >
              {completePhase1Mutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Concluir e Avançar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ComplianceLayout>
  );
}
