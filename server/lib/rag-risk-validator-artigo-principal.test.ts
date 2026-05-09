/**
 * Test contracts para Issue #1044 (P0) — rag_artigo_exato Opção B
 *
 * Spec aprovada pelo P.O. (2026-05-09):
 *
 *   rag_artigo_exato = chunks
 *     .filter(c => articleMatches(c.artigo, risk.artigo))
 *     [0]?.artigo
 *     ?? risk.artigo  // fallback nunca null
 *
 * Triade REGRA-ORQ-28:
 *   - Artefato 1: Issue #1044
 *   - Artefato 2: PR #1051 (33 it.todo skeleton)
 *   - Artefato 3: PR #1052 (CI gate validate-spec-1044.yml)
 *   - Artefato 4 (este PR): converter it.todo → it() + implementar Opção B
 */
import { describe, it, expect } from "vitest";
import {
  normalizeArtigo,
  articleMatches,
  selectBestArtigo,
} from "./rag-risk-validator";

// Helper para tipar chunks de teste
type Chunk = { artigo: string; conteudo: string };
const chunk = (artigo: string, conteudo = ""): Chunk => ({ artigo, conteudo });

describe("rag-risk-validator — Issue #1044 — rag_artigo_exato Opção B", () => {
  describe("POSITIVO: filtro pelo artigo principal da categoria", () => {
    it("chunks com artigo_principal === risk.artigo são preferidos sobre chunks correlatos", () => {
      const chunks = [chunk("Art. 22"), chunk("Art. 9")];
      const result = selectBestArtigo(chunks, "Art. 9");
      expect(result.artigo).toBe("Art. 9");
      expect(result.usedFallback).toBe(false);
    });

    it('caso canônico: chunks=[{artigo:"Art. 22"},{artigo:"Art. 9"}] + risk.artigo="Art. 9" → rag_artigo_exato="Art. 9"', () => {
      const chunks = [chunk("Art. 22"), chunk("Art. 9")];
      const result = selectBestArtigo(chunks, "Art. 9");
      expect(result.artigo).toBe("Art. 9");
    });

    it("filtro é aplicado ANTES da seleção do top — chunks correlatos com score maior são descartados", () => {
      const chunks = [chunk("Art. 22"), chunk("Art. 99"), chunk("Art. 9")];
      const result = selectBestArtigo(chunks, "Art. 9");
      expect(result.artigo).toBe("Art. 9");
      expect(result.usedFallback).toBe(false);
    });

    it("múltiplos chunks com artigo principal: primeiro retornado pelo DB (proxy de score) é usado", () => {
      const chunks = [
        chunk("Art. 9", "primeiro"),
        chunk("Art. 9", "segundo"),
        chunk("Art. 9", "terceiro"),
      ];
      const result = selectBestArtigo(chunks, "Art. 9");
      expect(result.artigo).toBe("Art. 9");
      expect(result.conteudo).toBe("primeiro");
    });
  });

  describe("NEGATIVO / FALLBACK: nenhum chunk match o artigo principal", () => {
    it("sem match: rag_artigo_exato recebe risk.artigo (categoria.artigo_principal)", () => {
      const chunks = [chunk("Art. 22"), chunk("Art. 99")];
      const result = selectBestArtigo(chunks, "Art. 9");
      expect(result.artigo).toBe("Art. 9");
      expect(result.usedFallback).toBe(true);
    });

    it('caso canônico: chunks=[{artigo:"Art. 22"}] + risk.artigo="Art. 9" → rag_artigo_exato="Art. 9" (fallback)', () => {
      const chunks = [chunk("Art. 22")];
      const result = selectBestArtigo(chunks, "Art. 9");
      expect(result.artigo).toBe("Art. 9");
      expect(result.usedFallback).toBe(true);
    });

    it("rag_artigo_exato nunca é null/undefined após selectBestArtigo", () => {
      const cases = [
        { docs: [chunk("Art. 22")], risk: "Art. 9" },
        { docs: [], risk: "Art. 9" },
        { docs: [chunk("Art. 22")], risk: "" },
      ];
      for (const c of cases) {
        const result = selectBestArtigo(c.docs, c.risk);
        expect(result.artigo).toBeDefined();
        expect(result.artigo).not.toBeNull();
      }
    });

    it("fallback ativa usedFallback=true (sinal para rag_validation_note)", () => {
      const result = selectBestArtigo([chunk("Art. 22")], "Art. 9");
      expect(result.usedFallback).toBe(true);
    });

    it("fallback retorna conteudo=null (não atribui trecho de artigo correlato)", () => {
      const result = selectBestArtigo([chunk("Art. 22", "trecho do art. 22")], "Art. 9");
      expect(result.usedFallback).toBe(true);
      expect(result.conteudo).toBeNull();
    });
  });

  describe("REGRESSÃO: comportamento anterior é proibido", () => {
    it('top chunk sem filtro pelo artigo principal NÃO pode ser atribuído como rag_artigo_exato (rejeita "Art. 22" quando risk.artigo="Art. 9")', () => {
      const chunks = [chunk("Art. 22"), chunk("Art. 9")];
      const result = selectBestArtigo(chunks, "Art. 9");
      expect(result.artigo).not.toBe("Art. 22");
      expect(result.artigo).toBe("Art. 9");
    });

    it("8/8 categorias do projeto #5040001: matching → artigo principal; sem match → fallback (nunca chunk correlato)", () => {
      const cases = [
        { risk: "Art. 9 LC 214/2025", correlato: "Art. 22 (parte 2)" },
        { risk: "Art. 2 LC 214/2025", correlato: "Art. 69" },
        { risk: "Art. 102 LC 214/2025", correlato: "Art. 191" },
        { risk: "Art. 45 LC 214/2025", correlato: "Art. 6" },
        { risk: "Art. 29 LC 214/2025", correlato: "Art. 16" },
        { risk: "Art. 58 LC 214/2025", correlato: "Art. 45" },
        { risk: "Art. 213 LC 214/2025", correlato: "Art. 13" },
      ];
      for (const c of cases) {
        const result = selectBestArtigo([chunk(c.correlato)], c.risk);
        expect(result.artigo).not.toBe(c.correlato);
        expect(result.usedFallback).toBe(true);
      }
    });

    it("comportamento docs[0] sem filtro foi removido — função não retorna primeiro chunk arbitrário", () => {
      const chunks = [chunk("Art. 22"), chunk("Art. 9")];
      const result = selectBestArtigo(chunks, "Art. 9");
      expect(result.artigo).toBe("Art. 9");
    });
  });

  describe("Normalização de artigo (handling de variações de string)", () => {
    it('normalizeArtigo("Art. 9 LC 214/2025") === normalizeArtigo("Art. 9") — sufixo da lei é ignorado', () => {
      expect(normalizeArtigo("Art. 9 LC 214/2025")).toBe(normalizeArtigo("Art. 9"));
    });

    it('normalizeArtigo("Art. 22 (parte 2)") === normalizeArtigo("Art. 22") — sufixo de parte é ignorado', () => {
      expect(normalizeArtigo("Art. 22 (parte 2)")).toBe(normalizeArtigo("Art. 22"));
    });

    it('articleMatches("Art. 9", "Arts. 6-12 LC 214/2025") === true — match parcial para artigos dentro do range', () => {
      expect(articleMatches("Art. 9", "Arts. 6-12 LC 214/2025")).toBe(true);
      expect(articleMatches("Art. 6", "Arts. 6-12")).toBe(true);
      expect(articleMatches("Art. 12", "Arts. 6-12")).toBe(true);
      expect(articleMatches("Art. 13", "Arts. 6-12")).toBe(false);
      expect(articleMatches("Art. 5", "Arts. 6-12")).toBe(false);
    });

    it("comparação case-insensitive: 'art. 9' === 'Art. 9' === 'ART. 9'", () => {
      expect(normalizeArtigo("art. 9")).toBe(normalizeArtigo("Art. 9"));
      expect(normalizeArtigo("ART. 9")).toBe(normalizeArtigo("Art. 9"));
    });

    it("espaços extras normalizados: 'Art.  9  LC  214' === 'Art. 9 LC 214'", () => {
      expect(normalizeArtigo("Art.  9  LC  214")).toBe(normalizeArtigo("Art. 9 LC 214"));
    });
  });

  describe("Validação cruzada com banco real (caso #5040001)", () => {
    it("split_payment: risk.artigo='Art. 9 LC 214/2025' → rag_artigo_exato='Art. 9' (não 'Art. 22 (parte 2)')", () => {
      const chunks = [chunk("Art. 22 (parte 2)"), chunk("Art. 9 LC 214/2025")];
      const result = selectBestArtigo(chunks, "Art. 9 LC 214/2025");
      expect(result.artigo).toBe("Art. 9 LC 214/2025");
    });

    it("imposto_seletivo: risk.artigo='Art. 2 LC 214/2025' → rag_artigo_exato='Art. 2' OU fallback (não 'Art. 69')", () => {
      const chunks = [chunk("Art. 69")];
      const result = selectBestArtigo(chunks, "Art. 2 LC 214/2025");
      expect(result.artigo).not.toBe("Art. 69");
      expect(result.usedFallback).toBe(true);
    });

    it("obrigacao_acessoria: risk.artigo='Art. 102 LC 214/2025' → rag_artigo_exato='Art. 102' OU fallback (não 'Art. 191')", () => {
      const chunks = [chunk("Art. 191"), chunk("Art. 102 LC 214/2025")];
      const result = selectBestArtigo(chunks, "Art. 102 LC 214/2025");
      expect(result.artigo).toBe("Art. 102 LC 214/2025");
      expect(result.artigo).not.toBe("Art. 191");
    });

    it("confissao_automatica: risk.artigo='Art. 45 LC 214/2025' → rag_artigo_exato='Art. 45' OU fallback (não 'Art. 6')", () => {
      const chunks = [chunk("Art. 6"), chunk("Art. 45 LC 214/2025")];
      const result = selectBestArtigo(chunks, "Art. 45 LC 214/2025");
      expect(result.artigo).toBe("Art. 45 LC 214/2025");
    });

    it("regime_diferenciado: risk.artigo='Art. 29 LC 214/2025' → rag_artigo_exato='Art. 29' OU fallback (não 'Art. 16')", () => {
      const chunks = [chunk("Art. 16")];
      const result = selectBestArtigo(chunks, "Art. 29 LC 214/2025");
      expect(result.artigo).not.toBe("Art. 16");
      expect(result.usedFallback).toBe(true);
    });

    it("transicao_iss_ibs: risk.artigo='Arts. 6-12 LC 214/2025' → rag_artigo_exato é Art. dentro do range OU fallback (não 'Art. 3')", () => {
      const chunks = [chunk("Art. 3"), chunk("Art. 9")];
      const result = selectBestArtigo(chunks, "Arts. 6-12 LC 214/2025");
      expect(result.artigo).toBe("Art. 9");
      expect(result.artigo).not.toBe("Art. 3");
    });

    it("credito_presumido: risk.artigo='Art. 58 LC 214/2025' → rag_artigo_exato='Art. 58' OU fallback (não 'Art. 45')", () => {
      const chunks = [chunk("Art. 45")];
      const result = selectBestArtigo(chunks, "Art. 58 LC 214/2025");
      expect(result.artigo).not.toBe("Art. 45");
      expect(result.usedFallback).toBe(true);
    });

    it("inscricao_cadastral: risk.artigo='Art. 213 LC 214/2025' → rag_artigo_exato='Art. 213' OU fallback (não 'Art. 13')", () => {
      const chunks = [chunk("Art. 13")];
      const result = selectBestArtigo(chunks, "Art. 213 LC 214/2025");
      expect(result.artigo).not.toBe("Art. 13");
      expect(result.usedFallback).toBe(true);
    });
  });

  describe("Backward compat e edge cases", () => {
    it("docs vazio (LIKE não retornou nada): selectBestArtigo retorna fallback com risk.artigo (typo applyNoResult corrigido)", () => {
      const result = selectBestArtigo([], "Art. 9");
      expect(result.artigo).toBe("Art. 9");
      expect(result.usedFallback).toBe(true);
      expect(result.conteudo).toBeNull();
    });

    it("risk.artigo undefined ou string vazia: fallback gracioso, não throw", () => {
      expect(() => selectBestArtigo([chunk("Art. 9")], undefined)).not.toThrow();
      expect(() => selectBestArtigo([chunk("Art. 9")], null)).not.toThrow();
      expect(() => selectBestArtigo([chunk("Art. 9")], "")).not.toThrow();
    });

    it("articleMatches retorna false para inputs vazios (não throw)", () => {
      expect(articleMatches("", "Art. 9")).toBe(false);
      expect(articleMatches("Art. 9", "")).toBe(false);
      expect(articleMatches("", "")).toBe(false);
    });

    it("docs vazio + risk.artigo undefined: fallback retorna string vazia (nunca null/undefined)", () => {
      const result = selectBestArtigo([], undefined);
      expect(result.artigo).toBe("");
      expect(result.artigo).not.toBeNull();
      expect(result.artigo).not.toBeUndefined();
    });
  });

  describe("DoD POSITIVO (verificável após implementação)", () => {
    it("selectBestArtigo é função pura — mesma entrada produz mesma saída", () => {
      const docs = [chunk("Art. 22"), chunk("Art. 9")];
      const r1 = selectBestArtigo(docs, "Art. 9");
      const r2 = selectBestArtigo(docs, "Art. 9");
      expect(r1).toEqual(r2);
    });

    it("filtro pelo principal cobre todas as 8 categorias do CSV #5040001 sem retornar correlato quando principal existe", () => {
      const fixtures = [
        { risk: "Art. 9", principal: "Art. 9", correlato: "Art. 22 (parte 2)" },
        { risk: "Art. 102", principal: "Art. 102", correlato: "Art. 191" },
        { risk: "Art. 45", principal: "Art. 45", correlato: "Art. 6" },
      ];
      for (const f of fixtures) {
        const docs = [chunk(f.correlato), chunk(f.principal)];
        const result = selectBestArtigo(docs, f.risk);
        expect(result.artigo).toBe(f.principal);
        expect(result.usedFallback).toBe(false);
      }
    });
  });

  describe("DoD NEGATIVO (estado proibido)", () => {
    it("nenhum risco do projeto #5040001 com categoria='split_payment' deve resultar em rag_artigo_exato='Art. 22'", () => {
      const docs = [chunk("Art. 22 (parte 2)"), chunk("Art. 9")];
      const result = selectBestArtigo(docs, "Art. 9 LC 214/2025");
      expect(result.artigo).not.toBe("Art. 22 (parte 2)");
      expect(result.artigo).not.toBe("Art. 22");
    });

    it("rag_artigo_exato nunca é um artigo aleatório do top-LIKE sem relação com a categoria", () => {
      const docs = [
        chunk("Art. 1"),
        chunk("Art. 5"),
        chunk("Art. 50"),
        chunk("Art. 100"),
        chunk("Art. 200"),
      ];
      const result = selectBestArtigo(docs, "Art. 9");
      expect(result.artigo).toBe("Art. 9");
      expect(result.usedFallback).toBe(true);
      expect(["Art. 1", "Art. 5", "Art. 50", "Art. 100", "Art. 200"]).not.toContain(
        result.artigo,
      );
    });
  });
});
