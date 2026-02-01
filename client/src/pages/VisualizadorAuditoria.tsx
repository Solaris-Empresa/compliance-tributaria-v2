/**
 * Visualizador de Auditoria
 * Sprint V19 - Feature 2
 * 
 * Página para visualizar histórico completo de mudanças com filtros
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft, Calendar, User, FileText, AlertCircle } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";

export default function VisualizadorAuditoria() {
  const [, setLocation] = useLocation();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [filters, setFilters] = useState<{
    userId?: number;
    entityType?: "action" | "task" | "corporate_assessment" | "branch_assessment" | "corporate_question" | "branch_question";
    startDate?: string;
    endDate?: string;
  }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("projectId");
    if (id) setProjectId(parseInt(id));
  }, []);

  const { data, isLoading } = trpc.auditLogs.list.useQuery(
    { projectId: projectId!, ...filters },
    { enabled: !!projectId }
  );

  const logs = data?.logs || [];

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

  const getActionColor = (action: string) => {
    switch (action) {
      case "create": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "update": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "delete": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "status_change": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      action: "Ação",
      task: "Tarefa",
      corporate_assessment: "Avaliação Corporativa",
      branch_assessment: "Avaliação por Ramo",
      corporate_question: "Questão Corporativa",
      branch_question: "Questão por Ramo",
    };
    return labels[type] || type;
  };

  return (
    <div className="container py-8">
      <Button variant="ghost" onClick={() => setLocation("/projetos")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Visualizador de Auditoria</h1>
        <p className="text-muted-foreground">
          Histórico completo de mudanças no projeto
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refine a visualização do histórico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="entityType">Tipo de Entidade</Label>
              <Select
                value={filters.entityType}
                onValueChange={(value) => setFilters({ ...filters, entityType: value === "all" ? undefined : value as any })}
              >
                <SelectTrigger id="entityType">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="action">Ação</SelectItem>
                  <SelectItem value="task">Tarefa</SelectItem>
                  <SelectItem value="corporate_assessment">Avaliação Corporativa</SelectItem>
                  <SelectItem value="branch_assessment">Avaliação por Ramo</SelectItem>
                  <SelectItem value="corporate_question">Questão Corporativa</SelectItem>
                  <SelectItem value="branch_question">Questão por Ramo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setFilters({
                  userId: undefined,
                  entityType: undefined,
                  startDate: undefined,
                  endDate: undefined,
                })}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {logs && logs.length > 0 ? (
            logs.map((log) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getActionColor(log.action)}>
                          {log.action.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {getEntityTypeLabel(log.entityType)}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">
                        {log.entityType} #{log.entityId}
                      </CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        {log.userName}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {Object.keys(log.changes).length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4" />
                        Alterações:
                      </div>
                      <div className="bg-muted p-3 rounded-md">
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Nenhum log encontrado
                </CardTitle>
                <CardDescription>
                  Não há registros de auditoria para os filtros selecionados.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
