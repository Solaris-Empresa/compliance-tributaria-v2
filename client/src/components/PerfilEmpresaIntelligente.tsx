/**
 * PerfilEmpresaIntelligente.tsx
 * Sprint v6.0 — Issues B1, B2, B3 (UX redesign) + C1, C2, C3, C4 (CPIE integration)
 *
 * Experiência assistida por IA:
 * - Layout em 2 colunas: formulário (esq) + painel de score em tempo real (dir)
 * - Botão "Analisar com IA" → chama CPIE e exibe score por dimensão, perguntas dinâmicas e sugestões
 * - Score de completude e confiança animado
 * - Microcopy contextual e inteligente
 * - CTA principal "Avançar" (não "Salvar" ou botão técnico)
 */
import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, Lock, AlertCircle, Sparkles, Building2, TrendingUp,
  Globe, CreditCard, Shield, ChevronRight, Info, Loader2, Brain,
  Lightbulb, AlertTriangle, ArrowRight, RefreshCw, MessageSquare
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CpieReportExport } from "@/components/CpieReportExport";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PerfilEmpresaData {
  cnpj: string;
  companyType: string;
  companySize: string;
  annualRevenueRange: string;
  taxRegime: string;
  operationType: string;
  clientType: string[];
  multiState: boolean | null;
  hasMultipleEstablishments: boolean | null;
  hasImportExport: boolean | null;
  hasSpecialRegimes: boolean | null;
  paymentMethods: string[];
  hasIntermediaries: boolean | null;
  hasTaxTeam: boolean | null;
  hasAudit: boolean | null;
  hasTaxIssues: boolean | null;
}

export const PERFIL_VAZIO: PerfilEmpresaData = {
  cnpj: "",
  companyType: "",
  companySize: "",
  annualRevenueRange: "",
  taxRegime: "",
  operationType: "",
  clientType: [],
  multiState: null,
  hasMultipleEstablishments: null,
  hasImportExport: null,
  hasSpecialRegimes: null,
  paymentMethods: [],
  hasIntermediaries: null,
  hasTaxTeam: null,
  hasAudit: null,
  hasTaxIssues: null,
};

// Tipos do CPIE (espelham server/cpie.ts)
interface ScoreDimension {
  name: string;
  score: number;
  weight: number;
  explanation: string;
  fieldsEvaluated: string[];
}

interface DynamicQuestion {
  id: string;
  question: string;
  rationale: string;
  field?: string;
  priority: "high" | "medium" | "low";
  category: string;
}

interface ProfileSuggestion {
  id: string;
  field: string;
  currentValue?: string;
  suggestedValue?: string;
  explanation: string;
  confidence: number;
  severity: "info" | "warning" | "critical";
}

interface ProfileInsight {
  id: string;
  title: string;
  description: string;
  category: "risk" | "opportunity" | "compliance" | "transition";
  relevance: "high" | "medium" | "low";
}

interface CpieResult {
  overallScore: number;
  confidenceScore: number;
  dimensions: ScoreDimension[];
  dynamicQuestions: DynamicQuestion[];
  suggestions: ProfileSuggestion[];
  insights: ProfileInsight[];
  readinessLevel: "insufficient" | "basic" | "good" | "excellent";
  readinessMessage: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function validateCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const calc = (d: string, weights: number[]) =>
    weights.reduce((sum, w, i) => sum + parseInt(d[i]) * w, 0);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const r1 = calc(digits, w1) % 11;
  const d1 = r1 < 2 ? 0 : 11 - r1;
  if (parseInt(digits[12]) !== d1) return false;
  const r2 = calc(digits, w2) % 11;
  const d2 = r2 < 2 ? 0 : 11 - r2;
  return parseInt(digits[13]) === d2;
}

/** Calcula score de completude (0-100) e confiança (0-100) */
export function calcProfileScore(p: PerfilEmpresaData): { completeness: number; confidence: number; missingRequired: string[]; missingOptional: string[] } {
  const required: Array<[boolean, string]> = [
    [validateCnpj(p.cnpj), "CNPJ válido"],
    [!!p.companyType, "Tipo Jurídico"],
    [!!p.companySize, "Porte da empresa"],
    [!!p.taxRegime, "Regime Tributário"],
    [!!p.operationType, "Tipo de Operação"],
    [p.clientType.length > 0, "Tipo de Cliente"],
    [p.multiState !== null, "Operação multiestadual"],
  ];
  const optional: Array<[boolean, string]> = [
    [!!p.annualRevenueRange, "Faturamento Anual"],
    [p.hasMultipleEstablishments !== null, "Múltiplos estabelecimentos"],
    [p.hasImportExport !== null, "Importação/Exportação"],
    [p.hasSpecialRegimes !== null, "Regimes Especiais"],
    [p.paymentMethods.length > 0, "Meios de Pagamento"],
    [p.hasIntermediaries !== null, "Intermediários financeiros"],
    [p.hasTaxTeam !== null, "Equipe tributária"],
    [p.hasAudit !== null, "Auditoria fiscal"],
    [p.hasTaxIssues !== null, "Passivo tributário"],
  ];
  const reqDone = required.filter(([ok]) => ok).length;
  const optDone = optional.filter(([ok]) => ok).length;
  const completeness = Math.round((reqDone / required.length) * 70 + (optDone / optional.length) * 30);
  let confidence = completeness;
  if (p.taxRegime === "simples_nacional" && (p.annualRevenueRange === "acima_50m" || p.annualRevenueRange === "10m_50m")) confidence = Math.max(0, confidence - 20);
  if (p.companySize === "mei" && p.taxRegime !== "simples_nacional") confidence = Math.max(0, confidence - 15);
  const missingRequired = required.filter(([ok]) => !ok).map(([, label]) => label);
  const missingOptional = optional.filter(([ok]) => !ok).map(([, label]) => label);
  return { completeness, confidence: Math.min(100, confidence), missingRequired, missingOptional };
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Card de seleção única — substitui dropdowns frios */
function SelectCard({ value, selected, onClick, icon, label, sublabel }: {
  value: string; selected: boolean; onClick: () => void;
  icon?: React.ReactNode; label: string; sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all duration-150 w-full",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/40 hover:bg-muted/20"
      )}
    >
      {selected && (
        <span className="absolute top-2 right-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </span>
      )}
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-sm font-medium leading-tight pr-5">{label}</span>
      {sublabel && <span className="text-xs text-muted-foreground leading-tight">{sublabel}</span>}
    </button>
  );
}

/** Toggle Sim/Não com estilo premium */
function SimNaoToggle({ value, onChange, label, tooltip }: {
  value: boolean | null; onChange: (v: boolean | null) => void;
  label: string; tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-sm leading-snug">{label}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {([[true, "Sim"], [false, "Não"]] as Array<[boolean, string]>).map(([bval, blabel]) => (
          <button
            key={blabel}
            type="button"
            onClick={() => onChange(value === bval ? null : bval)}
            className={cn(
              "px-3 py-1 rounded-lg border text-xs font-medium transition-all",
              value === bval
                ? bval ? "bg-emerald-500 text-white border-emerald-500" : "bg-red-500 text-white border-red-500"
                : "border-border hover:bg-muted/50 text-muted-foreground"
            )}
          >{blabel}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Painel de Score com CPIE ─────────────────────────────────────────────────

function ScorePanel({
  completeness, confidence, missingRequired, missingOptional,
  cpieResult, isAnalyzing, onAnalyze, profileData, restoredFromDb, projectId, projectName,
}: {
  completeness: number; confidence: number; missingRequired: string[]; missingOptional: string[];
  cpieResult: CpieResult | null; isAnalyzing: boolean; onAnalyze: () => void;
  profileData: PerfilEmpresaData; restoredFromDb?: boolean;
  projectId?: number; projectName?: string;
}) {
  const scoreColor = completeness >= 80 ? "text-emerald-600" : completeness >= 50 ? "text-amber-600" : "text-red-500";
  const confidenceColor = confidence >= 80 ? "text-emerald-600" : confidence >= 50 ? "text-amber-600" : "text-red-500";
  const barColor = completeness >= 80 ? "bg-emerald-500" : completeness >= 50 ? "bg-amber-500" : "bg-red-500";
  const confBarColor = confidence >= 80 ? "bg-emerald-500" : confidence >= 50 ? "bg-amber-500" : "bg-red-500";

  const hasMinimumData = !!profileData.companyType && !!profileData.taxRegime;
  const canExport = !!projectId && !!cpieResult;

  return (
    <div className="sticky top-4 space-y-4">
      {/* Score principal */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Qualidade do Perfil</span>
          {restoredFromDb && (
            <Badge variant="secondary" className="text-xs ml-auto gap-1">
              <CheckCircle2 className="h-3 w-3" />Sessão retomada
            </Badge>
          )}
        </div>

        {/* Completude */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Completude</span>
            <span className={cn("text-lg font-bold tabular-nums", scoreColor)}>{completeness}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${completeness}%` }} />
          </div>
        </div>

        {/* Confiança */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Confiança da IA</span>
            <span className={cn("text-lg font-bold tabular-nums", confidenceColor)}>{confidence}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", confBarColor)} style={{ width: `${confidence}%` }} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {confidence >= 80
              ? "Perfil consistente. A IA identificará CNAEs com alta precisão."
              : confidence >= 50
              ? "Perfil parcial. Adicione mais dados para melhorar a análise."
              : "Perfil insuficiente. Preencha os campos obrigatórios."}
          </p>
        </div>

        {/* Botão Analisar com IA */}
        <Button
          size="sm"
          variant={cpieResult ? "outline" : "default"}
          className="w-full gap-2"
          onClick={onAnalyze}
          disabled={isAnalyzing || !hasMinimumData}
        >
          {isAnalyzing ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analisando...</>
          ) : cpieResult ? (
            <><RefreshCw className="h-3.5 w-3.5" />Reanalisar com IA</>
          ) : (
            <><Brain className="h-3.5 w-3.5" />Analisar com IA</>
          )}
        </Button>
        {!hasMinimumData && (
          <p className="text-xs text-muted-foreground text-center -mt-1">Preencha tipo jurídico e regime tributário para ativar</p>
        )}
        {/* Botão Exportar PDF (H3) */}
        {canExport && (
          <CpieReportExport
            projectId={projectId!}
            projectName={projectName || "Projeto"}
            variant="outline"
            size="sm"
            className="w-full gap-2"
          />
        )}
      </div>

      {/* Resultado CPIE */}
      {cpieResult && (
        <>
          {/* Score por dimensão */}
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Score por Dimensão</span>
            </div>
            <div className="space-y-2.5">
              {cpieResult.dimensions.map((dim) => {
                const dimColor = dim.score >= 80 ? "bg-emerald-500" : dim.score >= 50 ? "bg-amber-500" : "bg-red-500";
                const dimTextColor = dim.score >= 80 ? "text-emerald-600" : dim.score >= 50 ? "text-amber-600" : "text-red-500";
                return (
                  <TooltipProvider key={dim.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="space-y-1 cursor-help">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{dim.name}</span>
                            <span className={cn("text-xs font-bold tabular-nums", dimTextColor)}>{dim.score}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-500", dimColor)} style={{ width: `${dim.score}%` }} />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs text-xs">
                        <p className="font-medium mb-1">{dim.explanation}</p>
                        <p className="text-muted-foreground">Peso: {dim.weight}%</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
            <div className={cn(
              "text-xs px-3 py-2 rounded-lg font-medium mt-1",
              cpieResult.readinessLevel === "excellent" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" :
              cpieResult.readinessLevel === "good" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" :
              cpieResult.readinessLevel === "basic" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" :
              "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            )}>
              {cpieResult.readinessMessage}
            </div>
          </div>

          {/* Sugestões de correção */}
          {cpieResult.suggestions.length > 0 && (
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold">Sugestões da IA</span>
                <Badge variant="outline" className="text-xs ml-auto">{cpieResult.suggestions.length}</Badge>
              </div>
              <div className="space-y-2.5">
                {cpieResult.suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className={cn(
                      "rounded-xl p-3 space-y-1.5 border",
                      sug.severity === "critical" ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800" :
                      sug.severity === "warning" ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800" :
                      "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-xs font-semibold",
                        sug.severity === "critical" ? "text-red-700 dark:text-red-400" :
                        sug.severity === "warning" ? "text-amber-700 dark:text-amber-400" :
                        "text-blue-700 dark:text-blue-400"
                      )}>{sug.field}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{sug.confidence}% confiança</span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground/80">{sug.explanation}</p>
                    {sug.suggestedValue && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground line-through">{sug.currentValue}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">{sug.suggestedValue}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Perguntas dinâmicas */}
          {cpieResult.dynamicQuestions.length > 0 && (
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Perguntas da IA</span>
                <Badge variant="outline" className="text-xs ml-auto">{cpieResult.dynamicQuestions.length}</Badge>
              </div>
              <div className="space-y-2.5">
                {cpieResult.dynamicQuestions.map((q) => (
                  <div key={q.id} className="rounded-xl border border-border bg-muted/20 p-3 space-y-1">
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        "shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full",
                        q.priority === "high" ? "bg-red-500" : q.priority === "medium" ? "bg-amber-500" : "bg-blue-400"
                      )} />
                      <p className="text-xs font-medium leading-snug">{q.question}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-3.5">{q.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {cpieResult.insights.length > 0 && (
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-semibold">Insights Tributários</span>
              </div>
              <div className="space-y-2.5">
                {cpieResult.insights.map((ins) => (
                  <div key={ins.id} className={cn(
                    "rounded-xl p-3 space-y-1 border",
                    ins.category === "risk" ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800" :
                    ins.category === "opportunity" ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800" :
                    ins.category === "transition" ? "bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800" :
                    "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800"
                  )}>
                    <p className="text-xs font-semibold">{ins.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ins.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Campos obrigatórios faltantes (quando não há CPIE result) */}
      {!cpieResult && missingRequired.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs font-semibold text-destructive">Obrigatórios ({missingRequired.length})</span>
          </div>
          <ul className="space-y-1">
            {missingRequired.map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-xs text-destructive/80">
                <span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />{f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Campos opcionais faltantes */}
      {!cpieResult && missingRequired.length === 0 && missingOptional.length > 0 && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Melhore o score</span>
          </div>
          <ul className="space-y-1">
            {missingOptional.slice(0, 3).map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-xs text-amber-700/80 dark:text-amber-400/80">
                <ChevronRight className="h-3 w-3 shrink-0" />{f}
              </li>
            ))}
            {missingOptional.length > 3 && (
              <li className="text-xs text-muted-foreground">+{missingOptional.length - 3} outros campos opcionais</li>
            )}
          </ul>
        </div>
      )}

      {/* Perfil completo */}
      {!cpieResult && missingRequired.length === 0 && missingOptional.length === 0 && (
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-50/50 dark:bg-emerald-900/10 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Perfil 100% completo!</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">A IA terá máxima precisão na identificação de CNAEs e no diagnóstico tributário.</p>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface PerfilEmpresaIntelligenteProps {
  value: PerfilEmpresaData;
  onChange: (data: PerfilEmpresaData) => void;
  /** Se true, exibe o painel lateral de score */
  showScorePanel?: boolean;
  /** Descrição do negócio (passada pelo NovoProjeto para enriquecer a análise) */
  description?: string;
  /** ID do projeto existente para retomada de sessão (H1) */
  projectId?: number;
  /** Nome do projeto para o relatório CPIE (H3) */
  projectName?: string;
}

export function PerfilEmpresaIntelligente({ value, onChange, showScorePanel = true, description, projectId, projectName }: PerfilEmpresaIntelligenteProps) {
  const [cnpjError, setCnpjError] = useState("");
  const [cpieResult, setCpieResult] = useState<CpieResult | null>(null);
  const [restoredFromDb, setRestoredFromDb] = useState(false);
  const score = calcProfileScore(value);

  // H1: Carregar análise salva do banco ao abrir projeto existente
  const savedAnalysis = trpc.cpie.getProjectAnalysis.useQuery(
    { projectId: projectId! },
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // 5 min
    }
  );

  // Reagir aos dados salvos via useEffect
  useEffect(() => {
    const data = savedAnalysis.data;
    if (data?.profileIntelligenceData && !cpieResult && !restoredFromDb) {
      const intel = data.profileIntelligenceData as Record<string, unknown>;
      if (intel?.dimensions || intel?.dynamicQuestions || intel?.suggestions) {
        setCpieResult({
          overallScore: (data.profileCompleteness as number) ?? 0,
          confidenceScore: (data.profileConfidence as number) ?? 0,
          dimensions: (intel.dimensions as ScoreDimension[]) ?? [],
          dynamicQuestions: (intel.dynamicQuestions as DynamicQuestion[]) ?? [],
          suggestions: (intel.suggestions as ProfileSuggestion[]) ?? [],
          insights: (intel.insights as ProfileInsight[]) ?? [],
          readinessLevel: (intel.readinessLevel as CpieResult["readinessLevel"]) ?? "basic",
          readinessMessage: (intel.readinessMessage as string) ?? "",
        });
        setRestoredFromDb(true);
        toast.info("ℹ️ Análise IA carregada da sessão anterior.");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAnalysis.data]);

  const analyzeProfile = trpc.cpie.analyze.useMutation({
    onSuccess: (data) => {
      setCpieResult(data as CpieResult);
      toast.success("Análise IA concluída! Veja as sugestões no painel.");
    },
    onError: () => {
      toast.error("Erro ao analisar perfil. Tente novamente.");
    },
  });

  const handleAnalyze = () => {
    analyzeProfile.mutate({
      cnpj: value.cnpj || undefined,
      companyType: value.companyType || undefined,
      companySize: value.companySize || undefined,
      annualRevenueRange: value.annualRevenueRange || undefined,
      taxRegime: value.taxRegime || undefined,
      operationType: value.operationType || undefined,
      clientType: value.clientType.length > 0 ? value.clientType : undefined,
      multiState: value.multiState,
      hasMultipleEstablishments: value.hasMultipleEstablishments,
      hasImportExport: value.hasImportExport,
      hasSpecialRegimes: value.hasSpecialRegimes,
      paymentMethods: value.paymentMethods.length > 0 ? value.paymentMethods : undefined,
      hasIntermediaries: value.hasIntermediaries,
      hasTaxTeam: value.hasTaxTeam,
      hasAudit: value.hasAudit,
      hasTaxIssues: value.hasTaxIssues,
      description: description || undefined,
    });
  };

  const set = useCallback(<K extends keyof PerfilEmpresaData>(key: K, val: PerfilEmpresaData[K]) => {
    onChange({ ...value, [key]: val });
  }, [value, onChange]);

  const toggleArray = useCallback((key: "clientType" | "paymentMethods", item: string) => {
    const arr = value[key] as string[];
    onChange({ ...value, [key]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item] });
  }, [value, onChange]);

  // Validação CNPJ ao sair do campo
  const handleCnpjBlur = () => {
    const digits = value.cnpj.replace(/\D/g, "");
    if (digits.length === 0) { setCnpjError(""); return; }
    if (digits.length !== 14) { setCnpjError("CNPJ incompleto — digite os 14 dígitos"); return; }
    if (!validateCnpj(value.cnpj)) { setCnpjError("CNPJ inválido — verifique os dígitos verificadores"); return; }
    setCnpjError("");
  };

  const cnpjDigits = value.cnpj.replace(/\D/g, "");
  const cnpjOk = validateCnpj(value.cnpj);

  const formContent = (
    <div className="space-y-8">

      {/* ── Seção 1: Identidade ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Identificação</h3>
          <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
        </div>

        {/* CNPJ */}
        <div className="space-y-1.5">
          <Label className="text-sm">CNPJ <span className="text-destructive">*</span></Label>
          <Input
            placeholder="00.000.000/0000-00"
            value={value.cnpj}
            onChange={(e) => set("cnpj", maskCnpj(e.target.value))}
            onBlur={handleCnpjBlur}
            maxLength={18}
            className={cn(
              cnpjError ? "border-destructive focus-visible:ring-destructive" : "",
              cnpjOk ? "border-emerald-500 focus-visible:ring-emerald-500" : ""
            )}
          />
          {cnpjError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{cnpjError}</p>}
          {cnpjOk && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />CNPJ válido</p>}
          {!cnpjOk && !cnpjError && cnpjDigits.length > 0 && cnpjDigits.length < 14 && (
            <p className="text-xs text-muted-foreground">{14 - cnpjDigits.length} dígito(s) restante(s)</p>
          )}
        </div>

        {/* Tipo Jurídico */}
        <div className="space-y-2">
          <Label className="text-sm">Tipo Jurídico <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: "ltda", label: "LTDA", sublabel: "Sociedade Limitada" },
              { value: "sa", label: "S.A.", sublabel: "Sociedade Anônima" },
              { value: "mei", label: "MEI", sublabel: "Microempreendedor Individual" },
              { value: "eireli", label: "EIRELI", sublabel: "Empresa Individual de Resp. Limitada" },
              { value: "slu", label: "SLU", sublabel: "Sociedade Limitada Unipessoal" },
              { value: "outros", label: "Outros", sublabel: "Cooperativa, Associação, etc." },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.companyType === opt.value}
                onClick={() => set("companyType", opt.value)}
                label={opt.label}
                sublabel={opt.sublabel}
              />
            ))}
          </div>
        </div>

        {/* Porte */}
        <div className="space-y-2">
          <Label className="text-sm">Porte da Empresa <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: "mei", label: "MEI", sublabel: "Até R$ 81 mil/ano" },
              { value: "micro", label: "Microempresa", sublabel: "Até R$ 360 mil/ano" },
              { value: "pequena", label: "Pequena", sublabel: "Até R$ 4,8 mi/ano" },
              { value: "media", label: "Média", sublabel: "Até R$ 300 mi/ano" },
              { value: "grande", label: "Grande", sublabel: "Acima de R$ 300 mi/ano" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.companySize === opt.value}
                onClick={() => set("companySize", opt.value)}
                label={opt.label}
                sublabel={opt.sublabel}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Seção 2: Regime Tributário ──────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b">
          <CreditCard className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Regime Tributário</h3>
          <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
        </div>

        {/* Regime */}
        <div className="space-y-2">
          <Label className="text-sm">Regime Atual <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { value: "simples_nacional", label: "Simples Nacional", sublabel: "Receita até R$ 4,8 mi/ano" },
              { value: "lucro_presumido", label: "Lucro Presumido", sublabel: "Receita até R$ 78 mi/ano" },
              { value: "lucro_real", label: "Lucro Real", sublabel: "Obrigatório acima de R$ 78 mi/ano" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.taxRegime === opt.value}
                onClick={() => set("taxRegime", opt.value)}
                label={opt.label}
                sublabel={opt.sublabel}
              />
            ))}
          </div>
        </div>

        {/* Faturamento */}
        <div className="space-y-2">
          <Label className="text-sm">Faturamento Anual Estimado</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "0-360000", label: "Até R$ 360 mil" },
              { value: "360000-4800000", label: "R$ 360 mil – R$ 4,8 mi" },
              { value: "4800000-78000000", label: "R$ 4,8 mi – R$ 78 mi" },
              { value: "78000000+", label: "Acima de R$ 78 mi" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.annualRevenueRange === opt.value}
                onClick={() => set("annualRevenueRange", opt.value)}
                label={opt.label}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Seção 3: Operações ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Operações</h3>
          <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
        </div>

        {/* Tipo de Operação */}
        <div className="space-y-2">
          <Label className="text-sm">Tipo de Operação Principal <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: "industria", label: "Indústria", sublabel: "Fabricação e transformação" },
              { value: "comercio", label: "Comércio", sublabel: "Compra e venda de mercadorias" },
              { value: "servicos", label: "Serviços", sublabel: "Prestação de serviços" },
              { value: "misto", label: "Misto", sublabel: "Comércio + Serviços" },
              { value: "agronegocio", label: "Agronegócio", sublabel: "Atividade rural" },
              { value: "financeiro", label: "Financeiro", sublabel: "Bancos, seguros, fintechs" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.operationType === opt.value}
                onClick={() => set("operationType", opt.value)}
                label={opt.label}
                sublabel={opt.sublabel}
              />
            ))}
          </div>
        </div>

        {/* Tipo de Cliente */}
        <div className="space-y-2">
          <Label className="text-sm">Tipo de Cliente <span className="text-destructive">*</span></Label>
          <p className="text-xs text-muted-foreground">Selecione todos que se aplicam.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: "b2b", label: "B2B", sublabel: "Vende para empresas" },
              { value: "b2c", label: "B2C", sublabel: "Vende para consumidores" },
              { value: "b2g", label: "B2G", sublabel: "Vende para governo" },
              { value: "b2b2c", label: "B2B2C", sublabel: "Modelo híbrido" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.clientType.includes(opt.value)}
                onClick={() => toggleArray("clientType", opt.value)}
                label={opt.label}
                sublabel={opt.sublabel}
              />
            ))}
          </div>
        </div>

        {/* Multi-estado */}
        <div className="space-y-2">
          <Label className="text-sm">Opera em múltiplos estados? <span className="text-destructive">*</span></Label>
          <SimNaoToggle
            value={value.multiState}
            onChange={(v) => set("multiState", v)}
            label="A empresa realiza operações em mais de um estado da federação"
            tooltip="Impacta diretamente o cálculo do ICMS e as obrigações acessórias estaduais sob a nova Reforma Tributária."
          />
        </div>
      </section>

      {/* ── Seção 4: Complexidade ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b">
          <AlertCircle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Complexidade Tributária</h3>
          <Badge variant="outline" className="text-xs">Opcional — melhora o score</Badge>
        </div>
        <div className="space-y-3">
          <SimNaoToggle value={value.hasMultipleEstablishments} onChange={(v) => set("hasMultipleEstablishments", v)}
            label="Possui múltiplos estabelecimentos/filiais?"
            tooltip="Filiais em estados diferentes criam obrigações distintas de ICMS e ISS." />
          <SimNaoToggle value={value.hasImportExport} onChange={(v) => set("hasImportExport", v)}
            label="Realiza operações de importação ou exportação?"
            tooltip="Impacta IBS, CBS e regimes aduaneiros especiais." />
          <SimNaoToggle value={value.hasSpecialRegimes} onChange={(v) => set("hasSpecialRegimes", v)}
            label="Possui regimes tributários especiais (RECOF, Drawback, ZFM, etc.)?"
            tooltip="Regimes especiais podem ser impactados pela transição para o IBS/CBS." />
        </div>
      </section>

      {/* ── Seção 5: Financeiro ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b">
          <CreditCard className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Perfil Financeiro</h3>
          <Badge variant="outline" className="text-xs">Opcional</Badge>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Meios de Pagamento Aceitos</Label>
          <p className="text-xs text-muted-foreground">Selecione todos que se aplicam.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: "cartao", label: "Cartão", sublabel: "Crédito/Débito" },
              { value: "boleto", label: "Boleto", sublabel: "Bancário" },
              { value: "pix", label: "PIX", sublabel: "Transferência instantânea" },
              { value: "dinheiro", label: "Dinheiro", sublabel: "Espécie" },
              { value: "transferencia", label: "TED/DOC", sublabel: "Transferência bancária" },
              { value: "marketplace", label: "Marketplace", sublabel: "Plataforma de terceiros" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.paymentMethods.includes(opt.value)}
                onClick={() => toggleArray("paymentMethods", opt.value)}
                label={opt.label}
                sublabel={opt.sublabel}
              />
            ))}
          </div>
        </div>
        <SimNaoToggle value={value.hasIntermediaries} onChange={(v) => set("hasIntermediaries", v)}
          label="Utiliza intermediários financeiros (factoring, FIDC, antecipação de recebíveis)?"
          tooltip="Pode gerar obrigações adicionais de IOF e retenção na fonte." />
      </section>

      {/* ── Seção 6: Governança ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Governança Tributária</h3>
          <Badge variant="outline" className="text-xs">Opcional</Badge>
        </div>
        <div className="space-y-3">
          <SimNaoToggle value={value.hasTaxTeam} onChange={(v) => set("hasTaxTeam", v)}
            label="Possui equipe tributária interna (contador, advogado fiscal)?"
            tooltip="Empresas sem equipe tributária têm maior risco de não conformidade durante a transição." />
          <SimNaoToggle value={value.hasAudit} onChange={(v) => set("hasAudit", v)}
            label="Realiza auditoria fiscal periódica?"
            tooltip="Auditorias regulares reduzem o risco de passivos tributários ocultos." />
          <SimNaoToggle value={value.hasTaxIssues} onChange={(v) => set("hasTaxIssues", v)}
            label="Possui passivo tributário ou pendências com a Receita Federal?"
            tooltip="Passivos existentes podem ser agravados pela mudança de regime na Reforma Tributária." />
        </div>
      </section>

    </div>
  );

  if (!showScorePanel) return formContent;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div>{formContent}</div>
      <ScorePanel
        {...score}
        cpieResult={cpieResult}
        isAnalyzing={analyzeProfile.isPending}
        onAnalyze={handleAnalyze}
        profileData={value}
        restoredFromDb={restoredFromDb}
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  );
}
