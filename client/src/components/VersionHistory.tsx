import { Clock, User, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface VersionItem {
  id: number;
  version: number;
  generatedAt: Date;
  generatedBy: number;
  archivedAt: Date;
  // Campos específicos de briefing (opcional)
  summaryText?: string;
  gapsAnalysis?: string;
  riskLevel?: string;
  priorityAreas?: string | null;
  // Campos específicos de action plan (opcional)
  planData?: string;
  status?: string;
  approvedAt?: Date | null;
  approvedBy?: number | null;
}

interface VersionHistoryProps {
  versions: VersionItem[];
  currentVersion: number;
  type: "briefing" | "actionPlan";
  onViewVersion: (version: number) => void;
  onRestoreVersion?: (version: number) => void;
}

export function VersionHistory({ 
  versions, 
  currentVersion, 
  type,
  onViewVersion,
  onRestoreVersion 
}: VersionHistoryProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRiskLevelBadge = (level: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      baixo: { variant: "secondary", label: "Baixo" },
      medio: { variant: "default", label: "Médio" },
      alto: { variant: "destructive", label: "Alto" },
      critico: { variant: "destructive", label: "Crítico" },
    };
    const config = variants[level] || { variant: "outline" as const, label: level };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      em_avaliacao: { variant: "default", label: "Em Avaliação" },
      aprovado: { variant: "secondary", label: "Aprovado" },
      reprovado: { variant: "destructive", label: "Reprovado" },
      em_ajuste: { variant: "outline", label: "Em Ajuste" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Versões</CardTitle>
          <CardDescription>
            Nenhuma versão anterior encontrada. Esta é a primeira versão.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Histórico de Versões
        </CardTitle>
        <CardDescription>
          {versions.length} versão(ões) anterior(es) • Versão atual: v{currentVersion}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {versions.map((version, index) => (
            <div key={version.id}>
              <div className="flex items-start gap-4">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      v{version.version}
                    </span>
                  </div>
                  {index < versions.length - 1 && (
                    <div className="w-px h-full bg-border min-h-[60px]" />
                  )}
                </div>

                {/* Version details */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">
                          Versão {version.version}
                        </h4>
                        {type === "briefing" && version.riskLevel && getRiskLevelBadge(version.riskLevel)}
                        {type === "actionPlan" && version.status && getStatusBadge(version.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(version.generatedAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          ID: {version.generatedBy}
                        </div>
                      </div>

                      {type === "briefing" && version.summaryText && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                          {version.summaryText.substring(0, 150)}...
                        </p>
                      )}

                      {type === "actionPlan" && version.approvedAt && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Aprovado em {formatDate(version.approvedAt)} por ID: {version.approvedBy}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewVersion(version.version)}
                      >
                        Visualizar
                      </Button>
                      {onRestoreVersion && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onRestoreVersion(version.version)}
                        >
                          Restaurar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {index < versions.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
