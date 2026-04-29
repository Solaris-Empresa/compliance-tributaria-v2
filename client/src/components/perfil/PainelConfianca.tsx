/**
 * PainelConfianca.tsx — M2 PR-B
 *
 * Painel sticky lateral direito de /projetos/:id/perfil-entidade.
 * 6 seções: PC-01 a PC-06 conforme MOCKUP_perfil_entidade_v5_1.html.
 *
 * Decisões P.O. canônicas implementadas:
 * - Score alto NÃO libera fluxo (PC-02 nota explícita).
 * - Termo "Perfil da Entidade" — NUNCA "Arquétipo".
 * - PC-05 marcado EXPLORATÓRIO, não bloqueia gate.
 * - PC-06 CTA disabled exceto se status === "confirmado" + 0 hard_blocks.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, Info, Clock, ChevronRight, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusArquetipo = "perfil_pendente" | "perfil_inconsistente" | "perfil_bloqueado" | "perfil_confirmado";
export type EligibilityOverall = "allowed" | "denied" | "pending";

export interface BlockerItem {
  readonly id: string;
  readonly severity: "HARD_BLOCK" | "BLOCK_FLOW" | "PENDENTE_CRITICO" | "PENDENTE" | "INFO";
  readonly titulo_curto: string;
  readonly por_que_importa?: string;
  readonly impacto_no_fluxo?: string;
  readonly acao_recomendada?: string;
  readonly target_field?: string;
}

export interface DimensaoSnapshot {
  readonly objeto: readonly string[];
  readonly papel_na_cadeia: string;
  readonly tipo_de_relacao: readonly string[];
  readonly territorio: readonly string[];
  readonly regime: string;
}

export interface PainelConfiancaData {
  readonly score_total: number;
  readonly completude: number;
  readonly inferencia_validada: number;
  readonly coerencia: number;
  readonly status_arquetipo: StatusArquetipo;
  readonly eligibility: EligibilityOverall;
  readonly mensagem_executiva: string;
  readonly blockers: readonly BlockerItem[];
  readonly snapshot: {
    readonly confirmedCnaes: readonly string[];
    readonly natureza_operacao_principal: readonly string[];
    readonly ncms: readonly string[];
    readonly nbss: readonly string[];
    readonly dimensoes: DimensaoSnapshot;
    readonly perfil_hash: string;
    readonly rules_hash: string;
  };
  readonly preview_riscos: readonly string[];
  readonly gate_liberated: boolean;
  readonly gate_motivo?: string;
}

interface PainelConfiancaProps {
  readonly data: PainelConfiancaData;
  readonly onIrParaCampo?: (targetField: string) => void;
  readonly onContinuarBriefing?: () => void;
}

// ─── Mappers visuais ───────────────────────────────────────────────────────

function statusBadgeColor(status: StatusArquetipo): string {
  switch (status) {
    case "perfil_confirmado": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "perfil_pendente": return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "perfil_inconsistente": return "bg-orange-500/15 text-orange-300 border-orange-500/30";
    case "perfil_bloqueado": return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  }
}

function statusLabel(status: StatusArquetipo): string {
  switch (status) {
    case "perfil_confirmado": return "Confirmado";
    case "perfil_pendente": return "Pendente";
    case "perfil_inconsistente": return "Inconsistente";
    case "perfil_bloqueado": return "Bloqueado";
  }
}

function eligibilityLabel(e: EligibilityOverall): string {
  return e === "allowed" ? "Liberado" : e === "denied" ? "Bloqueado" : "Aguardando";
}

function eligibilityBadgeColor(e: EligibilityOverall): string {
  return e === "allowed"
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : e === "denied"
    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
    : "bg-amber-500/15 text-amber-300 border-amber-500/30";
}

function severityIcon(s: BlockerItem["severity"]) {
  if (s === "HARD_BLOCK" || s === "BLOCK_FLOW") return <AlertCircle className="h-4 w-4 text-rose-400" />;
  if (s === "PENDENTE_CRITICO") return <AlertTriangle className="h-4 w-4 text-orange-400" />;
  if (s === "PENDENTE") return <Clock className="h-4 w-4 text-amber-400" />;
  return <Info className="h-4 w-4 text-indigo-400" />;
}

function severityOrder(s: BlockerItem["severity"]): number {
  return ({ HARD_BLOCK: 0, BLOCK_FLOW: 1, PENDENTE_CRITICO: 2, PENDENTE: 3, INFO: 4 } as Record<string, number>)[s] ?? 5;
}

// ─── Componente ────────────────────────────────────────────────────────────

export function PainelConfianca({ data, onIrParaCampo, onContinuarBriefing }: PainelConfiancaProps) {
  const blockersOrdered = [...data.blockers].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
  const hardBlockCount = data.blockers.filter((b) => b.severity === "HARD_BLOCK" || b.severity === "BLOCK_FLOW").length;

  return (
    <div className="space-y-3" data-testid="painel-confianca">
      {/* PC-01 — Resumo Executivo */}
      <Card data-testid="pc-01" className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-100">Confiança do Caso</CardTitle>
            <Badge className={cn("text-xs", statusBadgeColor(data.status_arquetipo))}>
              {statusLabel(data.status_arquetipo)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-semibold text-slate-100" data-testid="score-total">
              {data.score_total}
            </span>
            <span className="text-sm text-slate-400 mb-1">/ 100</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Fluxo E2E:</span>
            <Badge className={cn("text-xs", eligibilityBadgeColor(data.eligibility))} data-testid="eligibility-badge">
              {eligibilityLabel(data.eligibility)}
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mt-2" data-testid="mensagem-executiva">
            {data.mensagem_executiva}
          </p>
        </CardContent>
      </Card>

      {/* PC-02 — Composição da Confiança */}
      <Card data-testid="pc-02" className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-slate-100">Composição da Confiança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Completude (40%)</span>
              <span className="text-slate-200 font-mono">{data.completude}%</span>
            </div>
            <Progress value={data.completude} className="h-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Inferência validada (30%)</span>
              <span className="text-slate-200 font-mono">{data.inferencia_validada}%</span>
            </div>
            <Progress value={data.inferencia_validada} className="h-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Coerência (30%)</span>
              <span className="text-slate-200 font-mono">{data.coerencia}%</span>
            </div>
            <Progress value={data.coerencia} className="h-1.5" />
          </div>
          <Alert className="bg-amber-500/10 border-amber-500/30 mt-3">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <AlertDescription className="text-xs text-amber-200">
              Score alto não libera fluxo sozinho. Apenas confirmação do Perfil da Entidade libera o próximo passo.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* PC-03 — Pendências e Bloqueios */}
      <Card data-testid="pc-03" className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-100">Pendências e Bloqueios</CardTitle>
            <Badge variant="outline" className="text-xs">
              {data.blockers.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {blockersOrdered.length === 0 ? (
            <p className="text-xs text-slate-500">Sem pendências.</p>
          ) : (
            blockersOrdered.map((b) => (
              <div
                key={b.id}
                className="flex items-start gap-2 p-2 rounded border border-slate-700 bg-slate-800/40"
                data-testid={`blocker-${b.id}`}
              >
                {severityIcon(b.severity)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-100 font-medium">{b.titulo_curto}</p>
                  {b.por_que_importa && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{b.por_que_importa}</p>
                  )}
                  {b.acao_recomendada && (
                    <p className="text-[11px] text-slate-300 mt-1">→ {b.acao_recomendada}</p>
                  )}
                  {b.target_field && onIrParaCampo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] mt-1 px-2"
                      onClick={() => onIrParaCampo(b.target_field!)}
                      data-testid={`btn-ir-para-${b.target_field}`}
                    >
                      Ir para campo <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* PC-04 — Snapshot do Perfil */}
      <Card data-testid="pc-04" className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-slate-100">Perfil da Entidade em construção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div>
            <span className="text-slate-400">CNAEs:</span>{" "}
            <span className="text-slate-200">
              {data.snapshot.confirmedCnaes.length > 0 ? data.snapshot.confirmedCnaes.join(", ") : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Natureza:</span>{" "}
            <span className="text-slate-200">
              {data.snapshot.natureza_operacao_principal.length > 0
                ? data.snapshot.natureza_operacao_principal.join(", ")
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Papel:</span>{" "}
            <span className="text-slate-200">{data.snapshot.dimensoes.papel_na_cadeia || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400">Objeto:</span>{" "}
            <span className="text-slate-200">
              {data.snapshot.dimensoes.objeto.length > 0 ? data.snapshot.dimensoes.objeto.join(", ") : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Regime:</span>{" "}
            <span className="text-slate-200">{data.snapshot.dimensoes.regime || "—"}</span>
          </div>
          {data.snapshot.ncms.length > 0 && (
            <div>
              <span className="text-slate-400">NCMs:</span>{" "}
              <span className="text-slate-200 font-mono">{data.snapshot.ncms.join(", ")}</span>
            </div>
          )}
          {data.snapshot.nbss.length > 0 && (
            <div>
              <span className="text-slate-400">NBSs:</span>{" "}
              <span className="text-slate-200 font-mono">{data.snapshot.nbss.join(", ")}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-700 flex items-center gap-2 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] font-mono cursor-help" data-testid="perfil-hash-badge">
                    {data.snapshot.perfil_hash.substring(0, 8)}…
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-[10px]">{data.snapshot.perfil_hash}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge variant="outline" className="text-[10px]" data-testid="rules-version-badge">
              {data.snapshot.rules_hash.startsWith("sha256:") ? "m1-v1.0.0" : data.snapshot.rules_hash}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* PC-05 — Prévia de Riscos (EXPLORATÓRIO) */}
      <Card data-testid="pc-05" className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-100">Prévia de Riscos</CardTitle>
            <Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/30 text-[10px]" data-testid="badge-exploratorio">
              EXPLORATÓRIO
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs text-slate-300">
            {data.preview_riscos.length === 0 ? (
              <li className="text-slate-500">Sem prévias até confirmação do perfil.</li>
            ) : (
              data.preview_riscos.map((p, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-indigo-400">•</span>
                  <span>{p}</span>
                </li>
              ))
            )}
          </ul>
          <p className="text-[10px] text-slate-500 mt-2">
            Esta prévia não bloqueia nem libera o gate.
          </p>
        </CardContent>
      </Card>

      {/* PC-06 — Liberação do Próximo Passo */}
      <Card data-testid="pc-06" className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-slate-100">Próximo Passo</CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block w-full">
                  <Button
                    className="w-full"
                    disabled={!data.gate_liberated}
                    onClick={onContinuarBriefing}
                    data-testid="cta-continuar-questionario-solaris"
                  >
                    {data.gate_liberated ? (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 mr-2" />
                    )}
                    Continuar para o Questionário SOLARIS
                  </Button>
                </span>
              </TooltipTrigger>
              {!data.gate_liberated && (
                <TooltipContent>
                  {data.gate_motivo ?? `Resolva ${hardBlockCount} bloqueio(s) e confirme o Perfil da Entidade.`}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <p className="text-[10px] text-slate-500 mt-2">
            Liberado apenas com Perfil da Entidade confirmado e zero bloqueios críticos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
