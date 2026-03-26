/**
 * ingest-ec132-2023.mjs — Sprint D / G3
 *
 * Ingestão da EC 132/2023 no corpus RAG.
 *
 * Formato do JSON de entrada (ec132-2023-artigos.json):
 *   {
 *     "metadados": { ... },
 *     "artigos": [
 *       {
 *         "anchor_id": "ec132-art-145-par-3-1",
 *         "referencia": "Art. 145 §3º",
 *         "tipo": "paragrafo",
 *         "grupo": "principios-sistema-tributario",
 *         "chunkIndex": 1,
 *         "texto_literal": "...",
 *         "topicos": ["princípios tributários", ...]
 *       },
 *       ...
 *     ]
 *   }
 *
 * USO:
 *   node scripts/ingest-ec132-2023.mjs --file ec132-2023-artigos.json [--dry-run]
 *
 * IDEMPOTÊNCIA: upsert por anchor_id UNIQUE — seguro para double-run.
 */

import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const fileArg = fileIdx !== -1 ? args[fileIdx + 1] : null;
const isDryRun = args.includes("--dry-run");

if (!fileArg) {
  console.error("Uso: node scripts/ingest-ec132-2023.mjs --file <caminho.json> [--dry-run]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Grupos obrigatórios (cobertura mínima)
// ---------------------------------------------------------------------------
const GRUPOS_OBRIGATORIOS = [
  "principios-sistema-tributario",
  "IBS-CBS-regras-comuns",
  "IBS-competencia",
  "IBS-principios",
  "IBS-nao-cumulatividade",
  "comite-gestor-IBS",
  "imposto-seletivo",
  "transicao-reforma-tributaria",
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   INGESTÃO — EC 132/2023 — Sprint D / G3                    ║");
  console.log(`║   Modo: ${isDryRun ? "DRY-RUN (sem inserção no banco)         " : "PRODUÇÃO (inserindo no banco)            "}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Ler JSON
  let data;
  try {
    data = JSON.parse(readFileSync(fileArg, "utf-8"));
  } catch (e) {
    console.error(`❌ Erro ao ler ${fileArg}:`, e.message);
    process.exit(1);
  }

  const meta = data.metadados || {};
  const artigos = data.artigos || [];

  console.log(`📋 Lei: ${meta.lei || "EC 132/2023"}`);
  console.log(`📅 Publicação: ${meta.data_publicacao || "2023-12-20"}`);
  console.log(`📦 Artigos/chunks no JSON: ${artigos.length}\n`);

  if (artigos.length === 0) {
    console.error("❌ Nenhum artigo encontrado no JSON");
    process.exit(1);
  }

  // Verificar cobertura dos grupos obrigatórios
  const gruposPresentes = new Set(artigos.map((a) => a.grupo));
  console.log("📊 Grupos presentes no JSON:");
  for (const g of GRUPOS_OBRIGATORIOS) {
    const ok = gruposPresentes.has(g);
    console.log(`   ${ok ? "✅" : "❌"} ${g}`);
    if (!ok) {
      console.warn(`   ⚠️  Grupo obrigatório ausente: ${g} — verificar cobertura`);
    }
  }
  console.log();

  // Verificar unicidade de anchor_id no JSON
  const anchorIds = artigos.map((a) => a.anchor_id);
  const uniqueAnchorIds = new Set(anchorIds);
  if (uniqueAnchorIds.size !== anchorIds.length) {
    const duplicates = anchorIds.filter((id, i) => anchorIds.indexOf(id) !== i);
    console.error(`❌ COLISÃO DE anchor_id no JSON: ${[...new Set(duplicates)].join(", ")}`);
    process.exit(1);
  }
  console.log(`✅ Unicidade de anchor_id verificada: ${uniqueAnchorIds.size} IDs únicos\n`);

  // Conectar ao banco (apenas se não for dry-run)
  let conn = null;
  if (!isDryRun) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error("❌ DATABASE_URL não definida");
      process.exit(1);
    }
    conn = await createConnection(dbUrl);
    console.log("✅ Conectado ao banco\n");
  }

  // ---------------------------------------------------------------------------
  // Inserir artigos
  // ---------------------------------------------------------------------------
  let inserted = 0;
  let skipped = 0;

  for (const artigo of artigos) {
    const {
      anchor_id,
      referencia,
      tipo,
      grupo,
      chunkIndex,
      texto_literal,
      topicos: topicosArr,
    } = artigo;

    if (!texto_literal || !texto_literal.trim()) {
      console.warn(`⚠️  Artigo sem texto_literal: ${anchor_id} — pulando`);
      continue;
    }

    // Construir tópicos como string
    const topicosStr = [
      ...(Array.isArray(topicosArr) ? topicosArr : []),
      "EC 132/2023",
      "reforma tributária",
      grupo?.replace(/-/g, " ") || "",
    ]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 10)
      .join(", ");

    // Título descritivo
    const titulo = `EC 132/2023 — ${referencia} — ${tipo}`.slice(0, 499);

    // Artigo granular (referência + tipo)
    const artigoLabel = `${referencia}${tipo !== "artigo" ? `, ${tipo}` : ""}`.slice(0, 299);

    if (isDryRun) {
      console.log(`[DRY-RUN] anchor_id: ${anchor_id}`);
      console.log(`          referencia: ${referencia} | tipo: ${tipo} | grupo: ${grupo}`);
      console.log(`          texto: ${texto_literal.slice(0, 100).replace(/\n/g, " ")}...`);
      console.log();
      inserted++;
    } else {
      try {
        await conn.execute(
          `INSERT INTO ragDocuments
             (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex, anchor_id, autor, data_revisao)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             conteudo = VALUES(conteudo),
             topicos = VALUES(topicos),
             titulo = VALUES(titulo)`,
          [
            "ec132",
            artigoLabel,
            titulo,
            texto_literal,
            topicosStr,
            "COM,IND,SER", // cnaeGroups — enriquecimento em Sprint E
            chunkIndex || 1,
            anchor_id,
            "ingestao-automatica-sprint-d",
            "2026-03-26",
          ]
        );
        inserted++;
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {
          skipped++;
        } else {
          console.error(`   ❌ Erro no artigo ${anchor_id}:`, e.message);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Relatório de cobertura
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(70));
  console.log("📊 TABELA DE COBERTURA — EC 132/2023");
  console.log("=".repeat(70));
  console.log(`${"Lei".padEnd(15)} ${"Total".padStart(6)} ${"Inseridos".padStart(10)} ${"Skipped".padStart(8)} ${"Status".padStart(10)}`);
  console.log("-".repeat(55));
  console.log(
    `${"EC 132/2023".padEnd(15)} ${String(artigos.length).padStart(6)} ${String(inserted).padStart(10)} ${String(skipped).padStart(8)} ${"OK".padStart(10)}`
  );
  console.log("-".repeat(55));
  console.log();
  console.log(`✅ Chunks ${isDryRun ? "simulados" : "inseridos/atualizados"}: ${inserted}`);
  if (!isDryRun && skipped > 0) {
    console.log(`♻️  Chunks já existentes (upsert): ${skipped}`);
  }
  console.log(`📦 Total chunks processados: ${artigos.length}`);

  if (conn) await conn.end();

  console.log(isDryRun ? "\n✅ DRY-RUN concluído — nenhum dado gravado." : "\n✅ Ingestão EC 132/2023 concluída.");
}

main().catch((e) => {
  console.error("❌ Erro fatal:", e);
  process.exit(1);
});
