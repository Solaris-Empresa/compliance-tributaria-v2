/**
 * shared/categoria-labels.ts — Labels canônicas das categorias de risco
 *
 * F0-3 (Sprint 5, 2026-06-02): consolida 5 cópias do CATEGORIA_LABELS que
 * existiam duplicadas em:
 *   - server/lib/action-plan-engine-v4.ts:19
 *   - client/src/components/RiskDashboardV4.tsx:162
 *   - client/src/lib/generateDiagnosticoPDF.ts:131
 *   - client/src/pages/ActionPlanPage.tsx:72
 *   - client/src/pages/ConsolidacaoV4.tsx:56
 *
 * Cobre as 23 categorias ativas em `risk_categories` (status='ativo') conforme
 * snapshot Manus 2026-06-02 (resposta à M-1 do Board Sprint 5).
 *
 * Sync com `Categoria` type em `server/lib/risk-engine-v4.ts:27-37`:
 * type é a verdade canônica para tsc (Record exige todas as chaves quando não
 * Partial); este map garante label legível PT-BR para cada categoria.
 *
 * Categoria nova adicionada ao banco DEVE:
 *   1. Entrar no `Categoria` type (risk-engine-v4.ts)
 *   2. Entrar neste map com label PT-BR
 *   3. Opcionalmente entrar no `SEVERITY_TABLE` (caso contrário, fallback "media" + "curto_prazo")
 *
 * REGRA-ORQ-32 (no hardcode — visão sistêmica): este map é fallback. Fonte
 * canônica em runtime é `risk_categories.codigo` no banco. Map serve para UI
 * exibir label legível mesmo sem fetch do banco (SSR + componentes síncronos).
 */
export const CATEGORIA_LABELS: Record<string, string> = {
  // ─── 11 categorias originais (preservadas vs cópias antigas) ───
  imposto_seletivo: "Imposto Seletivo",
  confissao_automatica: "Confissão Automática",
  split_payment: "Split Payment",
  inscricao_cadastral: "Inscrição Cadastral",
  regime_diferenciado: "Regime Diferenciado",
  transicao_iss_ibs: "Transição ISS → IBS",
  obrigacao_acessoria: "Obrigação Acessória",
  aliquota_zero: "Alíquota Zero",
  aliquota_reduzida: "Alíquota Reduzida",
  credito_presumido: "Crédito Presumido",
  enquadramento_geral: "Enquadramento Geral",

  // ─── 12 categorias do banco que faltavam no type TS (N1 Sprint 5) ───
  credito_presumido_bens_usados:               "Crédito Presumido — Bens Usados",
  credito_presumido_reciclagem:                "Crédito Presumido — Reciclagem",
  regime_diferenciado_aliquota_reduzida_30:    "Regime Diferenciado — Alíquota Reduzida 30%",
  regime_diferenciado_aliquota_reduzida_60:    "Regime Diferenciado — Alíquota Reduzida 60%",
  regime_diferenciado_aliquota_zero:           "Regime Diferenciado — Alíquota Zero",
  regime_diferenciado_produtor_rural:          "Regime Diferenciado — Produtor Rural",
  regime_diferenciado_produtor_rural_credito:  "Regime Diferenciado — Produtor Rural (Crédito)",
  regime_diferenciado_reabilitacao_urbana:     "Regime Diferenciado — Reabilitação Urbana",
  regime_diferenciado_transporte:              "Regime Diferenciado — Transporte",
  regime_especifico_imoveis:                   "Regime Específico — Imóveis",
  regime_especifico_imoveis_locacao:           "Regime Específico — Imóveis (Locação 70%)",
  risco_art_269_270:                           "Obrigação — Cadastro e Apuração por Empreendimento",
};
