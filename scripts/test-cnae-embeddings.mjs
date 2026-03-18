/**
 * Script de teste: valida a busca semântica de CNAEs via embeddings (multi-query)
 * Uso: node scripts/test-cnae-embeddings.mjs
 */

import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";

// Carregar variáveis de ambiente
try {
  const envContent = readFileSync(new URL("../.env", import.meta.url), "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Carregar embeddings do banco
const db = await createConnection(DATABASE_URL);
const [rows] = await db.execute("SELECT cnaeCode, cnaeDescription, embeddingJson FROM cnaeEmbeddings");
const cache = rows.map((r) => ({
  code: r.cnaeCode,
  description: r.cnaeDescription,
  embedding: JSON.parse(r.embeddingJson),
}));
console.log(`✅ Cache carregado: ${cache.length} CNAEs`);

// Similaridade de cosseno
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Gerar embedding
async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text, encoding_format: "float" }),
  });
  const data = await res.json();
  return data.data[0].embedding;
}

// Buscar top-N para uma query
async function search(query, topN = 15) {
  const qEmb = await embed(query);
  const scored = cache.map((c) => ({ ...c, sim: cosineSim(qEmb, c.embedding) }));
  scored.sort((a, b) => b.sim - a.sim);
  return scored.slice(0, topN);
}

// Dividir em cláusulas (mesma lógica do servidor)
function splitIntoClauses(description) {
  if (!description || description.trim().length === 0) return [];
  const normalized = description
    .replace(/;/g, ",")
    .replace(/\b(além de|também|bem como|incluindo|e ainda)\b/gi, ",")
    .replace(/\s+e\s+/gi, ",");
  const parts = normalized.split(",").map((p) => p.trim()).filter((p) => p.length >= 5);
  if (parts.length <= 1) return [description.trim()];
  return [description.trim(), ...parts];
}

// Busca multi-query
async function searchMulti(description, topNPerQuery = 15) {
  const clauses = splitIntoClauses(description);
  const resultsPerClause = await Promise.all(clauses.map((c) => search(c, topNPerQuery)));

  const merged = new Map();
  for (const results of resultsPerClause) {
    for (const c of results) {
      const existing = merged.get(c.code);
      if (!existing || c.sim > existing.sim) {
        merged.set(c.code, c);
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.sim - a.sim);
}

// ─── Casos de teste ───────────────────────────────────────────────────────────
const testCases = [
  {
    query: "atacado de cereais, transporte rodoviário de cargas e venda de insumos agrícolas",
    expected: ["4632", "4912", "4683"],
    label: "Caso complexo: atacado + transporte + insumos",
  },
  {
    query: "pizzaria com delivery",
    expected: ["5611", "5612"],
    label: "Pizzaria com delivery",
  },
  {
    query: "fabricação de molduras de madeira",
    expected: ["1622", "1629"],
    label: "Molduras de madeira",
  },
  {
    query: "calcário para correção de solo",
    expected: ["4683", "0810"],
    label: "Calcário / corretivos do solo",
  },
  {
    query: "escritório de advocacia tributária",
    expected: ["6911"],
    label: "Advocacia tributária",
  },
  {
    query: "desenvolvimento de software e consultoria em TI",
    expected: ["6201", "6204"],
    label: "Software + consultoria TI",
  },
  {
    query: "restaurante e lanchonete com serviço de entrega",
    expected: ["5611", "5320"],
    label: "Restaurante + delivery",
  },
];

console.log("\n" + "=".repeat(70));
console.log("TESTE DE BUSCA SEMÂNTICA MULTI-QUERY DE CNAEs");
console.log("=".repeat(70));

let passed = 0;
let total = testCases.length;

for (const tc of testCases) {
  console.log(`\n📋 ${tc.label}`);
  console.log(`   Query: "${tc.query}"`);
  
  const clauses = splitIntoClauses(tc.query);
  console.log(`   Cláusulas: [${clauses.slice(1).map(c => `"${c}"`).join(", ")}]`);
  
  const results = await searchMulti(tc.query, 15);
  
  console.log(`   Top ${Math.min(12, results.length)} resultados (multi-query):`);
  results.slice(0, 12).forEach((r, i) => {
    const isExpected = tc.expected.some((e) => r.code.startsWith(e));
    const mark = isExpected ? "✅" : "  ";
    console.log(`   ${mark} ${i + 1}. ${r.code} — ${r.description} (${(r.sim * 100).toFixed(1)}%)`);
  });
  
  const found = tc.expected.filter((e) => results.slice(0, 20).some((r) => r.code.startsWith(e)));
  const hitRate = found.length / tc.expected.length;
  
  if (hitRate >= 0.5) {
    passed++;
    console.log(`   ✅ PASSOU: ${found.length}/${tc.expected.length} CNAEs esperados encontrados`);
  } else {
    console.log(`   ❌ FALHOU: apenas ${found.length}/${tc.expected.length} CNAEs esperados encontrados`);
  }
}

await db.end();

console.log("\n" + "=".repeat(70));
console.log(`RESULTADO: ${passed}/${total} testes passaram`);
const pct = Math.round((passed / total) * 100);
console.log(`PRECISÃO: ${pct}%`);
console.log("=".repeat(70));
