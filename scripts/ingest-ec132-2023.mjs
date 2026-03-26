/**
 * ingest-ec132-2023.mjs — Sprint D / G3
 *
 * Ingestão da EC 132/2023 no corpus RAG.
 * 1 chunk por dispositivo autônomo (caput, §, inciso quando relevante).
 *
 * PRÉ-REQUISITO: arquivo JSON fornecido pelo P.O.
 *   Caminho esperado: scripts/data/ec132-2023.json
 *   Formato esperado:
 *   [
 *     {
 *       "artigo": "Art. 145-A",
 *       "tipo": "caput",           // "caput" | "paragrafo" | "inciso" | "alinea" | "transitorio"
 *       "numero": null,            // número do § ou inciso (null para caput)
 *       "conteudo": "...",         // texto completo do dispositivo
 *       "topicos": ["IBS", "CBS", "fato gerador", ...],
 *       "cnaeGroups": "COM,IND,SER"  // opcional
 *     },
 *     ...
 *   ]
 *
 * USO:
 *   node scripts/ingest-ec132-2023.mjs [--dry-run]
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
const DATA_FILE = join(__dirname, "data", "ec132-2023.json");
const DRY_RUN = process.argv.includes("--dry-run");
const AUTOR = "ingestao-automatica-sprint-d";
const REVISADO_POR = "pendente-revisao-humana";
const DATA_REVISAO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ---------------------------------------------------------------------------
// Grupos de artigos obrigatórios (Bloco 4 — cobertura mínima)
// ---------------------------------------------------------------------------

const GRUPOS_OBRIGATORIOS = [
  {
    label: "Art. 145-A",
    pattern: /^art\.\s*145-?a/i,
    topicos_base: ["IBS", "CBS", "fato gerador", "base de calculo", "reforma tributaria", "EC 132/2023"],
  },
  {
    label: "Arts. 149-A a 149-G (CBS)",
    pattern: /^art\.\s*149-?[a-g]/i,
    topicos_base: ["CBS", "competencia federal", "nao cumulatividade", "credito fiscal", "EC 132/2023"],
  },
  {
    label: "Arts. 156-A a 156-G (IBS)",
    pattern: /^art\.\s*156-?[a-g]/i,
    topicos_base: ["IBS", "competencia subnacional", "estados", "municipios", "comite gestor", "EC 132/2023"],
  },
  {
    label: "Art. 153 VIII (IS)",
    pattern: /^art\.\s*153/i,
    topicos_base: ["imposto seletivo", "IS", "bens prejudiciais", "extrafiscalidade", "EC 132/2023"],
  },
  {
    label: "Disposições transitórias",
    pattern: /transitorio|disposicao\s+transit/i,
    topicos_base: ["periodo de transicao", "vigencia", "2026", "2033", "EC 132/2023"],
  },
];

// ---------------------------------------------------------------------------
// Funções auxiliares
// ---------------------------------------------------------------------------

/**
 * Determina o grupo de artigos ao qual um dispositivo pertence.
 */
function resolveGrupo(artigo) {
  for (const g of GRUPOS_OBRIGATORIOS) {
    if (g.pattern.test(artigo)) return g;
  }
  return null;
}

/**
 * Constrói o segmento de artigo para o anchor_id.
 * Exemplos:
 *   Art. 149-A, caput → "art-149a-caput"
 *   Art. 149-A, §1º   → "art-149a-par-1"
 *   Art. 156-A, §2º, inciso III → "art-156a-par-2-inc-iii"
 */
function buildArtigoSegment(artigo, tipo, numero) {
  const artigoNorm = normalizeAnchorSegment(artigo);
  if (tipo === "caput") return `${artigoNorm}-caput`;
  if (tipo === "paragrafo") return `${artigoNorm}-par-${normalizeAnchorSegment(String(numero ?? ""))}`;
  if (tipo === "inciso") return `${artigoNorm}-inc-${normalizeAnchorSegment(String(numero ?? ""))}`;
  if (tipo === "alinea") return `${artigoNorm}-alinea-${normalizeAnchorSegment(String(numero ?? ""))}`;
  if (tipo === "transitorio") return `${artigoNorm}-transitorio-${normalizeAnchorSegment(String(numero ?? ""))}`;
  return `${artigoNorm}-${normalizeAnchorSegment(String(tipo ?? ""))}`;
}

/**
 * Valida fronteiras semânticas de um chunk.
 * Retorna lista de avisos (vazia se OK).
 */
function validateSemanticBoundary(conteudo, anchor_id) {
  const warnings = [];
  const trimmed = conteudo.trim();

  // Não deve iniciar com letra minúscula após espaço (indica início no meio de frase)
  if (/^[a-záàâãéèêíïóôõöúüç]/.test(trimmed)) {
    warnings.push(`Chunk inicia com letra minúscula (possível início no meio de frase): ${anchor_id}`);
  }

  // Não deve terminar com vírgula ou conjunção
  if (/,\s*(e|ou|que)\s*$/.test(trimmed) || trimmed.endsWith(",")) {
    warnings.push(`Chunk termina com vírgula/conjunção: ${anchor_id}`);
  }

  // Deve conter dispositivo completo (caput ou § inteiro)
  if (conteudo.length < 30) {
    warnings.push(`Chunk muito curto (${conteudo.length} chars): ${anchor_id}`);
  }

  // Artigos > 1500 chars devem ser divididos apenas em fronteira de inciso/alínea
  if (conteudo.length > 1500) {
    warnings.push(`Chunk muito longo (${conteudo.length} chars) — considere dividir em inciso/alínea: ${anchor_id}`);
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Geração de chunks
// ---------------------------------------------------------------------------

/**
 * Gera chunks a partir dos dispositivos da EC 132/2023.
 * Controla chunkIndex por grupo (lei + artigo_base).
 */
function buildEc132Chunks(dispositivos) {
  const chunks = [];
  // chunkIndex por (artigo_base) — começa em 1, sequencial sem lacunas
  const chunkIndexMap = new Map();

  for (const d of dispositivos) {
    const grupo = resolveGrupo(d.artigo);
    const artigoSegment = buildArtigoSegment(d.artigo, d.tipo, d.numero);

    // chunkIndex por artigo_base (não por artigo+tipo para manter sequência)
    const artigoBase = normalizeAnchorSegment(d.artigo);
    const currentIdx = (chunkIndexMap.get(artigoBase) ?? 0) + 1;
    chunkIndexMap.set(artigoBase, currentIdx);

    const anchor_id = buildAnchorId("ec132", artigoSegment, currentIdx);

    // Validação de fronteiras semânticas
    const warnings = validateSemanticBoundary(d.conteudo ?? "", anchor_id);
    for (const w of warnings) {
      console.warn(`[CORPUS-WARN] ${w}`);
    }

    // Validação de conteúdo jurídico
    const conteudo = d.conteudo ?? "";
    const hasJuridicalIndicator = /art\.|§|inciso|ncm|anexo/i.test(conteudo);
    if (!hasJuridicalIndicator) {
      console.warn(`[CORPUS-WARN] Chunk sem indicador jurídico: ${anchor_id}`);
    }

    // Tópicos: base do grupo + específicos do dispositivo
    const topicosBase = grupo?.topicos_base ?? ["EC 132/2023", "reforma tributaria"];
    const topicosArr = [
      ...topicosBase,
      ...(d.topicos ?? []),
    ].filter((v, idx, arr) => arr.indexOf(v) === idx).slice(0, 10);

    // Validação de qualidade de tópicos
    if (topicosArr.length < 3) {
      console.warn(`[CORPUS-WARN] Menos de 3 tópicos para ${anchor_id}: ${topicosArr.join(", ")}`);
    }

    // Pelo menos 1 tópico deve estar presente no conteúdo
    const hasTopicInContent = topicosArr.some(t =>
      conteudo.toLowerCase().includes(t.toLowerCase())
    );
    if (!hasTopicInContent) {
      console.warn(`[CORPUS-WARN] Nenhum tópico encontrado no conteúdo de ${anchor_id}`);
    }

    chunks.push({
      anchor_id,
      lei: "ec132",
      artigo: `${d.artigo}${d.tipo !== "caput" ? `, ${d.tipo} ${d.numero ?? ""}` : ""}`.slice(0, 299),
      titulo: `EC 132/2023 — ${d.artigo}${d.tipo !== "caput" ? ` ${d.tipo} ${d.numero ?? ""}` : ""}`,
      conteudo,
      topicos: topicosArr.join(", "),
      cnaeGroups: d.cnaeGroups ?? "COM,IND,SER",
      chunkIndex: currentIdx,
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
  console.log("║   INGESTÃO — EC 132/2023 — Sprint D / G3                    ║");
  console.log(`║   Modo: ${DRY_RUN ? "DRY-RUN (sem inserção no banco)         " : "PRODUÇÃO (inserindo no banco)            "}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // ── Verificar arquivo fonte ──────────────────────────────────────────────
  if (!existsSync(DATA_FILE)) {
    console.error(`❌ BLOQUEIO: Arquivo fonte não encontrado: ${DATA_FILE}`);
    console.error("   Forneça o arquivo scripts/data/ec132-2023.json antes de executar.");
    console.error("   Formato esperado: [{artigo, tipo, numero, conteudo, topicos, cnaeGroups?}]");
    process.exit(1);
  }

  const dispositivos = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  console.log(`✅ Arquivo fonte carregado: ${DATA_FILE} (${dispositivos.length} dispositivos)`);

  // ── Conectar ao banco ────────────────────────────────────────────────────
  let connection;
  if (!DRY_RUN) {
    const conn = await connectDb();
    connection = conn.connection;
    console.log("✅ Conexão com banco estabelecida\n");
  }

  // ── Gerar chunks ─────────────────────────────────────────────────────────
  const chunks = buildEc132Chunks(dispositivos);
  console.log(`📦 ${chunks.length} chunks gerados\n`);

  // ── Verificar unicidade de anchor_id ────────────────────────────────────
  const anchorIds = chunks.map(c => c.anchor_id);
  const uniqueAnchorIds = new Set(anchorIds);
  if (uniqueAnchorIds.size !== anchorIds.length) {
    const duplicates = anchorIds.filter((id, i) => anchorIds.indexOf(id) !== i);
    console.error(`❌ COLISÃO DE anchor_id detectada: ${[...new Set(duplicates)].join(", ")}`);
    process.exit(1);
  }
  console.log(`✅ Unicidade de anchor_id verificada: ${uniqueAnchorIds.size} IDs únicos`);

  // ── Verificar cobertura dos grupos obrigatórios ──────────────────────────
  const coverageByGrupo = new Map();
  for (const g of GRUPOS_OBRIGATORIOS) {
    coverageByGrupo.set(g.label, 0);
  }
  for (const chunk of chunks) {
    for (const g of GRUPOS_OBRIGATORIOS) {
      if (g.pattern.test(chunk.artigo)) {
        coverageByGrupo.set(g.label, (coverageByGrupo.get(g.label) ?? 0) + 1);
      }
    }
  }
  console.log("\n📊 Cobertura por grupo obrigatório:");
  for (const [label, count] of coverageByGrupo) {
    const status = count > 0 ? "✅" : "❌";
    console.log(`   ${status} ${label}: ${count} chunks`);
    if (count === 0) {
      console.error(`❌ BLOQUEIO: Grupo obrigatório sem cobertura: ${label}`);
      process.exit(1);
    }
  }

  // ── Inserir chunks ───────────────────────────────────────────────────────
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

  // ── Detecção de sobreposição semântica ──────────────────────────────────
  const overlapCount = detectSemanticOverlap(chunks);
  if (overlapCount > 0) {
    console.warn(`\n⚠️  ${overlapCount} alertas de sobreposição semântica (>= 80%) — revisar manualmente`);
  }

  // ── Tabela de cobertura ──────────────────────────────────────────────────
  printCoverageSummary([{
    label: "EC 132/2023",
    expected: dispositivos.length,
    inserted,
    updated,
    skipped,
  }]);

  // ── Verificar cobertura mínima ───────────────────────────────────────────
  const actual = inserted + updated + skipped;
  const pct = dispositivos.length === 0 ? 100 : (actual / dispositivos.length) * 100;
  if (pct < 50) {
    console.error(`❌ BLOQUEIO: Cobertura < 50%: ${pct.toFixed(0)}% (${actual}/${dispositivos.length})`);
    process.exit(1);
  }
  if (pct < 80) {
    console.warn(`⚠️  Cobertura < 80%: ${pct.toFixed(0)}% (${actual}/${dispositivos.length})`);
  }

  if (!DRY_RUN && connection) {
    await connection.end();
  }

  console.log("\n✅ Ingestão EC 132/2023 — concluída");
}

main().catch(err => {
  console.error("❌ Erro fatal na ingestão:", err);
  process.exit(1);
});
