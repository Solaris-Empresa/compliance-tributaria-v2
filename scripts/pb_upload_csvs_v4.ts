/**
 * P-B: Deletar lotes 23bcbee4 e 7cbbaed6 + upload dos 2 CSVs v4
 * Sprint P — 2026-04-01
 *
 * CSV header: titulo,conteudo,topicos,cnaeGroups,lei,artigo,area,severidade_base,vigencia_inicio
 * artigo = codigo (SOL-013..SOL-036)
 */
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
const DB_URL = process.env.DATABASE_URL!;

interface CsvRow {
  titulo: string;
  conteudo: string;
  topicos: string;
  cnaeGroups: string;
  lei: string;
  artigo: string;
  area: string;
  severidade_base: string;
  vigencia_inicio: string;
}

/** Parser CSV simples que respeita aspas duplas */
function parseCsvLib(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/);
  const header = parseRow(lines[0]);
  const result: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseRow(line);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => { row[h.trim()] = (cols[idx] ?? "").trim(); });
    result.push(row as unknown as CsvRow);
  }
  return result;
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  try {
    // 1. Listar lotes existentes
    console.log("\n=== LOTES EXISTENTES ANTES DA DELEÇÃO ===");
    const [lotes] = await conn.execute(
      `SELECT upload_batch_id, COUNT(*) as total, MIN(criado_em) as created_at
       FROM solaris_questions
       WHERE upload_batch_id IS NOT NULL
       GROUP BY upload_batch_id
       ORDER BY created_at ASC`
    );
    console.log(JSON.stringify(lotes, null, 2));

    // 2. Soft delete dos lotes antigos (23bcbee4 e 7cbbaed6)
    const LOTES_DELETAR = ["23bcbee4", "7cbbaed6"];
    for (const batchId of LOTES_DELETAR) {
      const [result] = await conn.execute(
        `UPDATE solaris_questions SET ativo = 0, atualizado_em = ? WHERE upload_batch_id LIKE ?`,
        [Date.now(), `%${batchId}%`]
      );
      const affected = (result as { affectedRows: number }).affectedRows;
      console.log(JSON.stringify({ event: "batch_soft_deleted", batchId, affected }));
    }

    // 3. Verificar estado após deleção
    const [postDelete] = await conn.execute(
      `SELECT COUNT(*) as total_ativas FROM solaris_questions WHERE ativo = 1`
    );
    console.log(JSON.stringify({ event: "post_delete_ativas", postDelete }));

    // 4. Upload dos 2 CSVs v4
    const csvFiles = [
      { path: "/home/ubuntu/upload/SPRINT_P_CSV_Art45_v4.csv", name: "Art45_v4", lei: "Art45" },
      { path: "/home/ubuntu/upload/SPRINT_P_CSV_LC224_v4.csv", name: "LC224_v4", lei: "LC224" },
    ];

    for (const { path, name, lei } of csvFiles) {
      const content = readFileSync(path, "utf-8");
      const rows: CsvRow[] = parseCsvLib(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      console.log(`\n=== ${name}: ${rows.length} perguntas ===`);

      const batchId = randomUUID();
      const now = Date.now();
      let inserted = 0;
      let updated = 0;
      let errors = 0;

      for (const r of rows) {
        const codigo = r.artigo?.trim();
        if (!codigo) { errors++; continue; }

        const titulo = r.titulo?.trim() || "";
        const texto = r.conteudo?.trim() || titulo;
        const area = r.area?.trim() || "fiscal";
        const severidade = r.severidade_base?.trim() || "media";
        const topicos = r.topicos?.trim() || "";
        const vigencia = r.vigencia_inicio?.trim() || null;
        const fonte = `${lei} v4`;

        try {
          const [existing] = await conn.execute(
            "SELECT id FROM solaris_questions WHERE codigo = ?",
            [codigo]
          );
          const existingRows = existing as { id: number }[];

          if (existingRows.length > 0) {
            await conn.execute(
              `UPDATE solaris_questions
               SET titulo = ?, texto = ?, categoria = ?, severidade_base = ?,
                   topicos = ?, vigencia_inicio = ?, fonte = ?,
                   ativo = 1, upload_batch_id = ?, atualizado_em = ?
               WHERE codigo = ?`,
              [titulo, texto, area, severidade, topicos, vigencia, fonte, batchId, now, codigo]
            );
            updated++;
          } else {
            await conn.execute(
              `INSERT INTO solaris_questions
               (codigo, titulo, texto, categoria, severidade_base, topicos, vigencia_inicio,
                fonte, ativo, upload_batch_id, criado_em, atualizado_em)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
              [codigo, titulo, texto, area, severidade, topicos, vigencia, fonte, batchId, now, now]
            );
            inserted++;
          }
        } catch (err) {
          console.error(`Erro em ${codigo}: ${err}`);
          errors++;
        }
      }

      console.log(JSON.stringify({
        event: "csv_upload_complete",
        csv: name,
        batchId,
        inserted,
        updated,
        errors,
      }));
    }

    // 5. Estado final
    console.log("\n=== ESTADO FINAL ===");
    const [finalLotes] = await conn.execute(
      `SELECT upload_batch_id, COUNT(*) as total, MIN(criado_em) as created_at
       FROM solaris_questions
       WHERE ativo = 1 AND upload_batch_id IS NOT NULL
       GROUP BY upload_batch_id
       ORDER BY created_at DESC`
    );
    console.log(JSON.stringify(finalLotes, null, 2));

    const [totalFinal] = await conn.execute(
      `SELECT COUNT(*) as total_ativas FROM solaris_questions WHERE ativo = 1`
    );
    console.log(JSON.stringify({ event: "final_total_ativas", totalFinal }));

    // 6. Verificar perguntas ativas por artigo
    const [perArtigo] = await conn.execute(
      `SELECT codigo, titulo, ativo FROM solaris_questions
       WHERE codigo LIKE 'SOL-%'
       ORDER BY codigo ASC`
    );
    console.log("\n=== PERGUNTAS SOL-* NO BANCO ===");
    console.log(JSON.stringify(perArtigo, null, 2));

  } finally {
    await conn.end();
  }
}

main().catch(console.error);
