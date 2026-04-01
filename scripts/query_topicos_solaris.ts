/**
 * Sprint O — Auditoria: tópicos distintos em solaris_questions
 * Equivalente a:
 *   SELECT DISTINCT UNNEST(STRING_TO_ARRAY(topicos, ';')) AS topico
 *   FROM solaris_questions WHERE ativo = 1 ORDER BY topico;
 *
 * TiDB não suporta UNNEST — fazemos o split no Node.js.
 */
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // 1. Buscar todos os tópicos das questões ativas
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT codigo, topicos FROM solaris_questions WHERE ativo = 1 ORDER BY codigo`
  );

  console.log(`\n=== Total de questões ativas: ${rows.length} ===\n`);

  const topicoSet = new Set<string>();
  for (const row of rows) {
    const raw = (row.topicos as string | null) ?? "";
    const topicos = raw
      .split(";")
      .map((t: string) => t.trim().toLowerCase())
      .filter(Boolean);
    for (const t of topicos) topicoSet.add(t);
  }

  const sorted = [...topicoSet].sort();
  console.log(`=== Tópicos distintos (${sorted.length} total) ===`);
  sorted.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  // 2. Contar entradas do SOLARIS_GAPS_MAP
  const { SOLARIS_GAPS_MAP } = await import("../server/config/solaris-gaps-map.js");
  const mapKeys = Object.keys(SOLARIS_GAPS_MAP);
  console.log(`\n=== SOLARIS_GAPS_MAP: ${mapKeys.length} chaves ===`);
  mapKeys.sort().forEach((k, i) => console.log(`  ${i + 1}. ${k}`));

  // 3. Tópicos SEM mapeamento
  const semMapa = sorted.filter((t) => !SOLARIS_GAPS_MAP[t]);
  console.log(`\n=== Tópicos SEM mapeamento: ${semMapa.length} ===`);
  semMapa.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  // 4. Chaves do mapa que NÃO existem nas questões
  const mapSemQuestao = mapKeys.filter((k) => !topicoSet.has(k));
  console.log(`\n=== Chaves do mapa SEM questão correspondente: ${mapSemQuestao.length} ===`);
  mapSemQuestao.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));

  await conn.end();
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
