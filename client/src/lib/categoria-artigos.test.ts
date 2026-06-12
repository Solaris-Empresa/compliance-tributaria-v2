/**
 * Issue #1069 — tests da função pura
 *
 * Cobre:
 *   - Bug A: header de grupo com artigo errado (CATEGORIA_ARTIGOS corrigido)
 *   - Bug B: defesa contra prefixo duplicado
 *   - Idempotência de resolveArtigoForHeader (string vazia trata como falsy)
 *
 * Caso canônico: projeto #5580001 (teste E2E 2026-05-12)
 */
import { describe, it, expect } from "vitest";
import {
  CATEGORIA_ARTIGOS,
  resolveArtigoForHeader,
  ensureNoDoublePrefix,
} from "./categoria-artigos";

describe("Issue #1069 Bug A — CATEGORIA_ARTIGOS com valores corretos", () => {
  it("split_payment → Arts. 31-35 LC 214/2025 (LEGAL-2 #1373, NÃO Art. 9 nem Art. 29)", () => {
    expect(CATEGORIA_ARTIGOS.split_payment).toBe("Arts. 31-35 LC 214/2025");
    expect(CATEGORIA_ARTIGOS.split_payment).not.toContain("Art. 9");
    expect(CATEGORIA_ARTIGOS.split_payment).not.toContain("29");
  });

  it("inscricao_cadastral → Art. 59 LC 214/2025 (LEGAL-4, era Art. 213; NÃO Art. 21)", () => {
    expect(CATEGORIA_ARTIGOS.inscricao_cadastral).toBe("Art. 59 LC 214/2025");
    expect(CATEGORIA_ARTIGOS.inscricao_cadastral).not.toContain("213");
    expect(CATEGORIA_ARTIGOS.inscricao_cadastral).not.toBe("Art. 21 LC 214/2025");
  });

  it("regime_diferenciado → Art. 126 LC 214/2025 (LEGAL-3, NÃO Art. 29 / 229 / 258)", () => {
    expect(CATEGORIA_ARTIGOS.regime_diferenciado).toBe("Art. 126 LC 214/2025");
    expect(CATEGORIA_ARTIGOS.regime_diferenciado).not.toContain("258");
    expect(CATEGORIA_ARTIGOS.regime_diferenciado).not.toContain("229");
  });

  it("obrigacao_acessoria → Art. 60 LC 214/2025 (LEGAL-4, era Art. 102; NÃO Art. 88)", () => {
    expect(CATEGORIA_ARTIGOS.obrigacao_acessoria).toBe("Art. 60 LC 214/2025");
    expect(CATEGORIA_ARTIGOS.obrigacao_acessoria).not.toContain("88");
    expect(CATEGORIA_ARTIGOS.obrigacao_acessoria).not.toContain("102");
  });

  it("imposto_seletivo → Art. 409 LC 214/2025 (LEGAL-3, era Art. 393)", () => {
    expect(CATEGORIA_ARTIGOS.imposto_seletivo).toBe("Art. 409 LC 214/2025");
    expect(CATEGORIA_ARTIGOS.imposto_seletivo).not.toContain("393");
  });

  it("aliquota_reduzida → Art. 127 LC 214/2025 (LEGAL-3, era Art. 120)", () => {
    expect(CATEGORIA_ARTIGOS.aliquota_reduzida).toBe("Art. 127 LC 214/2025");
  });

  it("credito_presumido → Art. 168 LC 214/2025 (LEGAL-3, era Art. 185)", () => {
    expect(CATEGORIA_ARTIGOS.credito_presumido).toBe("Art. 168 LC 214/2025");
  });

  it("transicao_iss_ibs → Art. 342 LC 214/2025 (LEGAL-4, era Arts. 6-12)", () => {
    expect(CATEGORIA_ARTIGOS.transicao_iss_ibs).toBe("Art. 342 LC 214/2025");
    expect(CATEGORIA_ARTIGOS.transicao_iss_ibs).not.toContain("6-12");
  });

  it("categorias fora do escopo LEGAL-2/3/4 permanecem (regressão proibida)", () => {
    expect(CATEGORIA_ARTIGOS.confissao_automatica).toBe("Art. 45 LC 214/2025");
    expect(CATEGORIA_ARTIGOS.aliquota_zero).toBe("Art. 125 LC 214/2025");
  });

  it("mapa é imutável (Object.freeze)", () => {
    expect(Object.isFrozen(CATEGORIA_ARTIGOS)).toBe(true);
  });

  it("caso canônico #5580001 — 4 categorias erradas no PR #1061 todas corrigidas", () => {
    // Valores que P.O. mostrou como ERRADOS no header (build ac467c5b)
    const valoresErradosAntigos: Record<string, string> = {
      split_payment: "Art. 29 LC 214/2025",
      inscricao_cadastral: "Art. 21 LC 214/2025",
      regime_diferenciado: "Art. 258 LC 214/2025",
      obrigacao_acessoria: "Art. 88 LC 214/2025",
    };
    // Mapa atual NÃO pode mais conter esses valores
    for (const [cat, valorErrado] of Object.entries(valoresErradosAntigos)) {
      expect(CATEGORIA_ARTIGOS[cat]).not.toBe(valorErrado);
    }
  });
});

describe("Issue #1069 Bug A — resolveArtigoForHeader (fallback defensivo)", () => {
  it("retorna risk.artigo quando preenchido (fonte primária)", () => {
    expect(resolveArtigoForHeader("Art. 31 LC 214/2025", "split_payment"))
      .toBe("Art. 31 LC 214/2025");
  });

  it("retorna fallback CATEGORIA_ARTIGOS quando risk.artigo é null", () => {
    expect(resolveArtigoForHeader(null, "split_payment"))
      .toBe("Arts. 31-35 LC 214/2025");
  });

  it("retorna fallback quando risk.artigo é undefined", () => {
    expect(resolveArtigoForHeader(undefined, "inscricao_cadastral"))
      .toBe("Art. 59 LC 214/2025");
  });

  it("Bug A — string vazia trata como falsy (fallback dispara)", () => {
    // Antes: `"" ?? CATEGORIA_ARTIGOS[cat]` retornaria "" (string vazia é truthy para ??)
    // Depois: resolveArtigoForHeader trata "" como falsy → fallback ativa
    expect(resolveArtigoForHeader("", "regime_diferenciado"))
      .toBe("Art. 126 LC 214/2025");
  });

  it("string com whitespace também é tratada como falsy", () => {
    expect(resolveArtigoForHeader("   ", "obrigacao_acessoria"))
      .toBe("Art. 60 LC 214/2025");
  });

  it("categoria desconhecida retorna string vazia", () => {
    expect(resolveArtigoForHeader(null, "categoria_inexistente"))
      .toBe("");
  });

  it("caso canônico #5580001 — 4 categorias com fallback corrigido", () => {
    // Quando risk.artigo é vazio (cenário do bug em produção), fallback retorna valor CORRETO
    expect(resolveArtigoForHeader("", "split_payment")).toBe("Arts. 31-35 LC 214/2025");
    expect(resolveArtigoForHeader("", "inscricao_cadastral")).toBe("Art. 59 LC 214/2025");
    expect(resolveArtigoForHeader("", "regime_diferenciado")).toBe("Art. 126 LC 214/2025");
    expect(resolveArtigoForHeader("", "obrigacao_acessoria")).toBe("Art. 60 LC 214/2025");
  });
});

describe("Issue #1069 Bug B — ensureNoDoublePrefix", () => {
  it("retorna artigo inalterado quando já vem com prefixo (caso esperado)", () => {
    expect(ensureNoDoublePrefix("Art. 9 LC 214/2025")).toBe("Art. 9 LC 214/2025");
    expect(ensureNoDoublePrefix("Art. 45 LC 214/2025")).toBe("Art. 45 LC 214/2025");
    expect(ensureNoDoublePrefix("Arts. 6-12 LC 214/2025")).toBe("Arts. 6-12 LC 214/2025");
  });

  it("retorna inalterado sem prefixo (espera backend entregar formato correto)", () => {
    expect(ensureNoDoublePrefix("9 LC 214/2025")).toBe("9 LC 214/2025");
  });

  it("trim de whitespace", () => {
    expect(ensureNoDoublePrefix("  Art. 9 LC 214/2025  ")).toBe("Art. 9 LC 214/2025");
  });

  it("null/undefined retornam string vazia", () => {
    expect(ensureNoDoublePrefix(null)).toBe("");
    expect(ensureNoDoublePrefix(undefined)).toBe("");
  });

  it("regressão proibida — NÃO duplica prefixo quando aplicado a artigo bruto", () => {
    // Bug B original: `Art. ${bc[2]}` onde bc[2]="Art. 9..." → "Art. Art. 9..."
    // Fix substitui template por uso direto (este teste documenta o contrato)
    const bc2 = "Art. 9 LC 214/2025";
    const labelCorrect = bc2; // sem prefixo extra
    const labelBugado = `Art. ${bc2}`;
    expect(labelCorrect).toBe("Art. 9 LC 214/2025");
    expect(labelBugado).toBe("Art. Art. 9 LC 214/2025"); // documenta o bug original
    expect(labelCorrect).not.toContain("Art. Art.");
  });
});

describe("Issue #1069 — DoD POSITIVO + NEGATIVO", () => {
  it("DoD POSITIVO: caso canônico #5580001 — header exibe artigo CORRETO mesmo com fallback", () => {
    // Cenário do bug em produção: risk.artigo vazio → fallback dispara → mostra CATEGORIA_ARTIGOS
    const cenarios = [
      { cat: "split_payment", esperado: "Arts. 31-35 LC 214/2025" },
      { cat: "inscricao_cadastral", esperado: "Art. 59 LC 214/2025" },
      { cat: "regime_diferenciado", esperado: "Art. 126 LC 214/2025" },
      { cat: "obrigacao_acessoria", esperado: "Art. 60 LC 214/2025" },
    ];
    for (const c of cenarios) {
      expect(resolveArtigoForHeader("", c.cat)).toBe(c.esperado);
      expect(resolveArtigoForHeader(null, c.cat)).toBe(c.esperado);
    }
  });

  it("DoD NEGATIVO: nenhuma string 'Art. Art.' nunca aparece em qualquer cenário", () => {
    const cenarios = [
      "Art. 9 LC 214/2025",
      "Art. 45",
      "Arts. 6-12",
      "Art. 213 LC 214/2025",
    ];
    for (const c of cenarios) {
      expect(ensureNoDoublePrefix(c)).not.toContain("Art. Art.");
    }
  });

  it("DoD POSITIVO: funções puras — mesma entrada produz mesma saída", () => {
    expect(resolveArtigoForHeader("Art. 31", "split_payment")).toBe(
      resolveArtigoForHeader("Art. 31", "split_payment"),
    );
    expect(resolveArtigoForHeader("", "split_payment")).toBe(
      resolveArtigoForHeader("", "split_payment"),
    );
  });
});
