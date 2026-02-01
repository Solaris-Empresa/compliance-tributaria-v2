/**
 * Página de Gerenciamento de Ações
 * Sprint V19 - Feature 1: Integração Inline de Componentes
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ArrowLeft, Plus, AlertCircle } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { ActionEditDialog, ActionDeleteButton, ActionCreateDialog } from "../components/ActionEditor";

export default function GerenciarAcoes() {
  const [, setLocation] = useLocation();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"corporate" | "branch">("corporate");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("projectId");
    if (id) setProjectId(parseInt(id));
  }, []);

  const { data: corporateActions, isLoading: loadingCorporate } = trpc.actionsCrud.list.useQuery(
    { projectId: projectId!, category: "corporate" },
    { enabled: !!projectId }
  );

  const { data: branchActions, isLoading: loadingBranch } = trpc.actionsCrud.list.useQuery(
    { projectId: projectId!, category: "branch" },
    { enabled: !!projectId }
  );

  if (!projectId) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>ID do projeto não fornecido</p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critica": return "destructive";
      case "alta": return "default";
      case "media": return "secondary";
      case "baixa": return "outline";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "IN_PROGRESS": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "OVERDUE": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "SUGGESTED": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getAreaColor = (area: string) => {
    const colors: Record<string, string> = {
      TI: "bg-blue-100 text-blue-800",
      CONT: "bg-green-100 text-green-800",
      FISC: "bg-yellow-100 text-yellow-800",
      JUR: "bg-purple-100 text-purple-800",
      OPS: "bg-orange-100 text-orange-800",
      COM: "bg-pink-100 text-pink-800",
      ADM: "bg-gray-100 text-gray-800",
    };
    return colors[area] || colors.ADM;
  };

  const renderActionsList = (actions: any[] | undefined, isLoading: boolean, category: "corporate" | "branch") => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      );
    }

    if (!actions || actions.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Nenhuma ação encontrada
            </CardTitle>
            <CardDescription>
              Crie novas ações clicando no botão "Nova Ação" acima.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {actions.map((action) => (
          <Card key={action.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 mb-2">
                    {action.title}
                    <Badge variant={getPriorityColor(action.priority)}>
                      {action.priority}
                    </Badge>
                  </CardTitle>
                  {action.description && (
                    <CardDescription className="text-base">
                      {action.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <ActionEditDialog action={action} projectId={projectId!} />
                  <ActionDeleteButton action={action} projectId={projectId!} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Badge className={getStatusColor(action.status)} variant="outline">
                  {action.status}
                </Badge>
                <Badge className={getAreaColor(action.responsibleArea)} variant="outline">
                  {action.responsibleArea}
                </Badge>
                <Badge variant="secondary">
                  {action.taskType}
                </Badge>
                {action.estimatedHours && (
                  <span className="text-sm text-muted-foreground">
                    {action.estimatedHours}h estimadas
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container py-8">
      <Button variant="ghost" onClick={() => setLocation("/planos-acao")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Planos de Ação
      </Button>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerenciar Ações</h1>
          <p className="text-muted-foreground">
            Edite, crie e exclua ações dos planos de ação
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="corporate">Ações Corporativas</TabsTrigger>
            <TabsTrigger value="branch">Ações por Ramo</TabsTrigger>
          </TabsList>
          <ActionCreateDialog projectId={projectId} category={activeTab} ownerId={1} />
        </div>

        <TabsContent value="corporate" className="space-y-4">
          {renderActionsList(corporateActions?.actions, loadingCorporate, "corporate")}
        </TabsContent>

        <TabsContent value="branch" className="space-y-4">
          {renderActionsList(branchActions?.actions, loadingBranch, "branch")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
