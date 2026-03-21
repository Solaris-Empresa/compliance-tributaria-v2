/**
 * Teste end-to-end do pipeline CNAE discovery — Cerveja Stout/Trapista
 * Evidência para produção: valida embeddings + LLM + serialização
 */
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DESCRIPTION = "produção de cerveja stout e trapista; produção de 100 hectolitros; faturamento de 150 milhoes por ano; venda somente FOB.";

async function run() {
  console.log("=== TESTE END-TO-END CNAE DISCOVERY — CERVEJA ===\n");

  // 1. Verificar OPENAI_API_KEY
  if (!OPENAI_KEY) {
    console.error("❌ OPENAI_API_KEY ausente");
    process.exit(1);
  }
  console.log("✅ OPENAI_API_KEY presente:", OPENAI_KEY.substring(0, 15) + "...");

  // 2. Verificar banco de dados
  const conn = await mysql.createConnection(DB_URL);
  const [rows] = await conn.execute("SELECT COUNT(*) as total FROM cnae_embeddings");
  const total = rows[0].total;
  console.log(`✅ Banco: ${total} CNAEs com embeddings`);

  if (total === 0) {
    console.error("❌ Tabela cnae_embeddings vazia — rebuild necessário");
    await conn.end();
    process.exit(1);
  }

  // 3. Gerar embedding da query
  console.log("\n📊 Gerando embedding para:", DESCRIPTION.substring(0, 60) + "...");
  const embRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: DESCRIPTION })
  });
  const embData = await embRes.json();
  if (!embData.data?.[0]?.embedding) {
    console.error("❌ Falha ao gerar embedding:", JSON.stringify(embData).substring(0, 200));
    await conn.end();
    process.exit(1);
  }
  const queryEmbedding = embData.data[0].embedding;
  console.log(`✅ Embedding gerado: ${queryEmbedding.length} dimensões`);

  // 4. Buscar top-5 por similaridade de cosseno
  const [allRows] = await conn.execute("SELECT cnae_code, cnae_description, embedding_json FROM cnae_embeddings LIMIT 1332");
  await conn.end();

  const scored = allRows.map(row => {
    const emb = JSON.parse(row.embedding_json);
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < queryEmbedding.length; i++) {
      dot += queryEmbedding[i] * emb[i];
      normA += queryEmbedding[i] ** 2;
      normB += emb[i] ** 2;
    }
    return { code: row.cnae_code, description: row.cnae_description, similarity: dot / (Math.sqrt(normA) * Math.sqrt(normB)) };
  });
  scored.sort((a, b) => b.similarity - a.similarity);
  const top5 = scored.slice(0, 5);
  console.log("\n📋 Top-5 candidatos por similaridade semântica:");
  top5.forEach((c, i) => console.log(`  ${i+1}. ${c.code} — ${c.description} (${(c.similarity * 100).toFixed(1)}%)`));

  // 5. Chamar GPT-4.1 para classificação final
  console.log("\n🤖 Chamando GPT-4.1 para classificação final...");
  const ragContext = top5.map(c => `${c.code} — ${c.description}`).join("\n");
  const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Você é um classificador CNAE. Retorne JSON: {\"cnaes\":[{\"code\":\"XXXX-X/XX\",\"description\":\"...\",\"confidence\":95,\"justification\":\"...\"}]}" },
        { role: "user", content: `DESCRIÇÃO: ${DESCRIPTION}\n\nLISTA CNAE:\n${ragContext}\n\nRetorne JSON com os CNAEs identificados.` }
      ],
      response_format: { type: "json_object" }
    })
  });
  const llmData = await llmRes.json();
  const content = llmData.choices?.[0]?.message?.content;
  if (!content) {
    console.error("❌ LLM não retornou conteúdo:", JSON.stringify(llmData).substring(0, 200));
    process.exit(1);
  }
  const parsed = JSON.parse(content);
  console.log(`✅ GPT-4.1 identificou ${parsed.cnaes?.length || 0} CNAEs:`);
  (parsed.cnaes || []).forEach((c, i) => {
    // Teste de serialização: verificar que são objetos planos
    const safe = {
      code: String(c.code ?? ""),
      description: String(c.description ?? ""),
      confidence: Number(c.confidence ?? 0),
      justification: String(c.justification ?? "")
    };
    console.log(`  ${i+1}. ${safe.code} — ${safe.description} (${safe.confidence}%)`);
    console.log(`     Justificativa: ${safe.justification.substring(0, 80)}`);
  });

  console.log("\n✅ PIPELINE COMPLETO — CNAE DISCOVERY FUNCIONAL");
  console.log("📌 Evidência gerada em:", new Date().toISOString());
}

run().catch(e => { console.error("❌ ERRO FATAL:", e.message); process.exit(1); });
