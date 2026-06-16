import { describe, it, expect } from "vitest";
import { belongsToUniversalPool, buildRerankPrompt } from "./rag-retriever";

// RAG-1-FIX (#1375) — contract test do filtro do pool universal.
//
// O fix troca o proxy SQL `LENGTH(cnaeGroups) < 50` por
// `(cnaeGroups IS NULL OR cnaeGroups = '')` em fetchSetorialCandidates.
// `belongsToUniversalPool` é a especificação JS canônica dessa MESMA
// condição (espelho determinístico). A prova de consumo em runtime é o
// DoD SQL executado pelo Manus pós-merge (Lição #87 — smoke estático ≠
// consumo; aqui o unit test é o espelho, o SQL DoD é a evidência runtime).
describe("RAG-1-FIX — belongsToUniversalPool (pool universal por vazio, não por LENGTH)", () => {
  it("SEED-RAG-1: NÃO inclui chunk setorial (cnaeGroups preenchido) no pool universal", () => {
    // chunk com cnaeGroups='64,65,66' (financeiro) é SETORIAL → fora do pool universal
    expect(belongsToUniversalPool("64,65,66")).toBe(false);
  });

  it("SEED-RAG-1: INCLUI chunk com cnaeGroups='' (string vazia) no pool universal", () => {
    expect(belongsToUniversalPool("")).toBe(true);
  });

  it("SEED-RAG-1: INCLUI chunk com cnaeGroups=null no pool universal", () => {
    expect(belongsToUniversalPool(null)).toBe(true);
    expect(belongsToUniversalPool(undefined)).toBe(true);
  });

  it("não classifica como universal um cnaeGroups curto mas preenchido (regressão do bug LENGTH<50)", () => {
    // "28" tem LENGTH=2 (<50) → o proxy antigo o trataria como universal.
    // É SETORIAL (fabricação de máquinas) → deve ficar FORA do pool universal.
    expect(belongsToUniversalPool("28")).toBe(false);
    // grupo único transporte — também setorial, LENGTH curto
    expect(belongsToUniversalPool("49")).toBe(false);
  });

  it("trata whitespace-only como vazio (universal)", () => {
    expect(belongsToUniversalPool("   ")).toBe(true);
  });

  it("não classifica como universal uma lista longa de grupos (universal aparente do proxy antigo)", () => {
    // Lista longa "01,02,...,96" tem LENGTH grande; o proxy LENGTH<50 já a
    // excluía. Aqui confirmamos que continua FORA do pool universal — só
    // cnaeGroups vazio entra.
    const longList = Array.from({ length: 30 }, (_, i) =>
      String(i + 1).padStart(2, "0"),
    ).join(",");
    expect(longList.length).toBeGreaterThan(50);
    expect(belongsToUniversalPool(longList)).toBe(false);
  });
});

// RERANKER-NCM-AWARE-01 (#1468 · ADR-0036 · Opção A) — espelho determinístico
// da injeção da instrução de aderência ao NCM no prompt do rerankWithLLM.
// O ranking real (top-3 exclui Art.140/176, inclui Art.197) é validado por
// integração/smoke (Lição #87 — unit espelha a instrução, não o ranking LLM).
describe("RERANKER-NCM-AWARE-01 — buildRerankPrompt injeta aderência ao NCM", () => {
  const candidates = [
    {
      lei: "lc214",
      artigo: "Art. 140",
      titulo: "comunicação institucional",
      conteudo: "serviços de comunicação institucional à administração pública",
    },
    {
      lei: "lc214",
      artigo: "Art. 197",
      titulo: "produtor rural",
      conteudo: "máquinas e implementos agrícolas",
    },
  ];

  it("COM NCM: prompt contém o NCM e a instrução de priorização/penalização", () => {
    const prompt = buildRerankPrompt(candidates, "Fabricante; NCM 8436.99.00", 3, ["8436"]);
    expect(prompt).toContain("ADERÊNCIA AO NCM");
    expect(prompt).toContain("8436");
    expect(prompt).toContain("Penalize artigos de setores não relacionados");
  });

  it("COM múltiplos NCMs: lista todos na instrução", () => {
    const prompt = buildRerankPrompt(candidates, "q", 3, ["8436", "8701"]);
    expect(prompt).toContain("8436, 8701");
  });

  it("SEM NCM: prompt NÃO contém a instrução (degradação graciosa — Lição #67)", () => {
    const prompt = buildRerankPrompt(candidates, "Empresa de serviços; sem NCM", 3, []);
    expect(prompt).not.toContain("ADERÊNCIA AO NCM");
  });

  it("SEM NCM: bloco CONTEXTO→CANDIDATOS byte-idêntico ao formato anterior", () => {
    const prompt = buildRerankPrompt(candidates, "CTX", 3, []);
    expect(prompt).toContain("CONTEXTO DA EMPRESA:\nCTX\n\nCANDIDATOS (2 artigos):");
  });

  it("inclui candidatos indexados e o topK", () => {
    const prompt = buildRerankPrompt(candidates, "q", 5, ["8436"]);
    expect(prompt).toContain("[0] LC214 Art. 140");
    expect(prompt).toContain("[1] LC214 Art. 197");
    expect(prompt).toContain("Selecione os 5 artigos");
  });
});
