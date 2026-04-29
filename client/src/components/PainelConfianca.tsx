/**
 * PainelConfianca.tsx — Painel de Confiança M2 PR-B
 *
 * Sticky sidebar (coluna direita) com 6 seções:
 *   PC-01: Score de Confiança (gauge visual)
 *   PC-02: Status do Arquétipo (badge semântico)
 *   PC-03: Dimensões Canônicas (5 dims com preenchimento)
 *   PC-04: Blockers Ativos (lista com severity)
 *   PC-05: Campos Faltantes (checklist)
 *   PC-06: Metadata (hash, versão, timestamps)
 *
 * Ref: feat/m2-pr-b-frontend-perfil · PROMPT-M2-v3-FINAL.json §B2
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Lock,
  Fingerprint,
  Layers,
  Clock,
} from "lucide-react";
import type { PerfilEntidadeState } from "@/hooks/usePerfilEntidade";
import { cn } from "@/lib/utils";

// ─── Mapeamento de labels para dimensões ────────────────────────────────────
const DIMENSION_LABELS: Record<string, string> = {
  objeto: "Objeto Econômico",
  papel_na_cadeia: "Papel na Cadeia",
  tipo_de_relacao: "Tipo de Relação",
  territorio: "Território",
  regime: "Regime Tributário",
};

// ─── Mapeamento de status → visual ─────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  inconsistente: { label: "Inconsistente", color: "bg-orange-100 text-orange-800 border-orange-200", icon: AlertTriangle },
  bloqueado: { label: "Bloqueado", color: "bg-red-100 text-red-800 border-red-200", icon: ShieldX },
  confirmado: { label: "Confirmado", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: ShieldCheck },
  loading: { label: "Carregando...", color: "bg-gray-100 text-gray-600 border-gray-200", icon: Info },
  error: { label: "Erro", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  HARD_BLOCK: { label: "Bloqueio Crítico", color: "bg-red-100 text-red-700 border-red-200" },
  BLOCK_FLOW: { label: "Bloqueio de Fluxo", color: "bg-orange-100 text-orange-700 border-orange-200" },
  INFO: { label: "Informativo", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

interface PainelConfiancaProps {
  state: PerfilEntidadeState;
}

export default function PainelConfianca({ state }: PainelConfiancaProps) {
  const statusConfig = STATUS_CONFIG[state.status] ?? STATUS_CONFIG.pendente;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-4">
      {/* PC-01: Score de Confiança */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Score de Confiança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress value={state.confidenceScore} className="h-3" />
            </div>
            <span className={cn(
              "text-lg font-bold tabular-nums",
              state.confidenceScore >= 80 ? "text-emerald-600" :
              state.confidenceScore >= 50 ? "text-amber-600" :
              "text-red-600"
            )}>
              {state.confidenceScore}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {state.confidenceScore >= 80 ? "Perfil completo e consistente" :
             state.confidenceScore >= 50 ? "Perfil parcialmente completo" :
             "Perfil incompleto — preencha os campos obrigatórios"}
          </p>
        </CardContent>
      </Card>

      {/* PC-02: Status do Arquétipo */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            Status do Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className={cn("text-xs px-2.5 py-1", statusConfig.color)}>
            {statusConfig.label}
          </Badge>
          {state.isConfirmed && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Imutável — confirmado em {state.confirmedAt ? new Date(state.confirmedAt).toLocaleDateString("pt-BR") : "—"}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PC-03: Dimensões Canônicas */}
      {state.snapshot && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dimensões Canônicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
              const val = (state.snapshot as Record<string, unknown>)?.[key];
              const filled = val !== null && val !== undefined &&
                (Array.isArray(val) ? val.length > 0 : typeof val === "string" && val.length > 0);
              const displayVal = Array.isArray(val) ? val.join(", ") : String(val ?? "—");
              return (
                <div key={key} className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {filled ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className="text-xs font-medium truncate">{label}</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn(
                          "text-xs truncate max-w-[120px] text-right",
                          filled ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {filled ? displayVal : "—"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[250px]">
                        <p className="text-xs">{filled ? displayVal : "Não preenchido"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* PC-04: Blockers Ativos */}
      {state.blockers.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Blockers ({state.blockers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.blockers.map((blocker, i) => {
              const sevConfig = SEVERITY_CONFIG[blocker.severity] ?? SEVERITY_CONFIG.INFO;
              return (
                <div key={i} className="flex items-start gap-2">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", sevConfig.color)}>
                    {sevConfig.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground leading-tight">{blocker.rule}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* PC-05: Campos Faltantes */}
      {state.missingFields.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Campos Faltantes ({state.missingFields.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {state.missingFields.map((field, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <XCircle className="h-3 w-3 text-amber-500 shrink-0" />
                  {field}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* PC-06: Metadata */}
      {(state.perfilHash || state.archetypeVersion) && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {state.perfilHash && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Perfil Hash</span>
                <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded max-w-[100px] truncate">
                  {state.perfilHash.slice(0, 12)}…
                </code>
              </div>
            )}
            {state.archetypeVersion && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Versão</span>
                <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                  {state.archetypeVersion}
                </code>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {state.error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{state.error}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
