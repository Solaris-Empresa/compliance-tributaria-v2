/**
 * source-type-labels.ts — fonte ÚNICA dos labels de fonte (source_type / source_priority).
 *
 * Consolida as 5 cópias que existiam (server `SOURCE_TYPE_LABEL_V2` + 4 client
 * `SOURCE_LABELS`) num superset (UX-BRIEFING-C-V2 PR-0 / D4 / G5).
 * Precedente: `shared/categoria-labels.ts`.
 *
 * Labels canônicos (UX-LABELS-01 #1342, sem emoji). Superset de 11 chaves:
 *   - 7 source_type do briefing (rag, cnae, descricao, questionario, iagen, regra_semantica, solaris)
 *   - 4 source_priority extras de risco (ncm, nbs, regulatorio, inferred)
 *
 * Consumidores: server/routers-fluxo-v3.ts + client {RiskDashboardV4, ActionPlanPage,
 * ConsolidacaoV4, generateDiagnosticoPDF}. NÃO criar 6ª cópia.
 */
export const SOURCE_TYPE_LABELS: Record<string, string> = {
  cnae: "Incidência por atividade econômica (CNAE)",
  ncm: "Incidência por código de produto (NCM)",
  nbs: "Incidência por código de serviço (NBS)",
  solaris: "Questionário de conformidade SOLARIS",
  iagen: "Análise complementar por IA",
  regulatorio: "Norma regulatória aplicável",
  inferred: "Enquadramento inferido por perfil",
  rag: "Norma aplicável identificada",
  descricao: "Sinal identificado na descrição da atividade",
  questionario: "Declaração do contribuinte",
  regra_semantica: "Aplicação obrigatória por perfil",
};
