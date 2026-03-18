/**
 * flowStepperUtils.ts
 *
 * Utilitários para o FlowStepper — calcula qual é a última etapa concluída
 * com base no status do projeto, permitindo que o stepper mostre corretamente
 * todos os ícones verdes/clicáveis para projetos avançados.
 *
 * Mapeamento de status → etapa concluída:
 *   rascunho          → 1 (Projeto criado, nenhuma etapa do fluxo concluída)
 *   assessment_fase1  → 1 (Questionário em andamento)
 *   assessment_fase2  → 2 (Questionário concluído)
 *   matriz_riscos     → 3 (Briefing concluído)
 *   plano_acao        → 4 (Riscos concluídos)
 *   em_avaliacao      → 4 (Plano criado, aguardando aprovação)
 *   aprovado          → 5 (Todas as etapas concluídas)
 *   em_andamento      → 5
 *   parado            → 5
 *   concluido         → 5
 *   arquivado         → 5
 */

import type { FlowStep } from "@/components/FlowStepper";

export function statusToCompletedStep(status: string | undefined | null): FlowStep {
  if (!status) return 1 as FlowStep;
  const map: Record<string, FlowStep> = {
    rascunho:         1,
    assessment_fase1: 1,
    assessment_fase2: 2,
    matriz_riscos:    3,
    plano_acao:       4,
    em_avaliacao:     4,
    aprovado:         5,
    em_andamento:     5,
    parado:           5,
    concluido:        5,
    arquivado:        5,
  };
  return map[status] ?? 1;
}
