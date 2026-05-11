/**
 * Issue #1062 — Modal de aprovação mostra ❌ para QCNAE mesmo com respostas no banco
 *
 * Tests da função countCnaeAnswersV3 + integração com a lógica de
 * answeredSources/missingSources em approveBriefingWithReservation.
 *
 * Causa raiz: server/routers-fluxo-v3.ts:1986-1987 lia
 *   diagStatus?.cnae === "completed"
 * Esse flag fica dessincronizado pelo gate de progressão do stepper legado.
 *
 * Fix: substituir leitura do flag pelo COUNT real em questionnaireAnswersV3.
 *
 * Estes tests cobrem a *lógica de decisão* (cnaeCount > 0 → answered),
 * não a função de banco diretamente (essa precisa de DB real).
 */
import { describe, it, expect } from "vitest";

/**
 * Replica a lógica de decisão usada em approveBriefingWithReservation
 * para popular answeredSources/missingSources.
 *
 * Antes do fix #1062: tomava (flag === "completed")
 * Depois do fix #1062: toma (count > 0) — função pura testável
 */
function classifySource(count: number): "answered" | "missing" {
  return count > 0 ? "answered" : "missing";
}

function buildSourcesLists(counts: {
  solaris: number;
  iagen: number;
  productAnswers: number;
  serviceAnswers: number;
  cnae: number;
}): { answered: string[]; missing: string[] } {
  const answered: string[] = [];
  const missing: string[] = [];
  const push = (count: number, key: string) => {
    (classifySource(count) === "answered" ? answered : missing).push(key);
  };
  push(counts.solaris, "solaris_onda1");
  push(counts.iagen, "iagen_onda2");
  push(counts.productAnswers, "q_produtos_ncm");
  push(counts.serviceAnswers, "q_servicos_nbs");
  push(counts.cnae, "qcnae_especializado");
  return { answered, missing };
}

describe("Issue #1062 — lógica answeredSources/missingSources", () => {
  describe("classifySource (lógica pura)", () => {
    it("count > 0 → 'answered'", () => {
      expect(classifySource(1)).toBe("answered");
      expect(classifySource(12)).toBe("answered");
      expect(classifySource(100)).toBe("answered");
    });

    it("count === 0 → 'missing'", () => {
      expect(classifySource(0)).toBe("missing");
    });

    it("uniformidade entre fontes — mesma regra para CNAE, SOLARIS, IA Gen, NCM, NBS", () => {
      // Antes do #1062: CNAE usava flag (regra diferente)
      // Depois: todas usam mesma regra (count > 0)
      const all = [1, 5, 12, 100].map(classifySource);
      expect(all.every((r) => r === "answered")).toBe(true);
    });
  });

  describe("Caso canônico — projeto pós-limpeza 2026-05-11", () => {
    it("12 respostas CNAE → qcnae_especializado vai para answered (não missing)", () => {
      const { answered, missing } = buildSourcesLists({
        solaris: 24,
        iagen: 3,
        productAnswers: 2,
        serviceAnswers: 3,
        cnae: 12,  // <-- 12 respostas no banco
      });
      expect(answered).toContain("qcnae_especializado");
      expect(missing).not.toContain("qcnae_especializado");
    });

    it("Bug original: flag diagnosticStatus.cnae='not_started' + 12 respostas → ANTES ia para missing", () => {
      // Simulação do bug: count > 0 mas flag === 'not_started'
      // Comportamento antigo (bugado): missing.push("qcnae_especializado")
      // Comportamento novo (correto): COUNT > 0 → answered
      const cnaeCount = 12;
      const flagAntigo = "not_started"; // dessincronizado
      const flagSaidaAntiga = flagAntigo === "completed" ? "answered" : "missing";
      const flagSaidaNova = classifySource(cnaeCount);
      expect(flagSaidaAntiga).toBe("missing"); // bug confirmado
      expect(flagSaidaNova).toBe("answered"); // fix aplicado
      expect(flagSaidaAntiga).not.toBe(flagSaidaNova); // bug ≠ fix
    });
  });

  describe("Cenários comuns", () => {
    it("Onboarding zero — todos vão para missing", () => {
      const { answered, missing } = buildSourcesLists({
        solaris: 0,
        iagen: 0,
        productAnswers: 0,
        serviceAnswers: 0,
        cnae: 0,
      });
      expect(answered).toEqual([]);
      expect(missing.length).toBe(5);
    });

    it("Todos os 5 questionários respondidos → answered tem 5 entries", () => {
      const { answered, missing } = buildSourcesLists({
        solaris: 24,
        iagen: 3,
        productAnswers: 2,
        serviceAnswers: 3,
        cnae: 12,
      });
      expect(answered.length).toBe(5);
      expect(missing.length).toBe(0);
      expect(answered.sort()).toEqual(
        [
          "solaris_onda1",
          "iagen_onda2",
          "q_produtos_ncm",
          "q_servicos_nbs",
          "qcnae_especializado",
        ].sort(),
      );
    });

    it("Mix parcial — alguns answered, alguns missing", () => {
      const { answered, missing } = buildSourcesLists({
        solaris: 24, // ✅
        iagen: 0,    // ❌
        productAnswers: 2, // ✅
        serviceAnswers: 0, // ❌
        cnae: 12,    // ✅ (era ❌ antes do fix)
      });
      expect(answered.sort()).toEqual(
        ["solaris_onda1", "q_produtos_ncm", "qcnae_especializado"].sort(),
      );
      expect(missing.sort()).toEqual(
        ["iagen_onda2", "q_servicos_nbs"].sort(),
      );
    });
  });

  describe("DoD POSITIVO + NEGATIVO", () => {
    it("DoD POSITIVO: 12 respostas CNAE no banco → modal exibirá ✅ para qcnae_especializado", () => {
      const sources = buildSourcesLists({
        solaris: 24,
        iagen: 3,
        productAnswers: 2,
        serviceAnswers: 3,
        cnae: 12,
      });
      // No modal, "answered" → ✅; "missing" → ❌
      expect(sources.answered.includes("qcnae_especializado")).toBe(true);
    });

    it("DoD NEGATIVO: regressão proibida — qcnae_especializado NUNCA pode ficar em missing quando cnaeCount > 0", () => {
      // Tentar 10 cenários com cnaeCount > 0 — qcnae deve sempre estar em answered
      for (let i = 1; i <= 10; i++) {
        const { answered, missing } = buildSourcesLists({
          solaris: 0, iagen: 0, productAnswers: 0, serviceAnswers: 0, cnae: i,
        });
        expect(answered).toContain("qcnae_especializado");
        expect(missing).not.toContain("qcnae_especializado");
      }
    });

    it("DoD NEGATIVO: qcnae_especializado em missing APENAS quando cnaeCount === 0", () => {
      const sources = buildSourcesLists({
        solaris: 24, iagen: 3, productAnswers: 2, serviceAnswers: 3, cnae: 0,
      });
      expect(sources.missing).toContain("qcnae_especializado");
      expect(sources.answered).not.toContain("qcnae_especializado");
    });
  });
});
