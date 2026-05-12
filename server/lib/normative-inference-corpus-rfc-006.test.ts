/**
 * CORPUS-RFC-006 — Sprint 0 A4: testes dos exports puros
 *
 * `CNAES_ALIMENTAR`, `CNAES_ATACADISTA`, `hasAlimentarCnaeFn` e
 * `hasAtacadistaCnaeFn` são exportados como funções puras para teste isolado
 * (sem dependência de DATABASE_URL).
 *
 * Cobre:
 *   - "4623-1/09" agora está em ambos os Sets
 *   - CNAEs pré-existentes preservados (regressão proibida)
 *   - Controle negativo (CNAEs não-mapeados)
 */
import { describe, it, expect } from "vitest";
import {
  CNAES_ALIMENTAR,
  CNAES_ATACADISTA,
  hasAlimentarCnaeFn,
  hasAtacadistaCnaeFn,
} from "./normative-inference";

describe("CORPUS-RFC-006 A4 — CNAES_ALIMENTAR (Sets exportados)", () => {
  it('"4623-1/09" está em CNAES_ALIMENTAR (Sprint 0 A4)', () => {
    expect(CNAES_ALIMENTAR.has("4623-1/09")).toBe(true);
  });

  it('"4623-1/09" está em CNAES_ATACADISTA (Sprint 0 A4)', () => {
    expect(CNAES_ATACADISTA.has("4623-1/09")).toBe(true);
  });

  it("CNAES_ALIMENTAR tem 6 entradas após adição (5 pré-existentes + 1 novo)", () => {
    expect(CNAES_ALIMENTAR.size).toBe(6);
  });

  it("CNAES_ATACADISTA tem 9 entradas após adição (8 pré-existentes + 1 novo)", () => {
    expect(CNAES_ATACADISTA.size).toBe(9);
  });

  describe("Regressão proibida — CNAEs pré-existentes preservados", () => {
    const cnaesAlimentarOriginais = [
      "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01",
    ];
    const cnaesAtacadistaApenas = [
      "4637-1/07", "4633-8/01", "4636-2/02",
    ];

    it.each(cnaesAlimentarOriginais)(
      "CNAES_ALIMENTAR continua com %s",
      (cnae) => {
        expect(CNAES_ALIMENTAR.has(cnae)).toBe(true);
      },
    );

    it.each([...cnaesAlimentarOriginais, ...cnaesAtacadistaApenas])(
      "CNAES_ATACADISTA continua com %s",
      (cnae) => {
        expect(CNAES_ATACADISTA.has(cnae)).toBe(true);
      },
    );
  });
});

describe("CORPUS-RFC-006 A4 — hasAlimentarCnaeFn (função pura)", () => {
  it("true quando CNAE 4623-1/09 está presente (Sprint 0 A4)", () => {
    expect(hasAlimentarCnaeFn(["4623-1/09"])).toBe(true);
  });

  it("true quando CNAE 4623-1/09 está em lista mista", () => {
    expect(hasAlimentarCnaeFn(["8511-0/00", "4623-1/09"])).toBe(true);
  });

  it("true para CNAEs pré-existentes (regressão preservada)", () => {
    expect(hasAlimentarCnaeFn(["4639-7/01"])).toBe(true);
    expect(hasAlimentarCnaeFn(["4632-0/01"])).toBe(true);
  });

  it("false para CNAE não-mapeado", () => {
    expect(hasAlimentarCnaeFn(["8511-0/00"])).toBe(false);
  });

  it("false para array vazio", () => {
    expect(hasAlimentarCnaeFn([])).toBe(false);
  });

  it("false quando nenhum CNAE da lista está mapeado", () => {
    expect(hasAlimentarCnaeFn(["8511-0/00", "9499-5/00"])).toBe(false);
  });
});

describe("CORPUS-RFC-006 A4 — hasAtacadistaCnaeFn (função pura)", () => {
  it("true quando CNAE 4623-1/09 está presente (Sprint 0 A4)", () => {
    expect(hasAtacadistaCnaeFn(["4623-1/09"])).toBe(true);
  });

  it("true para CNAEs pré-existentes do conjunto ATACADISTA", () => {
    expect(hasAtacadistaCnaeFn(["4637-1/07"])).toBe(true);
    expect(hasAtacadistaCnaeFn(["4633-8/01"])).toBe(true);
    expect(hasAtacadistaCnaeFn(["4636-2/02"])).toBe(true);
  });

  it("true para CNAEs ALIMENTAR que também estão em ATACADISTA", () => {
    // Sets têm overlap: os 5 originais + 4623-1/09 estão em ambos
    expect(hasAtacadistaCnaeFn(["4639-7/01"])).toBe(true);
  });

  it("false para CNAE não-mapeado", () => {
    expect(hasAtacadistaCnaeFn(["8511-0/00"])).toBe(false);
  });

  it("false para array vazio", () => {
    expect(hasAtacadistaCnaeFn([])).toBe(false);
  });
});

describe("CORPUS-RFC-006 A4 — DoD POSITIVO + NEGATIVO", () => {
  it("DoD POSITIVO: caso canônico #5040001 — CNAE 4623-1/09 dispara ambos paths", () => {
    expect(hasAlimentarCnaeFn(["4623-1/09"])).toBe(true);
    expect(hasAtacadistaCnaeFn(["4623-1/09"])).toBe(true);
  });

  it("DoD NEGATIVO: regressão proibida — nenhum CNAE original foi removido", () => {
    const todosOriginais = [
      // Alimentares originais
      "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01",
      // Atacadistas apenas
      "4637-1/07", "4633-8/01", "4636-2/02",
    ];
    for (const cnae of todosOriginais) {
      expect(
        hasAtacadistaCnaeFn([cnae]),
        `CNAE ${cnae} desapareceu de CNAES_ATACADISTA`,
      ).toBe(true);
    }
  });

  it("DoD NEGATIVO: 4623-1/09 NÃO afeta lookup de outros CNAEs", () => {
    // Adicionar 4623-1/09 não deve afetar resultado para 4623-1/01 (sufixo diferente)
    expect(hasAlimentarCnaeFn(["4623-1/01"])).toBe(false);
    expect(hasAtacadistaCnaeFn(["4623-1/02"])).toBe(false);
  });
});
