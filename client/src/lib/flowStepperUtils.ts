/**
 * flowStepperUtils.ts
 *
 * Utilitários para o FlowStepper — calcula qual é a última etapa concluída
 * com base no status do projeto, permitindo que o stepper mostre corretamente
 * todos os ícones verdes/clicáveis para projetos avançados.
 *
 * Mapeamento de status → etapa concluída (completedUpTo):
 *   rascunho                → 1 (Projeto criado, nenhuma etapa do fluxo concluída)
 *   assessment_fase1        → 1 (Questionário legado em andamento)
 *   assessment_fase2        → 2 (Questionário legado concluído)
 *   matriz_riscos           → 3 (Briefing concluído — legado v2.0)
 *   plano_acao              → 4 (Riscos concluídos — legado v2.0)
 *   em_avaliacao            → 4 (Plano criado, aguardando aprovação)
 *   aprovado                → 5 (Todas as etapas concluídas)
 *   em_andamento            → 5
 *   parado                  → 5
 *   concluido               → 5
 *   arquivado               → 5
 *
 * v2.1 — Novos status do fluxo de diagnóstico em 3 camadas:
 *   consistencia_pendente   → 1 (Etapa 1 em andamento)
 *   cnaes_confirmados       → 1 (CNAEs confirmados, etapa 2 ainda não iniciada)
 *   diagnostico_corporativo → 1 (Etapa 2 em andamento — camada 1)
 *   diagnostico_operacional → 1 (Etapa 2 em andamento — camada 2)
 *   diagnostico_cnae        → 1 (Etapa 2 em andamento — camada 3)
 *   briefing                → 2 (Etapa 2 concluída, etapa 3 em andamento)
 *   riscos                  → 3 (Etapa 3 concluída, etapa 4 em andamento)
 *   plano                   → 4 (Etapa 4 concluída, etapa 5 em andamento)
 *   dashboard               → 5 (Todas as etapas concluídas)
 */

import type { FlowStep } from "@/components/FlowStepper";

export function statusToCompletedStep(status: string | undefined | null): FlowStep {
  if (!status) return 1 as FlowStep;
  const map: Record<string, FlowStep> = {
    // ── v2.1 — Novos status ──────────────────────────────────────────────────
    consistencia_pendente:   1,
    cnaes_confirmados:       1,
    diagnostico_corporativo: 1,
    diagnostico_operacional: 1,
    diagnostico_cnae:        1,
    briefing:                2,
    riscos:                  3,
    plano:                   4,
    dashboard:               5,
    // ── Legados v2.0 ─────────────────────────────────────────────────────────
    rascunho:                1,
    assessment_fase1:        1,
    assessment_fase2:        2,
    matriz_riscos:           3,
    plano_acao:              4,
    em_avaliacao:            4,
    aprovado:                5,
    em_andamento:            5,
    parado:                  5,
    concluido:               5,
    arquivado:               5,
  };
  return map[status] ?? 1;
}
