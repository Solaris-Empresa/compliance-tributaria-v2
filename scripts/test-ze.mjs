/**
 * Teste com a descrição exata do advogado:
 * "Comércio atacadista de cereais e leguminosas beneficiadas para alimentação animal;
 *  transporte rodoviária de cargas e comércio de insumos para agricultura especialmente calcário"
 */

import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";

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

const db = await createConnection(DATABASE_URL);
const [rows] = await db.execute("SELECT cnaeCode, cnaeDescription, embeddingJson FROM cnaeEmbeddings");
const cache = rows.map((r) => ({
  code: r.cnaeCode,
  description: r.cnaeDescription,
  embedding: JSON.parse(r.embeddingJson),
}));
console.log(`✅ Cache carregado: ${cache.length} CNAEs\n`);

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text, encoding_format: "float" }),
  });
  const data = await res.json();
  return data.data[0].embedding;
}

async function search(query, topN = 20) {
  const qEmb = await embed(query);
  const scored = cache.map((c) => ({ ...c, sim: cosineSim(qEmb, c.embedding) }));
  scored.sort((a, b) => b.sim - a.sim);
  return scored.slice(0, topN);
}

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

async function searchMulti(description, topNPerQuery = 20) {
  const clauses = splitIntoClauses(description);
  console.log("📌 Cláusulas identificadas:");
  clauses.forEach((c, i) => console.log(`   ${i === 0 ? "(completa)" : `(${i})`}: "${c}"`));
  console.log();

  const resultsPerClause = await Promise.all(clauses.map((c) => search(c, topNPerQuery)));

  // Mostrar resultado por cláusula
  clauses.forEach((clause, i) => {
    if (i === 0) return; // pular a completa
    console.log(`\n   🔎 Cláusula ${i}: "${clause}"`);
    resultsPerClause[i].slice(0, 5).forEach((r) => {
      const mark = ["4632", "4930", "4683"].some((p) => r.code.startsWith(p)) ? "✅" : "  ";
      console.log(`      ${mark} ${r.code} — ${r.description.substring(0, 60)} (${(r.sim * 100).toFixed(1)}%)`);
    });
  });

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

const DESCRICAO = "Comércio atacadista de cereais e leguminosas beneficiadas para alimentação animal; transporte rodoviária de cargas e comércio de insumos para agricultura especialmente calcário";

const ESPERADOS = [
  { prefix: "4632", label: "Comércio Atacadista De Cereais E Leguminosas" },
  { prefix: "4930", label: "Transporte Rodoviário De Carga" },
  { prefix: "4683", label: "Corretivos Do Solo / Insumos Agrícolas" },
];

console.log("=".repeat(70));
console.log("TESTE: Descrição do Advogado — topN=20 por cláusula");
console.log("=".repeat(70));
console.log(`\nDescrição: "${DESCRICAO}"\n`);

const results = await searchMulti(DESCRICAO, 20);

console.log("\n\n🔍 Top 25 candidatos MESCLADOS (multi-query):");
results.slice(0, 25).forEach((r, i) => {
  const isExpected = ESPERADOS.some((e) => r.code.startsWith(e.prefix));
  const mark = isExpected ? "✅" : "  ";
  console.log(`${mark} ${String(i + 1).padStart(2)}. ${r.code} — ${r.description} (${(r.sim * 100).toFixed(1)}%)`);
});

console.log("\n📊 Verificação dos CNAEs esperados:");
let allFound = true;
for (const esperado of ESPERADOS) {
  const pos = results.findIndex((r) => r.code.startsWith(esperado.prefix));
  if (pos >= 0) {
    const found = results[pos];
    console.log(`✅ ${esperado.label}: ${found.code} (posição ${pos + 1}, ${(found.sim * 100).toFixed(1)}%)`);
  } else {
    console.log(`❌ ${esperado.label}: NÃO ENCONTRADO`);
    allFound = false;
  }
}

await db.end();

console.log("\n" + "=".repeat(70));
console.log(allFound ? "✅ TODOS OS 3 CNAEs PRESENTES NO CONTEXTO DA IA!" : "⚠️  Algum CNAE não foi encontrado — ajustar topN");
console.log("=".repeat(70));
