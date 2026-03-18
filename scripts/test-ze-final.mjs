/**
 * Teste final com a nova estratégia de merge em 2 camadas (garantidos + pool)
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
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
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

// Nova estratégia: merge em 2 camadas
async function buildContext(description, topNPerQuery = 20) {
  const clauses = splitIntoClauses(description);
  console.log("📌 Cláusulas identificadas:");
  clauses.forEach((c, i) => console.log(`   ${i === 0 ? "(completa)" : `(${i})`}: "${c}"`));

  const resultsPerClause = await Promise.all(clauses.map((c) => search(c, topNPerQuery)));

  const guaranteed = new Map();
  const pool = new Map();

  resultsPerClause.forEach((results, clauseIdx) => {
    const isFullQuery = clauseIdx === 0;
    results.forEach((c, rank) => {
      const existing = pool.get(c.code);
      if (!existing || c.sim > existing.sim) pool.set(c.code, c);
      if (!isFullQuery && rank < 5) {
        const existingG = guaranteed.get(c.code);
        if (!existingG || c.sim > existingG.sim) guaranteed.set(c.code, c);
      }
    });
  });

  const poolSorted = Array.from(pool.values()).sort((a, b) => b.sim - a.sim);
  const guaranteedSorted = Array.from(guaranteed.values()).sort((a, b) => b.sim - a.sim);

  const finalCodes = new Set();
  const finalList = [];

  for (const c of guaranteedSorted) {
    if (!finalCodes.has(c.code)) { finalCodes.add(c.code); finalList.push(c); }
  }
  for (const c of poolSorted) {
    if (finalList.length >= 50) break;
    if (!finalCodes.has(c.code)) { finalCodes.add(c.code); finalList.push(c); }
  }

  return { finalList, guaranteed: guaranteedSorted };
}

const DESCRICAO = "Comércio atacadista de cereais e leguminosas beneficiadas para alimentação animal; transporte rodoviária de cargas e comércio de insumos para agricultura especialmente calcário";

const ESPERADOS = [
  { prefix: "4632", label: "Comércio Atacadista De Cereais E Leguminosas" },
  { prefix: "4930", label: "Transporte Rodoviário De Carga" },
  { prefix: "4683", label: "Corretivos Do Solo / Insumos Agrícolas" },
];

console.log("=".repeat(70));
console.log("TESTE FINAL: Estratégia de Merge em 2 Camadas");
console.log("=".repeat(70));
console.log(`\nDescrição: "${DESCRICAO}"\n`);

const { finalList, guaranteed } = await buildContext(DESCRICAO, 20);

console.log(`\n\n📦 CNAEs GARANTIDOS (top-5 de cada cláusula individual): ${guaranteed.length}`);
guaranteed.forEach((r) => {
  const isExpected = ESPERADOS.some((e) => r.code.startsWith(e.prefix));
  const mark = isExpected ? "✅" : "  ";
  console.log(`${mark} ${r.code} — ${r.description} (${(r.sim * 100).toFixed(1)}%)`);
});

console.log(`\n🔍 Lista final enviada para a IA (${finalList.length} candidatos):`);
finalList.slice(0, 30).forEach((r, i) => {
  const isExpected = ESPERADOS.some((e) => r.code.startsWith(e.prefix));
  const mark = isExpected ? "✅" : "  ";
  console.log(`${mark} ${String(i + 1).padStart(2)}. ${r.code} — ${r.description} (${(r.sim * 100).toFixed(1)}%)`);
});
if (finalList.length > 30) console.log(`   ... e mais ${finalList.length - 30} candidatos`);

console.log("\n📊 Verificação dos CNAEs esperados:");
let allFound = true;
for (const esperado of ESPERADOS) {
  const pos = finalList.findIndex((r) => r.code.startsWith(esperado.prefix));
  if (pos >= 0) {
    const found = finalList[pos];
    const isGuaranteed = guaranteed.some((g) => g.code === found.code);
    console.log(`✅ ${esperado.label}: ${found.code} (posição ${pos + 1}${isGuaranteed ? " — GARANTIDO" : ""}, ${(found.sim * 100).toFixed(1)}%)`);
  } else {
    console.log(`❌ ${esperado.label}: NÃO ENCONTRADO`);
    allFound = false;
  }
}

await db.end();

console.log("\n" + "=".repeat(70));
console.log(allFound ? "✅ TODOS OS 3 CNAEs PRESENTES NO CONTEXTO DA IA!" : "⚠️  Algum CNAE não foi encontrado");
console.log("=".repeat(70));
