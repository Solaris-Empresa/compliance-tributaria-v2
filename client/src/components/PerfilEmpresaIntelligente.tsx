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

/** Resultado do CPIE v2 analyzePreview — os 3 scores reais + gate */
export interface CpieV2GateResult {
  completenessScore: number;
  consistencyScore: number;
  diagnosticConfidence: number;
  canProceed: boolean;
  blockType?: "hard_block" | "soft_block_with_override";
  blockReason?: string;
  conflicts: Array<{ id: string; type: string; severity: string; description: string; field1?: string; field2?: string }>;
  reconciliationQuestions: Array<{ id: string; conflictId: string; question: string; purpose: string; isBlocking: boolean }>;
  analysisVersion: string;
  persisted: boolean;
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
  cpieResult, cpieV2Gate, isAnalyzing, onAnalyze, profileData, restoredFromDb, projectId, projectName,
  descLength,
}: {
  completeness: number; confidence: number; missingRequired: string[]; missingOptional: string[];
  cpieResult: CpieResult | null; cpieV2Gate: CpieV2GateResult | null; isAnalyzing: boolean; onAnalyze: () => void;
  profileData: PerfilEmpresaData; restoredFromDb?: boolean;
  projectId?: number; projectName?: string;
  /** Comprimento da descrição do projeto (passado pelo NovoProjeto) — usado para exibir aviso quando < 100 */
  descLength?: number;
}) {
  const [showAllConflicts, setShowAllConflicts] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Scores v2 reais (quando disponíveis) substituem os locais
  const displayCompleteness = cpieV2Gate ? cpieV2Gate.completenessScore : completeness;
  const displayConsistency = cpieV2Gate ? cpieV2Gate.consistencyScore : null;
  const displayDiagnostic = cpieV2Gate ? cpieV2Gate.diagnosticConfidence : null;

  // Cores do semáforo
  const completenessBarColor = displayCompleteness >= 80 ? "bg-emerald-500" : displayCompleteness >= 50 ? "bg-amber-500" : "bg-red-500";
  const consistencyBarColor = displayConsistency !== null
    ? (displayConsistency >= 60 ? "bg-emerald-500" : displayConsistency >= 40 ? "bg-amber-500" : "bg-red-500")
    : "bg-muted";
  const diagnosticBarColor = displayDiagnostic !== null
    ? (displayDiagnostic >= 40 ? "bg-emerald-500" : displayDiagnostic >= 15 ? "bg-amber-500" : "bg-red-600")
    : "bg-muted";

  // Veredito
  const isHardBlock = cpieV2Gate?.blockType === "hard_block";
  const isSoftBlock = cpieV2Gate?.blockType === "soft_block_with_override";
  const isApproved = cpieV2Gate?.canProceed === true;
  const hasAnalysis = !!cpieV2Gate;

  const hasMinimumData = !!profileData.companyType && !!profileData.taxRegime;
  const canExport = !!projectId && !!cpieResult;

  // Conflitos para o acordeão
  const allConflicts = cpieV2Gate?.conflicts ?? [];
  const criticalConflicts = allConflicts.filter(c => c.severity === "critical" || c.severity === "high");
  const visibleConflicts = showAllConflicts ? allConflicts : allConflicts.slice(0, 3);

  return (
    <div className="sticky top-4 space-y-3">

      {/* ── BLOCO 1: Status do Perfil (3 scores) ── */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Status do Perfil</span>
          {restoredFromDb && (
            <Badge variant="secondary" className="text-xs ml-auto gap-1">
              <CheckCircle2 className="h-3 w-3" />Sessão retomada
            </Badge>
          )}
        </div>

        {/* Score 1: Completude */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Completude do formulário</span>
            <span className={cn("text-base font-bold tabular-nums",
              displayCompleteness >= 80 ? "text-emerald-600" : displayCompleteness >= 50 ? "text-amber-600" : "text-red-500"
            )}>{displayCompleteness}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", completenessBarColor)} style={{ width: `${displayCompleteness}%` }} />
          </div>
        </div>

        {/* Score 2: Consistência */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Consistência interna</span>
            {displayConsistency !== null ? (
              <span className={cn("text-base font-bold tabular-nums",
                displayConsistency >= 60 ? "text-emerald-600" : displayConsistency >= 40 ? "text-amber-600" : "text-red-500"
              )}>{displayConsistency}%</span>
            ) : (
              <span className="text-xs text-muted-foreground">— aguardando análise</span>
            )}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", consistencyBarColor)} style={{ width: `${displayConsistency ?? 0}%` }} />
          </div>
        </div>

        {/* Score 3: Confiança Diagnóstica */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Confiança diagnóstica</span>
            {displayDiagnostic !== null ? (
              <span className={cn("text-base font-bold tabular-nums",
                displayDiagnostic >= 40 ? "text-emerald-600" : displayDiagnostic >= 15 ? "text-amber-600" : "text-red-600"
              )}>{displayDiagnostic}%</span>
            ) : (
              <span className="text-xs text-muted-foreground">— aguardando análise</span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", diagnosticBarColor)} style={{ width: `${displayDiagnostic ?? 0}%` }} />
          </div>
        </div>

        {/* Link discreto de reexecução */}
        <div className="pt-1 border-t border-border/50">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing || !hasMinimumData}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            {isAnalyzing ? (
              <><Loader2 className="h-3 w-3 animate-spin" />Analisando...</>
            ) : (
              <><RefreshCw className="h-3 w-3" />Reexecutar análise</>
            )}
          </button>
          {!hasMinimumData && (
            <p className="text-xs text-muted-foreground mt-1">Preencha tipo jurídico e regime tributário para ativar</p>
          )}
        </div>
      </div>

      {/* ── BLOCO 2: Veredito (só após análise) ── */}
      {hasAnalysis && (
        <div className={cn(
          "rounded-2xl border p-4 space-y-1",
          isHardBlock
            ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
            : isSoftBlock
            ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
            : "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
        )}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{isHardBlock ? "⛔" : isSoftBlock ? "⚠️" : "✅"}</span>
            <span className={cn(
              "text-sm font-bold",
              isHardBlock ? "text-red-700 dark:text-red-400" :
              isSoftBlock ? "text-amber-700 dark:text-amber-400" :
              "text-emerald-700 dark:text-emerald-400"
            )}>
              {isHardBlock ? "BLOQUEIO" : isSoftBlock ? "ATENÇÃO" : "APROVADO"}
            </span>
          </div>
          {cpieV2Gate?.blockReason && (
            <p className={cn(
              "text-xs leading-relaxed",
              isHardBlock ? "text-red-700/80 dark:text-red-300/80" :
              isSoftBlock ? "text-amber-700/80 dark:text-amber-300/80" :
              "text-emerald-700/80 dark:text-emerald-300/80"
            )}>
              {cpieV2Gate.blockReason}
            </p>
          )}
          {isApproved && !cpieV2Gate?.blockReason && (
            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
              Perfil consistente. Prossiga para a próxima etapa.
            </p>
          )}
        </div>
      )}

      {/* ── BLOCO 3: O que fazer agora ── */}
      {hasAnalysis && (
        <div className="rounded-2xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">O que fazer agora</span>
          </div>
          {isHardBlock && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                O perfil contém contradições críticas que impedem o diagnóstico. Corrija os campos em conflito antes de prosseguir.
              </p>
              <ul className="space-y-1">
                {criticalConflicts.slice(0, 3).map(c => (
                  <li key={c.id} className="flex items-start gap-1.5 text-xs text-red-700 dark:text-red-400">
                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{c.description}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Após corrigir, clique em <strong>Avançar</strong> para reanalisar automaticamente.
              </p>
            </div>
          )}
          {isSoftBlock && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Há inconsistências moderadas. Você pode prosseguir fornecendo uma justificativa formal (mínimo 50 caracteres).
              </p>
              <p className="text-xs text-muted-foreground">
                Clique em <strong>Justificar e continuar</strong> para registrar a justificativa e avançar.
              </p>
            </div>
          )}
          {isApproved && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                O perfil passou na análise de consistência. Clique em <strong>Avançar para CNAEs</strong> para continuar.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── BLOCO 4: Acordeão de conflitos ── */}
      {hasAnalysis && allConflicts.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">Conflitos detectados</span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs ml-auto",
                criticalConflicts.length > 0 ? "border-red-300 text-red-600 dark:text-red-400" : "border-amber-300 text-amber-600"
              )}
            >
              {allConflicts.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {visibleConflicts.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "rounded-lg p-2.5 border text-xs space-y-0.5",
                  c.severity === "critical"
                    ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                    : c.severity === "high"
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "font-semibold uppercase tracking-wide",
                    c.severity === "critical" ? "text-red-700 dark:text-red-400" :
                    c.severity === "high" ? "text-orange-700 dark:text-orange-400" :
                    "text-amber-700 dark:text-amber-400"
                  )}>{c.severity}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{c.type}</span>
                </div>
                <p className="text-foreground/80 leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
          {allConflicts.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllConflicts(!showAllConflicts)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showAllConflicts && "rotate-90")} />
              {showAllConflicts ? "Recolher" : `Ver todos (${allConflicts.length - 3} ocultos)`}
            </button>
          )}
        </div>
      )}

      {/* ── BLOCO 5: Conteúdo avançado (recolhido por padrão) ── */}
      {cpieResult && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span>Análise detalhada da IA</span>
            </div>
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", showAdvanced && "rotate-90")} />
          </button>

          {showAdvanced && (
            <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3">

              {/* Score por dimensão */}
              {cpieResult.dimensions.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score por dimensão</p>
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
                  <div className={cn(
                    "text-xs px-3 py-2 rounded-lg font-medium",
                    cpieResult.readinessLevel === "excellent" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" :
                    cpieResult.readinessLevel === "good" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" :
                    cpieResult.readinessLevel === "basic" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" :
                    "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  )}>
                    {cpieResult.readinessMessage}
                  </div>
                </div>
              )}

              {/* Perguntas dinâmicas */}
              {cpieResult.dynamicQuestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Perguntas da IA</p>
                  {cpieResult.dynamicQuestions.map((q) => (
                    <div key={q.id} className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1">
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
              )}

              {/* Insights */}
              {cpieResult.insights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Insights tributários</p>
                  {cpieResult.insights.map((ins) => (
                    <div key={ins.id} className={cn(
                      "rounded-lg p-2.5 space-y-1 border text-xs",
                      ins.category === "risk" ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800" :
                      ins.category === "opportunity" ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800" :
                      ins.category === "transition" ? "bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800" :
                      "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800"
                    )}>
                      <p className="font-semibold">{ins.title}</p>
                      <p className="text-muted-foreground leading-relaxed">{ins.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Exportar PDF */}
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
          )}
        </div>
      )}

      {/* Campos obrigatórios faltantes (estado neutro — sem análise) */}
      {!hasAnalysis && missingRequired.length > 0 && (
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
      {!hasAnalysis && missingRequired.length === 0 && missingOptional.length > 0 && (
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

      {/* Perfil completo — estado neutro */}
      {!hasAnalysis && missingRequired.length === 0 && missingOptional.length === 0 && (
        descLength !== undefined && descLength < 100 ? (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 dark:bg-amber-900/10 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Perfil completo — descrição incompleta.</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              A descrição do negócio precisa de pelo menos <strong>100 caracteres</strong> ({descLength} preenchidos). Complete a descrição para habilitar o botão Avançar.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-300/40 bg-emerald-50/50 dark:bg-emerald-900/10 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Perfil completo.</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Clique em Avançar para executar a análise de consistência do perfil.</p>
          </div>
        )
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
  /** K2: Callback chamado quando o score CPIE v2 é calculado/atualizado */
  onCpieScore?: (data: {
    // Compat v1 (mantido para não quebrar usos legados)
    score: number;
    dimensions: ScoreDimension[];
    // Novo: gate v2 completo
    v2Gate?: CpieV2GateResult;
  }) => void;
  /**
   * SINGLE SOURCE OF TRUTH — gate v2 calculado externamente (e.g., pelo NovoProjeto via analyzePreviewInline).
   * Quando presente, tem PRIORIDADE sobre o state interno cpieV2Gate do componente.
   * Garante que o ScorePanel reflita o resultado da análise disparada pelo botão Avançar.
   */
  externalCpieV2Gate?: CpieV2GateResult | null;
}

export function PerfilEmpresaIntelligente({ value, onChange, showScorePanel = true, description, projectId, projectName, onCpieScore, externalCpieV2Gate }: PerfilEmpresaIntelligenteProps) {
  const [cnpjError, setCnpjError] = useState("");
  const [cpieResult, setCpieResult] = useState<CpieResult | null>(null);
  const [cpieV2Gate, setCpieV2Gate] = useState<CpieV2GateResult | null>(null);
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

  const saveHistory = trpc.cpie.saveAnalysisToHistory.useMutation();

  const analyzeProfile = trpc.cpie.analyze.useMutation({
    onSuccess: (data) => {
      const result = data as CpieResult;
      setCpieResult(result);
      setRestoredFromDb(false);
      // I1: Salvar no histórico se houver projectId
      if (projectId) {
        saveHistory.mutate({
          projectId,
          overallScore: result.overallScore,
          confidenceScore: result.confidenceScore,
          readinessLevel: result.readinessLevel,
          readinessMessage: result.readinessMessage,
          dimensionsJson: result.dimensions,
          suggestionsJson: result.suggestions,
          dynamicQuestionsJson: result.dynamicQuestions,
          insightsJson: result.insights,
        });
      }
    },
    onError: () => {
      toast.error("Erro ao analisar perfil. Tente novamente.");
    },
  });

  // CPIE v2 analyzePreview — pipeline completo sem persistência
  const analyzePreviewV2 = trpc.cpieV2.analyzePreview.useMutation({
    onSuccess: (data) => {
      const gate = data as unknown as CpieV2GateResult;
      setCpieV2Gate(gate);
      // K2: Notificar o pai com score compat v1 + gate v2 completo
      onCpieScore?.({
        score: gate.diagnosticConfidence, // usa diagnosticConfidence como score principal
        dimensions: cpieResult?.dimensions ?? [],
        v2Gate: gate,
      });
      if (!gate.canProceed) {
        if (gate.blockType === "hard_block") {
          toast.error("⛔ Perfil bloqueado: contradições críticas detectadas. Corrija antes de prosseguir.");
        } else {
          toast.warning("⚠️ Conflitos detectados. Justifique para prosseguir.");
        }
      } else {
        toast.success("✅ Análise CPIE v2 concluída. Perfil consistente.");
      }
    },
    onError: () => {
      toast.error("Erro na análise CPIE v2. Tente novamente.");
    },
  });

  const handleAnalyze = () => {
    const profileInput = {
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
    };
    // Chamar v1 (para sugestões, dimensões, insights) e v2 preview (para gate real)
    analyzeProfile.mutate(profileInput);
    analyzePreviewV2.mutate(profileInput);
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
        cpieV2Gate={externalCpieV2Gate !== undefined ? externalCpieV2Gate : cpieV2Gate}
        isAnalyzing={analyzeProfile.isPending || analyzePreviewV2.isPending}
        onAnalyze={handleAnalyze}
        profileData={value}
        restoredFromDb={restoredFromDb}
        projectId={projectId}
        projectName={projectName}
        descLength={description ? description.trim().length : undefined}
      />
    </div>
  );
}
