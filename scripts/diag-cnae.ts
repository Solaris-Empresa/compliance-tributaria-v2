/**
 * Diagnóstico completo do pipeline CNAE Discovery
 * Simula exatamente o que o servidor faz em extractCnaes
 */
import { createConnection } from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

if (!DB_URL || !OPENAI_KEY) {
  console.error("Variáveis de ambiente ausentes:", { DB_URL: !!DB_URL, OPENAI_KEY: !!OPENAI_KEY });
  process.exit(1);
}

// Parse DATABASE_URL
const match = DB_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):?(\d+)?\/([^?]+)/);
if (!match) { console.error("DATABASE_URL inválida"); process.exit(1); }
const [, user, password, host, port, database] = match;
const dbName = database.split("?")[0];

console.log("=== DIAGNÓSTICO CNAE DISCOVERY ===\n");
console.log(`DB: ${host}:${port || 3306}/${dbName}`);

// 1. Conectar ao banco
const conn = await createConnection({
  host, user, password, database: dbName,
  port: parseInt(port || "3306"),
  ssl: { rejectUnauthorized: false },
});
console.log("✅ Banco conectado\n");

// 2. Verificar tabela cnaeEmbeddings
const [rows] = await conn.execute("SELECT COUNT(*) as total FROM cnaeEmbeddings") as any;
const total = rows[0].total;
console.log(`✅ cnaeEmbeddings: ${total} registros`);

// 3. Verificar amostra de embeddings
const [sample] = await conn.execute("SELECT cnaeCode, cnaeDescription, LENGTH(embeddingJson) as emb_len FROM cnaeEmbeddings LIMIT 3") as any;
console.log("Amostra:");
sample.forEach((r: any) => console.log(`  ${r.cnaeCode} | ${r.cnaeDescription.substring(0, 40)} | len=${r.emb_len}`));

// 4. Testar geração de embedding via OpenAI
console.log("\n--- Testando embedding da query ---");
const query = "produtora de cafe, venda fob, exportacao";
const embResp = await fetch("https://api.openai.com/v1/embeddings", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
  body: JSON.stringify({ model: "text-embedding-3-small", input: query, encoding_format: "float" }),
});
if (!embResp.ok) {
  const err = await embResp.text();
  console.error("❌ Embedding FALHOU:", embResp.status, err);
  process.exit(1);
}
const embData = await embResp.json() as any;
const queryEmbedding: number[] = embData.data[0].embedding;
console.log(`✅ Embedding gerado: ${queryEmbedding.length} dimensões`);

// 5. Carregar todos os embeddings do banco
console.log("\n--- Carregando embeddings do banco ---");
const [allRows] = await conn.execute("SELECT cnaeCode, cnaeDescription, embeddingJson FROM cnaeEmbeddings") as any;
console.log(`✅ ${allRows.length} embeddings carregados`);

// 6. Calcular similaridade de cosseno
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

console.log("\n--- Calculando similaridade ---");
const scored = allRows.map((row: any) => {
  const emb = JSON.parse(row.embeddingJson) as number[];
  return {
    code: row.cnaeCode,
    description: row.cnaeDescription,
    similarity: cosineSim(queryEmbedding, emb),
  };
});
scored.sort((a: any, b: any) => b.similarity - a.similarity);
const top10 = scored.slice(0, 10);
console.log("Top 10 CNAEs por similaridade:");
top10.forEach((c: any, i: number) =>
  console.log(`  ${i + 1}. [${c.similarity.toFixed(4)}] ${c.code} — ${c.description.substring(0, 50)}`)
);

// 7. Testar LLM com contexto RAG
console.log("\n--- Testando LLM gpt-4.1 com contexto RAG ---");
const ragContext = top10.map((c: any) => `${c.code} — ${c.description}`).join("\n");
const llmResp = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
  body: JSON.stringify({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: "Você é um Classificador Tributário Especialista em CNAE 2.3. Responda APENAS com JSON válido." },
      { role: "user", content: `DESCRIÇÃO: ${query}\n\nLISTA CNAE:\n${ragContext}\n\nResponda: {"cnaes": [{"code": "...", "description": "...", "confidence": 90, "justification": "..."}]}` },
    ],
    temperature: 0.1,
  }),
});
if (!llmResp.ok) {
  const err = await llmResp.text();
  console.error("❌ LLM FALHOU:", llmResp.status, err);
} else {
  const llmData = await llmResp.json() as any;
  const content = llmData.choices[0]?.message?.content;
  console.log("✅ LLM respondeu:", content);
}

await conn.end();
console.log("\n=== DIAGNÓSTICO CONCLUÍDO ===");
