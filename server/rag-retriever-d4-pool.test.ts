import { describe, it, expect } from "vitest";
import { isParteGeralLc214 } from "./rag-retriever";

// D4-POOL (Issue D4-POOL) — exclusão da Parte Geral da LC 214 do pool de Q.NCM.
// Escopo restrito a lei==='lc214' (Opção 1 aprovada pelo P.O.). Cobre o edge case
// do NCM 0102.xx que a Opção 2 (blanket artigoMin) excluiria indevidamente.
describe("D4-POOL — isParteGeralLc214 (exclusão escopada à LC 214)", () => {
  it("exclui a Parte Geral da LC 214 (Art. < 128)", () => {
    expect(isParteGeralLc214("lc214", "Art. 4")).toBe(true);
    expect(isParteGeralLc214("lc214", "Art. 12")).toBe(true);
    expect(isParteGeralLc214("lc214", "Art. 127")).toBe(true);
  });

  it("mantém os regimes específicos da LC 214 (Art. >= 128)", () => {
    expect(isParteGeralLc214("lc214", "Art. 128")).toBe(false);
    expect(isParteGeralLc214("lc214", "Art. 139")).toBe(false);
    expect(isParteGeralLc214("lc214", "Art. 197")).toBe(false);
  });

  it("mantém Anexos da LC 214 (sem número de artigo extraível)", () => {
    expect(isParteGeralLc214("lc214", "Anexo V")).toBe(false);
    expect(isParteGeralLc214("lc214", null)).toBe(false);
  });

  it("NÃO filtra outras leis — numeração independente (escopo lc214)", () => {
    expect(isParteGeralLc214("decreto12955", "Art. 5")).toBe(false);
    expect(isParteGeralLc214("resolucao_cgibs_6", "Art. 1")).toBe(false);
    expect(isParteGeralLc214("decreto12955", "Art. 620 (parte 67)")).toBe(false);
  });

  it("NÃO exclui chunk de tabela_ncm com código < 0128 (bug latente da Opção 2)", () => {
    // NCM 0102.21.10 (bovinos vivos): regex extrai "0102" → 102 < 128.
    // Sob blanket artigoMin:128 seria excluído; escopo lc214 o preserva.
    expect(isParteGeralLc214("tabela_ncm_completa", "0102.21.10")).toBe(false);
    expect(isParteGeralLc214("tabela_ncm_completa", "8436.99.00")).toBe(false);
  });
});
