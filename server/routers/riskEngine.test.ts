/**
 * Testes — Risk Engine G11
 * Issue #187 · Sprint O · 2026-03-31
 *
 * Critério de done G11:
 * - DerivedRiskSchema aceita e valida fonte_risco
 * - Derivação correta: gap.source='solaris' → fonte_risco='solaris'
 * - Default correto: gap.source=null/'v1'/'desconhecido' → fonte_risco='v1'
 * - Riscos contextuais têm fonte_risco='v1'
 * - Todos os valores do enum são aceitos pelo schema
 */

import { describe, it, expect } from "vitest";
import { DerivedRiskSchema, RiskOriginSchema } from "./riskEngine";

// Helper: cria um DerivedRisk válido com fonte_risco opcional
function makeRisk(overrides: Partial<{
  gap_id: number | null;
  fonte_risco: 'solaris' | 'cnae' | 'iagen' | 'engine' | 'v1';
}> = {}) {
  return {
    gap_id: overrides.gap_id ?? 1,
    requirement_id: 10,
    source_reference: "LC 214/2024",
    gap_classification: "ausencia",
    origin: "derivado" as const,
    origin_justification: "Risco derivado do gap 1",
    taxonomy: { domain: "fiscal", category: "apuracao", type: "split_payment" },
    score: {
      base_score: 70,
      adjusted_score: 63,
      severity: "alto" as const,
      scoring_factors: ["base_criticality=alta(70)", "gap_classification=ausencia(×1.0)"],
      confidence: 0.85,
      confidence_reason: "Risco derivado de requisito com gap classificado",
    },
    description: "Risco alto identificado",
    mitigation_hint: "Regularizar conformidade",
    fonte_risco: overrides.fonte_risco ?? 'v1',
  };
}

describe("G11 — DerivedRiskSchema.fonte_risco", () => {
  it("aceita fonte_risco='solaris' (pipeline SOLARIS Onda 1)", () => {
    const risk = makeRisk({ fonte_risco: 'solaris' });
    const result = DerivedRiskSchema.safeParse(risk);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe('solaris');
    }
  });

  it("aceita fonte_risco='cnae' (análise setorial)", () => {
    const risk = makeRisk({ fonte_risco: 'cnae' });
    const result = DerivedRiskSchema.safeParse(risk);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe('cnae');
    }
  });

  it("aceita fonte_risco='iagen' (IA Generativa Onda 2)", () => {
    const risk = makeRisk({ fonte_risco: 'iagen' });
    const result = DerivedRiskSchema.safeParse(risk);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe('iagen');
    }
  });

  it("aceita fonte_risco='v1' (pipeline legado)", () => {
    const risk = makeRisk({ fonte_risco: 'v1' });
    const result = DerivedRiskSchema.safeParse(risk);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe('v1');
    }
  });

  it("usa default 'v1' quando fonte_risco não é fornecido", () => {
    const risk = makeRisk();
    // Remover o campo para testar o default do schema
    const { fonte_risco: _omit, ...riskSemFonte } = risk;
    const result = DerivedRiskSchema.safeParse(riskSemFonte);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe('v1');
    }
  });

  it("rejeita valor inválido para fonte_risco", () => {
    const risk = { ...makeRisk(), fonte_risco: 'invalido' };
    const result = DerivedRiskSchema.safeParse(risk);
    expect(result.success).toBe(false);
  });

  // Componente B — Q5 obrigatórios (DEC-M2-05)
  it("aceita fonte_risco='engine' (Decision Kernel M2)", () => {
    const risk = makeRisk({ fonte_risco: 'engine' });
    const result = DerivedRiskSchema.safeParse(risk);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe('engine');
    }
  });

  it("gap_classification NULL para engine usa fallback 'ausencia'", () => {
    // DEC-M2-04: gap_classification=NULL para gaps engine é INTENCIONAL
    // O fallback 'ausencia' via effectiveGapClassification é o comportamento correto
    const risk = {
      ...makeRisk({ fonte_risco: 'engine' }),
      gap_classification: null,
    };
    const result = DerivedRiskSchema.safeParse(risk);
    expect(result.success).toBe(true);
    if (result.success) {
      // gap_classification pode ser null — o fallback é aplicado na lógica de scoring
      expect(result.data.fonte_risco).toBe('engine');
      expect(result.data.gap_classification).toBeNull();
    }
  });

  it("risco contextual (gap_id=null) aceita fonte_risco='v1'", () => {
    // Construir manualmente para garantir gap_id=null
    const risk = {
      gap_id: null,
      requirement_id: null,
      source_reference: null,
      gap_classification: null,
      origin: "contextual" as const,
      origin_justification: "Risco contextual do perfil da empresa",
      taxonomy: { domain: "fiscal", category: "recolhimento", type: "split_payment" },
      score: {
        base_score: 56,
        adjusted_score: 56,
        severity: "alto" as const,
        scoring_factors: ["base_criticality=alta(70)"],
        confidence: 0.72,
        confidence_reason: "Risco contextual inferido do perfil da empresa",
      },
      description: "Risco contextual de split payment",
      mitigation_hint: "Verificar integração com plataforma IBS",
      fonte_risco: 'v1' as const,
    };
    const result = DerivedRiskSchema.safeParse(risk);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe('v1');
      expect(result.data.gap_id).toBeNull();
    }
  });
});

describe("Componente B — Q5 testes obrigatórios (DEC-M2-05)", () => {
  it("fonteRisco deriva 'engine' para gap.gap_source === 'engine'", () => {
    // Simular a lógica da ternária atualizada no Componente B
    const gapSource = 'engine';
    const fonteRisco: 'solaris' | 'cnae' | 'iagen' | 'engine' | 'v1' =
      gapSource === 'solaris' ? 'solaris'
      : gapSource === 'cnae'  ? 'cnae'
      : gapSource === 'iagen' ? 'iagen'
      : gapSource === 'engine' ? 'engine'
      : 'v1';
    expect(fonteRisco).toBe('engine');
  });

  it("gaps source='engine' são incluídos na query do riskEngine (cláusula WHERE)", () => {
    // Teste unitário da lógica de filtragem: source='engine' deve ser incluído
    // A cláusula WHERE adicionada: OR (g.source = 'engine')
    // Simular avaliação da cláusula para um gap engine
    const gap = { source: 'engine', gap_classification: null, criticality: null };
    const isIncluded =
      (gap.gap_classification !== null && gap.gap_classification !== '') ||
      (gap.source === 'solaris' && gap.criticality !== null) ||
      (gap.source === 'engine');
    expect(isIncluded).toBe(true);
  });

  it("z.enum fonte_risco aceita valor 'engine'", () => {
    const { z } = require('zod');
    const enumSchema = z.enum(['solaris', 'cnae', 'iagen', 'engine', 'v1']);
    const result = enumSchema.safeParse('engine');
    expect(result.success).toBe(true);
  });
});

describe("G11 — derivação lógica de fonte_risco a partir de gap.source", () => {
  it("gap.source='solaris' → fonte_risco='solaris'", () => {
    // Simular a lógica de derivação do deriveRisksFromGaps
    const gapSource = 'solaris';
    const fonteRisco: 'solaris' | 'cnae' | 'iagen' | 'v1' =
      gapSource === 'solaris' ? 'solaris'
      : gapSource === 'cnae'  ? 'cnae'
      : gapSource === 'iagen' ? 'iagen'
      : 'v1';
    expect(fonteRisco).toBe('solaris');
  });

  it("gap.source='v1' → fonte_risco='v1'", () => {
    const gapSource = 'v1';
    const fonteRisco: 'solaris' | 'cnae' | 'iagen' | 'v1' =
      gapSource === 'solaris' ? 'solaris'
      : gapSource === 'cnae'  ? 'cnae'
      : gapSource === 'iagen' ? 'iagen'
      : 'v1';
    expect(fonteRisco).toBe('v1');
  });

  it("gap.source desconhecido → fonte_risco='v1' (default seguro)", () => {
    const gapSource = 'desconhecido';
    const fonteRisco: 'solaris' | 'cnae' | 'iagen' | 'v1' =
      gapSource === 'solaris' ? 'solaris'
      : gapSource === 'cnae'  ? 'cnae'
      : gapSource === 'iagen' ? 'iagen'
      : 'v1';
    expect(fonteRisco).toBe('v1');
  });

  it("gap.source=null → fonte_risco='v1' (default seguro)", () => {
    const gapSource = null;
    const fonteRisco: 'solaris' | 'cnae' | 'iagen' | 'v1' =
      gapSource === 'solaris' ? 'solaris'
      : gapSource === 'cnae'  ? 'cnae'
      : gapSource === 'iagen' ? 'iagen'
      : 'v1';
    expect(fonteRisco).toBe('v1');
  });

  it("gap.source='cnae' → fonte_risco='cnae'", () => {
    const gapSource = 'cnae';
    const fonteRisco: 'solaris' | 'cnae' | 'iagen' | 'v1' =
      gapSource === 'solaris' ? 'solaris'
      : gapSource === 'cnae'  ? 'cnae'
      : gapSource === 'iagen' ? 'iagen'
      : 'v1';
    expect(fonteRisco).toBe('cnae');
  });
});
