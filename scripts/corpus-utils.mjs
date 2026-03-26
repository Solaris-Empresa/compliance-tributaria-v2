/**
 * corpus-utils.mjs — Sprint D
 * Módulo compartilhado para ingestão do corpus regulatório.
 *
 * Exporta:
 *   - normalizeAnchorSegment(text): string — canônica e imutável (ver governança abaixo)
 *   - buildAnchorId(lei, artigo, chunkIndex): string
 *   - connectDb(): Promise<{ db, connection }>
 *   - upsertChunk(db, chunk): Promise<"insert" | "update" | "skip">
 *   - printCoverageSummary(results): void
 *
 * GOVERNANÇA DE EVOLUÇÃO DO anchor_id (DEC-002):
 *   anchor_id é contrato imutável de identidade de chunk.
 *   Uma vez gerado e inserido em produção:
 *     - NUNCA alterar normalizeAnchorSegment sem migração versionada
 *     - Qualquer mudança na regra de geração exige:
 *       (a) novo campo anchor_id_v2
 *       (b) migração em lote
 *       (c) deprecação do campo antigo
 *   Esta função deve ser a única fonte de verdade para geração de anchor_id.
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// ---------------------------------------------------------------------------
// normalizeAnchorSegment — canônica e compartilhada por ambos os scripts
// ---------------------------------------------------------------------------

/**
 * Normaliza um segmento de texto para uso em anchor_id.
 *
 * Regras (imutáveis — ver governança acima):
 *   1. Trim de espaços nas bordas
 *   2. Lowercase
 *   3. Remover acentos (NFD + strip combining marks)
 *   4. Substituir "§" por "par"
 *   5. Substituir "º" e "ª" por "" (ordinal — já está no contexto)
 *   6. Substituir "." em NCM por "-" (ex: 0101.21.00 → 0101-21-00)
 *   7. Substituir caracteres não alfanuméricos (exceto "-") por "-"
 *   8. Colapsar múltiplos "-" em um único
 *   9. Remover "-" nas bordas
 *
 * @param {string} text — segmento bruto (ex: "Anexo I, NCM 0101.21.00", "Art. 149-A §1º")
 * @returns {string} — segmento normalizado (ex: "anexo-i-ncm-0101-21-00", "art-149a-par-1")
 */
export function normalizeAnchorSegment(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip combining marks (acentos)
    .replace(/§\s*/g, "par-")          // § → par- (com hífen separador: §1º → par-1)
    .replace(/[º\u00ba\u00aa]/g, "")   // ordinal masculino/feminino
    .replace(/\./g, "-")               // ponto → hífen (NCM: 0101.21.00 → 0101-21-00)
    .replace(/-([a-z])\b/g, "$1")      // -A → A (ex: 149-A → 149a, 156-A → 156a)
    .replace(/[^a-z0-9-]/g, "-")       // não alfanumérico → hífen
    .replace(/-{2,}/g, "-")            // colapsar múltiplos hífens
    .replace(/^-+|-+$/g, "");          // trim hífens nas bordas
}

// ---------------------------------------------------------------------------
// buildAnchorId — compõe o anchor_id canônico
// ---------------------------------------------------------------------------

/**
 * Constrói o anchor_id canônico para um chunk.
 *
 * Formato: {lei}-{artigo_normalizado}-{chunkIndex}
 * Exemplos:
 *   - lc214-anexo-i-ncm-0101-21-00-animais-vivos-1
 *   - ec132-art-149a-par-1-1
 *   - lc214-anexo-xi-zfm-zona-franca-de-manaus-regra-1-1
 *
 * @param {string} lei — ex: "lc214", "ec132"
 * @param {string} artigo — ex: "Anexo I, NCM 0101.21.00 — Animais vivos"
 * @param {number} chunkIndex — começa em 1
 * @returns {string}
 */
export function buildAnchorId(lei, artigo, chunkIndex) {
  const leiNorm = normalizeAnchorSegment(lei);
  const artigoNorm = normalizeAnchorSegment(artigo);
  return `${leiNorm}-${artigoNorm}-${chunkIndex}`;
}

// ---------------------------------------------------------------------------
// connectDb — conexão com o banco (padrão do projeto)
// ---------------------------------------------------------------------------

/**
 * Cria uma conexão com o banco de dados via DATABASE_URL.
 * @returns {Promise<{ db: import("drizzle-orm/mysql2").MySql2Database, connection: import("mysql2/promise").Connection }>}
 */
export async function connectDb() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL não encontrada");
    process.exit(1);
  }
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);
  return { db, connection };
}

// ---------------------------------------------------------------------------
// upsertChunk — idempotência por anchor_id
// ---------------------------------------------------------------------------

/**
 * Insere ou atualiza um chunk no corpus.
 *
 * Lógica de idempotência:
 *   - Se anchor_id não existe → INSERT → loga [CORPUS-INSERT]
 *   - Se anchor_id existe e conteudo mudou → UPDATE → loga [CORPUS-UPDATE]
 *   - Se anchor_id existe e conteudo igual → SKIP → loga [CORPUS-SKIP]
 *
 * @param {import("mysql2/promise").Connection} connection — conexão raw para queries diretas
 * @param {{
 *   anchor_id: string,
 *   lei: string,
 *   artigo: string,
 *   titulo: string,
 *   conteudo: string,
 *   topicos: string,
 *   cnaeGroups: string,
 *   chunkIndex: number,
 *   autor: string,
 *   revisado_por: string,
 *   data_revisao: string,
 * }} chunk
 * @returns {Promise<"insert" | "update" | "skip">}
 */
export async function upsertChunk(connection, chunk) {
  // Verificar se anchor_id já existe
  const [rows] = await connection.execute(
    "SELECT id, conteudo FROM ragDocuments WHERE anchor_id = ? LIMIT 1",
    [chunk.anchor_id]
  );

  if (rows.length === 0) {
    // INSERT
    await connection.execute(
      `INSERT INTO ragDocuments
        (anchor_id, lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex, autor, revisado_por, data_revisao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chunk.anchor_id,
        chunk.lei,
        chunk.artigo,
        chunk.titulo,
        chunk.conteudo,
        chunk.topicos,
        chunk.cnaeGroups ?? "",
        chunk.chunkIndex,
        chunk.autor ?? null,
        chunk.revisado_por ?? null,
        chunk.data_revisao ?? null,
      ]
    );
    console.log(`[CORPUS-INSERT] ${chunk.anchor_id}`);
    return "insert";
  }

  const existing = rows[0];
  if (existing.conteudo === chunk.conteudo) {
    // SKIP — conteúdo idêntico
    console.log(`[CORPUS-SKIP]   ${chunk.anchor_id}`);
    return "skip";
  }

  // UPDATE — conteúdo mudou
  await connection.execute(
    `UPDATE ragDocuments
     SET conteudo = ?, titulo = ?, topicos = ?, cnaeGroups = ?,
         autor = ?, revisado_por = ?, data_revisao = ?
     WHERE anchor_id = ?`,
    [
      chunk.conteudo,
      chunk.titulo,
      chunk.topicos,
      chunk.cnaeGroups ?? "",
      chunk.autor ?? null,
      chunk.revisado_por ?? null,
      chunk.data_revisao ?? null,
      chunk.anchor_id,
    ]
  );
  console.log(`[CORPUS-UPDATE] ${chunk.anchor_id}`);
  return "update";
}

// ---------------------------------------------------------------------------
// detectSemanticOverlap — log de alerta de sobreposição semântica
// ---------------------------------------------------------------------------

/**
 * Calcula a sobreposição de tópicos entre dois chunks (Jaccard similarity).
 * Loga [CORPUS-SEMANTIC-WARN] se sobreposição >= 80%.
 *
 * @param {{ anchor_id: string, topicos: string }[]} chunks
 * @returns {number} — contagem de alertas emitidos
 */
export function detectSemanticOverlap(chunks) {
  let alertCount = 0;
  for (let i = 0; i < chunks.length; i++) {
    const setA = new Set(chunks[i].topicos.split(",").map(t => t.trim().toLowerCase()).filter(Boolean));
    for (let j = i + 1; j < chunks.length; j++) {
      const setB = new Set(chunks[j].topicos.split(",").map(t => t.trim().toLowerCase()).filter(Boolean));
      const intersection = new Set([...setA].filter(t => setB.has(t)));
      const union = new Set([...setA, ...setB]);
      const jaccard = union.size === 0 ? 0 : intersection.size / union.size;
      if (jaccard >= 0.8) {
        console.warn(
          `[CORPUS-SEMANTIC-WARN] Sobreposição ${(jaccard * 100).toFixed(0)}% entre:\n` +
          `  ${chunks[i].anchor_id}\n  ${chunks[j].anchor_id}`
        );
        alertCount++;
      }
    }
  }
  return alertCount;
}

// ---------------------------------------------------------------------------
// printCoverageSummary — tabela de cobertura esperado vs inserido
// ---------------------------------------------------------------------------

/**
 * Imprime a tabela de cobertura ao final da ingestão.
 *
 * @param {{ label: string, expected: number, inserted: number, updated: number, skipped: number }[]} results
 */
export function printCoverageSummary(results) {
  const totalExpected = results.reduce((s, r) => s + r.expected, 0);
  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
  const totalUpdated  = results.reduce((s, r) => s + r.updated, 0);
  const totalSkipped  = results.reduce((s, r) => s + r.skipped, 0);
  const totalActual   = totalInserted + totalUpdated + totalSkipped;

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              COBERTURA DE INGESTÃO — SPRINT D               ║");
  console.log("╠══════════════╦══════════╦══════════╦══════════╦═════════════╣");
  console.log("║ Documento    ║ Esperado ║ Inserido ║ Atualiz. ║ Cobertura   ║");
  console.log("╠══════════════╬══════════╬══════════╬══════════╬═════════════╣");
  for (const r of results) {
    const actual = r.inserted + r.updated + r.skipped;
    const pct = r.expected === 0 ? "N/A" : `${Math.round((actual / r.expected) * 100)}%`;
    const label = r.label.padEnd(12).slice(0, 12);
    const exp   = String(r.expected).padStart(8);
    const ins   = String(r.inserted).padStart(8);
    const upd   = String(r.updated).padStart(8);
    const cov   = pct.padStart(11);
    console.log(`║ ${label} ║${exp} ║${ins} ║${upd} ║${cov} ║`);
  }
  console.log("╠══════════════╬══════════╬══════════╬══════════╬═════════════╣");
  const totalPct = totalExpected === 0 ? "N/A" : `${Math.round((totalActual / totalExpected) * 100)}%`;
  console.log(`║ TOTAL        ║${String(totalExpected).padStart(8)} ║${String(totalInserted).padStart(8)} ║${String(totalUpdated).padStart(8)} ║${totalPct.padStart(11)} ║`);
  console.log("╚══════════════╩══════════╩══════════╩══════════╩═════════════╝");
  console.log(`\nSkipped (sem alteração): ${totalSkipped}`);
}
