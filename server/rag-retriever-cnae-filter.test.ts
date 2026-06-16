/**
 * rag-retriever-cnae-filter.test.ts — #1276 BUG-RERANKER
 *
 * Cobre filterByCnaeRelevance (filtro de relevância CNAE pós-merge). Determinístico, sem DB.
 * Inclui o DoD negativo (Lição #124) e a armadilha do fallback `length < 50` de matchesCnaeBoundary
 * (que tornaria o filtro no-op se fosse usado — por isso o filtro usa membership estrito).
 */
import { describe, it, expect } from "vitest";
import { filterByCnaeRelevance } from "./rag-retriever";

type Art = { artigo: string; cnaeGroups?: string | null };

const art139: Art = { artigo: "Art. 139", cnaeGroups: "41,42,43,68" }; // cultural — 11 chars (< 50)
const art128: Art = { artigo: "Art. 128", cnaeGroups: "86,87,88,45,46,47" }; // saúde/comércio
const art197: Art = { artigo: "Art. 197", cnaeGroups: "28" }; // máquinas agrícolas (grupo 28)
const universal: Art = { artigo: "Art. 110", cnaeGroups: "" }; // universal
const universalNull: Art = { artigo: "Art. 1", cnaeGroups: null };

const POOL = [art139, art128, art197, universal, universalNull];

describe("filterByCnaeRelevance (#1276)", () => {
  it("CNAE 28 (máquinas): exclui Art.139 (cultural) e Art.128 (saúde); mantém Art.197 + universais", () => {
    const out = filterByCnaeRelevance(POOL, ["28"]);
    const arts = out.map((a) => a.artigo);
    expect(arts).toContain("Art. 197");
    expect(arts).toContain("Art. 110");
    expect(arts).toContain("Art. 1");
    expect(arts).not.toContain("Art. 139");
    expect(arts).not.toContain("Art. 128");
  });

  it("armadilha do fallback <50: Art.139 ('41,42,43,68' = 11 chars) é EXCLUÍDO para CNAE 28 (membership estrito, não LENGTH)", () => {
    const out = filterByCnaeRelevance([art139], ["28"]);
    expect(out).toHaveLength(0); // se usasse matchesCnaeBoundary (<50 → true), teria length 1
  });

  it("DoD negativo (Lição #124): mudar SÓ o CNAE do projeto para 41 (cultural) → Art.139 PASSA (não over-filtra)", () => {
    const out = filterByCnaeRelevance(POOL, ["41"]);
    const arts = out.map((a) => a.artigo);
    expect(arts).toContain("Art. 139"); // grupo 41 ∈ "41,42,43,68"
    expect(arts).not.toContain("Art. 197"); // 41 ∉ "28"
  });

  it("guard: sem CNAE do projeto → não filtra (preserva tudo)", () => {
    expect(filterByCnaeRelevance(POOL, [])).toHaveLength(POOL.length);
  });

  it("universais (vazio/null) sempre passam, independente do CNAE", () => {
    const out = filterByCnaeRelevance([universal, universalNull], ["99"]);
    expect(out).toHaveLength(2);
  });
});
