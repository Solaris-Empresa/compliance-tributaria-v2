import { describe, it, expect } from "vitest";
import { isSetorialArtigo } from "./rag-retriever";

// D2-DETECTOR (PR-B) — isSetorialArtigo agora reconhece setorialidade via artigo_pai
// (metadado), não só pelo número do próprio artigo. Caso canônico: Art. 620 (parte 67)
// do Decreto (Anexo V máquinas) vinculado ao Art. 197 da LC 214 pela migration 0117.
describe("D2-DETECTOR — isSetorialArtigo(artigo, artigoPai?)", () => {
  it("reconhece Anexo/Decreto como setorial VIA artigo_pai (197 ∈ [128,260])", () => {
    expect(isSetorialArtigo("Art. 620 (parte 67)", "Art. 197")).toBe(true);
    expect(isSetorialArtigo("Art. 620 (parte 64)", "Art. 197")).toBe(true);
  });

  it("SEM artigo_pai, Art. 620 NÃO é setorial (620 fora de [128,260]) — estado pré-fix", () => {
    expect(isSetorialArtigo("Art. 620 (parte 67)")).toBe(false);
    expect(isSetorialArtigo("Art. 620 (parte 67)", null)).toBe(false);
  });

  it("artigo_pai fora da faixa NÃO torna setorial", () => {
    expect(isSetorialArtigo("Art. 620 (parte 67)", "Art. 999")).toBe(false);
    expect(isSetorialArtigo("Art. 620 (parte 67)", "Art. 12")).toBe(false);
  });

  it("regressão: faixa numérica direta continua funcionando (sem artigo_pai)", () => {
    expect(isSetorialArtigo("Art. 128")).toBe(true);
    expect(isSetorialArtigo("Art. 139")).toBe(true);
    expect(isSetorialArtigo("Art. 197")).toBe(true);
    expect(isSetorialArtigo("Art. 260")).toBe(true);
  });

  it("regressão: Parte Geral e fora-de-faixa continuam NÃO-setoriais", () => {
    expect(isSetorialArtigo("Art. 4")).toBe(false);
    expect(isSetorialArtigo("Art. 12")).toBe(false);
    expect(isSetorialArtigo("Art. 127")).toBe(false);
    expect(isSetorialArtigo("Art. 261")).toBe(false);
  });

  it("regressão: Anexo% continua setorial (com e sem artigo_pai)", () => {
    expect(isSetorialArtigo("Anexo IX")).toBe(true);
    expect(isSetorialArtigo("Anexo V", "Art. 197")).toBe(true);
  });
});
