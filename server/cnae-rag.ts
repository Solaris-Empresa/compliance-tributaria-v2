/**
 * cnae-rag.ts — RAG (Retrieval Augmented Generation) para identificação de CNAEs
 *
 * Estratégia:
 * 1. Expande a query com sinônimos (pizzaria → restaurante, similar)
 * 2. Busca CNAEs candidatos na tabela oficial IBGE (1332 subclasses)
 * 3. Injeta os candidatos no prompt da IA como contexto
 * 4. A IA escolhe os mais relevantes com base no contexto fornecido
 */

import { CNAE_TABLE, type CnaeEntry } from "./cnae-table";

// ─── Normalização ────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "para", "por", "com", "sem", "sob", "sobre", "entre", "ate",
  "um", "uma", "uns", "umas", "o", "a", "os", "as", "e", "ou", "que",
  "se", "nao", "mais", "muito", "bem", "ja", "ainda", "so",
  "como", "quando", "onde", "qual", "quais", "ser", "ter", "fazer",
  "empresa", "negocio", "atividade", "servico", "produto", "venda",
  "compra", "comercio", "industria", "fabricacao", "prestacao",
]);

function extractTokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

// ─── Dicionário de sinônimos / aliases ───────────────────────────────────────
// Mapeia termos populares que NÃO aparecem nas descrições oficiais CNAE
// para termos equivalentes que SÃO encontrados na tabela IBGE

const SYNONYMS: Record<string, string[]> = {
  // Alimentação
  pizzaria: ["restaurante", "similar", "lanchonete", "alimenticio"],
  pizza: ["restaurante", "similar", "alimenticio"],
  hamburger: ["lanchonete", "restaurante", "similar"],
  hamburguer: ["lanchonete", "restaurante", "similar"],
  lanchonete: ["lanchonete", "restaurante"],
  padaria: ["panificacao", "confeitaria", "padaria"],
  pastelaria: ["lanchonete", "restaurante", "similar"],
  churrascaria: ["restaurante", "similar"],
  sorveteria: ["sorvete", "lanchonete"],
  cafeteria: ["cafe", "lanchonete", "restaurante"],
  bar: ["bar", "bebida", "similar"],
  boteco: ["bar", "bebida", "similar"],
  // Saúde
  clinica: ["clinica", "medico", "saude", "ambulatorio"],
  consultorio: ["consultorio", "medico", "odontologico", "saude"],
  hospital: ["hospital", "saude"],
  farmacia: ["farmacia", "drogaria"],
  laboratorio: ["laboratorio", "analise", "clinica"],
  // Tecnologia
  startup: ["software", "tecnologia", "desenvolvimento", "computador"],
  app: ["software", "aplicativo", "desenvolvimento", "computador"],
  aplicativo: ["software", "desenvolvimento", "computador"],
  ecommerce: ["comercio", "varejista", "internet", "eletronico"],
  "e-commerce": ["comercio", "varejista", "internet"],
  marketplace: ["comercio", "varejista", "internet"],
  // Construção
  construtora: ["construcao", "edificios", "obras"],
  empreiteira: ["construcao", "obras", "servicos"],
  reforma: ["reformas", "construcao", "manutencao"],
  // Educação
  escola: ["ensino", "educacao", "fundamental", "medio"],
  faculdade: ["ensino", "superior", "educacao"],
  curso: ["ensino", "treinamento", "educacao"],
  // Transporte
  uber: ["transporte", "passageiros", "taxi"],
  taxi: ["transporte", "passageiros", "taxi"],
  frete: ["transporte", "cargas", "frete"],
  logistica: ["transporte", "logistica", "cargas"],
  // Varejo
  loja: ["comercio", "varejista"],
  mercado: ["supermercado", "mercadorias", "alimenticios"],
  supermercado: ["supermercado", "mercadorias", "alimenticios"],
  boutique: ["vestuario", "acessorios", "varejista"],
  // Serviços
  advocacia: ["advocacia", "juridico", "advogado"],
  advogado: ["advocacia", "juridico"],
  contador: ["contabilidade", "contabil", "escritorio"],
  contabilidade: ["contabilidade", "contabil"],
  imobiliaria: ["imobiliaria", "imoveis", "aluguel"],
  corretora: ["corretora", "seguros", "imoveis"],
  // Beleza
  salao: ["cabeleireiro", "beleza", "estetica"],
  barbearia: ["cabeleireiro", "beleza"],
  estetica: ["estetica", "beleza", "cuidados"],
  // Indústria
  fabrica: ["fabricacao", "industria"],
  manufatura: ["fabricacao", "industria"],
  // Agro
  fazenda: ["agricultura", "pecuaria", "cultivo"],
  agropecuaria: ["agricultura", "pecuaria", "cultivo"],
  // Moldura/Artesanato
  moldura: ["madeira", "artefatos", "artesanato", "decoracao"],
  quadro: ["madeira", "artefatos", "artesanato"],
  artesanato: ["artesanato", "artefatos", "madeira"],
};

/**
 * Expande os tokens da query com sinônimos para melhorar o recall
 */
function expandWithSynonyms(tokens: string[]): string[] {
  const expanded = new Set<string>(tokens);
  for (const token of tokens) {
    const syns = SYNONYMS[token];
    if (syns) {
      syns.forEach(s => expanded.add(s));
    }
    // Também tenta prefixos (pizzaria → pizz)
    if (token.length >= 5) {
      expanded.add(token.slice(0, -2)); // remove últimas 2 letras
    }
  }
  return Array.from(expanded);
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreMatch(queryTokens: string[], cnae: CnaeEntry): number {
  const descTokens = extractTokens(cnae.description);
  const codeNorm = cnae.code.replace(/[^0-9]/g, "");
  
  let score = 0;
  for (const qt of queryTokens) {
    // Match exato no código
    if (codeNorm.startsWith(qt)) score += 10;
    
    // Match exato em token da descrição
    if (descTokens.includes(qt)) score += 8;
    
    // Match parcial: query contém token da descrição ou vice-versa
    for (const dt of descTokens) {
      if (dt.length >= 4 && qt.includes(dt)) score += 3;
      if (qt.length >= 4 && dt.includes(qt)) score += 3;
    }
  }
  
  return score;
}

// ─── API pública ─────────────────────────────────────────────────────────────

export function findCandidateCnaes(description: string, topN = 80): CnaeEntry[] {
  const rawTokens = extractTokens(description);
  const queryTokens = expandWithSynonyms(rawTokens);
  
  if (rawTokens.length === 0) {
    // Sem tokens: retornar amostra diversificada (não apenas os primeiros)
    // Selecionar CNAEs de diferentes seções para dar cobertura ampla
    const sample: CnaeEntry[] = [];
    const step = Math.floor(CNAE_TABLE.length / topN);
    for (let i = 0; i < topN && i * step < CNAE_TABLE.length; i++) {
      sample.push(CNAE_TABLE[i * step]);
    }
    return sample;
  }
  
  // Calcular score para todos os CNAEs
  const scored = CNAE_TABLE.map(cnae => ({
    cnae,
    score: scoreMatch(queryTokens, cnae),
  }));
  
  // Ordenar por score
  scored.sort((a, b) => b.score - a.score);
  
  // Pegar os que têm score > 0
  const relevant = scored
    .filter(s => s.score > 0)
    .slice(0, topN)
    .map(s => s.cnae);
  
  // Se poucos resultados, complementar com CNAEs de seções diversas
  if (relevant.length < 20) {
    const existing = new Set(relevant.map(c => c.code));
    // Adicionar CNAEs de seções mais comuns (alimentação, serviços, comércio, TI)
    const prioritySections = ["5", "6", "4", "7", "8", "9", "1", "2", "3"];
    const fallback: CnaeEntry[] = [];
    for (const sec of prioritySections) {
      const sectionItems = CNAE_TABLE
        .filter(c => !existing.has(c.code) && c.code.startsWith(sec))
        .slice(0, 10);
      fallback.push(...sectionItems);
      if (relevant.length + fallback.length >= topN) break;
    }
    return [...relevant, ...fallback.slice(0, topN - relevant.length)];
  }
  
  return relevant;
}

export function formatCandidatesForPrompt(candidates: CnaeEntry[]): string {
  return candidates
    .map(c => `${c.code} — ${c.description}`)
    .join("\n");
}

export function buildCnaeRagContext(description: string): string {
  const candidates = findCandidateCnaes(description, 80);
  return formatCandidatesForPrompt(candidates);
}
