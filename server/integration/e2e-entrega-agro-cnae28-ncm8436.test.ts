/**
 * e2e-entrega-agro-cnae28-ncm8436.test.ts — Issue #1494 (G3-T3)
 *
 * Pergunta do #1494: para CNAE 28 + NCM 8436 (fabricante de máquinas agrícolas),
 * o benefício agro CHEGA ao output — e é o Art. 197 CERTO?
 *
 *   ✅ CERTO: Art. 197 do **Decreto 12.955 / Resolução CGIBS 6** (regulamento agro,
 *             c/c Art. 110 LC 214) — ADR-0035 §9.2.
 *   ❌ ERRADO: Art. 197 da **LC 214** (cooperativas/serviços financeiros,
 *             cnaeGroups="64,65,66") — se aparecer p/ CNAE 28 é bug real.
 *
 * O "PASS" do relatório de testes (auditoria 18/06) foi reclassificado sobre
 * afirmação NÃO verificada (Lição #59/#87 — assemble ≠ consumption). Este teste
 * prova o CONSUMO em runtime, em 3 camadas:
 *
 *   Camada 1 (pura, CI-always): o filtro de relevância CNAE remove o LC214 Art.197
 *     (cooperativas) p/ CNAE 28 e mantém o agro universal — sem DB, determinístico.
 *   Camada 2 (dbDescribe): a injeção determinística busca SÓ o Art.197 regulamento
 *     (decreto12955/resolucao_cgibs_6), NUNCA lc214.
 *   Camada 3 (E2E completo, dbDescribe+openaiDescribe): generateProductQuestions
 *     produz pergunta ancorada no Art.197 regulamento e NENHUMA no LC214 Art.197.
 *
 * O gate puro shouldInjectArt197 já é coberto por art197-injection.test.ts — aqui
 * não duplicamos; cobrimos o que aquele teste NÃO cobre (filtro + injeção DB + E2E).
 *
 * CI-safety: REGRA-ORQ-CI-01 (dbDescribe/openaiDescribe pulam sem DATABASE_URL/
 * OPENAI_API_KEY). DoD negativo segue Lição #124 (muda só a variável do gate —
 * qual Art.197 — mantendo o número do artigo igual).
 */
import { describe, it, expect } from "vitest";
import {
  dbDescribe,
  SKIP_DB_TESTS,
  SKIP_OPENAI_TESTS,
} from "../test-helpers";
import {
  shouldInjectArt197,
  fetchArt197Chunks,
} from "../lib/art197-injection";
import { filterByCnaeRelevance } from "../rag-retriever";
import { generateProductQuestions } from "../lib/product-questions";

// Dados canônicos do caso (projeto 2700001 — fabricante de máquinas agrícolas).
const CNAE_28 = "2833-0/00"; // grupo 28 — fabricação de máquinas/equip. para agropecuária
const NCM_8436 = "8436.99.00"; // máquinas e aparelhos para trabalhos agrícolas
const CNAE_GROUP_28 = "28"; // grupo de 2 díg. usado pelo filtro de relevância

// Regulamento agro (CERTO) vs LC214 cooperativas (ERRADO) — mesmo "Art. 197".
const REGULAMENTO_LEIS = /DECRETO12955|RESOLUCAO_CGIBS_6/;
const LC214 = /LC\s*214/;
const ART_197 = /Art\.?\s*197\b/;

// E2E completo exige DB + OpenAI simultaneamente.
const e2eFullDescribe =
  !SKIP_DB_TESTS && !SKIP_OPENAI_TESTS ? describe : describe.skip;

// ─── Camada 1 — pura (CI-always): filtro de relevância CNAE ──────────────────
describe("#1494 C1 — filterByCnaeRelevance separa o Art.197 certo do errado (CNAE 28)", () => {
  // Os dois candidatos têm o MESMO artigo ("Art. 197"): a variável do gate é
  // qual Art.197 (cnaeGroups), não o número (Lição #124 — DoD negativo correto).
  const lc214Cooperativas = {
    lei: "lc214",
    artigo: "Art. 197",
    cnaeGroups: "64,65,66", // cooperativas/serviços financeiros
  };
  const agroUniversal = {
    lei: "decreto12955",
    artigo: "Art. 197",
    cnaeGroups: "", // regulamento agro — pool universal
  };

  it("NEGATIVO: remove o LC214 Art.197 (cooperativas) para CNAE 28", () => {
    const out = filterByCnaeRelevance([lc214Cooperativas], [CNAE_GROUP_28]);
    expect(out).toHaveLength(0);
  });

  it("POSITIVO: mantém o Art.197 regulamento agro (universal) para CNAE 28", () => {
    const out = filterByCnaeRelevance([agroUniversal], [CNAE_GROUP_28]);
    expect(out).toHaveLength(1);
    expect(out[0]!.lei).toBe("decreto12955");
  });

  it("misto: do pool {agro universal, LC214 cooperativas}, sobra só o agro p/ CNAE 28", () => {
    const out = filterByCnaeRelevance(
      [agroUniversal, lc214Cooperativas],
      [CNAE_GROUP_28],
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.cnaeGroups).toBe("");
  });

  it("sanidade do gate: CNAE 28 + NCM 8436 dispara a injeção (caso do #1494)", () => {
    expect(shouldInjectArt197([CNAE_28], [NCM_8436])).toBe(true);
  });
});

// ─── Camada 2 — dbDescribe: a injeção busca só o regulamento, nunca lc214 ─────
dbDescribe("#1494 C2 — fetchArt197Chunks injeta o Art.197 regulamento (não lc214)", () => {
  it("POSITIVO+NEGATIVO: chunks vêm de decreto12955/resolucao_cgibs_6, artigo Art.197; NENHUM de lc214", async () => {
    const chunks = await fetchArt197Chunks();

    // POSITIVO: a injeção encontrou o artigo agro no corpus.
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    for (const c of chunks) {
      expect(c.lei).toMatch(/^(decreto12955|resolucao_cgibs_6)$/);
      expect(c.artigo ?? "").toMatch(ART_197);
    }

    // NEGATIVO: nenhum chunk injetado é o LC214 Art.197 (cooperativas).
    // Guard estrutural — se alguém adicionar "lc214" a ART197_LEIS, falha aqui.
    expect(chunks.some((c) => c.lei === "lc214")).toBe(false);
  });
});

// ─── Camada 3 — E2E completo (dbDescribe + openaiDescribe): consumo runtime ───
e2eFullDescribe("#1494 C3 — E2E: o Art.197 agro chega às perguntas (e o LC214 não)", () => {
  it(
    "generateProductQuestions(CNAE 28 + NCM 8436) → pergunta ancorada no Art.197 regulamento; nenhuma no LC214 Art.197",
    async () => {
      const result = await generateProductQuestions(
        [NCM_8436],
        [CNAE_28],
        {}, // sem archetype → corpusGapSetorial=false → gera todos os chunks do pool
      );

      // Deve retornar a lista de perguntas (não nao_aplicavel). Falha diagnóstica.
      if (!Array.isArray(result)) {
        throw new Error(
          `Esperava TrackedQuestion[]; recebi ${JSON.stringify(result)} ` +
            `(motivo provável: DB/RAG sem o corpus do Art.197 ou injeção falhou).`,
        );
      }

      // POSITIVO (consumo): ao menos 1 pergunta ancorada no Art.197 regulamento.
      const agro = result.filter(
        (q) => REGULAMENTO_LEIS.test(q.lei_ref) && ART_197.test(q.lei_ref),
      );
      expect(agro.length).toBeGreaterThanOrEqual(1);

      // NEGATIVO: nenhuma pergunta ancorada no LC214 Art.197 (cooperativas) —
      // o filtro de relevância CNAE 28 deve tê-lo removido upstream.
      const cooperativasErrado = result.filter(
        (q) => LC214.test(q.lei_ref) && ART_197.test(q.lei_ref),
      );
      expect(cooperativasErrado).toHaveLength(0);
    },
    180_000, // operações LLM são lentas (testing.md)
  );
});
