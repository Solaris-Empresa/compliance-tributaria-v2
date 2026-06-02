// rag-risk-validator.ts — Sprint Z-13.5 Tarefa 3
// Valida riscos contra o corpus RAG (ragDocuments).
// FULLTEXT/LIKE match — sem embeddings (simplifica).
//
// Issue #1044 (Opção B, P.O. 2026-05-09):
//   rag_artigo_exato = chunks
//     .filter(c => articleMatches(c.artigo, risk.artigo))
//     [0]?.artigo
//     ?? risk.artigo  // fallback nunca null

import { drizzle } from "drizzle-orm/mysql2";
import type { InsertRiskV4 } from "./db-queries-risks-v4";
import type { ConsolidatedEvidence } from "./risk-engine-v4";

// ─── Constantes ──────────────────────────────────────────────────────────────

// Aplicada quando LIKE não retorna chunks (no result).
const CONFIDENCE_DEGRADATION_NO_MATCH = 0.75;

// ─── DB ──────────────────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;
async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  if (!_db) throw new Error("[rag-risk-validator] DATABASE_URL não configurado");
  return _db;
}

async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as T[];
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RagDocument {
  id: number;
  lei: string;
  artigo: string;
  titulo: string;
  conteudo: string;
}

// ─── Query templates por categoria ───────────────────────────────────────────

// Termos validados contra o corpus ragDocuments (2.515 chunks, TiDB LIKE).
// Cada entrada usa 1-2 palavras que garantem hits reais.
// Validado em 2026-04-13 — Sprint Z-13.5
const RAG_QUERIES: Record<string, string> = {
  split_payment:        "split payment",          // 20 hits
  confissao_automatica: "apuração do IBS",         // 10 hits (Art. 43, Art. 270)
  aliquota_zero:        "cesta básica",            // 5 hits (Art. 125 lc214)
  credito_presumido:    "crédito presumido",       // 32 hits
  obrigacao_acessoria:  "obrigação acessória",     // 7 hits
  inscricao_cadastral:  "sujeito passivo",         // 74 hits (melhor proxy disponível)
  transicao_iss_ibs:    "prestação de serviços",   // 34 hits (melhor proxy disponível)
  imposto_seletivo:     "imposto seletivo",        // 54 hits
  regime_diferenciado:  "regime diferenciado",     // 3 hits
  aliquota_reduzida:    "alíquota reduzida",       // 8 hits
};

// ─── Normalização e match de artigos (Issue #1044 Opção B) ───────────────────

/**
 * Normaliza string de artigo para comparação:
 * - lowercase
 * - remove sufixo de lei ("LC 214/2025", "lc214")
 * - remove sufixo de parte ("(parte 2)")
 * - colapsa espaços
 *
 * Exemplos:
 *   "Art. 9 LC 214/2025"   → "art. 9"
 *   "Art. 22 (parte 2)"    → "art. 22"
 *   "Arts. 6-12 LC214"     → "arts. 6-12"
 */
export function normalizeArtigo(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\s+lc\s*\d+(\/\d+)?/g, "")
    .replace(/\s*\(parte\s*\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifica se um artigo de chunk corresponde ao artigo principal da categoria.
 *
 * Casos cobertos:
 *   1. Match exato após normalização: "Art. 9 LC 214/2025" === "Art. 9"
 *   2. Range no risk.artigo: "Arts. 6-12 LC 214/2025" inclui "Art. 9"
 *   3. Lista discreta no risk.artigo: "Arts. 200, 201, 203, 245 LEI" inclui
 *      Art. 200/201/203/245 mas NÃO Art. 202/204..244 — pareado com
 *      `formatArticleRange` Opção D em `risk-engine-v4.ts:412`
 *      (BUG-RAG-ARTIGO-RANGE, 2026-06-02).
 *
 * Issue #1044 Opção B (P.O. 2026-05-09) + Opção D ampliada (P.O. 2026-06-02).
 */
export function articleMatches(chunkArtigo: string, riskArtigo: string): boolean {
  const chunkN = normalizeArtigo(chunkArtigo);
  const riskN = normalizeArtigo(riskArtigo);

  if (!chunkN || !riskN) return false;

  if (chunkN === riskN) return true;

  const chunkNumMatch = chunkN.match(/art\.?\s*(\d+)/);
  const chunkNum = chunkNumMatch ? parseInt(chunkNumMatch[1], 10) : null;

  // Range "arts. 6-12" ou "art. 6-12" no riskArtigo (artigos consecutivos reais)
  const rangeMatch = riskN.match(/arts?\.\s*(\d+)\s*-\s*(\d+)/);
  if (rangeMatch && chunkNum !== null) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    return chunkNum >= start && chunkNum <= end;
  }

  // BUG-RAG-ARTIGO-RANGE Opção D (2026-06-02): lista discreta
  // "arts. 200, 201, 203, 245" — formatArticleRange emite esse formato quando
  // o bundle normativo tem artigos NÃO-consecutivos. Validamos `chunkNum`
  // contra a lista literal (não expansão por range). Exige ≥2 entradas para
  // não conflitar com o caso `chunkN === riskN` quando há vírgula trailing.
  const listMatch = riskN.match(/arts?\.\s*([\d,\s]+)/);
  if (listMatch && chunkNum !== null) {
    const list = listMatch[1]
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (list.length >= 2) {
      return list.includes(chunkNum);
    }
  }

  return false;
}

/**
 * Seleciona o artigo "exato" do RAG conforme spec do Issue #1044 (Opção B):
 *   1. Filtra chunks com articleMatches(c.artigo, riskArtigo) === true
 *   2. Se houver match: retorna primeiro filtrado (ordem natural ≈ score)
 *   3. Se não: fallback para riskArtigo (nunca null), conteudo=null
 *
 * Função pura — test seam para Issue #1044.
 */
export function selectBestArtigo(
  docs: Array<{ artigo: string; conteudo: string }>,
  riskArtigo: string | null | undefined,
): { artigo: string; conteudo: string | null; usedFallback: boolean } {
  const principalArtigo = riskArtigo ?? "";

  const matching = docs.filter((d) => articleMatches(d.artigo, principalArtigo));

  if (matching.length > 0) {
    return {
      artigo: matching[0].artigo,
      conteudo: matching[0].conteudo,
      usedFallback: false,
    };
  }

  // Fallback Opção B: nunca retorna null. Se riskArtigo vazio, usa docs[0]?.artigo.
  return {
    artigo: principalArtigo || docs[0]?.artigo || "",
    conteudo: null,
    usedFallback: true,
  };
}

// ─── Função principal ────────────────────────────────────────────────────────

/**
 * Enriquece um risco com validação RAG.
 * Busca no corpus ragDocuments por LIKE match.
 *
 * Issue #1044 Opção B: filtra chunks pelo artigo principal da categoria
 * (risk.artigo) antes de selecionar best chunk. Se nenhum chunk match,
 * fallback para risk.artigo (rag_artigo_exato nunca null).
 */
export async function enrichRiskWithRag(risk: InsertRiskV4): Promise<InsertRiskV4> {
  const ragQuery = RAG_QUERIES[risk.categoria] ?? risk.categoria;

  // Build LIKE search terms — split query into words, require all
  const words = ragQuery.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length === 0) {
    return applyNoResult(risk, ragQuery);
  }

  // Search ragDocuments with LIKE for each word
  const likeClauses = words.map(() => "conteudo LIKE ?").join(" AND ");
  const likeParams = words.map((w) => `%${w}%`);

  let docs: RagDocument[];
  try {
    docs = await query<RagDocument>(
      `SELECT id, lei, artigo, titulo, conteudo
       FROM ragDocuments
       WHERE ${likeClauses}
       LIMIT 50`,
      likeParams
    );
  } catch {
    return applyNoResult(risk, ragQuery);
  }

  if (docs.length === 0) {
    return applyNoResult(risk, ragQuery);
  }

  // Issue #1044 Opção B: filtra pelo artigo principal antes de selecionar best.
  const selected = selectBestArtigo(docs, risk.artigo);
  const bestArtigo = selected.artigo;
  const bestConteudo = selected.conteudo !== null ? selected.conteudo.slice(0, 500) : null;
  const validationNote = selected.usedFallback
    ? "Artigo principal não localizado — usando fallback da categoria"
    : null;

  const ragConfidence = 0.85;
  const baseConfidence = risk.confidence ?? 1.0;
  const blendedConfidence = baseConfidence * 0.8 + ragConfidence * 0.2;

  // Update evidence JSON
  const evidence = (typeof risk.evidence === "string"
    ? JSON.parse(risk.evidence)
    : risk.evidence ?? {}) as ConsolidatedEvidence;

  evidence.rag_validated = true;
  evidence.rag_confidence = ragConfidence;
  evidence.rag_artigo_exato = bestArtigo;
  if (bestConteudo !== null) {
    evidence.rag_trecho_legal = bestConteudo;
  } else {
    delete evidence.rag_trecho_legal;
  }
  evidence.rag_query = ragQuery;
  if (validationNote !== null) {
    evidence.rag_validation_note = validationNote;
  } else {
    delete evidence.rag_validation_note;
  }

  risk.evidence = evidence;
  risk.confidence = Math.round(blendedConfidence * 100) / 100;
  risk.rag_validated = 1;
  risk.rag_confidence = ragConfidence;
  risk.rag_artigo_exato = bestArtigo;
  risk.rag_trecho_legal = bestConteudo;
  risk.rag_query = ragQuery;
  risk.rag_validation_note = validationNote;

  return risk;
}

function applyNoResult(risk: InsertRiskV4, ragQuery: string): InsertRiskV4 {
  const baseConfidence = risk.confidence ?? 1.0;

  const evidence = (typeof risk.evidence === "string"
    ? JSON.parse(risk.evidence)
    : risk.evidence ?? {}) as ConsolidatedEvidence;

  evidence.rag_validated = false;
  evidence.rag_confidence = 0;
  evidence.rag_validation_note = "Base legal não localizada no corpus RAG";
  evidence.rag_query = ragQuery;

  risk.evidence = evidence;
  risk.confidence = Math.round(baseConfidence * CONFIDENCE_DEGRADATION_NO_MATCH * 100) / 100;
  risk.rag_validated = 0;
  risk.rag_confidence = 0;
  risk.rag_query = ragQuery;
  risk.rag_validation_note = "Base legal não localizada no corpus RAG";

  return risk;
}
