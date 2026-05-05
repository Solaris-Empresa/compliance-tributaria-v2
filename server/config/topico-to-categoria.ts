/**
 * topico-to-categoria.ts — Sprint M3.10 Fix B
 *
 * Mapeamento determinístico tópico SOLARIS/IAGEN → categoria canônica
 * (`risk_category_code`). Usado por solaris-gap-analyzer e iagen-gap-analyzer
 * para preencher coluna `risk_category_code` em project_gaps_v3.
 *
 * Sem este mapeamento, gaps de fontes solaris/iagen ficam com
 * risk_category_code = NULL e cairiam em "unmapped" no GapToRuleMapper —
 * causa raiz documentada em
 * `docs/governance/post-mortems/2026-05-05-mono-fonte-matriz-riscos.md`.
 *
 * Origem dos mapeamentos: dry-run validado pelo Manus em 2026-05-05
 * (`Resultado do Dry-Run_ Validação do Diagnóstico Mono-Fonte.md`).
 *
 * MANUTENÇÃO: tópicos não mapeados retornam null (gap mantém
 * risk_category_code NULL). Curadoria deve expandir conforme novos
 * tópicos aparecem em SOLARIS_GAPS_MAP ou iagen_answers.
 */

/** Categorias canônicas válidas (espelha CategoriaCanonica em risk-categorizer.ts). */
type CategoriaCanonica =
  | "imposto_seletivo"
  | "ibs_cbs"
  | "regime_diferenciado"
  | "aliquota_reduzida"
  | "aliquota_zero"
  | "cadastro_fiscal"
  | "split_payment"
  | "obrigacao_acessoria"
  | "transicao"
  | "enquadramento_geral"
  | "confissao_automatica"
  | "inscricao_cadastral"
  | "transicao_iss_ibs"
  | "credito_presumido";

/**
 * Mapping curado tópico → categoria canônica.
 * Validado empiricamente via dry-run Manus 2026-05-05.
 */
export const TOPICO_TO_CATEGORIA: Record<string, CategoriaCanonica> = {
  // Confissão automática (Art. 45 LC 214) — gaps sobre dívida ativa, NF-e, CGIBS
  confissao_automatica: "confissao_automatica",
  nfe: "confissao_automatica",
  cgibs: "confissao_automatica",
  divida_ativa: "confissao_automatica",
  erro_operacional: "confissao_automatica",
  credito_tributario: "confissao_automatica",
  art45: "confissao_automatica",

  // Obrigação acessória — apuração assistida, retificação, espontaneidade
  apuracao_assistida: "obrigacao_acessoria",
  apuracao: "obrigacao_acessoria",
  retificacao: "obrigacao_acessoria",
  estorno: "obrigacao_acessoria",
  credito_indevido: "obrigacao_acessoria",
  espontaneidade: "obrigacao_acessoria",

  // Regime diferenciado — ERP, parametrização fiscal
  erp: "regime_diferenciado",
  parametrizacao_fiscal: "regime_diferenciado",

  // Enquadramento geral — governança, risco sistêmico
  governanca: "enquadramento_geral",
  risco_sistemico: "enquadramento_geral",
  trilha_auditoria: "enquadramento_geral",

  // Split payment — contraditório, ampla defesa, judicialização
  contraditorio: "split_payment",
  ampla_defesa: "split_payment",
  judicializacao: "split_payment",
  estrategia_juridica: "split_payment",

  // Inscrição cadastral — passivo tributário
  passivo_tributario: "inscricao_cadastral",
  cobranca_imediata: "inscricao_cadastral",
  saldo_recolher: "inscricao_cadastral",
};

/**
 * Mapeia um tópico para categoria canônica.
 * Retorna null se tópico não é reconhecido (gap fica com risk_category_code NULL).
 *
 * @param topico - Tópico do gap (snake_case, lowercase)
 * @returns Categoria canônica ou null se não mapeado
 */
export function mapTopicToCategory(
  topico: string | null | undefined,
): CategoriaCanonica | null {
  if (!topico) return null;
  const normalized = topico.trim().toLowerCase();
  return TOPICO_TO_CATEGORIA[normalized] ?? null;
}
