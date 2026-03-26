/**
 * ingest-anexos-lc214-2025.mjs — Sprint D / G4
 *
 * Ingestão dos Anexos I–XVII (sem VII) da LC 214/2025 no corpus RAG.
 * Granularidade: 1 chunk por item numerado do Anexo.
 *
 * Formato do JSON de entrada (lc214-2025-anexos-completo.json):
 *   {
 *     "metadados": { "lei": "LC 214/2025", ... },
 *     "anexos": {
 *       "I":   { "titulo", "regime", "reducao", "tipo_chunk", "referencia_legal", "texto_literal_completo" },
 *       ...  (sem "VII" — numeração pula VI → VIII)
 *     }
 *   }
 *
 * USO:
 *   node scripts/ingest-anexos-lc214-2025.mjs --file lc214-2025-anexos-completo.json [--dry-run]
 *
 * IDEMPOTÊNCIA: upsert por anchor_id UNIQUE — seguro para double-run.
 */

import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";
import { buildAnchorId, normalizeAnchorSegment } from "./corpus-utils.mjs";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const fileArg = fileIdx !== -1 ? args[fileIdx + 1] : null;
const isDryRun = args.includes("--dry-run");

if (!fileArg) {
  console.error("Uso: node scripts/ingest-anexos-lc214-2025.mjs --file <caminho.json> [--dry-run]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Parser: 1 item por chunk
//
// Padrão do texto_literal_completo:
//   - Linhas de cabeçalho (ANEXO X, título, "ITEM DESCRIÇÃO...")
//   - Número inteiro sozinho em uma linha → início de novo item
//   - Linhas seguintes (até o próximo número) → conteúdo do item
//   - Para Anexo XIV: após o nome do medicamento, há uma linha com NCM/SH
//
// Estratégia:
//   1. Ignorar linhas de cabeçalho (antes do primeiro número)
//   2. Ao encontrar linha que é só um número inteiro → salvar item anterior, iniciar novo
//   3. Acumular linhas de conteúdo no item atual
// ---------------------------------------------------------------------------

/**
 * Retorna true se a linha é um número de item (inteiro positivo sozinho).
 */
function isItemNumber(line) {
  return /^\d+$/.test(line.trim());
}

/**
 * Retorna true se a linha é cabeçalho do Anexo (deve ser ignorada).
 */
function isHeader(line) {
  const l = line.trim();
  // Linhas de cabeçalho: "ANEXO X", título em maiúsculas, "ITEM DESCRIÇÃO...", "NCM/SH" sozinho
  if (/^ANEXO\s+[IVXLCDM]+\s*$/.test(l)) return true;
  if (l === "ITEM DESCRIÇÃO DO PRODUTO") return true;
  if (l === "ITEM DESCRIÇÃO") return true;
  if (l === "NCM/SH") return true;
  // Linhas de título em maiúsculas antes do primeiro item (sem números)
  return false;
}

/**
 * Parser especial para Anexo XVI: tabela ano/percentual ("2029 81,0%").
 * 1 chunk por linha de dado (ignorando cabeçalhos).
 */
function parseAnexoXVI(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const items = [];
  let numero = 0;
  for (const line of lines) {
    // Linhas de dado: "AAAA PP,P%" ou "AAAA PP%"
    if (/^\d{4}\s+[\d,\.]+%$/.test(line)) {
      numero++;
      items.push({ numero, conteudo: line });
    }
  }
  return items;
}

/**
 * Parser especial para Anexo XVII: categorias por nome (sem numeração).
 * 1 chunk por categoria (nome + NCMs).
 */
function parseAnexoXVII(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const items = [];
  let numero = 0;
  let currentCategory = null;
  let currentLines = [];
  let headerPhase = true;

  // Categorias do Anexo XVII (nomes conhecidos)
  const CATEGORY_NAMES = new Set([
    "Veículos",
    "Aeronaves e Embarcações",
    "Produtos fumígenos",
    "Bebidas alcóolicas",
    "Bebidas açucaradas",
    "Bens minerais",
    "Concursos de prognósticos",
    "Produtos prejudiciais à saúde",
    "Produtos prejudiciais ao meio ambiente",
  ]);

  for (const line of lines) {
    // Ignorar cabeçalho do Anexo
    if (/^ANEXO\s+XVII/.test(line) || line === "BENS E SERVIÇOS SUJEITOS AO IMPOSTO SELETIVO") {
      continue;
    }
    // Detectar início de nova categoria
    if (CATEGORY_NAMES.has(line)) {
      if (currentCategory !== null && currentLines.length > 0) {
        numero++;
        items.push({ numero, conteudo: `${currentCategory}: ${currentLines.join(" ")}` });
      }
      currentCategory = line;
      currentLines = [];
      headerPhase = false;
    } else if (!headerPhase && currentCategory !== null) {
      currentLines.push(line);
    }
  }
  // Último item
  if (currentCategory !== null && currentLines.length > 0) {
    numero++;
    items.push({ numero, conteudo: `${currentCategory}: ${currentLines.join(" ")}` });
  }
  return items;
}

/**
 * Parseia texto_literal_completo e retorna array de { numero, conteudo }.
 * 1 item por número encontrado.
 */
function parseItemsFromText(text) {
  const rawLines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const items = [];
  let currentNumber = null;
  let currentLines = [];
  let headerPhase = true; // Antes do primeiro número, estamos no cabeçalho

  for (const line of rawLines) {
    if (isItemNumber(line)) {
      // Salvar item anterior (se existir)
      if (currentNumber !== null && currentLines.length > 0) {
        items.push({
          numero: currentNumber,
          conteudo: currentLines.join(" ").trim(),
        });
      }
      // Iniciar novo item
      currentNumber = parseInt(line, 10);
      currentLines = [];
      headerPhase = false;
    } else if (headerPhase) {
      // Ignorar linhas de cabeçalho antes do primeiro número
      continue;
    } else if (currentNumber !== null) {
      // Acumular linha de conteúdo do item atual
      // Ignorar linhas que são apenas "NCM/SH" (cabeçalho de coluna)
      if (line !== "NCM/SH") {
        currentLines.push(line);
      }
    }
  }

  // Salvar último item
  if (currentNumber !== null && currentLines.length > 0) {
    items.push({
      numero: currentNumber,
      conteudo: currentLines.join(" ").trim(),
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   INGESTÃO — LC 214/2025 — Anexos I–XVII (sem VII)          ║");
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
  const anexos = data.anexos || {};

  console.log(`📋 Lei: ${meta.lei || "LC 214/2025"}`);
  console.log(`📅 Publicação: ${meta.data_publicacao || "2025-01-16"}`);
  console.log(`📦 Anexos no JSON: ${Object.keys(anexos).join(", ")}`);

  if ("VII" in anexos) {
    console.warn("⚠️  Anexo VII encontrado no JSON — revisar conforme instrução do P.O.");
  } else {
    console.log("✅ Anexo VII ausente (conforme instrução do P.O. — numeração pula VI→VIII)\n");
  }

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
  // Processar cada Anexo
  // ---------------------------------------------------------------------------
  const coverageRows = [];
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalChunks = 0;

  for (const [numRomano, anexo] of Object.entries(anexos)) {
    const titulo = anexo.titulo || `Anexo ${numRomano}`;
    const regime = anexo.regime || "nao_especificado";
    const reducao = anexo.reducao || "";
    const referenciaLegal = anexo.referencia_legal || `LC 214/2025, Anexo ${numRomano}`;
    const texto = anexo.texto_literal_completo || "";

    if (!texto.trim()) {
      console.warn(`⚠️  Anexo ${numRomano}: texto vazio — pulando`);
      coverageRows.push({ anexo: numRomano, titulo: titulo.slice(0, 55), chunks: 0, inserted: 0, skipped: 0, status: "VAZIO" });
      continue;
    }

    // Parsear itens: 1 item = 1 chunk
    // Usar parser especializado para Anexos XVI e XVII (sem numeração por item)
    let items;
    if (numRomano === "XVI") {
      items = parseAnexoXVI(texto);
    } else if (numRomano === "XVII") {
      items = parseAnexoXVII(texto);
    } else {
      items = parseItemsFromText(texto);
    }

    if (items.length === 0) {
      console.warn(`⚠️  Anexo ${numRomano}: nenhum item encontrado no parser — verificar formato`);
      coverageRows.push({ anexo: numRomano, titulo: titulo.slice(0, 55), chunks: 0, inserted: 0, skipped: 0, status: "SEM_ITENS" });
      continue;
    }

    console.log(`📎 Anexo ${numRomano}: ${items.length} itens → ${items.length} chunks`);

    let inserted = 0;
    let skipped = 0;

    for (const item of items) {
      const { numero, conteudo } = item;

      // Conteúdo do chunk: cabeçalho contextual + item
      const chunkContent = [
        `ANEXO ${numRomano} — ${titulo}`,
        `Regime: ${regime}${reducao ? ` | Redução: ${reducao}` : ""}`,
        `Referência: ${referenciaLegal}`,
        ``,
        `Item ${numero}: ${conteudo}`,
      ].join("\n");

      const artigoLabel = `Anexo ${numRomano}, item ${numero}`;
      const anchorId = buildAnchorId(
        "lc214",
        `anexo-${normalizeAnchorSegment(numRomano)}-item-${numero}`,
        numero
      );

      // Tópicos automáticos
      const topicos = [
        `Anexo ${numRomano}`,
        regime.replace(/_/g, " "),
        reducao ? `redução ${reducao}` : "",
        "LC 214/2025",
        "reforma tributária",
        "IBS",
        "CBS",
      ]
        .filter(Boolean)
        .join(", ");

      if (isDryRun) {
        if (numero <= 2) {
          console.log(`   [DRY-RUN] anchor_id: ${anchorId}`);
          console.log(`   [DRY-RUN] artigo:    ${artigoLabel}`);
          console.log(`   [DRY-RUN] conteudo:  ${conteudo.slice(0, 100)}...`);
        }
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
              "lc214",
              artigoLabel.slice(0, 299),
              titulo.slice(0, 499),
              chunkContent,
              topicos,
              "",
              numero,
              anchorId,
              "ingestao-automatica-sprint-d",
              "2026-03-26",
            ]
          );
          inserted++;
        } catch (e) {
          if (e.code === "ER_DUP_ENTRY") {
            skipped++;
          } else {
            console.error(`   ❌ Erro no item ${numero} do Anexo ${numRomano}:`, e.message);
          }
        }
      }
    }

    totalInserted += inserted;
    totalSkipped += skipped;
    totalChunks += items.length;

    coverageRows.push({
      anexo: numRomano,
      titulo: titulo.slice(0, 55),
      chunks: items.length,
      inserted,
      skipped,
      status: isDryRun ? "DRY-RUN" : skipped > 0 ? "UPSERTED" : "INSERTED",
    });
  }

  // ---------------------------------------------------------------------------
  // Tabela de cobertura
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(95));
  console.log("📊 TABELA DE COBERTURA — LC 214/2025 Anexos (1 chunk por item)");
  console.log("=".repeat(95));
  console.log(
    `${"Anexo".padEnd(8)} ${"Título (55 chars)".padEnd(57)} ${"Itens".padStart(6)} ${"Status".padStart(10)}`
  );
  console.log("-".repeat(85));
  for (const row of coverageRows) {
    console.log(
      `${String(row.anexo).padEnd(8)} ${row.titulo.padEnd(57)} ${String(row.chunks).padStart(6)} ${row.status.padStart(10)}`
    );
  }
  console.log("-".repeat(85));
  console.log(`${"TOTAL".padEnd(8)} ${"".padEnd(57)} ${String(totalChunks).padStart(6)}`);
  console.log();
  console.log(`✅ Chunks ${isDryRun ? "simulados" : "inseridos/atualizados"}: ${totalInserted}`);
  if (!isDryRun && totalSkipped > 0) {
    console.log(`♻️  Chunks já existentes (upsert): ${totalSkipped}`);
  }
  console.log(`📦 Total chunks gerados: ${totalChunks}`);

  if (conn) await conn.end();

  console.log(isDryRun ? "\n✅ DRY-RUN concluído — nenhum dado gravado." : "\n✅ Ingestão concluída.");
}

main().catch((e) => {
  console.error("❌ Erro fatal:", e);
  process.exit(1);
});
