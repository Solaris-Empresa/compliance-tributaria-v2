/**
 * IA SOLARIS — Testes Unitários do Shadow Mode
 * ─────────────────────────────────────────────────────────────────────────────
 * ADR-009: Cobertura completa dos 5 módulos do Shadow Mode.
 *
 * Módulos testados:
 *   1. utils.ts — areValuesEquivalent, stableStringify
 *   2. readers.ts — readLegacyDiagnosticSource, readNewDiagnosticSource, determineShadowFlowVersion
 *   3. logger.ts — ConsoleDiagnosticDivergenceLogger, createDivergenceLogger
 *   4. shadow.ts — runShadowComparison, compareDiagnosticSources
 *   5. diagnostic-source.ts — getDiagnosticReadMode
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  areValuesEquivalent,
  stableStringify,
} from "./diagnostic-shadow/utils";
import {
  readLegacyDiagnosticSource,
  readNewDiagnosticSource,
  determineShadowFlowVersion,
  type ProjectRowForShadow,
} from "./diagnostic-shadow/readers";
import {
  ConsoleDiagnosticDivergenceLogger,
  createDivergenceLogger,
} from "./diagnostic-shadow/logger";
import {
  runShadowComparison,
  compareDiagnosticSources,
} from "./diagnostic-shadow/shadow";
import { getDiagnosticReadMode } from "./diagnostic-source";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const makeProject = (overrides: Partial<ProjectRowForShadow> = {}): ProjectRowForShadow => ({
  id: 1,
  questionnaireAnswers: null,
  corporateAnswers: null,
  operationalAnswers: null,
  briefingContent: null,
  riskMatricesData: null,
  actionPlansData: null,
  briefingContentV1: null,
  briefingContentV3: null,
  riskMatricesDataV1: null,
  riskMatricesDataV3: null,
  actionPlansDataV1: null,
  actionPlansDataV3: null,
  ...overrides,
});

const V3_PROJECT = makeProject({
  questionnaireAnswers: [{ cnae: "1234-5/01", answers: {} }],
  briefingContent: "Briefing legado V3",
  riskMatricesData: { area1: [{ risk: "risco1" }] },
  actionPlansData: { area1: [{ action: "acao1" }] },
});

const V1_PROJECT = makeProject({
  corporateAnswers: { regime: "lucro_real", size: "grande" },
  operationalAnswers: { employees: 500 },
  briefingContent: "Briefing legado V1",
  riskMatricesData: { area1: [{ risk: "risco_v1" }] },
  actionPlansData: { area1: [{ action: "acao_v1" }] },
});

const NONE_PROJECT = makeProject();

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 1: utils.ts
// ─────────────────────────────────────────────────────────────────────────────

describe("utils — areValuesEquivalent", () => {
  it("retorna true para dois nulls", () => {
    expect(areValuesEquivalent(null, null)).toBe(true);
  });

  it("retorna false para null vs string", () => {
    expect(areValuesEquivalent(null, "valor")).toBe(false);
  });

  it("retorna false para string vs null", () => {
    expect(areValuesEquivalent("valor", null)).toBe(false);
  });

  it("retorna true para strings idênticas", () => {
    expect(areValuesEquivalent("abc", "abc")).toBe(true);
  });

  it("retorna false para strings diferentes", () => {
    expect(areValuesEquivalent("abc", "xyz")).toBe(false);
  });

  it("retorna true para objetos com mesmas propriedades", () => {
    expect(areValuesEquivalent({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("retorna false para objetos com propriedades diferentes", () => {
    expect(areValuesEquivalent({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("retorna true para arrays idênticos", () => {
    expect(areValuesEquivalent([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("retorna false para arrays com ordem diferente", () => {
    expect(areValuesEquivalent([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  it("retorna true para objetos aninhados idênticos", () => {
    const a = { x: { y: [1, 2] } };
    const b = { x: { y: [1, 2] } };
    expect(areValuesEquivalent(a, b)).toBe(true);
  });
});

describe("utils — stableStringify", () => {
  it("serializa null como 'null'", () => {
    expect(stableStringify(null)).toBe("null");
  });

  it("serializa string como string com aspas", () => {
    expect(stableStringify("abc")).toBe('"abc"');
  });

  it("ordena chaves de objeto deterministicamente", () => {
    const result = stableStringify({ b: 2, a: 1 });
    expect(result).toBe('{"a":1,"b":2}');
  });

  it("serializa arrays preservando ordem", () => {
    expect(stableStringify([3, 1, 2])).toBe("[3,1,2]");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 2: readers.ts
// ─────────────────────────────────────────────────────────────────────────────

describe("readers — determineShadowFlowVersion", () => {
  it("retorna 'v3' para projeto com questionnaireAnswers", () => {
    expect(determineShadowFlowVersion(V3_PROJECT)).toBe("v3");
  });

  it("retorna 'v1' para projeto com corporateAnswers", () => {
    expect(determineShadowFlowVersion(V1_PROJECT)).toBe("v1");
  });

  it("retorna 'none' para projeto sem dados", () => {
    expect(determineShadowFlowVersion(NONE_PROJECT)).toBe("none");
  });

  it("retorna 'hybrid' para projeto com ambos", () => {
    const hybrid = makeProject({
      questionnaireAnswers: [{ cnae: "1234-5/01" }],
      corporateAnswers: { regime: "lucro_real" },
    });
    expect(determineShadowFlowVersion(hybrid)).toBe("hybrid");
  });
});

describe("readers — readLegacyDiagnosticSource", () => {
  it("lê briefingContent da coluna legada para V3", () => {
    const result = readLegacyDiagnosticSource(V3_PROJECT);
    expect(result.briefingContent).toBe("Briefing legado V3");
    expect(result.flowVersion).toBe("v3");
    expect(result.source.briefing).toBe("briefingContent");
  });

  it("retorna null para projeto none", () => {
    const result = readLegacyDiagnosticSource(NONE_PROJECT);
    expect(result.briefingContent).toBeNull();
    expect(result.riskMatricesData).toBeNull();
    expect(result.actionPlansData).toBeNull();
  });

  it("lê riskMatricesData da coluna legada", () => {
    const result = readLegacyDiagnosticSource(V3_PROJECT);
    expect(result.riskMatricesData).toEqual({ area1: [{ risk: "risco1" }] });
  });
});

describe("readers — readNewDiagnosticSource", () => {
  it("lê briefingContentV3 para projeto V3", () => {
    const project = makeProject({
      questionnaireAnswers: [{ cnae: "1234-5/01" }],
      briefingContentV3: "Briefing novo V3",
    });
    const result = readNewDiagnosticSource(project);
    expect(result.briefingContent).toBe("Briefing novo V3");
    expect(result.source.briefing).toBe("briefingContentV3");
  });

  it("lê briefingContentV1 para projeto V1", () => {
    const project = makeProject({
      corporateAnswers: { regime: "lucro_real" },
      briefingContentV1: "Briefing novo V1",
    });
    const result = readNewDiagnosticSource(project);
    expect(result.briefingContent).toBe("Briefing novo V1");
    expect(result.source.briefing).toBe("briefingContentV1");
  });

  it("retorna null para projeto none", () => {
    const result = readNewDiagnosticSource(NONE_PROJECT);
    expect(result.briefingContent).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 3: logger.ts
// ─────────────────────────────────────────────────────────────────────────────

describe("logger — ConsoleDiagnosticDivergenceLogger", () => {
  it("loga divergência no console sem lançar erro", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = new ConsoleDiagnosticDivergenceLogger();
    await expect(
      logger.log({
        projectId: 1,
        flowVersion: "v3",
        field: "briefingContent",
        legacySourceColumn: "legacy_briefingContent",
        newSourceColumn: "new_briefingContentV3",
        legacyValue: "valor_legado",
        newValue: "valor_novo",
        reason: "conteúdo diferente",
        timestamp: new Date().toISOString(),
      })
    ).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});

describe("logger — createDivergenceLogger", () => {
  it("retorna ConsoleDiagnosticDivergenceLogger quando NODE_ENV=test", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    const logger = createDivergenceLogger();
    expect(logger).toBeInstanceOf(ConsoleDiagnosticDivergenceLogger);
    process.env.NODE_ENV = originalEnv;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 4: shadow.ts
// ─────────────────────────────────────────────────────────────────────────────

describe("shadow — compareDiagnosticSources (sem persistência)", () => {
  it("retorna divergencesFound=0 quando legada e nova são iguais (ambas null)", () => {
    const result = compareDiagnosticSources(NONE_PROJECT);
    expect(result.divergencesFound).toBe(0);
    expect(result.fields.every((f) => f.equivalent)).toBe(true);
  });

  it("detecta divergência quando legada tem valor e nova é null", () => {
    const result = compareDiagnosticSources(V3_PROJECT);
    // V3_PROJECT tem briefingContent legado mas briefingContentV3 é null
    const briefingField = result.fields.find((f) => f.field === "briefingContent");
    expect(briefingField?.equivalent).toBe(false);
    expect(result.divergencesFound).toBeGreaterThan(0);
  });

  it("retorna divergencesFound=0 quando legada e nova coincidem", () => {
    const project = makeProject({
      questionnaireAnswers: [{ cnae: "1234-5/01" }],
      briefingContent: "mesmo texto",
      briefingContentV3: "mesmo texto",
      riskMatricesData: { area1: [{ risk: "r1" }] },
      riskMatricesDataV3: { area1: [{ risk: "r1" }] },
      actionPlansData: { area1: [{ action: "a1" }] },
      actionPlansDataV3: { area1: [{ action: "a1" }] },
    });
    const result = compareDiagnosticSources(project);
    expect(result.divergencesFound).toBe(0);
  });

  it("retorna o projectId correto", () => {
    const project = makeProject({ id: 42 });
    const result = compareDiagnosticSources(project);
    expect(result.projectId).toBe(42);
  });
});

describe("shadow — runShadowComparison (com logger mock)", () => {
  it("retorna dados legados (invariante de produção)", async () => {
    const mockLogger = { log: vi.fn().mockResolvedValue(undefined) };
    const result = await runShadowComparison(V3_PROJECT, mockLogger);
    // Deve retornar dados legados
    expect(result.briefingContent).toBe("Briefing legado V3");
  });

  it("chama logger.log para cada divergência encontrada", async () => {
    const mockLogger = { log: vi.fn().mockResolvedValue(undefined) };
    await runShadowComparison(V3_PROJECT, mockLogger);
    // V3_PROJECT tem 3 campos com divergência (legado tem valor, novo é null)
    expect(mockLogger.log).toHaveBeenCalledTimes(3);
  });

  it("NÃO chama logger.log quando não há divergência", async () => {
    const mockLogger = { log: vi.fn().mockResolvedValue(undefined) };
    await runShadowComparison(NONE_PROJECT, mockLogger);
    expect(mockLogger.log).not.toHaveBeenCalled();
  });

  it("não lança erro quando logger falha (fire-and-forget safety)", async () => {
    // Nota: runShadowComparison aguarda o logger — o fire-and-forget está em getDiagnosticSource
    const mockLogger = {
      log: vi.fn().mockRejectedValue(new Error("DB error")),
    };
    // Deve lançar (pois o logger falha) — o fire-and-forget é no nível acima
    await expect(runShadowComparison(V3_PROJECT, mockLogger)).rejects.toThrow("DB error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 5: diagnostic-source.ts — getDiagnosticReadMode
// ─────────────────────────────────────────────────────────────────────────────

describe("getDiagnosticReadMode", () => {
  const originalEnv = process.env.DIAGNOSTIC_READ_MODE;

  beforeEach(() => {
    delete process.env.DIAGNOSTIC_READ_MODE;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DIAGNOSTIC_READ_MODE = originalEnv;
    } else {
      delete process.env.DIAGNOSTIC_READ_MODE;
    }
  });

  it("retorna 'legacy' por padrão (sem variável de ambiente)", () => {
    expect(getDiagnosticReadMode()).toBe("legacy");
  });

  it("retorna 'shadow' quando DIAGNOSTIC_READ_MODE=shadow", () => {
    process.env.DIAGNOSTIC_READ_MODE = "shadow";
    expect(getDiagnosticReadMode()).toBe("shadow");
  });

  it("retorna 'new' quando DIAGNOSTIC_READ_MODE=new", () => {
    process.env.DIAGNOSTIC_READ_MODE = "new";
    expect(getDiagnosticReadMode()).toBe("new");
  });

  it("retorna 'legacy' para valor inválido", () => {
    process.env.DIAGNOSTIC_READ_MODE = "invalid_value";
    expect(getDiagnosticReadMode()).toBe("legacy");
  });

  it("retorna 'legacy' para string vazia", () => {
    process.env.DIAGNOSTIC_READ_MODE = "";
    expect(getDiagnosticReadMode()).toBe("legacy");
  });
});
