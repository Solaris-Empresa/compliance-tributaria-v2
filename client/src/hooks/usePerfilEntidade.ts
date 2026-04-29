/**
 * usePerfilEntidade.ts — Hook M2 PR-B · Perfil da Entidade
 *
 * Encapsula chamadas trpc.perfil.build / .confirm / .get
 * e expõe estado derivado para ConfirmacaoPerfil.tsx e PainelConfianca.tsx.
 *
 * Ref: feat/m2-pr-b-frontend-perfil · PROMPT-M2-v3-FINAL.json §B3
 */
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

export type PerfilStatus = "loading" | "error" | "pendente" | "inconsistente" | "bloqueado" | "confirmado";

export interface PerfilEntidadeState {
  /** Status consolidado do perfil */
  status: PerfilStatus;
  /** Snapshot dimensional (null se ainda não computado) */
  snapshot: Record<string, unknown> | null;
  /** Blockers ativos */
  blockers: Array<{ id: string; severity: string; rule: string }>;
  /** Campos obrigatórios faltantes */
  missingFields: string[];
  /** Hash do perfil (para auditoria) */
  perfilHash: string | null;
  /** Versão do arquétipo */
  archetypeVersion: string | null;
  /** Se já foi confirmado (imutável) */
  isConfirmed: boolean;
  /** Data da confirmação */
  confirmedAt: string | null;
  /** Score de confiança (0-100) */
  confidenceScore: number;
  /** Pode confirmar (zero hard_blocks + status !== "bloqueado") */
  canConfirm: boolean;
  /** Erro da API */
  error: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Refetch build */
  refetchBuild: () => void;
  /** Mutation de confirmação */
  confirmPerfil: ReturnType<typeof trpc.perfil.confirm.useMutation>;
}

/**
 * Calcula score de confiança baseado no snapshot.
 * Regra: cada dimensão preenchida = +20 pontos (5 dimensões = 100).
 * Hard blocks = -30 cada. Missing fields = -10 cada.
 */
function computeConfidenceScore(
  snapshot: Record<string, unknown> | null,
  blockers: Array<{ severity: string }>,
  missingFields: string[],
): number {
  if (!snapshot) return 0;

  let score = 0;

  // 5 dimensões canônicas (20 pts cada)
  const dims = ["objeto", "papel_na_cadeia", "tipo_de_relacao", "territorio", "regime"];
  for (const dim of dims) {
    const val = snapshot[dim];
    if (val !== null && val !== undefined) {
      if (Array.isArray(val) && val.length > 0) score += 20;
      else if (typeof val === "string" && val.length > 0) score += 20;
    }
  }

  // Penalidades
  const hardBlocks = blockers.filter((b) => b.severity === "HARD_BLOCK").length;
  score -= hardBlocks * 30;
  score -= missingFields.length * 10;

  return Math.max(0, Math.min(100, score));
}

export function usePerfilEntidade(projectId: number | null): PerfilEntidadeState {
  // Query: perfil.get (verifica se já foi confirmado)
  const getQuery = trpc.perfil.get.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId, retry: false },
  );

  // Query: perfil.build (computa snapshot sem persistir)
  const buildQuery = trpc.perfil.build.useQuery(
    { projectId: projectId! },
    {
      enabled: !!projectId && !getQuery.data?.confirmed,
      retry: false,
    },
  );

  // Mutation: perfil.confirm
  const confirmMutation = trpc.perfil.confirm.useMutation();

  const state = useMemo((): Omit<PerfilEntidadeState, "refetchBuild" | "confirmPerfil"> => {
    // Se já confirmado (imutável)
    if (getQuery.data?.confirmed) {
      return {
        status: "confirmado",
        snapshot: getQuery.data.snapshot as unknown as Record<string, unknown>,
        blockers: [],
        missingFields: [],
        perfilHash: getQuery.data.perfil_hash,
        archetypeVersion: getQuery.data.archetype_version,
        isConfirmed: true,
        confirmedAt: getQuery.data.confirmed_at,
        confidenceScore: 100,
        canConfirm: false,
        error: null,
        isLoading: false,
      };
    }

    // Loading
    if (getQuery.isLoading || buildQuery.isLoading) {
      return {
        status: "loading",
        snapshot: null,
        blockers: [],
        missingFields: [],
        perfilHash: null,
        archetypeVersion: null,
        isConfirmed: false,
        confirmedAt: null,
        confidenceScore: 0,
        canConfirm: false,
        error: null,
        isLoading: true,
      };
    }

    // Error (feature flag disabled returns FORBIDDEN)
    if (getQuery.error || buildQuery.error) {
      const errMsg = getQuery.error?.message || buildQuery.error?.message || "Erro desconhecido";
      return {
        status: "error",
        snapshot: null,
        blockers: [],
        missingFields: [],
        perfilHash: null,
        archetypeVersion: null,
        isConfirmed: false,
        confirmedAt: null,
        confidenceScore: 0,
        canConfirm: false,
        error: errMsg,
        isLoading: false,
      };
    }

    // Build result available
    if (buildQuery.data) {
      const { snapshot, blockers, missing_required_fields, status_arquetipo, perfil_hash } = buildQuery.data;
      const blockersTyped = blockers as unknown as Array<{ id: string; severity: string; rule: string }>;
      const missingFields = missing_required_fields as string[];
      const hasHardBlocks = blockersTyped.some((b) => b.severity === "HARD_BLOCK");
      const snapshotRecord = snapshot as unknown as Record<string, unknown>;
      const confidenceScore = computeConfidenceScore(snapshotRecord, blockersTyped, missingFields);
      const canConfirm = !hasHardBlocks && status_arquetipo !== "bloqueado" && missingFields.length === 0;

      return {
        status: status_arquetipo as PerfilStatus,
        snapshot: snapshotRecord,
        blockers: blockersTyped,
        missingFields,
        perfilHash: perfil_hash,
        archetypeVersion: buildQuery.data.archetype_version_target,
        isConfirmed: false,
        confirmedAt: null,
        confidenceScore,
        canConfirm,
        error: null,
        isLoading: false,
      };
    }

    // Default (no data yet)
    return {
      status: "pendente",
      snapshot: null,
      blockers: [],
      missingFields: [],
      perfilHash: null,
      archetypeVersion: null,
      isConfirmed: false,
      confirmedAt: null,
      confidenceScore: 0,
      canConfirm: false,
      error: null,
      isLoading: false,
    };
  }, [getQuery.data, getQuery.isLoading, getQuery.error, buildQuery.data, buildQuery.isLoading, buildQuery.error]);

  return {
    ...state,
    refetchBuild: () => buildQuery.refetch(),
    confirmPerfil: confirmMutation,
  };
}
