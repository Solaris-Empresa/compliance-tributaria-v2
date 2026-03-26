/**
 * scripts/migrate-anchor-id-legado.mjs
 * Migração de anchor_id para chunks legados (sem anchor_id) do corpus RAG.
 *
 * Estratégia: usar ${lei}-art-${normalizeAnchorSegment(artigo)}-id${id}
 * O sufixo -id${id} garante unicidade absoluta sem colisões.
 * Exclusivo para migração de legados — chunks novos (Sprint D+) usam anchor_id canônico sem sufixo.
 *
 * Uso:
 *   node scripts/migrate-anchor-id-legado.mjs --lei lc214 --dry-run
 *   node scripts/migrate-anchor-id-legado.mjs --lei lc214
 *   node scripts/migrate-anchor-id-legado.mjs --lei lc227 --dry-run
 *   node scripts/migrate-anchor-id-legado.mjs --lei lc227
 *   node scripts/migrate-anchor-id-legado.mjs --lei lc224 --dry-run
 *   node scripts/migrate-anchor-id-legado.mjs --lei lc224
 *   node scripts/migrate-anchor-id-legado.mjs --all --dry-run   # todas as leis
 *   node scripts/migrate-anchor-id-legado.mjs --all             # executar todas
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

// ─── normalizeAnchorSegment (canônico — mesma lógica de corpus-utils.mjs) ───
function normalizeAnchorSegment(text) {
  if (!text) return "desconhecido";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")        // remove acentos
    .replace(/§\s*(\d+)/g, "par-$1")        // §1º → par-1
    .replace(/º|ª/g, "")                    // remove ordinal
    .replace(/\b(\d+)-([a-z])\b/gi, "$1$2") // 149-A → 149a
    .replace(/[^a-z0-9\s-]/g, " ")          // remove especiais
    .replace(/\s+/g, "-")                   // espaços → hífens
    .replace(/-+/g, "-")                    // múltiplos hífens
    .replace(/^-|-$/g, "")                  // trim hífens
    .substring(0, 100);
}

// ─── buildLegacyAnchorId: formato exclusivo para legados ────────────────────
function buildLegacyAnchorId(lei, artigo, id) {
  const leiNorm = normalizeAnchorSegment(lei);
  const artigoNorm = normalizeAnchorSegment(artigo);
  return `${leiNorm}-art-${artigoNorm}-id${id}`;
}

// ─── args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const leiFlag = args.find((a) => a.startsWith("--lei="))?.split("=")[1]
  || (args.includes("--lei") ? args[args.indexOf("--lei") + 1] : null);
const isAll = args.includes("--all");

if (!leiFlag && !isAll) {
  console.error("Uso: node migrate-anchor-id-legado.mjs --lei <lc214|lc227|lc224> [--dry-run]");
  console.error("     node migrate-anchor-id-legado.mjs --all [--dry-run]");
  process.exit(1);
}

const LEIS_VALIDAS = ["lc214", "lc227", "lc224"];
const leisAlvo = isAll ? LEIS_VALIDAS : [leiFlag];

for (const l of leisAlvo) {
  if (!LEIS_VALIDAS.includes(l)) {
    console.error(`Lei inválida: ${l}. Válidas: ${LEIS_VALIDAS.join(", ")}`);
    process.exit(1);
  }
}

// ─── conexão ─────────────────────────────────────────────────────────────────
const db = await mysql.createConnection(process.env.DATABASE_URL);

// ─── migração por lei ─────────────────────────────────────────────────────────
async function migrarLei(lei) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[MIGRAÇÃO] lei=${lei} | modo=${isDryRun ? "DRY-RUN" : "REAL"}`);
  console.log("=".repeat(60));

  // Buscar todos os chunks legados desta lei
  const [rows] = await db.execute(
    "SELECT id, lei, artigo, chunkIndex, LEFT(conteudo, 80) as conteudo_inicio FROM ragDocuments WHERE lei = ? AND anchor_id IS NULL ORDER BY id",
    [lei]
  );

  if (rows.length === 0) {
    console.log(`[OK] Nenhum chunk legado encontrado para ${lei} — já migrado.`);
    return { total: 0, migrados: 0, colisoes: 0, erros: 0 };
  }

  console.log(`[INFO] ${rows.length} chunks legados encontrados para ${lei}`);

  // Verificar id 811 especificamente (LC 227 fragmentado)
  const id811 = rows.find((r) => r.id === "811" || r.id === 811);
  if (id811) {
    console.log(`\n[ATENÇÃO] id=811 detectado (chunk fragmentado LC 227):`);
    console.log(`  artigo: ${id811.artigo}`);
    console.log(`  conteúdo: ${id811.conteudo_inicio}`);
    console.log(`  → Receberá anchor_id com sufixo -id811 para rastreabilidade`);
    console.log(`  → Conteúdo fragmentado preservado — correção manual pendente (Issue #101)`);
  }

  // Gerar anchor_ids e verificar colisões
  const anchorMap = new Map(); // anchor_id → [ids]
  const updates = [];

  for (const row of rows) {
    const anchorId = buildLegacyAnchorId(row.lei, row.artigo, row.id);

    if (anchorMap.has(anchorId)) {
      anchorMap.get(anchorId).push(row.id);
    } else {
      anchorMap.set(anchorId, [row.id]);
    }

    updates.push({ id: row.id, anchorId, artigo: row.artigo });
  }

  // Detectar colisões (anchor_id gerado para mais de 1 id — impossível com sufixo -id${id})
  const colisoes = [...anchorMap.entries()].filter(([, ids]) => ids.length > 1);
  if (colisoes.length > 0) {
    console.error(`\n[ERRO CRÍTICO] ${colisoes.length} colisões detectadas:`);
    for (const [anchor, ids] of colisoes) {
      console.error(`  [ANCHOR-COLLISION] anchor_id=${anchor} ids=${ids.join(", ")}`);
    }
    console.error("ABORTANDO — resolver colisões manualmente antes de prosseguir.");
    return { total: rows.length, migrados: 0, colisoes: colisoes.length, erros: 0 };
  }

  console.log(`[OK] Zero colisões detectadas — ${updates.length} anchor_ids únicos`);

  // Preview (dry-run) ou execução real
  let migrados = 0;
  let erros = 0;
  const dataRevisao = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  if (isDryRun) {
    console.log(`\n[DRY-RUN] Primeiros 10 exemplos:`);
    for (const u of updates.slice(0, 10)) {
      console.log(`  [DRY-RUN] id=${u.id} artigo="${u.artigo}" → anchor_id=${u.anchorId}`);
    }
    if (updates.length > 10) {
      console.log(`  ... e mais ${updates.length - 10} chunks`);
    }
    migrados = updates.length;
  } else {
    console.log(`\n[EXEC] Iniciando UPDATE de ${updates.length} chunks...`);
    for (const u of updates) {
      try {
        await db.execute(
          "UPDATE ragDocuments SET anchor_id = ?, autor = ?, data_revisao = ? WHERE id = ? AND anchor_id IS NULL",
          [u.anchorId, "migracao-sprint-d", dataRevisao, u.id]
        );
        console.log(`[ANCHOR-MIGRATED] id=${u.id} anchor_id=${u.anchorId}`);
        migrados++;
      } catch (err) {
        console.error(`[ANCHOR-ERROR] id=${u.id} erro=${err.message}`);
        erros++;
      }
    }
  }

  // Resumo
  console.log(`\n${"─".repeat(60)}`);
  console.log(`[RESUMO] lei=${lei}`);
  console.log(`  Total legados:  ${rows.length}`);
  console.log(`  Migrados:       ${migrados}`);
  console.log(`  Colisões:       ${colisoes.length}`);
  console.log(`  Erros:          ${erros}`);
  if (isDryRun) console.log(`  Modo:           DRY-RUN (nenhum UPDATE executado)`);
  console.log("─".repeat(60));

  return { total: rows.length, migrados, colisoes: colisoes.length, erros };
}

// ─── execução principal ───────────────────────────────────────────────────────
const resultados = {};
for (const lei of leisAlvo) {
  resultados[lei] = await migrarLei(lei);
}

// Calcular totais gerais
let totalGeral = 0, migradosGeral = 0, colisoesGeral = 0, errosGeral = 0;
for (const r of Object.values(resultados)) {
  totalGeral += r.total;
  migradosGeral += r.migrados;
  colisoesGeral += r.colisoes;
  errosGeral += r.erros;
}

// Resumo final (modo --all)
if (isAll) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("[RESUMO FINAL — TODAS AS LEIS]");
  for (const [lei, r] of Object.entries(resultados)) {
    console.log(`  ${lei}: total=${r.total} migrados=${r.migrados} colisões=${r.colisoes} erros=${r.erros}`);
  }
  console.log(`  TOTAL: ${totalGeral} chunks, ${migradosGeral} migrados, ${colisoesGeral} colisões, ${errosGeral} erros`);
  console.log("=".repeat(60));
}

await db.end();
process.exit(errosGeral > 0 || colisoesGeral > 0 ? 1 : 0);
