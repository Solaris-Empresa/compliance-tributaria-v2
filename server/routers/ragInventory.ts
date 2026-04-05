/**
 * ragInventory — Sprint H · Momento 1
 *
 * Endpoint tRPC que alimenta o RAG Cockpit com dados reais do banco em tempo real.
 * Elimina o ciclo manual de diagnóstico de 2–4h por RFC.
 *
 * Padrão de conexão: mysql.createConnection (igual scoringEngine, actionEngine, briefingEngine)
 * GS-07 threshold: < 10 bytes (Orquestrador Sprint H — exclui artigos legítimos curtos)
 * GS-07b: chunks SUPERSEDED — informativo, não bloqueia gold set
 */

import { router, protectedProcedure } from "../_core/trpc";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";

// ── Gold Set — 8 queries canônicas + 1 auxiliar ─────────────────────────────
// GS-07 threshold: < 10 bytes (decisão Orquestrador Sprint H)
// Rationale: id 113 ("e" = 1 char) é a única anomalia real no corpus atual.
// Artigos legítimos curtos (ids 63, 312, 835, 30841, 1005) têm > 28 bytes.
// Chunks SUPERSEDED (id 811) são excluídos pelo padrão de conteúdo em GS-07b.
const GS07_THRESHOLD = 10;

async function runGoldSet(conn: mysql.Connection) {
  const checks = [
    {
      id: "GS-01",
      label: "Integridade total",
      query: `SELECT COUNT(*) AS total,
                SUM(CASE WHEN anchor_id IS NULL THEN 1 ELSE 0 END) AS orphans
              FROM ragDocuments`,
      pass: (r: any[]) => Number(r[0].orphans) === 0,
    },
    {
      id: "GS-02",
      label: "Distribuição por lei",
      query: `SELECT lei, COUNT(*) AS qtd FROM ragDocuments GROUP BY lei`,
      pass: (r: any[]) => r.length >= 4,
    },
    {
      id: "GS-03",
      label: "lc227 — split payment",
      query: `SELECT COUNT(*) AS qtd FROM ragDocuments
              WHERE lei = 'lc227'
                AND (topicos LIKE '%split payment%'
                  OR conteudo LIKE '%split payment%')`,
      pass: (r: any[]) => Number(r[0].qtd) >= 1,
    },
    {
      id: "GS-04",
      label: "lc214 Art.45 — confissão",
      query: `SELECT COUNT(*) AS qtd FROM ragDocuments
              WHERE lei = 'lc214'
                AND (topicos LIKE '%confissão%' OR artigo LIKE '%45%')`,
      pass: (r: any[]) => Number(r[0].qtd) >= 1,
    },
    {
      id: "GS-05",
      label: "lc224 — CNAE universal",
      query: `SELECT COUNT(*) AS qtd FROM ragDocuments
              WHERE lei = 'lc224'
                AND (cnaeGroups LIKE '%46%' OR cnaeGroups LIKE '%01-96%')`,
      pass: (r: any[]) => Number(r[0].qtd) >= 1,
    },
    {
      id: "GS-06",
      label: "ec132 — cobertura total",
      query: `SELECT COUNT(*) AS qtd FROM ragDocuments WHERE lei = 'ec132'`,
      pass: (r: any[]) => Number(r[0].qtd) >= 18,
    },
    {
      id: "GS-07",
      label: "Zero anomalias críticas",
      // Threshold < 10 bytes: captura fragmentos de ingestão (ex: id 113 = "e")
      // Exclui artigos legítimos curtos (> 28 bytes) e chunks SUPERSEDED
      query: `SELECT COUNT(*) AS qtd FROM ragDocuments
              WHERE (LENGTH(conteudo) < ${GS07_THRESHOLD})
                 OR (anchor_id IS NULL)`,
      pass: (r: any[]) => Number(r[0].qtd) === 0,
    },
    {
      id: "GS-07b",
      label: "Chunks SUPERSEDED (informativo)",
      // Monitoramento de marcadores de governança RFC — não bloqueia gold set
      query: `SELECT COUNT(*) AS qtd FROM ragDocuments
              WHERE conteudo LIKE '[SUPERSEDED%'`,
      pass: (_r: any[]) => true, // sempre passa — apenas monitoramento
    },
    {
      id: "GS-08",
      label: "Ingestão rastreável",
      query: `SELECT COUNT(*) AS qtd FROM ragDocuments
              WHERE autor IS NULL OR autor = ''`,
      pass: (r: any[]) => Number(r[0].qtd) === 0,
    },
  ];

  return Promise.all(
    checks.map(async (c) => {
      const [result] = await conn.execute(c.query);
      const rows = result as any[];
      const ok = c.pass(rows);
      return {
        id: c.id,
        label: c.label,
        status: ok ? "ok" : "warn",
        value: rows[0],
      };
    })
  );
}

// ── Router ───────────────────────────────────────────────────────────────────
export const ragInventoryRouter = router({
  /**
   * getSnapshot — retorna estado completo do corpus RAG em tempo real.
   * Usado pelo RAG Cockpit (/admin/rag-cockpit) para eliminar dados estáticos hardcoded.
   *
   * Retorna:
   * - totals: contagem total, com/sem anchor_id, total de leis
   * - by_lei: distribuição por lei com range de ids e orphans
   * - anomalies: chunks com anchor_id NULL ou conteúdo < GS07_THRESHOLD bytes (máx 50)
   * - recent: 20 chunks mais recentes por id
   * - by_autor: distribuição por autor (rastreabilidade de ingestão)
   * - gold_set: resultado das 9 queries canônicas (GS-01 a GS-08 + GS-07b)
   * - confidence: % de queries do gold set com status "ok" (GS-07b excluída do cálculo)
   * - corpus_version: versão do corpus (env CORPUS_VERSION ou "v3.3")
   */
  getSnapshot: protectedProcedure.query(async () => {
    const conn = await mysql.createConnection(ENV.databaseUrl);
    try {
      const [[totals]] = (await conn.execute(`
        SELECT
          COUNT(*)                                                    AS total_chunks,
          SUM(CASE WHEN anchor_id IS NULL     THEN 1 ELSE 0 END)     AS sem_anchor_id,
          SUM(CASE WHEN anchor_id IS NOT NULL THEN 1 ELSE 0 END)     AS com_anchor_id,
          COUNT(DISTINCT lei)                                         AS total_leis
        FROM ragDocuments
      `)) as any;

      const [byLei] = (await conn.execute(`
        SELECT lei,
               COUNT(*)                                               AS total,
               MIN(id)                                                AS id_min,
               MAX(id)                                                AS id_max,
               SUM(CASE WHEN anchor_id IS NULL THEN 1 ELSE 0 END)    AS sem_anchor
        FROM ragDocuments
        GROUP BY lei
        ORDER BY lei
      `)) as any;

      const [anomalies] = (await conn.execute(`
        SELECT id, lei, artigo, titulo,
               LENGTH(conteudo)  AS bytes,
               anchor_id, autor, data_revisao
        FROM ragDocuments
        WHERE anchor_id IS NULL
           OR LENGTH(conteudo) < ${GS07_THRESHOLD}
        ORDER BY id
        LIMIT 50
      `)) as any;

      const [recent] = (await conn.execute(`
        SELECT id, lei, artigo, titulo,
               autor, data_revisao, createdAt,
               LEFT(conteudo, 100) AS conteudo_inicio
        FROM ragDocuments
        ORDER BY id DESC
        LIMIT 20
      `)) as any;

      const [byAutor] = (await conn.execute(`
        SELECT autor,
               COUNT(*)          AS qtd,
               MIN(id)           AS id_min,
               MAX(id)           AS id_max,
               MAX(data_revisao) AS ultima_revisao
        FROM ragDocuments
        GROUP BY autor
        ORDER BY qtd DESC
        LIMIT 20
      `)) as any;

      const goldSet = await runGoldSet(conn);

      // Confidence: exclui GS-07b (informativo) do cálculo
      const goldSetForScore = goldSet.filter((g) => g.id !== "GS-07b");
      const goldOk = goldSetForScore.filter((g) => g.status === "ok").length;
      const confidence = +((goldOk / goldSetForScore.length) * 100).toFixed(1);

      return {
        snapshot_at: new Date().toISOString(),
        totals,
        by_lei: byLei,
        anomalies,
        recent,
        by_autor: byAutor,
        gold_set: goldSet,
        confidence,
        corpus_version: process.env.CORPUS_VERSION ?? "v3.3",
      };
    } finally {
      await conn.end();
    }
  }),
});
