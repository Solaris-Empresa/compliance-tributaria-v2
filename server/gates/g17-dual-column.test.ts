/**
 * g17-dual-column.test.ts — FIX-01 (FEAT-SOL-UX-01 follow-up)
 * ─────────────────────────────────────────────────────────────────────────────
 * Test contracts da função pura `classifyForGap` — dual-column (resposta_opcao
 * canônico + fallback texto-livre para projetos pré-PR-C).
 *
 * Padrão: idêntico a `server/lib/credito-presumido-eligibility.test.ts`
 * (15 PASS hoje) — unitário sem DB, sem mock, sem I/O.
 *
 * Origem: despacho SOLARIS-FIX-01 (2026-06-01).
 * Cobre os 9 cenários T-01..T-09 do despacho, corrige B1/B2/B4 da auditoria
 * Manus do projeto 4920001.
 *
 * Por que arquivo separado e não reuso de g17b-solaris-pipeline.test.ts:
 * o arquivo existente testa G17-B (deriveRisksFromGaps + riskEngine + status
 * transition) — escopo diferente. Manter isolamento facilita revisão.
 */

import { describe, it, expect } from "vitest";
import {
  classifyForGap,
  type GapClassification,
  type RespostaOpcao,
} from "../lib/solaris-gap-analyzer";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function expectClass(
  result: GapClassification,
  expected: { isNegative: boolean; isExcluded: boolean },
) {
  expect(result.isNegative).toBe(expected.isNegative);
  expect(result.isExcluded).toBe(expected.isExcluded);
}

// ─── Cenários T-01..T-09 do despacho FIX-01 ───────────────────────────────────

describe("FIX-01 — classifyForGap: dual-column resposta_opcao + fallback legado", () => {
  describe("Fonte canônica: resposta_opcao (radio button PR-C)", () => {
    it("T-01 — opcao='nao' + texto='' → gera gap (corrige BUG B1 — 5 falsos negativos PROD)", () => {
      expectClass(classifyForGap("nao", ""), { isNegative: true, isExcluded: false });
    });

    it("T-02 — opcao='nao_sei' + texto='' → gera gap (conservador, produto jurídico)", () => {
      expectClass(classifyForGap("nao_sei", ""), { isNegative: true, isExcluded: false });
    });

    it("T-03 — opcao='sim' + texto='' → SEM gap", () => {
      expectClass(classifyForGap("sim", ""), { isNegative: false, isExcluded: false });
    });

    it("T-04 — opcao='nao_se_aplica' + texto='' → exclusão (sem gap, distinto de atendido)", () => {
      expectClass(classifyForGap("nao_se_aplica", ""), {
        isNegative: false,
        isExcluded: true,
      });
    });
  });

  describe("Fallback legado: texto-livre (resposta_opcao=null, pré-PR-C)", () => {
    it("T-05 — null + texto='Não.' → gera gap (back-compat preservada)", () => {
      expectClass(classifyForGap(null, "Não."), {
        isNegative: true,
        isExcluded: false,
      });
    });

    it("T-06 — null + texto='Sim.' → SEM gap (back-compat preservada)", () => {
      expectClass(classifyForGap(null, "Sim."), {
        isNegative: false,
        isExcluded: false,
      });
    });

    it("T-07 — null + texto='Não se aplica.' → exclusão (corrige BUG B4 — antes virava gap)", () => {
      expectClass(classifyForGap(null, "Não se aplica."), {
        isNegative: false,
        isExcluded: true,
      });
    });
  });

  describe("Inconsistência radio≠texto: radio prevalece (corrige BUG B2)", () => {
    it("T-08 — opcao='sim' + texto='Não.' → SEM gap (radio prevalece)", () => {
      expectClass(classifyForGap("sim", "Não."), {
        isNegative: false,
        isExcluded: false,
      });
    });

    it("T-09 — opcao='nao' + texto='Sim.' → gera gap (radio prevalece — simétrico de T-08)", () => {
      expectClass(classifyForGap("nao", "Sim."), {
        isNegative: true,
        isExcluded: false,
      });
    });
  });

  // ─── Cobertura adicional (não no despacho — defesa em profundidade) ──────

  describe("Defesa em profundidade — variações de texto-livre no fallback legado", () => {
    it("null + 'N/A' literal (case-insensitive) → exclusão", () => {
      expectClass(classifyForGap(null, "N/A"), { isNegative: false, isExcluded: true });
      expectClass(classifyForGap(null, "n/a"), { isNegative: false, isExcluded: true });
    });

    it("null + 'NA' literal (sem barra) → exclusão", () => {
      expectClass(classifyForGap(null, "NA"), { isNegative: false, isExcluded: true });
      expectClass(classifyForGap(null, "na"), { isNegative: false, isExcluded: true });
    });

    it("null + 'não aplicável' → exclusão (variação acentuada)", () => {
      expectClass(classifyForGap(null, "Não aplicável"), {
        isNegative: false,
        isExcluded: true,
      });
    });

    it("null + 'nao' (sem acento, exato) → gera gap (back-compat)", () => {
      expectClass(classifyForGap(null, "nao"), { isNegative: true, isExcluded: false });
    });

    it("null + texto vazio → SEM gap (nao_iniciado conceitual — apenas missing)", () => {
      expectClass(classifyForGap(null, ""), { isNegative: false, isExcluded: false });
    });

    it("null + 'NÃO. Em revisão.' → gera gap (uppercase + pontuação preservados via toLowerCase + trim)", () => {
      expectClass(classifyForGap(null, "NÃO. Em revisão."), {
        isNegative: true,
        isExcluded: false,
      });
    });

    it("null + whitespace puro → SEM gap (após trim vira vazio)", () => {
      expectClass(classifyForGap(null, "   "), {
        isNegative: false,
        isExcluded: false,
      });
    });
  });

  describe("Defesa em profundidade — opcao com texto inconsistente (radio sempre prevalece)", () => {
    it("opcao='nao_se_aplica' + texto='Sim.' → exclusão (radio prevalece)", () => {
      expectClass(classifyForGap("nao_se_aplica", "Sim."), {
        isNegative: false,
        isExcluded: true,
      });
    });

    it("opcao='nao_sei' + texto='Sim, mas com dúvida' → gap (conservador prevalece)", () => {
      expectClass(classifyForGap("nao_sei", "Sim, mas com dúvida"), {
        isNegative: true,
        isExcluded: false,
      });
    });
  });

  describe("Idempotência conceitual da função pura", () => {
    it("mesma entrada produz mesma saída (determinismo)", () => {
      const cases: Array<[RespostaOpcao | null, string]> = [
        ["sim", ""],
        ["nao", "Não."],
        [null, "Não se aplica"],
        [null, ""],
      ];
      for (const [opcao, resposta] of cases) {
        const a = classifyForGap(opcao, resposta);
        const b = classifyForGap(opcao, resposta);
        expect(a).toEqual(b);
      }
    });
  });
});
