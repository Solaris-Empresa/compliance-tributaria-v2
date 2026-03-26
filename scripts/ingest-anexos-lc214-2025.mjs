/**
 * ingest-anexos-lc214-2025.mjs — Sprint D / G4
 *
 * Ingestão dos 11 Anexos da LC 214/2025 no corpus RAG.
 *
 * PRÉ-REQUISITO: arquivo JSON fornecido pelo P.O.
 *   Caminho esperado: scripts/data/lc214-anexos.json
 *   Formato esperado:
 *   {
 *     "anexo_i":   [{ "ncm": "0101.21.00", "descricao": "Animais vivos...", "topicos": ["..."] }],
 *     "anexo_ii":  [...],
 *     "anexo_iii": [...],
 *     "anexo_iv":  [...],
 *     "anexo_v":   [{ "regra": 1, "descricao": "...", "topicos": ["..."] }],
 *     "anexo_vi":  [...],
 *     "anexo_vii": [...],
 *     "anexo_viii":[...],
 *     "anexo_ix":  [...],
 *     "anexo_x":   [...],
 *     "anexo_xi":  [...]
 *   }
 *
 * USO:
 *   node scripts/ingest-anexos-lc214-2025.mjs [--dry-run]
 *
 *   --dry-run: imprime os chunks sem inserir no banco
 *
 * IDEMPOTÊNCIA: upsert por anchor_id — seguro para double-run.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  normalizeAnchorSegment,
  buildAnchorId,
  connectDb,
  upsertChunk,
  detectSemanticOverlap,
  printCoverageSummary,
} from "./corpus-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "data", "lc214-anexos.json");
const DRY_RUN = process.argv.includes("--dry-run");
const AUTOR = "ingestao-automatica-sprint-d";
const REVISADO_POR = "pendente-revisao-humana";
const DATA_REVISAO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ---------------------------------------------------------------------------
// Configuração dos Anexos
// ---------------------------------------------------------------------------

const ANEXOS_CONFIG = [
  {
    key: "anexo_i",
    label: "Anexo I",
    titulo_base: "LC 214/2025 — Anexo I — Alíquota reduzida 60%",
    tipo: "ncm",
    topicos_base: ["aliquota reduzida", "60%", "cesta basica", "LC 214/2025", "IBS", "CBS"],
    cnaeGroups: "COM,IND",
  },
  {
    key: "anexo_ii",
    label: "Anexo II",
    titulo_base: "LC 214/2025 — Anexo II — Alíquota reduzida 30%",
    tipo: "ncm",
    topicos_base: ["aliquota reduzida", "30%", "LC 214/2025", "IBS", "CBS"],
    cnaeGroups: "COM,IND",
  },
  {
    key: "anexo_iii",
    label: "Anexo III",
    titulo_base: "LC 214/2025 — Anexo III — Alíquota zero",
    tipo: "ncm",
    topicos_base: ["aliquota zero", "isencao", "cesta basica", "LC 214/2025", "IBS", "CBS"],
    cnaeGroups: "COM,IND",
  },
  {
    key: "anexo_iv",
    label: "Anexo IV",
    titulo_base: "LC 214/2025 — Anexo IV — Imposto Seletivo",
    tipo: "ncm",
    topicos_base: ["imposto seletivo", "IS", "bens prejudiciais", "LC 214/2025"],
    cnaeGroups: "COM,IND",
  },
  {
    key: "anexo_v",
    label: "Anexo V",
    titulo_base: "LC 214/2025 — Anexo V — Combustíveis",
    tipo: "regra",
    topicos_base: ["combustiveis", "petroleo", "gas", "biocombustivel", "LC 214/2025", "IBS", "CBS"],
    cnaeGroups: "IND,COM",
  },
  {
    key: "anexo_vi",
    label: "Anexo VI",
    titulo_base: "LC 214/2025 — Anexo VI — Serviços financeiros",
    tipo: "regra",
    topicos_base: ["servicos financeiros", "banco", "seguro", "credito", "LC 214/2025", "CBS"],
    cnaeGroups: "SER",
  },
  {
    key: "anexo_vii",
    label: "Anexo VII",
    titulo_base: "LC 214/2025 — Anexo VII — Planos de saúde",
    tipo: "regra",
    topicos_base: ["planos de saude", "saude", "assistencia medica", "LC 214/2025", "CBS"],
    cnaeGroups: "SER",
  },
  {
    key: "anexo_viii",
    label: "Anexo VIII",
    titulo_base: "LC 214/2025 — Anexo VIII — Prognósticos",
    tipo: "regra",
    topicos_base: ["prognosticos", "apostas", "loterias", "LC 214/2025", "IS"],
    cnaeGroups: "SER",
  },
  {
    key: "anexo_ix",
    label: "Anexo IX",
    titulo_base: "LC 214/2025 — Anexo IX — Cooperativas",
    tipo: "regra",
    topicos_base: ["cooperativas", "ato cooperativo", "LC 214/2025", "IBS", "CBS"],
    cnaeGroups: "COM,IND,SER",
  },
  {
    key: "anexo_x",
    label: "Anexo X",
    titulo_base: "LC 214/2025 — Anexo X — Bens imóveis",
    tipo: "regra",
    topicos_base: ["bens imoveis", "imoveis", "locacao", "compra e venda", "LC 214/2025", "IBS"],
    cnaeGroups: "SER,COM",
  },
  {
    key: "anexo_xi",
    label: "Anexo XI",
    titulo_base: "LC 214/2025 — Anexo XI — Zona Franca de Manaus",
    tipo: "regra",
    topicos_base: ["ZFM", "Zona Franca de Manaus", "beneficio fiscal", "Amazonia", "LC 214/2025"],
    cnaeGroups: "COM,IND",
  },
];

// ---------------------------------------------------------------------------
// Funções de chunking por tipo
// ---------------------------------------------------------------------------

/**
 * Gera chunks para Anexos de NCM (I, II, III, IV).
 * 1 chunk por NCM.
 */
function buildNcmChunks(items, config) {
  const chunks = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const ncmNorm = normalizeAnchorSegment(item.ncm);
    const descNorm = normalizeAnchorSegment(item.descricao ?? "");
    const artigoGranular = `${config.label}, NCM ${item.ncm} — ${item.descricao ?? ""}`.slice(0, 299);
    const chunkIndex = 1; // 1 chunk por NCM
    const anchor_id = buildAnchorId("lc214", `${config.label}-ncm-${ncmNorm}-${descNorm}`, chunkIndex);

    // Validação de integridade
    if (!item.conteudo && !item.descricao) {
      console.warn(`[CORPUS-WARN] NCM sem conteúdo: ${item.ncm}`);
    }

    const conteudo = item.conteudo ??
      `${config.titulo_base}\nNCM: ${item.ncm}\nDescrição: ${item.descricao ?? ""}\n` +
      (item.aliquota ? `Alíquota: ${item.aliquota}\n` : "") +
      (item.observacao ? `Observação: ${item.observacao}\n` : "");

    // Validação de fronteira semântica
    if (conteudo.trimEnd().endsWith(",") || /,\s*(e|ou|que)\s*$/.test(conteudo.trimEnd())) {
      console.warn(`[CORPUS-WARN] Chunk termina com conjunção: ${anchor_id}`);
    }

    const topicosArr = [
      ...config.topicos_base,
      ...(item.topicos ?? []),
      `NCM ${item.ncm}`,
    ].filter((v, idx, arr) => arr.indexOf(v) === idx).slice(0, 10);

    chunks.push({
      anchor_id,
      lei: "lc214",
      artigo: artigoGranular,
      titulo: `${config.titulo_base} — NCM ${item.ncm}`,
      conteudo,
      topicos: topicosArr.join(", "),
      cnaeGroups: config.cnaeGroups,
      chunkIndex,
      autor: AUTOR,
      revisado_por: REVISADO_POR,
      data_revisao: DATA_REVISAO,
    });
  }
  return chunks;
}

/**
 * Gera chunks para Anexos de regras (V–XI).
 * 1 chunk por regra.
 */
function buildRegraChunks(items, config) {
  const chunks = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const regraNum = item.regra ?? (i + 1);
    const artigoGranular = `${config.label}, Regra ${regraNum}`.slice(0, 299);
    const chunkIndex = 1; // 1 chunk por regra
    const anchor_id = buildAnchorId("lc214", `${config.label}-regra-${regraNum}`, chunkIndex);

    const conteudo = item.conteudo ??
      `${config.titulo_base}\nRegra ${regraNum}: ${item.descricao ?? ""}\n` +
      (item.aliquota ? `Alíquota: ${item.aliquota}\n` : "") +
      (item.observacao ? `Observação: ${item.observacao}\n` : "");

    // Validação de fronteira semântica
    if (conteudo.trimEnd().endsWith(",") || /,\s*(e|ou|que)\s*$/.test(conteudo.trimEnd())) {
      console.warn(`[CORPUS-WARN] Chunk termina com conjunção: ${anchor_id}`);
    }
    if (conteudo.length < 30) {
      console.warn(`[CORPUS-WARN] Chunk muito curto (${conteudo.length} chars): ${anchor_id}`);
    }

    const topicosArr = [
      ...config.topicos_base,
      ...(item.topicos ?? []),
    ].filter((v, idx, arr) => arr.indexOf(v) === idx).slice(0, 10);

    chunks.push({
      anchor_id,
      lei: "lc214",
      artigo: artigoGranular,
      titulo: `${config.titulo_base} — Regra ${regraNum}`,
      conteudo,
      topicos: topicosArr.join(", "),
      cnaeGroups: config.cnaeGroups,
      chunkIndex,
      autor: AUTOR,
      revisado_por: REVISADO_POR,
      data_revisao: DATA_REVISAO,
    });
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   INGESTÃO — LC 214/2025 — 11 Anexos — Sprint D / G4        ║");
  console.log(`║   Modo: ${DRY_RUN ? "DRY-RUN (sem inserção no banco)         " : "PRODUÇÃO (inserindo no banco)            "}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // ── Verificar arquivo fonte ──────────────────────────────────────────────
  if (!existsSync(DATA_FILE)) {
    console.error(`❌ BLOQUEIO: Arquivo fonte não encontrado: ${DATA_FILE}`);
    console.error("   Forneça o arquivo scripts/data/lc214-anexos.json antes de executar.");
    console.error("   Formato esperado: { \"anexo_i\": [{ncm, descricao, topicos, conteudo?}], ... }");
    process.exit(1);
  }

  const rawData = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  console.log(`✅ Arquivo fonte carregado: ${DATA_FILE}`);

  // ── Conectar ao banco ────────────────────────────────────────────────────
  let connection;
  if (!DRY_RUN) {
    const conn = await connectDb();
    connection = conn.connection;
    console.log("✅ Conexão com banco estabelecida\n");
  }

  // ── Gerar e inserir chunks por Anexo ────────────────────────────────────
  const coverageResults = [];
  const allChunks = [];

  for (const config of ANEXOS_CONFIG) {
    const items = rawData[config.key] ?? [];
    if (items.length === 0) {
      console.warn(`[CORPUS-WARN] Nenhum item encontrado para ${config.label} (chave: ${config.key})`);
    }

    const chunks = config.tipo === "ncm"
      ? buildNcmChunks(items, config)
      : buildRegraChunks(items, config);

    allChunks.push(...chunks);

    let inserted = 0, updated = 0, skipped = 0;

    for (const chunk of chunks) {
      if (DRY_RUN) {
        console.log(`[DRY-RUN] ${chunk.anchor_id} | ${chunk.conteudo.slice(0, 60)}...`);
        inserted++;
      } else {
        const result = await upsertChunk(connection, chunk);
        if (result === "insert") inserted++;
        else if (result === "update") updated++;
        else skipped++;
      }
    }

    coverageResults.push({
      label: config.label,
      expected: items.length,
      inserted,
      updated,
      skipped,
    });
  }

  // ── Detecção de sobreposição semântica ──────────────────────────────────
  const overlapCount = detectSemanticOverlap(allChunks);
  if (overlapCount > 0) {
    console.warn(`\n⚠️  ${overlapCount} alertas de sobreposição semântica (>= 80%) — revisar manualmente`);
  }

  // ── Verificar unicidade de anchor_id ────────────────────────────────────
  const anchorIds = allChunks.map(c => c.anchor_id);
  const uniqueAnchorIds = new Set(anchorIds);
  if (uniqueAnchorIds.size !== anchorIds.length) {
    const duplicates = anchorIds.filter((id, i) => anchorIds.indexOf(id) !== i);
    console.error(`❌ COLISÃO DE anchor_id detectada: ${[...new Set(duplicates)].join(", ")}`);
    process.exit(1);
  }
  console.log(`\n✅ Unicidade de anchor_id verificada: ${uniqueAnchorIds.size} IDs únicos`);

  // ── Tabela de cobertura ──────────────────────────────────────────────────
  printCoverageSummary(coverageResults);

  // ── Verificar cobertura mínima ───────────────────────────────────────────
  for (const r of coverageResults) {
    const actual = r.inserted + r.updated + r.skipped;
    const pct = r.expected === 0 ? 100 : (actual / r.expected) * 100;
    if (pct < 50) {
      console.error(`❌ BLOQUEIO: Cobertura < 50% para ${r.label}: ${pct.toFixed(0)}% (${actual}/${r.expected})`);
      process.exit(1);
    }
    if (pct < 80) {
      console.warn(`⚠️  Cobertura < 80% para ${r.label}: ${pct.toFixed(0)}% (${actual}/${r.expected})`);
    }
  }

  if (!DRY_RUN && connection) {
    await connection.end();
  }

  console.log("\n✅ Ingestão LC 214/2025 — Anexos — concluída");
}

main().catch(err => {
  console.error("❌ Erro fatal na ingestão:", err);
  process.exit(1);
});
