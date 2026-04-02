/**
 * rag-ingest-lote-d.mjs — Sprint S Lote D
 *
 * Processa os PDFs das 5 leis ausentes e insere no banco ragDocuments.
 * Leis: lc116, lc87, cg_ibs, rfb_cbs, conv_icms
 *
 * Uso: node server/rag-ingest-lote-d.mjs [--dry-run]
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execSync } from "child_process";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DRY_RUN = process.argv.includes("--dry-run");

// ─── Mapeamento de arquivos para leis ────────────────────────────────────────
const PDF_MAP = [
  {
    lei: "lc87",
    file: "/home/ubuntu/upload/DOC-Legislaçãocitada-20070523.pdf",
    titulo_base: "Lei Complementar nº 87/1996 — Lei Kandir (ICMS)",
    descricao: "ICMS — Operações relativas à circulação de mercadorias e prestações de serviços de transporte e comunicação",
  },
  {
    lei: "lc116",
    file: "/home/ubuntu/upload/DOC-Legislaçãocitada-20121030.pdf",
    titulo_base: "Lei Complementar nº 116/2003 — ISS",
    descricao: "ISS — Imposto Sobre Serviços de Qualquer Natureza",
  },
  {
    lei: "rfb_cbs",
    file: "/home/ubuntu/upload/ATO-CONJUNTO-RFB_CGIBS-No-1-DE-22-DE-DEZEMBRO-DE-2025-ATO-CONJUNTO-RFB_CGIBS-No-1-DE-22-DE-DEZEMBRO-DE-2025-DOU-Imprensa-Nacional.pdf",
    titulo_base: "Ato Conjunto RFB/CGIBS nº 1/2025 — CBS",
    descricao: "Obrigações acessórias exigíveis para apuração do IBS e CBS em 2026",
  },
  {
    lei: "conv_icms",
    file: "/home/ubuntu/upload/CONVÊNIOICMS142_18—ConselhoNacionaldePolíticaFazendáriaCONFAZ.pdf",
    titulo_base: "Convênio ICMS 142/2018 — CONFAZ",
    descricao: "Substituição tributária ICMS — Regime geral e procedimentos",
  },
  {
    lei: "cg_ibs",
    file: "/home/ubuntu/upload/27102250-resoluc-a-o-csibs-n-1-de-23-de-fevereiro-de-2026-assinatura.pdf",
    titulo_base: "Resolução CSIBS nº 1/2026 — Comitê Gestor IBS",
    descricao: "Estrutura e governança do Comitê Gestor do IBS",
  },
];

// ─── Utilitários de chunking ──────────────────────────────────────────────────

/**
 * Extrai texto de um PDF usando pdftotext
 */
function extractPdfText(filePath) {
  try {
    const text = execSync(`pdftotext "${filePath}" -`, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
    return text;
  } catch (e) {
    console.error(`Erro ao extrair PDF ${filePath}:`, e.message);
    return "";
  }
}

/**
 * Normaliza texto: remove múltiplos espaços/newlines excessivos
 */
function normalizeText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Detecta artigos no texto legal e divide em chunks por artigo.
 * Padrão: "Art. N" ou "Artigo N" ou "CAPÍTULO" ou "SEÇÃO"
 */
function splitIntoChunks(text, lei, tituloBase) {
  const chunks = [];

  // Padrões de divisão: artigos, capítulos, seções, cláusulas
  const SPLIT_PATTERN = /(?=\n(?:Art\.?\s+\d+[°º]?|Artigo\s+\d+|CAPÍTULO\s+[IVXLC]+|Seção\s+[IVXLC]+|Cláusula\s+\w+|CLÁUSULA\s+\w+)[\s\S]{0,5})/i;

  const sections = text.split(SPLIT_PATTERN).filter(s => s.trim().length > 50);

  if (sections.length === 0) {
    // Fallback: dividir por parágrafos de ~800 chars
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 30);
    let buffer = "";
    let chunkIdx = 0;
    for (const para of paragraphs) {
      buffer += para + "\n\n";
      if (buffer.length >= 800) {
        chunks.push(makeChunk(lei, tituloBase, `Trecho ${chunkIdx + 1}`, buffer.trim(), chunkIdx));
        buffer = "";
        chunkIdx++;
      }
    }
    if (buffer.trim().length > 30) {
      chunks.push(makeChunk(lei, tituloBase, `Trecho ${chunkIdx + 1}`, buffer.trim(), chunkIdx));
    }
    return chunks;
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (section.length < 30) continue;

    // Extrair identificador do artigo/seção
    const artigoMatch = section.match(/^(Art\.?\s+\d+[°º]?[A-Z]?|Artigo\s+\d+|CAPÍTULO\s+[IVXLC]+|Seção\s+[IVXLC]+|Cláusula\s+\w+|CLÁUSULA\s+\w+)/i);
    const artigoId = artigoMatch ? artigoMatch[1].replace(/\s+/g, " ").trim() : `Trecho ${i + 1}`;

    // Extrair título/ementa do artigo (primeira linha após o identificador)
    const lines = section.split("\n").filter(l => l.trim());
    const tituloArtigo = lines.length > 1 ? lines[1].substring(0, 200).trim() : artigoId;

    // Dividir seções muito longas em sub-chunks de ~1200 chars
    if (section.length > 1500) {
      const subChunks = splitLongSection(section, 1200);
      for (let j = 0; j < subChunks.length; j++) {
        const subArtigoId = j === 0 ? artigoId : `${artigoId}-p${j + 1}`;
        chunks.push(makeChunk(lei, tituloBase, subArtigoId, subChunks[j], i * 10 + j));
      }
    } else {
      chunks.push(makeChunk(lei, tituloBase, artigoId, section, i));
    }
  }

  return chunks;
}

function splitLongSection(text, maxLen) {
  const parts = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end < text.length) {
      // Quebrar em parágrafo ou ponto
      const breakAt = text.lastIndexOf("\n", end);
      if (breakAt > start + maxLen / 2) end = breakAt;
    }
    parts.push(text.slice(start, end).trim());
    start = end;
  }
  return parts.filter(p => p.length > 30);
}

function makeChunk(lei, tituloBase, artigo, conteudo, chunkIndex) {
  // anchor_id determinístico: lei-artigo-chunkIndex (sanitizado)
  const anchorId = `${lei}-${artigo.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").toLowerCase()}-${chunkIndex}`;

  // Extrair tópicos: palavras-chave do conteúdo (primeiras 10 palavras únicas relevantes)
  const palavras = conteudo
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 15)
    .join(" ");

  return {
    lei,
    artigo: artigo.substring(0, 299),
    titulo: `${tituloBase} — ${artigo}`.substring(0, 499),
    conteudo: conteudo.substring(0, 65000),
    topicos: palavras.substring(0, 1000),
    cnaeGroups: "",
    chunkIndex,
    anchor_id: anchorId.substring(0, 254),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const db = DRY_RUN ? null : await createConnection(process.env.DATABASE_URL);
if (!DRY_RUN) console.log("Conectado ao banco.");

let totalInserted = 0;
const results = [];

for (const { lei, file, titulo_base, descricao } of PDF_MAP) {
  if (!existsSync(file)) {
    console.warn(`⚠️  Arquivo não encontrado: ${file} — pulando ${lei}`);
    results.push({ lei, status: "ARQUIVO_NAO_ENCONTRADO", chunks: 0 });
    continue;
  }

  console.log(`\n📄 Processando ${lei}: ${file}`);
  const rawText = extractPdfText(file);
  if (!rawText || rawText.trim().length < 100) {
    console.warn(`⚠️  Texto extraído muito curto para ${lei} — pulando`);
    results.push({ lei, status: "TEXTO_VAZIO", chunks: 0 });
    continue;
  }

  const text = normalizeText(rawText);
  const chunks = splitIntoChunks(text, lei, titulo_base);
  console.log(`  → ${chunks.length} chunks gerados`);

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Primeiro chunk:\n  ${JSON.stringify(chunks[0], null, 2).substring(0, 300)}`);
    results.push({ lei, status: "DRY_RUN", chunks: chunks.length });
    continue;
  }

  // Verificar chunks existentes para esta lei
  const [existing] = await db.execute("SELECT COUNT(*) as cnt FROM ragDocuments WHERE lei = ?", [lei]);
  if (existing[0].cnt > 0) {
    console.log(`  ℹ️  ${lei} já tem ${existing[0].cnt} chunks. Pulando (use --force para reinserir).`);
    results.push({ lei, status: "JA_EXISTENTE", chunks: existing[0].cnt });
    continue;
  }

  // Inserir chunks
  let inserted = 0;
  for (const chunk of chunks) {
    try {
      await db.execute(
        `INSERT INTO ragDocuments (anchor_id, lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          chunk.anchor_id,
          chunk.lei,
          chunk.artigo,
          chunk.titulo,
          chunk.conteudo,
          chunk.topicos,
          chunk.cnaeGroups,
          chunk.chunkIndex,
        ]
      );
      inserted++;
    } catch (e) {
      // Ignorar duplicatas (anchor_id UNIQUE)
      if (!e.message.includes("Duplicate")) {
        console.error(`  Erro ao inserir chunk ${chunk.anchor_id}:`, e.message);
      }
    }
  }

  console.log(`  ✅ ${inserted}/${chunks.length} chunks inseridos para ${lei}`);
  totalInserted += inserted;
  results.push({ lei, status: "OK", chunks: inserted });
}

// ─── Verificação final ────────────────────────────────────────────────────────
if (!DRY_RUN) {
  const [finalCount] = await db.execute("SELECT COUNT(*) as total FROM ragDocuments");
  const [byLei] = await db.execute("SELECT lei, COUNT(*) as chunks FROM ragDocuments GROUP BY lei ORDER BY chunks DESC");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("Q6 — Cobertura de dados reais:");
  console.log(`  Total após upload: ${finalCount[0].total} chunks`);
  console.log("  Por lei:");
  for (const row of byLei) {
    console.log(`    ${row.lei}: ${row.chunks} chunks`);
  }
  console.log("\n  Resumo por lote:");
  for (const r of results) {
    console.log(`    ${r.lei}: ${r.status} (${r.chunks} chunks)`);
  }
  console.log(`\n  Inseridos nesta execução: ${totalInserted}`);
  console.log("═══════════════════════════════════════════════════════");

  await db.end();
}

console.log("\nLote D concluído.");
