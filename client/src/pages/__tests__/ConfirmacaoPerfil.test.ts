/**
 * ConfirmacaoPerfil.test.ts — M2 PR-B
 *
 * Testes unitários puros (sem render) para a lógica de mapeamento e
 * derivação de estado visual da tela /projetos/:id/perfil-entidade.
 *
 * NOTA: este projeto NÃO possui @testing-library/react instalado, portanto
 * não testamos render direto. Cobrimos:
 *   - mapStatusToFsm: prefixo perfil_ no FSM (Manus IMP-6)
 *   - deriveVisualState: 8 estados visuais (S1-S4, C1-C4)
 *   - inferOrigemFromBlockers: fallback vs infer
 *   - String check: termo "Arquétipo" NÃO presente em ConfirmacaoPerfil/PainelConfianca/DimensaoCard
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mapStatusToFsm,
  deriveVisualState,
  inferOrigemFromBlockers,
  shouldShowNCM,
  shouldShowNBS,
  isNbsInNcmField,
  isValidNcmFormat,
} from "../ConfirmacaoPerfil";

describe("mapStatusToFsm — engine sem prefixo → FSM com prefixo perfil_", () => {
  it("T1: confirmado → perfil_confirmado", () => {
    expect(mapStatusToFsm("confirmado")).toBe("perfil_confirmado");
  });
  it("T2: inconsistente → perfil_inconsistente", () => {
    expect(mapStatusToFsm("inconsistente")).toBe("perfil_inconsistente");
  });
  it("T3: bloqueado → perfil_bloqueado", () => {
    expect(mapStatusToFsm("bloqueado")).toBe("perfil_bloqueado");
  });
  it("T4: undefined → perfil_pendente (default seguro)", () => {
    expect(mapStatusToFsm(undefined)).toBe("perfil_pendente");
  });
  it("T5: pendente → perfil_pendente", () => {
    expect(mapStatusToFsm("pendente")).toBe("perfil_pendente");
  });
});

describe("deriveVisualState — 8 estados visuais", () => {
  it("T6: c4_confirmado quando perfilGet.confirmed=true", () => {
    expect(deriveVisualState({ confirmed: true }, null, false)).toBe("c4");
  });
  it("T7: s1_inicio quando sem dados e form não iniciado", () => {
    expect(deriveVisualState(null, null, false)).toBe("s1");
  });
  it("T8: s2_modal quando form iniciado mas sem build data", () => {
    expect(deriveVisualState(null, null, true)).toBe("s2");
  });
  it("T9: c3_bloqueado quando engine retorna bloqueado", () => {
    expect(
      deriveVisualState(null, { status_arquetipo: "bloqueado", blockers: [] }, true),
    ).toBe("c3");
  });
  it("T10: c3_bloqueado quando >=1 HARD_BLOCK ativo", () => {
    expect(
      deriveVisualState(
        null,
        { status_arquetipo: "pendente", blockers: [{ severity: "HARD_BLOCK" }] },
        true,
      ),
    ).toBe("c3");
  });
  it("T11: c2_inconsistente quando engine retorna inconsistente sem hard_block", () => {
    expect(
      deriveVisualState(
        null,
        { status_arquetipo: "inconsistente", blockers: [] },
        true,
      ),
    ).toBe("c2");
  });
  it("T12: c1_pendente quando engine retorna pendente", () => {
    expect(
      deriveVisualState(null, { status_arquetipo: "pendente", blockers: [] }, true),
    ).toBe("c1");
  });
  it("T13: s4_painel_completo quando engine confirma sem persistir ainda", () => {
    expect(
      deriveVisualState(
        { confirmed: false },
        { status_arquetipo: "confirmado", blockers: [] },
        true,
      ),
    ).toBe("s4");
  });
});

describe("inferOrigemFromBlockers — origem da derivação por presença de blocker", () => {
  it("T14: V-10-FALLBACK presente → origem='fallback'", () => {
    expect(inferOrigemFromBlockers([{ id: "V-10-FALLBACK" }], "V-10-FALLBACK")).toBe(
      "fallback",
    );
  });
  it("T15: ausente → origem='infer'", () => {
    expect(inferOrigemFromBlockers([{ id: "V-LC-103" }], "V-10-FALLBACK")).toBe(
      "infer",
    );
  });
  it("T16: lista vazia → origem='infer'", () => {
    expect(inferOrigemFromBlockers([], "V-10-FALLBACK")).toBe("infer");
  });
});

describe("Termo proibido — 'Arquétipo' NÃO aparece em strings da UI cliente", () => {
  // Decisão P.O. canônica: termo na UI cliente é "Perfil da Entidade".
  // /admin/m1-perfil pode usar "Arquétipo" pois é interno (fora deste teste).
  const root = join(__dirname, "..", "..");

  function readSource(rel: string): string {
    const raw = readFileSync(join(root, rel), "utf8");
    // Strip comentários (// ... e /* ... */) — termo "Arquétipo" em docstring
    // de regra "NUNCA Arquétipo" é legítimo, não viola
    return raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  }

  it("T17: ConfirmacaoPerfil.tsx NÃO contém 'Arquétipo' (com acento) em UI text", () => {
    const src = readSource("pages/ConfirmacaoPerfil.tsx");
    // Permitir uso em comentários (// ou /*); checar apenas strings JSX/literal
    const stringLiterals = src.match(/"[^"]*"/g) ?? [];
    const naturalLanguage = stringLiterals.filter(
      (s) => /[A-Za-zÀ-ÿ\s]{8,}/.test(s) && !/data-testid|class/.test(s),
    );
    const offenders = naturalLanguage.filter((s) => /Arquétipo/i.test(s));
    expect(offenders).toEqual([]);
  });

  it("T18: PainelConfianca.tsx NÃO contém 'Arquétipo' em UI text", () => {
    const src = readSource("components/perfil/PainelConfianca.tsx");
    const stringLiterals = src.match(/"[^"]*"/g) ?? [];
    const naturalLanguage = stringLiterals.filter(
      (s) => /[A-Za-zÀ-ÿ\s]{8,}/.test(s) && !/data-testid|class/.test(s),
    );
    const offenders = naturalLanguage.filter((s) => /Arquétipo/i.test(s));
    expect(offenders).toEqual([]);
  });

  it("T19: DimensaoCard.tsx NÃO contém 'Arquétipo' em UI text", () => {
    const src = readSource("components/perfil/DimensaoCard.tsx");
    const stringLiterals = src.match(/"[^"]*"/g) ?? [];
    const naturalLanguage = stringLiterals.filter(
      (s) => /[A-Za-zÀ-ÿ\s]{8,}/.test(s) && !/data-testid|class/.test(s),
    );
    const offenders = naturalLanguage.filter((s) => /Arquétipo/i.test(s));
    expect(offenders).toEqual([]);
  });

  it("T20: ConfirmacaoPerfil.tsx contém o termo canônico 'Perfil da Entidade'", () => {
    const src = readSource("pages/ConfirmacaoPerfil.tsx");
    expect(src).toMatch(/Perfil da Entidade/);
  });
});

// ─── PR-C: G-A10 + G-A5 fixes ────────────────────────────────────────────

describe("G-A5 (PR-C) — conditional rendering por natureza_operacao_principal", () => {
  it("T21: shouldShowNCM true para 'Produção própria'", () => {
    expect(shouldShowNCM(["Produção própria"])).toBe(true);
  });

  it("T22: shouldShowNCM true para 'Comércio'", () => {
    expect(shouldShowNCM(["Comércio"])).toBe(true);
  });

  it("T23: shouldShowNCM false para 'Prestação de serviço' isolado", () => {
    expect(shouldShowNCM(["Prestação de serviço"])).toBe(false);
  });

  it("T24: shouldShowNBS true para 'Transporte'", () => {
    expect(shouldShowNBS(["Transporte"])).toBe(true);
  });

  it("T25: shouldShowNBS true para 'Locação'", () => {
    expect(shouldShowNBS(["Locação"])).toBe(true);
  });

  it("T26: shouldShowNBS false para 'Comércio' isolado", () => {
    expect(shouldShowNBS(["Comércio"])).toBe(false);
  });

  it("T27: 'Intermediação' (Misto) ativa AMBOS NCM e NBS", () => {
    expect(shouldShowNCM(["Intermediação"])).toBe(true);
    expect(shouldShowNBS(["Intermediação"])).toBe(true);
  });

  it("T28: natureza vazia → ambos false", () => {
    expect(shouldShowNCM([])).toBe(false);
    expect(shouldShowNBS([])).toBe(false);
  });
});

describe("G-A10 (PR-C) — validação inline NCM/NBS", () => {
  it("T29: isValidNcmFormat aceita NCM completo '1201.90.00'", () => {
    expect(isValidNcmFormat("1201.90.00")).toBe(true);
  });

  it("T30: isValidNcmFormat rejeita NCM truncado '1201'", () => {
    expect(isValidNcmFormat("1201")).toBe(false);
  });

  it("T31: isValidNcmFormat rejeita formato inválido '12019000'", () => {
    expect(isValidNcmFormat("12019000")).toBe(false);
  });

  it("T32: isNbsInNcmField detecta NBS '1.0501.14.59' digitado em campo NCM", () => {
    expect(isNbsInNcmField("1.0501.14.59")).toBe(true);
  });

  it("T33: isNbsInNcmField rejeita NCM legítimo '1201.90.00'", () => {
    expect(isNbsInNcmField("1201.90.00")).toBe(false);
  });

  it("T34: isNbsInNcmField com whitespace ainda detecta NBS", () => {
    expect(isNbsInNcmField("  1.0501.14.59  ")).toBe(true);
  });

  it("T35: isValidNcmFormat insensível a espaços nas pontas", () => {
    expect(isValidNcmFormat("  1201.90.00  ")).toBe(true);
  });
});
