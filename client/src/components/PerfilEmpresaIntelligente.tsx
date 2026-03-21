/**
 * PerfilEmpresaIntelligente.tsx
 * Sprint v6.0 — Issues B1 (redesign visual), B2 (componentes inteligentes), B3 (microcopy)
 *
 * Substitui o formulário frio de 5 blocos por uma experiência assistida por IA:
 * - Layout em 2 colunas: formulário (esq) + painel de score em tempo real (dir)
 * - Componentes de seleção por card visual (sem dropdowns frios)
 * - Score de completude e confiança animado
 * - Microcopy contextual e inteligente
 * - CTA principal "Avançar" (não "Salvar" ou botão técnico)
 */
import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Lock, AlertCircle, Sparkles, Building2, TrendingUp, Users, Globe, CreditCard, Shield, ChevronRight, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  // Confiança: penaliza inconsistências conhecidas
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

/** Painel lateral de score em tempo real */
function ScorePanel({ completeness, confidence, missingRequired, missingOptional }: {
  completeness: number; confidence: number; missingRequired: string[]; missingOptional: string[];
}) {
  const scoreColor = completeness >= 80 ? "text-emerald-600" : completeness >= 50 ? "text-amber-600" : "text-red-500";
  const confidenceColor = confidence >= 80 ? "text-emerald-600" : confidence >= 50 ? "text-amber-600" : "text-red-500";
  const barColor = completeness >= 80 ? "bg-emerald-500" : completeness >= 50 ? "bg-amber-500" : "bg-red-500";
  const confBarColor = confidence >= 80 ? "bg-emerald-500" : confidence >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="sticky top-4 space-y-4">
      {/* Score principal */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Qualidade do Perfil</span>
        </div>

        {/* Completude */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Completude</span>
            <span className={cn("text-lg font-bold tabular-nums", scoreColor)}>{completeness}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", barColor)}
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Confiança */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Confiança da IA</span>
            <span className={cn("text-lg font-bold tabular-nums", confidenceColor)}>{confidence}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", confBarColor)}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {confidence >= 80
              ? "Perfil consistente. A IA identificará CNAEs com alta precisão."
              : confidence >= 50
              ? "Perfil parcial. Adicione mais dados para melhorar a análise."
              : "Perfil insuficiente. Preencha os campos obrigatórios."}
          </p>
        </div>
      </div>

      {/* Campos obrigatórios faltantes */}
      {missingRequired.length > 0 && (
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

      {/* Campos opcionais faltantes (top 3) */}
      {missingRequired.length === 0 && missingOptional.length > 0 && (
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
      {missingRequired.length === 0 && missingOptional.length === 0 && (
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
}

export function PerfilEmpresaIntelligente({ value, onChange, showScorePanel = true }: PerfilEmpresaIntelligenteProps) {
  const [cnpjError, setCnpjError] = useState("");
  const score = calcProfileScore(value);

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: "ltda", label: "Ltda", sublabel: "Limitada" },
              { value: "sa", label: "S.A.", sublabel: "Sociedade Anônima" },
              { value: "mei", label: "MEI", sublabel: "Microempreendedor" },
              { value: "eireli", label: "Eireli", sublabel: "Empresa Individual" },
              { value: "scp", label: "SCP", sublabel: "Sociedade em Conta de Participação" },
              { value: "cooperativa", label: "Cooperativa", sublabel: "" },
              { value: "outro", label: "Outro", sublabel: "" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.companyType === opt.value}
                onClick={() => set("companyType", value.companyType === opt.value ? "" : opt.value)}
                label={opt.label}
                sublabel={opt.sublabel}
              />
            ))}
          </div>
        </div>

        {/* Porte */}
        <div className="space-y-2">
          <Label className="text-sm">Porte da Empresa <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: "mei", label: "MEI", sublabel: "Até R$ 81 mil/ano" },
              { value: "micro", label: "Micro", sublabel: "Até R$ 360 mil/ano" },
              { value: "pequena", label: "Pequena", sublabel: "Até R$ 4,8 mi/ano" },
              { value: "media", label: "Média", sublabel: "Até R$ 300 mi/ano" },
              { value: "grande", label: "Grande", sublabel: "Acima de R$ 300 mi/ano" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.companySize === opt.value}
                onClick={() => set("companySize", value.companySize === opt.value ? "" : opt.value)}
                label={opt.label}
                sublabel={opt.sublabel}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Seção 2: Regime e Faturamento ───────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Regime Tributário e Faturamento</h3>
          <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
        </div>

        {/* Regime Tributário */}
        <div className="space-y-2">
          <Label className="text-sm">Regime Tributário <span className="text-destructive">*</span></Label>
          <p className="text-xs text-muted-foreground">O regime define as obrigações acessórias e o impacto da Reforma Tributária.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { value: "simples_nacional", label: "Simples Nacional", sublabel: "Faturamento até R$ 4,8 mi/ano" },
              { value: "lucro_presumido", label: "Lucro Presumido", sublabel: "Faturamento até R$ 78 mi/ano" },
              { value: "lucro_real", label: "Lucro Real", sublabel: "Obrigatório acima de R$ 78 mi/ano" },
              { value: "lucro_arbitrado", label: "Lucro Arbitrado", sublabel: "Determinado pelo Fisco" },
              { value: "imune_isento", label: "Imune/Isento", sublabel: "Entidades sem fins lucrativos" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.taxRegime === opt.value}
                onClick={() => set("taxRegime", value.taxRegime === opt.value ? "" : opt.value)}
                label={opt.label}
                sublabel={opt.sublabel}
              />
            ))}
          </div>
          {/* Alerta de inconsistência */}
          {value.taxRegime === "simples_nacional" && (value.annualRevenueRange === "acima_50m" || value.annualRevenueRange === "10m_50m") && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300/50">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Atenção:</strong> Simples Nacional tem limite de R$ 4,8 mi/ano. O faturamento informado excede esse limite. Verifique o regime tributário correto.
              </p>
            </div>
          )}
        </div>

        {/* Faturamento Anual */}
        <div className="space-y-2">
          <Label className="text-sm">Faturamento Anual <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: "ate_81k", label: "Até R$ 81 mil" },
              { value: "ate_360k", label: "R$ 81 mil – R$ 360 mil" },
              { value: "ate_4_8m", label: "R$ 360 mil – R$ 4,8 mi" },
              { value: "ate_10m", label: "R$ 4,8 mi – R$ 10 mi" },
              { value: "10m_50m", label: "R$ 10 mi – R$ 50 mi" },
              { value: "acima_50m", label: "Acima de R$ 50 mi" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.annualRevenueRange === opt.value}
                onClick={() => set("annualRevenueRange", value.annualRevenueRange === opt.value ? "" : opt.value)}
                label={opt.label}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Seção 3: Operação ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Perfil Operacional</h3>
          <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
        </div>

        {/* Tipo de Operação */}
        <div className="space-y-2">
          <Label className="text-sm">Tipo de Operação <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: "industria", label: "Indústria", sublabel: "Produção e manufatura" },
              { value: "comercio", label: "Comércio", sublabel: "Compra e revenda" },
              { value: "servicos", label: "Serviços", sublabel: "Prestação de serviços" },
              { value: "misto", label: "Misto", sublabel: "Indústria + Comércio + Serviços" },
              { value: "financeiro", label: "Financeiro", sublabel: "Banco, seguradora, fintech" },
              { value: "agro", label: "Agronegócio", sublabel: "Produção rural e agropecuária" },
            ].map((opt) => (
              <SelectCard
                key={opt.value}
                value={opt.value}
                selected={value.operationType === opt.value}
                onClick={() => set("operationType", value.operationType === opt.value ? "" : opt.value)}
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div>{formContent}</div>
      <ScorePanel {...score} />
    </div>
  );
}
