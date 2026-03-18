/**
 * Script: generate-cnae-embeddings.mjs
 * Gera embeddings vetoriais para todos os 1.332 CNAEs usando OpenAI text-embedding-3-small
 * e os armazena na tabela cnaeEmbeddings do banco.
 *
 * Uso: node scripts/generate-cnae-embeddings.mjs
 *
 * Estratégia:
 * - Processa em batches de 100 CNAEs (limite da API OpenAI)
 * - Verifica CNAEs já processados para permitir re-execução segura
 * - Rate limiting: 500ms entre batches para evitar throttling
 */

import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";

// Carregar variáveis de ambiente do .env se existir
try {
  const envContent = readFileSync(
    new URL("../.env", import.meta.url),
    "utf-8"
  );
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {
  // .env pode não existir em produção — usar process.env diretamente
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY não definida");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não definida");
  process.exit(1);
}

// Extrair dados CNAE diretamente do arquivo TypeScript
function extractCnaeTable() {
  const content = readFileSync(
    new URL("../server/cnae-table.ts", import.meta.url),
    "utf-8"
  );
  const lines = content.split("\n");
  let inArray = false;
  let depth = 0;
  const result = [];

  for (const line of lines) {
    if (!inArray && line.includes("CNAE_TABLE: CnaeEntry[] = [")) {
      inArray = true;
      result.push("[");
      depth = 1;
      continue;
    }
    if (inArray) {
      for (const ch of line) {
        if (ch === "[" || ch === "{") depth++;
        if (ch === "]" || ch === "}") depth--;
      }
      if (depth === 0) break;
      result.push(line);
    }
  }

  return JSON.parse(result.join("\n") + "]");
}

const CNAE_TABLE = extractCnaeTable();
console.log(`✅ Carregados ${CNAE_TABLE.length} CNAEs da base IBGE`);

// Conectar ao banco
const db = await createConnection(DATABASE_URL);
console.log("✅ Conectado ao banco de dados");

// Verificar quais CNAEs já têm embedding
const [existing] = await db.execute("SELECT cnaeCode FROM cnaeEmbeddings");
const existingCodes = new Set(existing.map((r) => r.cnaeCode));
console.log(`ℹ️  ${existingCodes.size} CNAEs já possuem embeddings`);

const pending = CNAE_TABLE.filter((c) => !existingCodes.has(c.code));
console.log(`📋 ${pending.length} CNAEs para processar`);

if (pending.length === 0) {
  console.log("✅ Todos os CNAEs já têm embeddings. Nada a fazer.");
  await db.end();
  process.exit(0);
}

// Função para gerar embeddings via OpenAI
async function generateEmbeddings(texts) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
      encoding_format: "float",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.data.map((item) => item.embedding);
}

// Processar em batches de 100
const BATCH_SIZE = 100;
const DELAY_MS = 500;
let processed = 0;
let errors = 0;

for (let i = 0; i < pending.length; i += BATCH_SIZE) {
  const batch = pending.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

  console.log(`\n🔄 Batch ${batchNum}/${totalBatches} (${batch.length} CNAEs)...`);

  try {
    // Texto enriquecido para melhor semântica: código + descrição
    const texts = batch.map((c) => `CNAE ${c.code}: ${c.description}`);

    const embeddings = await generateEmbeddings(texts);

    // Inserir no banco
    for (let j = 0; j < batch.length; j++) {
      const cnae = batch[j];
      const embedding = embeddings[j];

      await db.execute(
        `INSERT INTO cnaeEmbeddings (cnaeCode, cnaeDescription, embeddingJson)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           embeddingJson = VALUES(embeddingJson),
           cnaeDescription = VALUES(cnaeDescription)`,
        [cnae.code, cnae.description, JSON.stringify(embedding)]
      );
    }

    processed += batch.length;
    console.log(`✅ Batch ${batchNum} concluído. Total: ${processed}/${pending.length}`);
  } catch (err) {
    console.error(`❌ Erro no batch ${batchNum}: ${err.message}`);
    errors += batch.length;
  }

  // Rate limiting entre batches
  if (i + BATCH_SIZE < pending.length) {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }
}

await db.end();

console.log(`\n🎉 Concluído!`);
console.log(`   ✅ Processados: ${processed}`);
console.log(`   ❌ Erros: ${errors}`);
console.log(`   📊 Total na base: ${existingCodes.size + processed}`);

if (errors > 0) {
  console.log(`\n⚠️  Execute o script novamente para reprocessar os CNAEs com erro.`);
  process.exit(1);
}
