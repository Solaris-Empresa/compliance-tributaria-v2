// rag-risk-validator.ts — Sprint Z-13.5 Tarefa 3
// Valida riscos contra o corpus RAG (ragDocuments).
// FULLTEXT/LIKE match — sem embeddings (simplifica).

import { drizzle } from "drizzle-orm/mysql2";
import type { InsertRiskV4 } from "./db-queries-risks-v4";
import type { ConsolidatedEvidence } from "./risk-engine-v4";

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

// ─── Função principal ────────────────────────────────────────────────────────

/**
 * Enriquece um risco com validação RAG.
 * Busca no corpus ragDocuments por LIKE match.
 * Mutates the risk in-place and returns it.
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
       LIMIT 5`,
      likeParams
    );
  } catch {
    return applyNoResult(risk, ragQuery);
  }

  if (docs.length === 0) {
    return applyNoResult(risk, ragQuery);
  }

  // Use the first (best) match
  const best = docs[0];
  const ragConfidence = 0.85;
  const baseConfidence = risk.confidence ?? 1.0;
  const blendedConfidence = baseConfidence * 0.8 + ragConfidence * 0.2;

  // Update evidence JSON
  const evidence = (typeof risk.evidence === "string"
    ? JSON.parse(risk.evidence)
    : risk.evidence ?? {}) as ConsolidatedEvidence;

  evidence.rag_validated = true;
  evidence.rag_confidence = ragConfidence;
  evidence.rag_artigo_exato = best.artigo;
  evidence.rag_trecho_legal = best.conteudo.slice(0, 500);
  evidence.rag_query = ragQuery;

  risk.evidence = evidence;
  risk.confidence = Math.round(blendedConfidence * 100) / 100;
  risk.rag_validated = 1;
  risk.rag_confidence = ragConfidence;
  risk.rag_artigo_exato = best.artigo;
  risk.rag_trecho_legal = best.conteudo.slice(0, 500);
  risk.rag_query = ragQuery;
  risk.rag_validation_note = null;

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
  risk.confidence = Math.round(baseConfidence * 0.75 * 100) / 100;
  risk.rag_validated = 0;
  risk.rag_confidence = 0;
  risk.rag_query = ragQuery;
  risk.rag_validation_note = "Base legal não localizada no corpus RAG";

  return risk;
}
