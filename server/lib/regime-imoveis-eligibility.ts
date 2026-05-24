/**
 * regime-imoveis-eligibility.ts — FEAT-COB-01 (#1176)
 *
 * Gate de elegibilidade do regime específico de bens imóveis (Arts. 251-270 LC 214/2025).
 * Despacho Definitivo 24/05/2026 (D2 — gate por CNAE automático, sem questionário).
 *
 * Base legal verificada no corpus (fonte de verdade):
 *   - Art. 360 V (decreto) + §13 → "serviço de construção civil" é operação do regime
 *     (execução por administração/empreitada/subempreitada, incl. estradas/pontes/portos).
 *   - Art. 261 caput → alíquotas das operações do Capítulo reduzidas em 50%.
 *   - Art. 261 parágrafo único → locação/cessão/arrendamento reduzidas em 70%.
 *   - Art. 263 incisos (sujeito passivo): I alienante · III locador · V prestador de construção · VI intermediação.
 *   - 71xx (engenharia/arquitetura/projeto) NÃO é construção civil (§13 = execução, não projeto;
 *     projetos são serviço profissional, regime do Art. 127) → EXCLUÍDO.
 *
 * Funções PURAS (Lição #65): só CNAE, sem DB nem cnaeAnswers (gate é automático por CNAE — D2).
 * Formato de CNAE no perfil: "XXXX-X/YY" (ex: "4120-4/00") — ver project-profile-extractor.ts.
 *
 * Distinção de subclasse importa (50% vs 70%):
 *   6810-2/01 (venda própria, alienante)  → oportunidade 50%
 *   6810-2/02 (aluguel de imóveis próprios) → locação 70%
 */

/** Prefixos de 4 dígitos elegíveis à oportunidade de 50% (construção + incorporação). */
const OPORTUNIDADE_PREFIXOS = ["4120", "4110", "4121"] as const;

/** Subclasses específicas elegíveis à oportunidade de 50% (venda própria + intermediação). */
const OPORTUNIDADE_SUBCLASSES = ["6810-2/01", "6821-8/01"] as const;

/** Subclasse de locação (70% — Art. 261 PU). */
const LOCACAO_SUBCLASSE = "6810-2/02" as const;

/**
 * Oportunidade de 50% (Art. 261 caput): construção (41xx alvo), incorporação (4110),
 * alienação própria (6810-2/01) e intermediação (6821-8/01).
 * NÃO inclui 6810-2/02 (locação = 70%, ver isRegimeImoveisLocacao).
 */
export function isRegimeImoveisOportunidade(cnaes: string[]): boolean {
  return cnaes.some(
    (c) =>
      OPORTUNIDADE_PREFIXOS.some((p) => c.startsWith(p)) ||
      OPORTUNIDADE_SUBCLASSES.some((s) => c.includes(s)),
  );
}

/**
 * Oportunidade de 70% (Art. 261 parágrafo único): locação/cessão/arrendamento.
 * Gate na subclasse 6810-2/02 (aluguel de imóveis próprios).
 */
export function isRegimeImoveisLocacao(cnaes: string[]): boolean {
  return cnaes.some((c) => c.includes(LOCACAO_SUBCLASSE));
}

/**
 * Risco/obrigação (Arts. 269-270): cadastro de obra (CIB) + apuração por empreendimento.
 * Aplica-se a toda construtora que executa obra → qualquer CNAE 41xx (despacho D2 G-C).
 */
export function isRegimeImoveisRisco(cnaes: string[]): boolean {
  return cnaes.some((c) => c.startsWith("41"));
}

/**
 * FEAT-COB-01 (#1176) — diretriz/restrição IMPERATIVA injetada no prompt do briefing LLM
 * (fluxoV3.generateBriefing). Mesmo padrão de buildCreditoPresumidoRestriction (#1202) e
 * buildArt127PromptRestriction (#1194). Determinístico (Simples Nacional excluído — Art. 251).
 *
 *   elegível    → diretriz para CITAR as dimensões aplicáveis (50% / 70% / Arts. 269-270)
 *   não elegível → restrição imperativa (NÃO mencionar o regime)
 */
export function buildRegimeImoveisRestriction(
  cnaes: string[],
  taxRegime?: string | null,
): string {
  const sn = taxRegime === "simples_nacional";
  const op50 = !sn && isRegimeImoveisOportunidade(cnaes);
  const loc70 = !sn && isRegimeImoveisLocacao(cnaes);
  const risco = !sn && isRegimeImoveisRisco(cnaes);

  if (!op50 && !loc70 && !risco) {
    return (
      "\nRESTRIÇÃO NORMATIVA OBRIGATÓRIA: O regime específico de bens imóveis " +
      "(Arts. 251 a 270 da LC 214/2025, incluindo a redução de 50%/70% do Art. 261) NÃO se " +
      "aplica ao perfil analisado. NÃO mencione, NÃO sugira e NÃO gere gap ou oportunidade " +
      "relacionada a esse regime. Isto é determinístico.\n"
    );
  }

  const itens: string[] = [];
  if (op50) {
    itens.push(
      "oportunidade de redução de 50% nas operações com bens imóveis (Art. 261 caput)",
    );
  }
  if (loc70) {
    itens.push(
      "oportunidade de redução de 70% na locação, cessão onerosa e arrendamento de bens imóveis (Art. 261, parágrafo único)",
    );
  }
  if (risco) {
    itens.push(
      "obrigação de cadastro de obra (CIB) e apuração por empreendimento de construção civil (Arts. 269 e 270)",
    );
  }

  return (
    "\nDIRETRIZ NORMATIVA OBRIGATÓRIA: O perfil é contribuinte do regime específico de bens " +
    "imóveis (Arts. 251-270 da LC 214/2025). CITE explicitamente: " +
    itens.join("; ") +
    ". Fundamento determinístico (engine) — não inventar percentuais diferentes.\n"
  );
}

/**
 * FEAT-COB-01 (#1176) — filtro DEFENSIVO dos gaps de imóveis no BriefingEngineView
 * (briefingEngine.ts lê project_gaps_v3 direto). Mesmo padrão de filterCreditoPresumidoGaps (P2-B #1204).
 *
 * NOTA (Lição #59): hoje o regime de imóveis é gerado por-PERFIL (inferNormativeRisks → risks_v4),
 * NÃO por requisito → NÃO existem gaps 'regime_especifico_imoveis*' / 'risco_art_269_270' em
 * project_gaps_v3 (decisão N1.4: sem REQ-IMO). Logo este filtro é NO-OP no estado atual.
 * Mantido para (a) simetria com credito_presumido e (b) proteger o BriefingEngineView caso
 * requisitos futuros passem a gerar esses gaps (evita o bug do P2-B reaparecer).
 *
 * Filtra POR DIMENSÃO: suprime cada categoria que o perfil não é elegível a receber.
 */
export function filterRegimeImoveisGaps<T extends { risk_category_code?: string | null }>(
  gaps: T[],
  cnaes: string[],
  taxRegime?: string | null,
): T[] {
  const sn = taxRegime === "simples_nacional";
  const suprimir = new Set<string>();
  if (sn || !isRegimeImoveisOportunidade(cnaes)) suprimir.add("regime_especifico_imoveis");
  if (sn || !isRegimeImoveisLocacao(cnaes)) suprimir.add("regime_especifico_imoveis_locacao");
  if (sn || !isRegimeImoveisRisco(cnaes)) suprimir.add("risco_art_269_270");
  if (suprimir.size === 0) return gaps;
  return gaps.filter((g) => !g.risk_category_code || !suprimir.has(g.risk_category_code));
}
