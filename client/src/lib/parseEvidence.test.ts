/**
 * Unit tests for parseEvidence hotfix — ConsolidatedEvidence → EvidenceItem[]
 * Validates that the frontend correctly maps backend ConsolidatedEvidence
 * objects (with .gaps[]) to the EvidenceItem[] format used by EvidencePanel.
 */
import { describe, it, expect } from "vitest";

// ─── Replicate types from RiskDashboardV4.tsx ────────────────────────────────

interface EvidenceItem {
  fonte?: string;
  prioridade?: string;
  pergunta?: string;
  resposta?: string;
  confianca?: number;
  [key: string]: unknown;
}

interface ConsolidatedEvidenceGap {
  ruleId?: string;
  fonte?: string;
  gapClassification?: string;
  sourceReference?: string;
  artigo?: string;
  confidence?: number;
  weight?: number;
  questionId?: number | null;
  answerValue?: string | null;
  gapId?: number | null;
  questionSource?: string | null;
}

interface ConsolidatedEvidence {
  gaps?: ConsolidatedEvidenceGap[];
  rag_validated?: boolean;
  rag_confidence?: number;
  rag_artigo_exato?: string;
  rag_trecho_legal?: string;
  archetype_context?: string;
}

// ─── Replicate parseEvidence logic ───────────────────────────────────────────

function parseEvidence(raw: EvidenceItem[] | string | ConsolidatedEvidence): EvidenceItem[] {
  if (Array.isArray(raw)) return raw;

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { return []; }
    if (Array.isArray(parsed)) return parsed as EvidenceItem[];
  }

  const obj = parsed as ConsolidatedEvidence;
  if (obj && typeof obj === "object" && Array.isArray(obj.gaps)) {
    return obj.gaps.map((gap) => ({
      fonte: gap.fonte ?? undefined,
      prioridade: gap.gapClassification ?? undefined,
      pergunta: gap.sourceReference
        ? `[${gap.ruleId ?? "regra"}] ${gap.sourceReference}`
        : (gap.ruleId ?? undefined),
      resposta: gap.answerValue ?? undefined,
      confianca: gap.confidence ?? undefined,
    }));
  }

  return [];
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("parseEvidence (hotfix EvidencePanel)", () => {
  it("should return empty array for empty string", () => {
    expect(parseEvidence("")).toEqual([]);
  });

  it("should return empty array for invalid JSON string", () => {
    expect(parseEvidence("not json")).toEqual([]);
  });

  it("should pass through an existing EvidenceItem array", () => {
    const items: EvidenceItem[] = [
      { fonte: "solaris", pergunta: "Q1", resposta: "Sim", confianca: 0.9 },
    ];
    expect(parseEvidence(items)).toEqual(items);
  });

  it("should parse a JSON string containing an array", () => {
    const items: EvidenceItem[] = [{ fonte: "iagen", pergunta: "Q2" }];
    expect(parseEvidence(JSON.stringify(items))).toEqual(items);
  });

  it("should map ConsolidatedEvidence object (real production format) to EvidenceItem[]", () => {
    const consolidated: ConsolidatedEvidence = {
      gaps: [
        {
          ruleId: "regime_diferenciado",
          fonte: "solaris",
          gapClassification: "ausencia",
          sourceReference: "EC 132, LC 214",
          artigo: "Art. 29",
          confidence: 1,
          weight: 0.25,
          questionId: null,
          answerValue: null,
          gapId: null,
          questionSource: null,
        },
        {
          ruleId: "split_payment",
          fonte: "iagen",
          gapClassification: "parcial",
          sourceReference: "Art. 9 LC 214/2025",
          artigo: "Art. 9",
          confidence: 0.85,
          weight: 0.5,
          questionId: 42,
          answerValue: "Sim",
          gapId: 7,
          questionSource: "iagen",
        },
      ],
      rag_validated: true,
      rag_confidence: 0.8,
      rag_artigo_exato: "Art. 29",
      rag_trecho_legal: "O regime diferenciado...",
      archetype_context: "operadora_regulada",
    };

    const result = parseEvidence(consolidated);

    expect(result).toHaveLength(2);

    // First gap: no answerValue
    expect(result[0].fonte).toBe("solaris");
    expect(result[0].prioridade).toBe("ausencia");
    expect(result[0].pergunta).toBe("[regime_diferenciado] EC 132, LC 214");
    expect(result[0].resposta).toBeUndefined();
    expect(result[0].confianca).toBe(1);

    // Second gap: with answerValue
    expect(result[1].fonte).toBe("iagen");
    expect(result[1].prioridade).toBe("parcial");
    expect(result[1].pergunta).toBe("[split_payment] Art. 9 LC 214/2025");
    expect(result[1].resposta).toBe("Sim");
    expect(result[1].confianca).toBe(0.85);
  });

  it("should handle ConsolidatedEvidence as JSON string", () => {
    const consolidated: ConsolidatedEvidence = {
      gaps: [
        {
          ruleId: "confissao_automatica",
          fonte: "solaris",
          gapClassification: "ausencia",
          sourceReference: "Art. 45 LC 214/2025",
          confidence: 1,
        },
      ],
      rag_validated: false,
      rag_confidence: 0,
    };

    const result = parseEvidence(JSON.stringify(consolidated));

    expect(result).toHaveLength(1);
    expect(result[0].fonte).toBe("solaris");
    expect(result[0].pergunta).toBe("[confissao_automatica] Art. 45 LC 214/2025");
  });

  it("should return empty array for ConsolidatedEvidence with empty gaps", () => {
    const consolidated: ConsolidatedEvidence = {
      gaps: [],
      rag_validated: true,
      rag_confidence: 0.5,
    };
    expect(parseEvidence(consolidated)).toEqual([]);
  });

  it("should return empty array for object without gaps field", () => {
    const obj = { rag_validated: true, rag_confidence: 0.5 } as ConsolidatedEvidence;
    expect(parseEvidence(obj)).toEqual([]);
  });
});
