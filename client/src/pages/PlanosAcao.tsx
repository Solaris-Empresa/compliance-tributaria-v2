import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Sparkles, Filter, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PlanosAcao() {
  const [, params] = useRoute("/projetos/:id/planos-acao");
  const projectId = Number(params?.id);
  const [, setLocation] = useLocation();

  const { data: corporatePlan, isLoading: loadingCorporate, refetch: refetchCorporate } = 
    trpc.actionPlans.corporate.get.useQuery({ projectId }, { enabled: !!projectId });

  const { data: branchPlans, isLoading: loadingBranches, refetch: refetchBranches } = 
    trpc.actionPlans.branch.list.useQuery({ projectId }, { enabled: !!projectId });

  const generateCorporateMutation = trpc.actionPlans.corporate.generate.useMutation({
    onSuccess: () => refetchCorporate(),
  });

  const generateBranchMutation = trpc.actionPlans.branch.generate.useMutation({
    onSuccess: () => refetchBranches(),
  });

  const [activeTab, setActiveTab] = useState("corporativo");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  if (loadingCorporate || loadingBranches) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderTaskCard = (task: any, index: number) => {
    const areaColors: Record<string, string> = {
      TI: "bg-blue-100 text-blue-800",
      CONT: "bg-green-100 text-green-800",
      FISC: "bg-yellow-100 text-yellow-800",
      JUR: "bg-purple-100 text-purple-800",
      OPS: "bg-orange-100 text-orange-800",
      COM: "bg-pink-100 text-pink-800",
      ADM: "bg-gray-100 text-gray-800",
    };

    const typeLabels: Record<string, string> = {
      STRATEGIC: "Estratégica",
      OPERATIONAL: "Operacional",
      COMPLIANCE: "Compliance",
    };

    return (
      <Card key={index} className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <div className="flex gap-2">
              <Badge className={areaColors[task.responsibleArea] || "bg-gray-100"}>
                {task.responsibleArea}
              </Badge>
              <Badge variant="outline">{typeLabels[task.taskType]}</Badge>
            </div>
          </div>
          <CardDescription>{task.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Prioridade: <strong>{task.priority}</strong></span>
            <span>Prazo estimado: <strong>{task.estimatedDays} dias</strong></span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Planos de Ação</h1>
        <p className="text-muted-foreground mt-2">
          Tarefas organizadas por categoria para preparação da Reforma Tributária
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="corporativo">
            <FileText className="h-4 w-4 mr-2" />
            Plano Corporativo
          </TabsTrigger>
          {branchPlans && branchPlans.length > 0 && (
            <TabsTrigger value="ramos">
              <FileText className="h-4 w-4 mr-2" />
              Planos por Ramo ({branchPlans.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="corporativo" className="space-y-4 mt-6">
          {!corporatePlan ? (
            <Card>
              <CardHeader>
                <CardTitle>Gerar Plano Corporativo</CardTitle>
                <CardDescription>
                  Crie um plano de ação personalizado baseado no questionário corporativo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => generateCorporateMutation.mutate({ projectId })}
                  disabled={generateCorporateMutation.isPending}
                >
                  {generateCorporateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar com IA
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/visualizar-plano-corporativo?projectId=${projectId}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizar Plano Completo
                </Button>
              </div>
              {/* Filtros */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Área Responsável</label>
                      <Select value={filterArea} onValueChange={setFilterArea}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="TI">TI</SelectItem>
                          <SelectItem value="CONT">Contábil</SelectItem>
                          <SelectItem value="FISC">Fiscal</SelectItem>
                          <SelectItem value="JUR">Jurídico</SelectItem>
                          <SelectItem value="OPS">Operações</SelectItem>
                          <SelectItem value="COM">Comercial</SelectItem>
                          <SelectItem value="ADM">ADM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Tipo de Tarefa</label>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="STRATEGIC">Estratégica</SelectItem>
                          <SelectItem value="OPERATIONAL">Operacional</SelectItem>
                          <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Prioridade</label>
                      <Select value={filterPriority} onValueChange={setFilterPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="ALTA">Alta</SelectItem>
                          <SelectItem value="MÉDIA">Média</SelectItem>
                          <SelectItem value="BAIXA">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {(corporatePlan as any).tasks?.length || 0} tarefas geradas
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Versão {corporatePlan.version} • Criado em{" "}
                    {new Date(corporatePlan.generatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => generateCorporateMutation.mutate({ projectId })}
                  disabled={generateCorporateMutation.isPending}
                >
                  {generateCorporateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Regenerar
                </Button>
              </div>

              {((corporatePlan as any).tasks || [])
                .filter((task: any) => {
                  if (filterArea !== "all" && task.responsibleArea !== filterArea) return false;
                  if (filterType !== "all" && task.taskType !== filterType) return false;
                  if (filterPriority !== "all" && task.priority !== filterPriority) return false;
                  return true;
                })
                .map((task: any, index: number) => renderTaskCard(task, index))
              }
            </div>
          )}
        </TabsContent>

        <TabsContent value="ramos" className="space-y-6 mt-6">
          {branchPlans && branchPlans.length > 0 ? (
            <>
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/visualizar-planos-ramo?projectId=${projectId}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizar Todos os Planos
                </Button>
              </div>
              {branchPlans.map((plan: any) => (
              <div key={plan.id} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{plan.branchName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {(plan.tasks || []).length} tarefas • Versão {plan.version}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      generateBranchMutation.mutate({
                        projectId,
                        branchId: plan.branchId,
                      })
                    }
                    disabled={generateBranchMutation.isPending}
                  >
                    {generateBranchMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Regenerar
                  </Button>
                </div>

                <div className="space-y-4">
                  {(plan.tasks || []).map((task: any, index: number) =>
                    renderTaskCard(task, index)
                  )}
                </div>
              </div>
            ))}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Nenhum plano por ramo gerado</CardTitle>
                <CardDescription>
                  Complete os questionários por ramo para gerar os planos de ação específicos
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
