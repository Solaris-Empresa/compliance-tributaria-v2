/**
 * ingest-lc87-1996.mjs — Sprint V / PV-03
 *
 * Ingestão da LC 87/1996 (Lei Kandir) no corpus RAG.
 *
 * CONTEXTO:
 *   A LC 87/1996 é a "Lei Kandir" — regula o ICMS e é fundamental para
 *   entender a transição para IBS/CBS na Reforma Tributária (LC 214/2025).
 *   Os 5 chunks legados (pré-Sprint G) são complementados por esta ingestão.
 *
 * RESTRIÇÃO:
 *   Este corpus é para RAG contextual APENAS.
 *   NÃO usar no engine determinístico (ncm-dataset.json / nbs-dataset.json).
 *
 * Formato do JSON de entrada (lc87-1996-artigos.json):
 *   {
 *     "metadados": { "lei": "lc87", ... },
 *     "artigos": [
 *       {
 *         "anchor_id": "lc87-art-2-100",
 *         "referencia": "Art. 2",
 *         "tipo": "artigo",
 *         "grupo": "fato-gerador-icms",
 *         "chunkIndex": 100,
 *         "texto_literal": "...",
 *         "topicos": ["fato gerador ICMS", ...]
 *       },
 *       ...
 *     ]
 *   }
 *
 * USO:
 *   node scripts/ingest-lc87-1996.mjs --file scripts/lc87-1996-artigos.json [--dry-run]
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
  console.error("Uso: node scripts/ingest-lc87-1996.mjs --file <caminho.json> [--dry-run]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Grupos obrigatórios (cobertura mínima da LC 87 para compliance tributário)
// ---------------------------------------------------------------------------
const GRUPOS_OBRIGATORIOS = [
  "fato-gerador-icms",
  "nao-incidencia-icms",
  "base-calculo-icms",
  "aliquotas-icms",
  "nao-cumulatividade-icms",
  "credito-icms",
  "substituicao-tributaria",
  "local-operacao-icms",
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   INGESTÃO — LC 87/1996 (Lei Kandir) — Sprint V / PV-03     ║");
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

  console.log(`📋 Lei: ${meta.nome || "LC 87/1996"}`);
  console.log(`📅 Publicação: ${meta.data_publicacao || "1996-09-16"}`);
  console.log(`📦 Chunks no JSON: ${artigos.length}`);
  console.log(`🔒 Restrição: ${meta.restricao || "N/A"}\n`);

  if (artigos.length === 0) {
    console.error("❌ Nenhum artigo encontrado no JSON");
    process.exit(1);
  }

  // Verificar cobertura dos grupos obrigatórios
  const gruposPresentes = new Set(artigos.map((a) => a.grupo));
  console.log("📊 Grupos obrigatórios:");
  let gruposFaltando = 0;
  for (const g of GRUPOS_OBRIGATORIOS) {
    const ok = gruposPresentes.has(g);
    console.log(`   ${ok ? "✅" : "❌"} ${g}`);
    if (!ok) {
      console.warn(`   ⚠️  Grupo obrigatório ausente: ${g}`);
      gruposFaltando++;
    }
  }
  if (gruposFaltando > 0) {
    console.error(`\n❌ ${gruposFaltando} grupo(s) obrigatório(s) ausente(s) — abortando`);
    process.exit(1);
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
  // Dry-run: verificar colisões com chunks legados lc87 existentes
  // ---------------------------------------------------------------------------
  if (!isDryRun) {
    const [existingRows] = await conn.execute(
      "SELECT anchor_id FROM ragDocuments WHERE lei = 'lc87'"
    );
    const existingIds = new Set(existingRows.map((r) => r.anchor_id));
    console.log(`📊 Chunks lc87 existentes no banco: ${existingIds.size}`);
    const colisoes = anchorIds.filter((id) => existingIds.has(id));
    if (colisoes.length > 0) {
      console.log(`   ℹ️  ${colisoes.length} anchor_id(s) já existem — serão atualizados via UPSERT`);
    } else {
      console.log(`   ✅ Sem colisão com chunks existentes — todos são novos`);
    }
    console.log();
  }

  // ---------------------------------------------------------------------------
  // Inserir artigos
  // ---------------------------------------------------------------------------
  let inserted = 0;
  let updated = 0;
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
      console.warn(`⚠️  Chunk sem texto_literal: ${anchor_id} — pulando`);
      skipped++;
      continue;
    }

    // Construir tópicos como string
    const topicosStr = [
      ...(Array.isArray(topicosArr) ? topicosArr : []),
      "LC 87/1996",
      "Lei Kandir",
      "ICMS",
      "reforma tributária",
      grupo?.replace(/-/g, " ") || "",
    ]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 10)
      .join(", ");

    // Título descritivo
    const titulo = `LC 87/1996 — Lei Kandir — ${referencia} — ${tipo}`.slice(0, 499);

    // Artigo granular
    const artigoLabel = `${referencia}${tipo !== "artigo" ? `, ${tipo}` : ""}`.slice(0, 299);

    if (isDryRun) {
      console.log(`[DRY-RUN] anchor_id: ${anchor_id}`);
      console.log(`          referencia: ${referencia} | tipo: ${tipo} | grupo: ${grupo}`);
      console.log(`          texto: ${texto_literal.slice(0, 120).replace(/\n/g, " ")}...`);
      console.log();
      inserted++;
    } else {
      try {
        const [result] = await conn.execute(
          `INSERT INTO ragDocuments
             (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex, anchor_id, autor, data_revisao)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             conteudo = VALUES(conteudo),
             topicos = VALUES(topicos),
             titulo = VALUES(titulo)`,
          [
            "lc87",
            artigoLabel,
            titulo,
            texto_literal,
            topicosStr,
            "COM,IND,SER,AGR", // LC 87 é transversal a todos os setores
            chunkIndex || 100,
            anchor_id,
            "ingestao-sprint-v-pv03",
            "2026-04-05",
          ]
        );
        if (result.affectedRows === 1) {
          inserted++;
        } else {
          updated++;
        }
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {
          skipped++;
        } else {
          console.error(`   ❌ Erro no chunk ${anchor_id}:`, e.message);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Relatório final
  // ---------------------------------------------------------------------------
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║   RELATÓRIO FINAL                                            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`   Chunks processados: ${artigos.length}`);
  console.log(`   Inseridos (novos):  ${inserted}`);
  if (!isDryRun) {
    console.log(`   Atualizados:        ${updated}`);
    console.log(`   Pulados (sem texto): ${skipped}`);
  }

  if (!isDryRun && conn) {
    // Q6: SELECT COUNT após ingestão
    const [countRows] = await conn.execute(
      "SELECT COUNT(*) as total FROM ragDocuments WHERE lei = 'lc87'"
    );
    const totalLc87 = countRows[0].total;
    console.log(`\n   📊 Q6 — Total lc87 no banco após ingestão: ${totalLc87}`);

    const [totalRows] = await conn.execute(
      "SELECT COUNT(*) as total FROM ragDocuments"
    );
    console.log(`   📊 Total geral no corpus: ${totalRows[0].total}`);

    await conn.end();
  }

  console.log("\n✅ Ingestão concluída");
}

main().catch((e) => {
  console.error("❌ Erro fatal:", e);
  process.exit(1);
});
