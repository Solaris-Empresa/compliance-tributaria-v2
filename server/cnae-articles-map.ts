/**
 * Pré-RAG Inteligente — Mapeamento CNAE → Tópicos → Artigos Regulatórios
 * Sprint V62: camada intermediária de seleção de artigos antes do RAG completo
 *
 * Cobertura: 25 grupos CNAE (2 primeiros dígitos) + fallback geral
 * Fontes: LC 214/2025, LC 227/2024, EC 132/2023, LC 244/2024
 */

export interface CnaeArticleContext {
  grupo: string;
  descricao: string;
  topicos: string[];
  artigos_lc214: string[];
  artigos_ec132: string[];
  artigos_lc227: string[];
  artigos_lc244: string[];
  notas_especificas: string[];
}

/**
 * Mapeamento por grupo CNAE (2 primeiros dígitos do código).
 * Cobre os setores mais impactados pela Reforma Tributária.
 */
export const CNAE_ARTICLES_MAP: Record<string, CnaeArticleContext> = {
  // ── COMÉRCIO ──────────────────────────────────────────────────────────────
  "47": {
    grupo: "47",
    descricao: "Comércio varejista",
    topicos: ["não cumulatividade", "crédito de IBS/CBS", "split payment", "substituição tributária"],
    artigos_lc214: ["Art. 9 (fato gerador)", "Art. 28 (não cumulatividade)", "Art. 47-52 (créditos)", "Art. 156-A (IBS)", "Art. 195 (CBS)"],
    artigos_ec132: ["Art. 1 (IBS e CBS)", "Art. 3 (não cumulatividade ampla)"],
    artigos_lc227: ["Art. 5 (split payment obrigatório para varejo)", "Art. 12 (prazo de adequação)"],
    artigos_lc244: ["Art. 3 (transição 2026-2032)", "Art. 7 (alíquotas progressivas)"],
    notas_especificas: [
      "Varejo é obrigado ao split payment a partir de jan/2027",
      "Crédito de IBS/CBS sobre compras de mercadorias para revenda é amplo",
      "Substituição tributária progressiva será eliminada no novo regime",
    ],
  },
  "46": {
    grupo: "46",
    descricao: "Comércio atacadista",
    topicos: ["não cumulatividade", "crédito de IBS/CBS", "split payment", "importação"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 156-A", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 3"],
    artigos_lc227: ["Art. 5", "Art. 12"],
    artigos_lc244: ["Art. 3", "Art. 7"],
    notas_especificas: [
      "Atacadistas com operações interestaduais devem mapear impacto do IBS estadual",
      "Crédito de IBS/CBS sobre importações segue regras específicas do Art. 47",
    ],
  },
  "45": {
    grupo: "45",
    descricao: "Comércio e reparação de veículos",
    topicos: ["não cumulatividade", "IS sobre veículos", "crédito de IBS/CBS"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 387-392 (IS sobre veículos)"],
    artigos_ec132: ["Art. 1", "Art. 8 (Imposto Seletivo)"],
    artigos_lc227: ["Art. 5"],
    artigos_lc244: ["Art. 3", "Art. 7"],
    notas_especificas: [
      "Veículos automotores são sujeitos ao Imposto Seletivo (IS) — Art. 387-392 LC 214",
      "Concessionárias devem avaliar impacto do IS na precificação",
    ],
  },
  // ── SERVIÇOS ──────────────────────────────────────────────────────────────
  "62": {
    grupo: "62",
    descricao: "Atividades de tecnologia da informação",
    topicos: ["tributação de serviços digitais", "não cumulatividade", "crédito de IBS/CBS", "exportação de serviços"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 156-A §2 (serviços digitais)", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 3", "Art. 5 (serviços digitais)"],
    artigos_lc227: ["Art. 8 (exportação de serviços — imunidade)"],
    artigos_lc244: ["Art. 3", "Art. 7"],
    notas_especificas: [
      "Exportação de serviços de TI mantém imunidade de IBS/CBS — Art. 8 LC 227",
      "SaaS e licenciamento de software têm tratamento específico no Art. 156-A §2",
      "Empresas de TI com clientes no exterior devem documentar exportação para manter imunidade",
    ],
  },
  "63": {
    grupo: "63",
    descricao: "Atividades de prestação de serviços de informação",
    topicos: ["serviços digitais", "não cumulatividade", "exportação de serviços"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 156-A §2"],
    artigos_ec132: ["Art. 1", "Art. 5"],
    artigos_lc227: ["Art. 8"],
    artigos_lc244: ["Art. 3"],
    notas_especificas: [
      "Plataformas digitais e marketplaces têm obrigações específicas de split payment",
    ],
  },
  "64": {
    grupo: "64",
    descricao: "Atividades de serviços financeiros",
    topicos: ["regime específico financeiro", "não cumulatividade reduzida", "CBS sobre serviços financeiros"],
    artigos_lc214: ["Art. 202-220 (regime específico de serviços financeiros)", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 9 (regime específico)"],
    artigos_lc227: ["Art. 15 (instituições financeiras)"],
    artigos_lc244: ["Art. 10 (transição setor financeiro)"],
    notas_especificas: [
      "Setor financeiro tem regime específico — Art. 202-220 LC 214",
      "Alíquota de CBS para serviços financeiros é diferenciada",
      "IOF não é substituído pelo IBS/CBS — coexistência de tributos",
    ],
  },
  "65": {
    grupo: "65",
    descricao: "Seguros, resseguros, previdência complementar",
    topicos: ["regime específico seguros", "CBS sobre seguros", "não cumulatividade"],
    artigos_lc214: ["Art. 221-235 (regime específico seguros)", "Art. 195"],
    artigos_ec132: ["Art. 9"],
    artigos_lc227: ["Art. 15"],
    artigos_lc244: ["Art. 10"],
    notas_especificas: [
      "Seguradoras têm regime específico — Art. 221-235 LC 214",
      "Prêmios de seguro têm base de cálculo diferenciada",
    ],
  },
  // ── SAÚDE ─────────────────────────────────────────────────────────────────
  "86": {
    grupo: "86",
    descricao: "Atividades de atenção à saúde humana",
    topicos: ["alíquota reduzida saúde", "imunidade", "não cumulatividade", "medicamentos"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 120-135 (saúde — alíquota reduzida)", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 6 (saúde — alíquota reduzida)"],
    artigos_lc227: ["Art. 10 (serviços de saúde)"],
    artigos_lc244: ["Art. 5 (cesta básica saúde)"],
    notas_especificas: [
      "Serviços de saúde têm alíquota reduzida de IBS/CBS — Art. 120-135 LC 214",
      "Medicamentos da cesta básica têm alíquota zero — Art. 5 LC 244",
      "Hospitais e clínicas devem mapear quais serviços se qualificam para redução",
    ],
  },
  "87": {
    grupo: "87",
    descricao: "Atividades de atenção à saúde humana — residencial",
    topicos: ["alíquota reduzida saúde", "não cumulatividade"],
    artigos_lc214: ["Art. 120-135", "Art. 195"],
    artigos_ec132: ["Art. 6"],
    artigos_lc227: ["Art. 10"],
    artigos_lc244: ["Art. 5"],
    notas_especificas: ["Casas de repouso e cuidados residenciais seguem regime de saúde"],
  },
  // ── EDUCAÇÃO ──────────────────────────────────────────────────────────────
  "85": {
    grupo: "85",
    descricao: "Educação",
    topicos: ["imunidade educação", "alíquota reduzida", "não cumulatividade"],
    artigos_lc214: ["Art. 9", "Art. 136-150 (educação — alíquota reduzida)", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 7 (educação)"],
    artigos_lc227: ["Art. 11 (serviços educacionais)"],
    artigos_lc244: ["Art. 6 (educação básica)"],
    notas_especificas: [
      "Educação básica tem alíquota zero — Art. 6 LC 244",
      "Ensino superior e cursos livres têm alíquota reduzida — Art. 136-150 LC 214",
      "Entidades sem fins lucrativos mantêm imunidade constitucional",
    ],
  },
  // ── CONSTRUÇÃO ────────────────────────────────────────────────────────────
  "41": {
    grupo: "41",
    descricao: "Construção de edifícios",
    topicos: ["crédito de IBS/CBS sobre insumos", "não cumulatividade", "split payment", "regime específico construção"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 236-250 (construção civil)", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 3"],
    artigos_lc227: ["Art. 5", "Art. 13 (construção civil)"],
    artigos_lc244: ["Art. 3", "Art. 8 (habitação popular)"],
    notas_especificas: [
      "Construção civil tem regime específico — Art. 236-250 LC 214",
      "Habitação popular (Minha Casa Minha Vida) tem alíquota reduzida — Art. 8 LC 244",
      "Crédito sobre materiais de construção é amplo no novo regime",
    ],
  },
  "42": {
    grupo: "42",
    descricao: "Obras de infraestrutura",
    topicos: ["crédito de IBS/CBS", "não cumulatividade", "contratos com poder público"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 236-250"],
    artigos_ec132: ["Art. 1", "Art. 3"],
    artigos_lc227: ["Art. 13"],
    artigos_lc244: ["Art. 3"],
    notas_especificas: [
      "Contratos com poder público têm regras específicas de split payment",
    ],
  },
  // ── INDÚSTRIA ─────────────────────────────────────────────────────────────
  "10": {
    grupo: "10",
    descricao: "Fabricação de produtos alimentícios",
    topicos: ["cesta básica", "alíquota zero", "não cumulatividade", "IS sobre produtos prejudiciais"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 387-392 (IS)", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 8"],
    artigos_lc227: ["Art. 5"],
    artigos_lc244: ["Art. 1-4 (cesta básica nacional)", "Art. 5 (alíquota zero alimentos)"],
    notas_especificas: [
      "Alimentos da cesta básica têm alíquota zero — Art. 1-4 LC 244",
      "Bebidas açucaradas e ultraprocessados podem ser sujeitos ao IS",
      "Fabricantes devem classificar produtos entre cesta básica e regime geral",
    ],
  },
  "11": {
    grupo: "11",
    descricao: "Fabricação de bebidas",
    topicos: ["IS sobre bebidas", "não cumulatividade", "alíquota específica"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 387-392 (IS — bebidas alcoólicas)"],
    artigos_ec132: ["Art. 1", "Art. 8"],
    artigos_lc227: ["Art. 5"],
    artigos_lc244: ["Art. 3"],
    notas_especificas: [
      "Bebidas alcoólicas são sujeitas ao Imposto Seletivo — Art. 387-392 LC 214",
      "Refrigerantes e bebidas açucaradas podem ter IS adicional",
    ],
  },
  "19": {
    grupo: "19",
    descricao: "Fabricação de coque, derivados do petróleo e biocombustíveis",
    topicos: ["IS sobre combustíveis", "não cumulatividade", "regime específico energia"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 387-392 (IS — combustíveis)", "Art. 251-270 (regime combustíveis)"],
    artigos_ec132: ["Art. 1", "Art. 8"],
    artigos_lc227: ["Art. 5"],
    artigos_lc244: ["Art. 3"],
    notas_especificas: [
      "Combustíveis têm regime específico de IBS/CBS — Art. 251-270 LC 214",
      "IS sobre combustíveis fósseis é progressivo",
    ],
  },
  // ── AGRONEGÓCIO ───────────────────────────────────────────────────────────
  "01": {
    grupo: "01",
    descricao: "Agricultura, pecuária e serviços relacionados",
    topicos: ["cesta básica", "alíquota zero", "não cumulatividade", "crédito presumido"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 3"],
    artigos_lc227: ["Art. 5"],
    artigos_lc244: ["Art. 1-4 (cesta básica)", "Art. 9 (agronegócio — crédito presumido)"],
    notas_especificas: [
      "Produção agropecuária para cesta básica tem alíquota zero",
      "Crédito presumido para pequenos produtores — Art. 9 LC 244",
      "Exportações agropecuárias mantêm imunidade",
    ],
  },
  // ── TRANSPORTE ────────────────────────────────────────────────────────────
  "49": {
    grupo: "49",
    descricao: "Transporte terrestre",
    topicos: ["não cumulatividade", "crédito de combustível", "split payment", "transporte de passageiros"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 3"],
    artigos_lc227: ["Art. 5", "Art. 14 (transporte público)"],
    artigos_lc244: ["Art. 3", "Art. 11 (transporte coletivo)"],
    notas_especificas: [
      "Transporte coletivo urbano tem alíquota reduzida — Art. 11 LC 244",
      "Crédito de IBS/CBS sobre combustível é relevante para transportadoras",
    ],
  },
  // ── IMÓVEIS ───────────────────────────────────────────────────────────────
  "68": {
    grupo: "68",
    descricao: "Atividades imobiliárias",
    topicos: ["regime específico imóveis", "não cumulatividade", "locação", "incorporação"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 271-290 (regime imóveis)", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 10 (imóveis)"],
    artigos_lc227: ["Art. 16 (locação imóveis)"],
    artigos_lc244: ["Art. 8 (habitação popular)"],
    notas_especificas: [
      "Atividades imobiliárias têm regime específico — Art. 271-290 LC 214",
      "Locação residencial pode ter tratamento diferenciado",
      "Incorporadoras devem avaliar impacto no custo de construção e repasse",
    ],
  },
  // ── ENERGIA ───────────────────────────────────────────────────────────────
  "35": {
    grupo: "35",
    descricao: "Eletricidade, gás e outras utilidades",
    topicos: ["regime específico energia", "IS sobre energia", "não cumulatividade"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 251-270 (regime energia)", "Art. 387-392 (IS)"],
    artigos_ec132: ["Art. 1", "Art. 8"],
    artigos_lc227: ["Art. 5"],
    artigos_lc244: ["Art. 3"],
    notas_especificas: [
      "Energia elétrica tem regime específico de tributação — Art. 251-270 LC 214",
      "Energia de fontes renováveis pode ter IS reduzido",
    ],
  },
  // ── TELECOMUNICAÇÕES ──────────────────────────────────────────────────────
  "61": {
    grupo: "61",
    descricao: "Telecomunicações",
    topicos: ["regime específico telecom", "não cumulatividade", "split payment"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 291-310 (regime telecom)", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 11 (telecom)"],
    artigos_lc227: ["Art. 5"],
    artigos_lc244: ["Art. 3"],
    notas_especificas: [
      "Telecomunicações têm regime específico — Art. 291-310 LC 214",
      "Serviços de internet e banda larga têm tratamento diferenciado",
    ],
  },
  // ── HOTELARIA E TURISMO ───────────────────────────────────────────────────
  "55": {
    grupo: "55",
    descricao: "Alojamento",
    topicos: ["não cumulatividade", "crédito de IBS/CBS", "split payment"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 3"],
    artigos_lc227: ["Art. 5"],
    artigos_lc244: ["Art. 3"],
    notas_especificas: [
      "Hotéis e pousadas devem avaliar impacto do split payment no fluxo de caixa",
    ],
  },
  "56": {
    grupo: "56",
    descricao: "Alimentação (restaurantes, bares)",
    topicos: ["não cumulatividade", "crédito de insumos", "split payment"],
    artigos_lc214: ["Art. 9", "Art. 28", "Art. 47-52", "Art. 195"],
    artigos_ec132: ["Art. 1", "Art. 3"],
    artigos_lc227: ["Art. 5"],
    artigos_lc244: ["Art. 3"],
    notas_especificas: [
      "Restaurantes têm crédito amplo sobre insumos alimentícios",
      "Delivery e plataformas digitais têm obrigações específicas de split payment",
    ],
  },
};

/**
 * Contexto regulatório geral — aplicado quando o CNAE não tem mapeamento específico.
 */
export const FALLBACK_ARTICLE_CONTEXT: CnaeArticleContext = {
  grupo: "geral",
  descricao: "Regime geral",
  topicos: ["não cumulatividade", "crédito de IBS/CBS", "split payment", "transição 2026-2032"],
  artigos_lc214: ["Art. 9 (fato gerador)", "Art. 28 (não cumulatividade)", "Art. 47-52 (créditos)", "Art. 156-A (IBS)", "Art. 195 (CBS)"],
  artigos_ec132: ["Art. 1 (IBS e CBS)", "Art. 3 (não cumulatividade)"],
  artigos_lc227: ["Art. 5 (split payment)", "Art. 12 (prazo de adequação)"],
  artigos_lc244: ["Art. 3 (transição 2026-2032)", "Art. 7 (alíquotas progressivas)"],
  notas_especificas: [
    "Período de transição: 2026-2032 com coexistência de regimes",
    "Split payment obrigatório a partir de jan/2027",
    "Alíquota de referência IBS+CBS: ~26,5% (estimativa — sujeita a aprovação)",
  ],
};

/**
 * Retorna o contexto regulatório para uma lista de CNAEs confirmados.
 * Usa os 2 primeiros dígitos do código CNAE para o mapeamento.
 */
export function getArticlesForCnaes(cnaes: Array<{ code: string; description: string }>): string {
  const contexts: CnaeArticleContext[] = [];
  const seenGroups = new Set<string>();

  for (const cnae of cnaes) {
    const group = cnae.code.replace(/\D/g, "").substring(0, 2);
    if (!seenGroups.has(group)) {
      seenGroups.add(group);
      const context = CNAE_ARTICLES_MAP[group] || FALLBACK_ARTICLE_CONTEXT;
      contexts.push(context);
    }
  }

  if (contexts.length === 0) {
    contexts.push(FALLBACK_ARTICLE_CONTEXT);
  }

  // Formatar como texto para injeção no prompt
  const lines: string[] = [
    "=== CONTEXTO REGULATÓRIO (use APENAS estes artigos, não invente outros) ===",
    "",
  ];

  for (const ctx of contexts) {
    lines.push(`## Setor: ${ctx.descricao} (Grupo CNAE ${ctx.grupo})`);
    lines.push(`Tópicos relevantes: ${ctx.topicos.join(", ")}`);
    lines.push("");
    lines.push("**LC 214/2025:**");
    ctx.artigos_lc214.forEach(a => lines.push(`  - ${a}`));
    lines.push("**EC 132/2023:**");
    ctx.artigos_ec132.forEach(a => lines.push(`  - ${a}`));
    lines.push("**LC 227/2024:**");
    ctx.artigos_lc227.forEach(a => lines.push(`  - ${a}`));
    lines.push("**LC 244/2024:**");
    ctx.artigos_lc244.forEach(a => lines.push(`  - ${a}`));
    if (ctx.notas_especificas.length > 0) {
      lines.push("**Notas específicas do setor:**");
      ctx.notas_especificas.forEach(n => lines.push(`  - ${n}`));
    }
    lines.push("");
  }

  lines.push("INSTRUÇÃO CRÍTICA: Cite APENAS os artigos listados acima.");
  lines.push("Se precisar de um artigo não listado, escreva: 'verificar com advogado tributarista'.");
  lines.push("=== FIM DO CONTEXTO REGULATÓRIO ===");

  return lines.join("\n");
}
