/**
 * ConfirmacaoPerfil.tsx — M2 PR-B
 *
 * Página /projetos/:id/perfil-entidade.
 * Inserida entre confirmCnaes (NovoProjeto) e Questionário SOLARIS.
 *
 * Layout 2 colunas (desktop ≥1024px):
 *   - Esquerda: revisão dimensional (cards) + CTA "Confirmar Perfil da Entidade"
 *   - Direita: PainelConfianca sticky (PC-01..PC-06)
 *
 * 8 estados visuais via data-state no root (S1..S4 + C1..C4).
 *
 * Decisões P.O.:
 * - Termo "Perfil da Entidade" — NUNCA "Arquétipo".
 * - CTA Confirmar habilitado apenas se status === "perfil_confirmado" + 0 hard_blocks.
 * - Snapshot imutável após confirmação (ADR-0031).
 * - Score alto NÃO libera fluxo (PC-02 nota explícita).
 *
 * Reusa procedures PR-A:
 *   - perfil.build (read-only)
 *   - perfil.confirm (write-once, HTTP 409 se já confirmado)
 *   - perfil.get (consulta snapshot persistido)
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  PainelConfianca,
  type PainelConfiancaData,
  type StatusArquetipo,
  type EligibilityOverall,
  type BlockerItem,
} from "@/components/perfil/PainelConfianca";
import { DimensaoCard, type DimensaoOrigem } from "@/components/perfil/DimensaoCard";

type VisualState = "s1" | "s2" | "s3" | "s4" | "c1" | "c2" | "c3" | "c4";

// ─── Mappers do output do engine para enum FSM (com prefixo perfil_) ───────

export function mapStatusToFsm(engineStatus: string | undefined): StatusArquetipo {
  if (engineStatus === "confirmado") return "perfil_confirmado";
  if (engineStatus === "inconsistente") return "perfil_inconsistente";
  if (engineStatus === "bloqueado") return "perfil_bloqueado";
  return "perfil_pendente";
}

export function deriveVisualState(
  perfilGetData: { confirmed?: boolean } | null | undefined,
  buildData: { status_arquetipo?: string; blockers?: readonly { severity: string }[] } | null | undefined,
  formStarted: boolean,
): VisualState {
  if (perfilGetData?.confirmed) return "c4";
  if (!buildData) return formStarted ? "s2" : "s1";
  const status = buildData.status_arquetipo;
  const hardBlocks = buildData.blockers?.filter((b) => b.severity === "HARD_BLOCK").length ?? 0;
  if (status === "bloqueado" || hardBlocks > 0) return "c3";
  if (status === "inconsistente") return "c2";
  if (status === "pendente") return "c1";
  if (status === "confirmado") return "s4";
  return "s3";
}

// ─── Componente principal ──────────────────────────────────────────────────

export default function ConfirmacaoPerfil() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();

  const [confirming, setConfirming] = useState(false);
  const [formStarted, setFormStarted] = useState(false);

  // Procedures M2 PR-A
  const perfilGet = trpc.perfil.get.useQuery(
    { projectId },
    { enabled: projectId > 0, refetchOnWindowFocus: false },
  );

  const perfilBuild = trpc.perfil.build.useQuery(
    { projectId },
    {
      enabled: projectId > 0 && !perfilGet.data?.confirmed,
      refetchOnWindowFocus: false,
    },
  );

  const confirmMutation = trpc.perfil.confirm.useMutation({
    onSuccess: () => {
      toast.success("Perfil da Entidade confirmado.");
      perfilGet.refetch();
      setConfirming(false);
    },
    onError: (err) => {
      toast.error(err.message ?? "Erro ao confirmar Perfil da Entidade.");
      setConfirming(false);
    },
  });

  // Detectar quando usuário começa interação
  useEffect(() => {
    if (perfilBuild.data && !formStarted) setFormStarted(true);
  }, [perfilBuild.data, formStarted]);

  const visualState = deriveVisualState(perfilGet.data, perfilBuild.data, formStarted);

  // ─── Composição do PainelConfianca data ──────────────────────────────────

  const painelData: PainelConfiancaData = useMemo(() => {
    const isConfirmed = perfilGet.data?.confirmed === true;
    const snapshotPersisted = isConfirmed
      ? (perfilGet.data?.snapshot as Record<string, unknown> | null)
      : null;

    const buildPerfil = perfilBuild.data?.snapshot;
    const buildBlockers = perfilBuild.data?.blockers ?? [];

    const completude = buildPerfil ? 100 - (perfilBuild.data?.missing_required_fields?.length ?? 0) * 10 : 0;
    const inferenciaValidada = buildBlockers.filter((b) => b.id === "V-10-FALLBACK").length === 0 ? 100 : 0;
    const coerencia = buildBlockers.filter((b) => b.id.startsWith("V-LC-")).length === 0 ? 100 : 0;
    const scoreTotal = Math.floor(completude * 0.4 + inferenciaValidada * 0.3 + coerencia * 0.3);

    const fsmStatus = mapStatusToFsm(buildPerfil?.status_arquetipo);
    const hardBlockCount = buildBlockers.filter((b) => b.severity === "HARD_BLOCK").length;

    const eligibility: EligibilityOverall = isConfirmed
      ? "allowed"
      : hardBlockCount > 0
      ? "denied"
      : "pending";

    const blockers: BlockerItem[] = buildBlockers.map((b) => ({
      id: b.id,
      severity: b.severity as BlockerItem["severity"],
      titulo_curto: b.id,
      por_que_importa: b.rule,
      acao_recomendada:
        b.severity === "HARD_BLOCK"
          ? "Resolva este bloqueio para continuar."
          : b.severity === "INFO"
          ? "Item informativo — não bloqueia o gate."
          : "Revise para melhorar a confiança.",
    }));

    let mensagem: string;
    if (isConfirmed) {
      mensagem = "Perfil da Entidade confirmado. Você pode continuar para o Questionário SOLARIS.";
    } else if (hardBlockCount > 0) {
      mensagem = `Resolva ${hardBlockCount} bloqueio(s) crítico(s) antes de confirmar.`;
    } else if (fsmStatus === "perfil_pendente") {
      mensagem = "Faltam confirmações obrigatórias para liberar a análise.";
    } else if (fsmStatus === "perfil_inconsistente") {
      mensagem = "Existem inconsistências que precisam ser corrigidas.";
    } else {
      mensagem = "Revise as dimensões abaixo e clique em Confirmar Perfil da Entidade.";
    }

    const buildSnapshot = perfilBuild.data;
    const persistedSnap = snapshotPersisted as Record<string, unknown> | null;

    return {
      score_total: isConfirmed ? 100 : scoreTotal,
      completude: isConfirmed ? 100 : completude,
      inferencia_validada: isConfirmed ? 100 : inferenciaValidada,
      coerencia: isConfirmed ? 100 : coerencia,
      status_arquetipo: isConfirmed ? "perfil_confirmado" : fsmStatus,
      eligibility,
      mensagem_executiva: mensagem,
      blockers,
      snapshot: {
        confirmedCnaes: (persistedSnap?.confirmedCnaes as string[]) ?? [],
        natureza_operacao_principal:
          (persistedSnap?.natureza_operacao_principal as string[]) ??
          ((buildSnapshot as { natureza_operacao_principal?: string[] } | null)?.natureza_operacao_principal ?? []),
        ncms: (persistedSnap?.ncms_canonicos as string[]) ?? [],
        nbss: (persistedSnap?.nbss_canonicos as string[]) ?? [],
        dimensoes: {
          objeto: (buildPerfil?.objeto as string[]) ?? (persistedSnap?.dim_objeto as string[]) ?? [],
          papel_na_cadeia:
            (buildPerfil?.papel_na_cadeia as string) ?? (persistedSnap?.dim_papel_na_cadeia as string) ?? "",
          tipo_de_relacao:
            (buildPerfil?.tipo_de_relacao as string[]) ?? (persistedSnap?.dim_tipo_de_relacao as string[]) ?? [],
          territorio:
            (buildPerfil?.territorio as string[]) ?? (persistedSnap?.dim_territorio as string[]) ?? [],
          regime: (buildPerfil?.regime as string) ?? (persistedSnap?.dim_regime as string) ?? "",
        },
        perfil_hash: perfilBuild.data?.perfil_hash ?? perfilGet.data?.perfil_hash ?? "",
        rules_hash: perfilBuild.data?.rules_hash ?? perfilGet.data?.rules_hash ?? "",
      },
      preview_riscos: [],
      gate_liberated: isConfirmed,
      gate_motivo: isConfirmed
        ? undefined
        : hardBlockCount > 0
        ? `${hardBlockCount} bloqueio(s) crítico(s) ativo(s).`
        : "Confirme o Perfil da Entidade para liberar.",
    };
  }, [perfilGet.data, perfilBuild.data]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const canConfirm =
    !confirming &&
    !perfilGet.data?.confirmed &&
    perfilBuild.data?.status_arquetipo === "confirmado" &&
    (perfilBuild.data?.blockers ?? []).filter((b) => b.severity === "HARD_BLOCK").length === 0;

  const handleConfirmar = () => {
    setConfirming(true);
    confirmMutation.mutate({ projectId });
  };

  const handleContinuarSolaris = () => {
    navigate(`/projetos/${projectId}/questionario-solaris`);
  };

  const handleIrParaCampo = (target: string) => {
    const el = document.querySelector(`[data-field="${target}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (projectId <= 0) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Projeto inválido.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (perfilGet.isLoading || perfilBuild.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (perfilGet.error || perfilBuild.error) {
    const err = perfilGet.error ?? perfilBuild.error;
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{err?.message ?? "Erro ao carregar Perfil da Entidade."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isConfirmed = perfilGet.data?.confirmed === true;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" data-state={visualState} data-testid="confirmacao-perfil-page">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <ShieldCheck className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-100">Perfil da Entidade</h1>
            <p className="text-sm text-slate-400">
              Confirme as dimensões antes de avançar para o Questionário SOLARIS.
            </p>
          </div>
          {isConfirmed && (
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Confirmado
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-base text-slate-100">Dimensões do Perfil da Entidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DimensaoCard
                  tipo="objeto"
                  valor={painelData.snapshot.dimensoes.objeto}
                  origem={inferOrigemFromBlockers(perfilBuild.data?.blockers ?? [], "V-10-FALLBACK")}
                  onIrParaCampo={() => handleIrParaCampo("objeto")}
                />
                <DimensaoCard
                  tipo="papel_na_cadeia"
                  valor={painelData.snapshot.dimensoes.papel_na_cadeia}
                  origem="user"
                />
                <DimensaoCard
                  tipo="tipo_de_relacao"
                  valor={painelData.snapshot.dimensoes.tipo_de_relacao}
                  origem="user"
                />
                <DimensaoCard
                  tipo="territorio"
                  valor={painelData.snapshot.dimensoes.territorio}
                  origem="cnae"
                />
                <DimensaoCard
                  tipo="regime"
                  valor={painelData.snapshot.dimensoes.regime}
                  origem="user"
                />
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-base text-slate-100">CNAEs e Códigos Fiscais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div data-field="confirmedCnaes">
                  <p className="text-xs text-slate-400 mb-1">CNAEs confirmados (em /projetos/novo)</p>
                  <p className="text-slate-200">
                    {painelData.snapshot.confirmedCnaes.length > 0
                      ? painelData.snapshot.confirmedCnaes.join(", ")
                      : "—"}
                  </p>
                </div>
                {/* G-A5 fix (PR-C): conditional rendering explícito por natureza_operacao_principal,
                    não mais por .length > 0. Mostra a seção mesmo se array vazio (orienta usuário a preencher) */}
                {shouldShowNCM(painelData.snapshot.natureza_operacao_principal) && (
                  <div data-field="ncms_principais" data-testid="campo-ncms">
                    <p className="text-xs text-slate-400 mb-1">NCMs (Produtos)</p>
                    {painelData.snapshot.ncms.length > 0 ? (
                      <p className="text-slate-200 font-mono text-xs">
                        {painelData.snapshot.ncms.join(", ")}
                      </p>
                    ) : (
                      <p className="text-amber-300 text-xs" data-testid="ncm-missing-warning">
                        Esta operação envolve bens/produtos. Informe pelo menos um NCM principal.
                      </p>
                    )}
                  </div>
                )}
                {shouldShowNBS(painelData.snapshot.natureza_operacao_principal) && (
                  <div data-field="nbss_principais" data-testid="campo-nbss">
                    <p className="text-xs text-slate-400 mb-1">NBSs (Serviços)</p>
                    {painelData.snapshot.nbss.length > 0 ? (
                      <p className="text-slate-200 font-mono text-xs">
                        {painelData.snapshot.nbss.join(", ")}
                      </p>
                    ) : (
                      <p className="text-amber-300 text-xs" data-testid="nbs-missing-warning">
                        Esta operação envolve serviços. Informe pelo menos um NBS principal.
                      </p>
                    )}
                  </div>
                )}
                {/* G-A10 fix: aviso específico se algum NCM digitado for na verdade um NBS */}
                {painelData.snapshot.ncms.some(isNbsInNcmField) && (
                  <div data-testid="nbs-in-ncm-warning" className="rounded border border-rose-500/40 bg-rose-500/10 p-2">
                    <p className="text-xs text-rose-300">
                      O código informado parece ser NBS. Use o campo NBS para serviços.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTA principal */}
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-4">
                {isConfirmed ? (
                  <div className="space-y-3">
                    <Alert className="bg-emerald-500/10 border-emerald-500/30">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <AlertDescription className="text-emerald-200 text-sm">
                        Perfil da Entidade confirmado em{" "}
                        {perfilGet.data?.confirmed_at
                          ? new Date(perfilGet.data.confirmed_at).toLocaleString("pt-BR")
                          : "—"}
                        . Snapshot imutável (ADR-0031).
                      </AlertDescription>
                    </Alert>
                    <Button
                      className="w-full"
                      onClick={handleContinuarSolaris}
                      data-testid="cta-continuar-solaris"
                    >
                      Continuar para o Questionário SOLARIS
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    disabled={!canConfirm}
                    onClick={handleConfirmar}
                    data-testid="cta-confirmar-perfil"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Confirmando…
                      </>
                    ) : (
                      "Confirmar Perfil da Entidade"
                    )}
                  </Button>
                )}
                {!isConfirmed && !canConfirm && (
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Resolva pendências e bloqueios no painel ao lado para habilitar a confirmação.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna painel — sticky desktop */}
          <div className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <PainelConfianca
              data={painelData}
              onIrParaCampo={handleIrParaCampo}
              onContinuarBriefing={handleContinuarSolaris}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function inferOrigemFromBlockers(
  blockers: readonly { id: string }[],
  blockerId: string,
): DimensaoOrigem {
  return blockers.some((b) => b.id === blockerId) ? "fallback" : "infer";
}

// ─── G-A5 (PR-C): conditional rendering por natureza_operacao_principal ───
// Resolve gap COSMÉTICO da auditoria Manus PR #867 A5.
// Substituição de filtro `.length > 0` por mapping explícito com tipo_operacao.
//
// Reusa semântica do NATUREZA_TO_TIPO_OBJETO de validateM1Input.ts (PR #859):
//   - "Produção própria" / "Comércio" / "Intermediação" → exige NCM
//   - "Transporte" / "Prestação de serviço" / "Locação" / "Intermediação" → exige NBS
// (Intermediação aparece em ambos pois é Misto)

const NATUREZA_REQUER_NCM = new Set([
  "Produção própria",
  "Comércio",
  "Intermediação",
]);

const NATUREZA_REQUER_NBS = new Set([
  "Transporte",
  "Prestação de serviço",
  "Locação",
  "Intermediação",
]);

export function shouldShowNCM(natureza: readonly string[]): boolean {
  return natureza.some((n) => NATUREZA_REQUER_NCM.has(n));
}

export function shouldShowNBS(natureza: readonly string[]): boolean {
  return natureza.some((n) => NATUREZA_REQUER_NBS.has(n));
}

/**
 * G-A10 fix (PR-C): detecta NBS digitado em campo NCM.
 * NBS tem formato `1.XXXX.XX.XX` (prefixo "1." opcional). NCM é `XXXX.XX.XX`.
 * Se string de NCM começa com "1." e tem mais de um ponto → provavelmente é NBS.
 */
export function isNbsInNcmField(value: string): boolean {
  const trimmed = value.trim();
  return /^1\.\d{4}\.\d{2}\.\d{2}$/.test(trimmed);
}

/**
 * G-A10 fix: validação de formato NCM (regex 8 dígitos com pontos)
 */
export function isValidNcmFormat(value: string): boolean {
  return /^\d{4}\.\d{2}\.\d{2}$/.test(value.trim());
}
