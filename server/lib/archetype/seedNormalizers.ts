/**
 * seedNormalizers.ts — PR-J Fase 2b
 *
 * Constantes de normalização de seed compartilhadas entre:
 *   - server/routers/perfil.ts (buildSeedFromProject)
 *   - server/routers-m1-monitor.ts (m1MonitorRouter.runAndLog)
 *
 * Antes de PR-J, essas constantes estavam duplicadas em escopo de função
 * em ambos os arquivos. Refactor garante uma única fonte de verdade —
 * elimina classe inteira de bugs do tipo "fix em A, esqueci de aplicar em B"
 * (Lição #32: adapter sem cobertura → bugs sequenciais).
 *
 * Regras invariantes (Fase 2a snapshots como gate):
 *   - TAX_REGIME_ALIASES e SNAKE_TO_LABEL: dois mapas próximos mas com inputs
 *     levemente diferentes (TAX_REGIME aceita snake + title idempotente;
 *     SNAKE_TO_LABEL aceita snake + 2 sinônimos extras "simples" e "regime_geral").
 *     Mantemos os 2 distintos para preservar comportamento atual byte-a-byte.
 *   - NATUREZA_TO_FONTES: idêntico nos 2 arquivos (whitespace-insensitive).
 *     Consolidado aqui — formato compacto.
 *   - POSICAO_ALIASES: existia APENAS em m1-monitor.ts. perfil.ts usa if/else
 *     inline, NÃO importa esta constante (preservar comportamento perfil).
 *
 * Vinculadas:
 *   - PR #892 (Fase 1 pré-análise)
 *   - PR #893 (Fase 2a snapshots gates de regressão)
 *   - Lição #32 (adapter sem cobertura)
 *   - Lição #43 (callgraph completo)
 */

/**
 * TAX_REGIME_ALIASES — usado por perfil.ts (buildSeedFromProject).
 *
 * Snake_case (formato salvo pelo client form) + title case (passthrough idempotente).
 * Cobre os 4 regimes oficiais: Simples Nacional, Lucro Presumido, Lucro Real, MEI.
 *
 * Refs históricas: perfil.ts:136 antes do PR-J Fase 2b.
 */
export const TAX_REGIME_ALIASES: Record<string, string> = {
  // snake_case (formato salvo pelo client form)
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI",
  // title case (passthrough idempotente)
  "Simples Nacional": "Simples Nacional",
  "Lucro Presumido": "Lucro Presumido",
  "Lucro Real": "Lucro Real",
  MEI: "MEI",
};

/**
 * SNAKE_TO_LABEL — usado por m1-monitor.ts (runAndLog handler).
 *
 * Snake_case → título UI. Inclui 2 aliases extras vs TAX_REGIME_ALIASES:
 *   - "simples" → "Simples Nacional" (forma curta)
 *   - "regime_geral" → "Lucro Real" (fallback razoável)
 *
 * NÃO consolidado com TAX_REGIME_ALIASES porque: m1-monitor.ts usa
 * `VALID_LABELS.has(rawRegime) ? rawRegime : SNAKE_TO_LABEL[rawRegime]`
 * (verificação prévia de label válido), enquanto perfil.ts usa lookup direto
 * com fallback `?? taxRegimeRaw`. Mudar SNAKE_TO_LABEL para incluir mappings
 * de title→title (idempotente) seria redundante mas não-quebra; mudar
 * TAX_REGIME_ALIASES para incluir "simples"/"regime_geral" muda comportamento
 * do perfil.ts que hoje retorna o input raw nesses casos.
 *
 * Refs históricas: m1-monitor.ts:169 antes do PR-J Fase 2b.
 */
export const SNAKE_TO_LABEL: Record<string, string> = {
  "lucro_real": "Lucro Real",
  "lucro_presumido": "Lucro Presumido",
  "simples_nacional": "Simples Nacional",
  "simples": "Simples Nacional",
  "mei": "MEI",
  "regime_geral": "Lucro Real", // fallback razoável para regime_geral
};

/**
 * POSICAO_ALIASES — usado APENAS por m1-monitor.ts (runAndLog handler).
 *
 * perfil.ts NÃO usa esta constante — usa if/else inline em buildSeedFromProject
 * (operationType → posicao). T4 standby anterior errou ao listar POSICAO_ALIASES
 * em perfil.ts: empíricamente confirmado que existe APENAS em m1-monitor.ts.
 *
 * Mapeia aliases de snake_case legado + variações de capitalização para os
 * literais aceitos pelo runner (buildPerfilEntidade.ts §2.2):
 * "Produtor/fabricante", "Atacadista", "Varejista", "Prestador de servico",
 * "Operadora", "Intermediador", "Importador", "Transportador".
 *
 * Refs históricas: m1-monitor.ts:193 antes do PR-J Fase 2b.
 */
export const POSICAO_ALIASES: Record<string, string> = {
  // snake_case legado
  "fabricante":          "Produtor/fabricante",
  "produtor":            "Produtor/fabricante",
  "distribuidor":        "Atacadista",
  "atacadista":          "Atacadista",
  "varejista":           "Varejista",
  "prestador_servico":   "Prestador de servico",
  "prestador de serviço": "Prestador de servico",
  "intermediador":       "Intermediador",
  "operadora":           "Operadora",
  "operadora_regulada":  "Operadora",
  "importador":          "Importador",
  // Alias especial: "Produtor" (agro) → "Produtor/fabricante" (runner)
  "Produtor":            "Produtor/fabricante",
  // Alias especial: "Fabricante" (indústria) → "Produtor/fabricante" (runner)
  "Fabricante":          "Produtor/fabricante",
  // Alias: "Prestador de Serviço" (com acento) → "Prestador de servico"
  "Prestador de Serviço": "Prestador de servico",
  "Transportador":       "Transportador", // pass-through (runner usa natureza_op)
  "Comerciante":         "Varejista",     // alias razoável
  "Importador":          "Importador",    // pass-through (runner usa atua_importacao)
  "Intermediador":       "Intermediador", // pass-through
};

/**
 * NATUREZA_TO_FONTES — usado por perfil.ts E m1-monitor.ts.
 *
 * Mapeia natureza_operacao_principal (multi-select UI) → fontes_receita
 * (input para FONTE_RECEITA_TO_RELACAO no engine, derivando tipo_de_relacao).
 *
 * T4 standby + Fase 2a invariant test confirmaram: o conteúdo lógico é
 * idêntico entre perfil.ts:156 e m1-monitor.ts:226 (whitespace de alinhamento
 * visual difere, semântica não). Consolidado aqui em formato compacto.
 *
 * Refs históricas: perfil.ts:156 + m1-monitor.ts:226 antes do PR-J Fase 2b.
 */
export const NATUREZA_TO_FONTES: Record<string, string> = {
  "Produção própria": "Producao propria",
  "Comércio": "Venda de mercadoria",
  "Prestação de serviço": "Prestacao de servico",
  "Transporte": "Prestacao de servico",
  "Intermediação": "Comissao/intermediacao",
  "Locação": "Aluguel/locacao",
};
