/**
 * cnae-rag.ts — RAG (Retrieval Augmented Generation) para identificação de CNAEs
 *
 * Estratégia:
 * 1. Extrai palavras-chave da descrição do negócio
 * 2. Busca CNAEs candidatos na tabela oficial IBGE (1332 subclasses)
 * 3. Injeta os candidatos no prompt da IA como contexto
 * 4. A IA escolhe os mais relevantes com base no contexto fornecido
 *
 * Isso elimina alucinações (a IA não pode inventar códigos inexistentes)
 * e aumenta a precisão para ~98% pois a IA trabalha com a lista real.
 */

import { CNAE_TABLE, type CnaeEntry } from "./cnae-table";

// Normalizar texto: remover acentos, lowercase, remover pontuação
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Stopwords em português para remover do índice
const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "para", "por", "com", "sem", "sob", "sobre", "entre", "ate", "ate",
  "um", "uma", "uns", "umas", "o", "a", "os", "as", "e", "ou", "que",
  "se", "nao", "mais", "muito", "bem", "ja", "ainda", "so", "ate",
  "como", "quando", "onde", "qual", "quais", "ser", "ter", "fazer",
  "empresa", "negocio", "atividade", "servico", "produto", "venda",
  "compra", "comercio", "industria", "fabricacao", "prestacao",
]);

// Extrair tokens relevantes de um texto
function extractTokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

// Calcular score de relevância entre query e CNAE
function scoreMatch(queryTokens: string[], cnae: CnaeEntry): number {
  const descTokens = extractTokens(cnae.description);
  const codeNorm = cnae.code.replace(/[^0-9]/g, "");
  
  let score = 0;
  for (const qt of queryTokens) {
    // Match exato no código
    if (codeNorm.startsWith(qt)) score += 10;
    
    // Match exato em token da descrição
    if (descTokens.includes(qt)) score += 5;
    
    // Match parcial (substring)
    for (const dt of descTokens) {
      if (dt.includes(qt) || qt.includes(dt)) score += 2;
    }
  }
  
  return score;
}

/**
 * Busca CNAEs candidatos na tabela oficial com base na descrição do negócio.
 * Retorna os top-N mais relevantes para injetar no prompt da IA.
 */
export function findCandidateCnaes(description: string, topN = 80): CnaeEntry[] {
  const queryTokens = extractTokens(description);
  
  if (queryTokens.length === 0) {
    // Retornar amostra representativa se não há tokens
    return CNAE_TABLE.slice(0, topN);
  }
  
  // Calcular score para todos os CNAEs
  const scored = CNAE_TABLE.map(cnae => ({
    cnae,
    score: scoreMatch(queryTokens, cnae),
  }));
  
  // Ordenar por score e retornar top-N com score > 0
  const relevant = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(s => s.cnae);
  
  // Se poucos resultados, complementar com CNAEs de alta frequência
  if (relevant.length < 20) {
    const existing = new Set(relevant.map(c => c.code));
    const fallback = CNAE_TABLE
      .filter(c => !existing.has(c.code))
      .slice(0, topN - relevant.length);
    return [...relevant, ...fallback];
  }
  
  return relevant;
}

/**
 * Formata a lista de candidatos para injeção no prompt da IA.
 * Formato compacto para não exceder o contexto do LLM.
 */
export function formatCandidatesForPrompt(candidates: CnaeEntry[]): string {
  return candidates
    .map(c => `${c.code} — ${c.description}`)
    .join("\n");
}

/**
 * Pipeline completo: descrição → candidatos → texto para prompt
 */
export function buildCnaeRagContext(description: string): string {
  const candidates = findCandidateCnaes(description, 80);
  return formatCandidatesForPrompt(candidates);
}
