import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function AssessmentFase1() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0");

  const [formData, setFormData] = useState({
    taxRegime: "",
    companySize: "",
    annualRevenue: "",
    businessSector: "",
    mainActivity: "",
    employeeCount: "",
    hasAccountingDept: "",
    currentERPSystem: "",
    mainChallenges: "",
    complianceGoals: "",
  });

  const { data: project } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );
  const { data: existingAssessment } = trpc.assessmentPhase1.get.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const savePhase1 = trpc.assessmentPhase1.save.useMutation({
    onSuccess: () => {
      toast.success("Assessment Fase 1 salvo com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const completePhase1 = trpc.assessmentPhase1.complete.useMutation({
    onSuccess: () => {
      toast.success("Fase 1 concluída! Avançando para Fase 2...");
      setLocation(`/projetos/${projectId}/assessment/fase2`);
    },
    onError: (error) => {
      toast.error(`Erro ao finalizar: ${error.message}`);
    },
  });

  // Carregar dados existentes
  useEffect(() => {
    if (existingAssessment) {
      setFormData({
        taxRegime: existingAssessment.taxRegime || "",
        companySize: existingAssessment.companySize || "",
        annualRevenue: existingAssessment.annualRevenue?.toString() || "",
        businessSector: existingAssessment.businessSector || "",
        mainActivity: existingAssessment.mainActivity || "",
        employeeCount: existingAssessment.employeeCount?.toString() || "",
        hasAccountingDept: existingAssessment.hasAccountingDept || "",
        currentERPSystem: existingAssessment.currentERPSystem || "",
        mainChallenges: existingAssessment.mainChallenges || "",
        complianceGoals: existingAssessment.complianceGoals || "",
      });
    }
  }, [existingAssessment]);

  // Salvamento automático a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.values(formData).some(v => v !== "")) {
        handleSaveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData]);

  const handleSaveDraft = () => {
    savePhase1.mutate({
      projectId,
      ...formData,
      annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : undefined,
      employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : undefined,
    });
  };

  const handleComplete = async () => {
    try {
      console.log('[handleComplete] Iniciando... projectId:', projectId);
      
      // Validar campos obrigatórios
      const requiredFields = [
        "taxRegime",
        "companySize",
        "annualRevenue",
        "businessSector",
        "mainActivity",
      ];

      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

      if (missingFields.length > 0) {
        toast.error("Preencha todos os campos obrigatórios antes de continuar");
        return;
      }

      console.log('[handleComplete] Campos validados, salvando dados...');
      // Primeiro salvar os dados
      const saveResult = await savePhase1.mutateAsync({
        projectId,
        ...formData,
        annualRevenue: parseFloat(formData.annualRevenue),
        employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : undefined,
      });
      console.log('[handleComplete] Dados salvos com sucesso:', saveResult);

      console.log('[handleComplete] Completando fase com projectId:', projectId);
      // Depois completar a fase
      const completeResult = await completePhase1.mutateAsync({ projectId });
      console.log('[handleComplete] Fase completada com sucesso:', completeResult);
    } catch (error) {
      console.error('[handleComplete] Erro capturado:', error);
      toast.error(`Erro ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href={`/projetos/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
                Voltar para Projeto
              </Link>
          </Button>
          <h1 className="text-3xl font-bold">Assessment - Fase 1</h1>
          <p className="text-muted-foreground mt-1">
            {project.name}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Perguntas básicas sobre regime tributário e características da empresa
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span className="font-medium text-primary">Fase 1</span>
            <span>→</span>
            <span>Fase 2</span>
            <span>→</span>
            <span>Briefing</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary w-1/3 transition-all"></div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Campos marcados com * são obrigatórios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Regime Tributário */}
            <div className="space-y-2">
              <Label htmlFor="taxRegime">Regime Tributário *</Label>
              <Select
                value={formData.taxRegime}
                onValueChange={(value) => setFormData({ ...formData, taxRegime: value })}
              >
                <SelectTrigger id="taxRegime">
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

            {/* Porte da Empresa */}
            <div className="space-y-2">
              <Label htmlFor="companySize">Porte da Empresa *</Label>
              <Select
                value={formData.companySize}
                onValueChange={(value) => setFormData({ ...formData, companySize: value })}
              >
                <SelectTrigger id="companySize">
                  <SelectValue placeholder="Selecione o porte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mei">MEI</SelectItem>
                  <SelectItem value="microempresa">Microempresa</SelectItem>
                  <SelectItem value="pequena">Pequena Empresa</SelectItem>
                  <SelectItem value="media">Média Empresa</SelectItem>
                  <SelectItem value="grande">Grande Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Faturamento Anual */}
            <div className="space-y-2">
              <Label htmlFor="annualRevenue">Faturamento Anual (R$) *</Label>
              <Input
                id="annualRevenue"
                type="number"
                placeholder="Ex: 5000000"
                value={formData.annualRevenue}
                onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Informe o faturamento anual aproximado em reais
              </p>
            </div>

            {/* Setor de Atuação */}
            <div className="space-y-2">
              <Label htmlFor="businessSector">Setor de Atuação *</Label>
              <Select
                value={formData.businessSector}
                onValueChange={(value) => setFormData({ ...formData, businessSector: value })}
              >
                <SelectTrigger id="businessSector">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercio">Comércio</SelectItem>
                  <SelectItem value="industria">Indústria</SelectItem>
                  <SelectItem value="servicos">Serviços</SelectItem>
                  <SelectItem value="transporte">Transporte e Logística</SelectItem>
                  <SelectItem value="tecnologia">Tecnologia</SelectItem>
                  <SelectItem value="saude">Saúde</SelectItem>
                  <SelectItem value="educacao">Educação</SelectItem>
                  <SelectItem value="construcao">Construção Civil</SelectItem>
                  <SelectItem value="agronegocio">Agronegócio</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atividade Principal */}
            <div className="space-y-2">
              <Label htmlFor="mainActivity">Atividade Principal *</Label>
              <Input
                id="mainActivity"
                placeholder="Ex: Transporte rodoviário de cargas"
                value={formData.mainActivity}
                onChange={(e) => setFormData({ ...formData, mainActivity: e.target.value })}
              />
            </div>

            {/* Número de Funcionários */}
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

            {/* Departamento Contábil */}
            <div className="space-y-2">
              <Label htmlFor="hasAccountingDept">Possui Departamento Contábil Interno?</Label>
              <Select
                value={formData.hasAccountingDept}
                onValueChange={(value) => setFormData({ ...formData, hasAccountingDept: value })}
              >
                <SelectTrigger id="hasAccountingDept">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="terceirizado">Terceirizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sistema ERP */}
            <div className="space-y-2">
              <Label htmlFor="currentERPSystem">Sistema ERP Atual</Label>
              <Input
                id="currentERPSystem"
                placeholder="Ex: SAP, TOTVS, Conta Azul"
                value={formData.currentERPSystem}
                onChange={(e) => setFormData({ ...formData, currentERPSystem: e.target.value })}
              />
            </div>

            {/* Principais Desafios */}
            <div className="space-y-2">
              <Label htmlFor="mainChallenges">Principais Desafios Tributários</Label>
              <Textarea
                id="mainChallenges"
                placeholder="Descreva os principais desafios ou dificuldades relacionados à gestão tributária"
                value={formData.mainChallenges}
                onChange={(e) => setFormData({ ...formData, mainChallenges: e.target.value })}
                rows={4}
              />
            </div>

            {/* Objetivos de Compliance */}
            <div className="space-y-2">
              <Label htmlFor="complianceGoals">Objetivos com o Compliance</Label>
              <Textarea
                id="complianceGoals"
                placeholder="O que espera alcançar com a adequação à reforma tributária?"
                value={formData.complianceGoals}
                onChange={(e) => setFormData({ ...formData, complianceGoals: e.target.value })}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-8 flex gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={savePhase1.isPending}
          >
            {savePhase1.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Rascunho
              </>
            )}
          </Button>
          <Button
            onClick={handleComplete}
            disabled={completePhase1.isPending}
            className="flex-1"
          >
            {completePhase1.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                Finalizar Fase 1 e Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Salvamento automático:</strong> Suas respostas são salvas automaticamente a cada 30 segundos.
              Você pode sair e voltar depois para continuar de onde parou.
            </p>
          </CardContent>
        </Card>
      </div>
    </ComplianceLayout>
  );
}
