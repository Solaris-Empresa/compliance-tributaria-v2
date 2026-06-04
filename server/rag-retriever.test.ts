import { describe, it, expect } from "vitest";
import { belongsToUniversalPool } from "./rag-retriever";

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
