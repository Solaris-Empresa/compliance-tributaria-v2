/**
 * Sprint I — G9 + G10: evidencia_regulatoria e acao_concreta obrigatórios
 *
 * Critérios de aceite:
 * G9-1: RiskItemSchema rejeita evidencia_regulatoria ausente
 * G9-2: RiskItemSchema rejeita evidencia_regulatoria genérica (< 10 chars)
 * G9-3: RiskItemSchema aceita evidencia_regulatoria com artigo específico
 * G9-4: TaskItemSchema rejeita evidencia_regulatoria ausente
 * G9-5: TaskItemSchema rejeita evidencia_regulatoria com .catch() silencioso (removido)
 * G9-6: TaskItemSchema aceita evidencia_regulatoria com artigo específico
 * G10-1: TaskItemSchema rejeita acao_concreta ausente
 * G10-2: TaskItemSchema rejeita acao_concreta com < 20 chars
 * G10-3: TaskItemSchema aceita acao_concreta descritiva (>= 20 chars)
 * G10-4: TaskItemSchema aceita criterio_de_conclusao opcional
 * G10-5: TaskItemSchema aceita tarefa completa com todos os campos obrigatórios
 */

import { describe, it, expect } from "vitest";
import { RiskItemSchema, TaskItemSchema } from "./ai-schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures base
// ─────────────────────────────────────────────────────────────────────────────

const baseRisk = {
  id: "r1",
  evento: "Risco de alíquota IBS sobre serviços",
  probabilidade: "Alta",
  impacto: "Alto",
  severidade: "Crítica",
  severidade_score: 9,
};

const baseTask = {
  id: "t1",
  titulo: "Revisar contratos de prestação de serviço",
  descricao: "1. Mapear contratos vigentes\n2. Identificar impactos IBS/CBS\n3. Renegociar cláusulas tributárias",
  area: "contabilidade" as const,
  prazo_sugerido: "30 dias" as const,
  prioridade: "Alta" as const,
  responsavel_sugerido: "Controller Fiscal",
  objetivo_diagnostico: "Adequar contratos ao novo regime IBS/CBS",
};

// ─────────────────────────────────────────────────────────────────────────────
// G9 — RiskItemSchema: evidencia_regulatoria obrigatória
// ─────────────────────────────────────────────────────────────────────────────

describe("G9 — RiskItemSchema: evidencia_regulatoria obrigatória", () => {
  it("G9-1: rejeita risco sem evidencia_regulatoria", () => {
    const result = RiskItemSchema.safeParse({ ...baseRisk });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(e => e.path.join("."));
      expect(paths).toContain("evidencia_regulatoria");
    }
  });

  it("G9-2: rejeita evidencia_regulatoria com menos de 10 caracteres", () => {
    const result = RiskItemSchema.safeParse({
      ...baseRisk,
      evidencia_regulatoria: "EC 132", // 6 chars — genérico demais
    });
    expect(result.success).toBe(false);
  });

  it("G9-3: aceita evidencia_regulatoria com artigo específico", () => {
    const result = RiskItemSchema.safeParse({
      ...baseRisk,
      evidencia_regulatoria: "Art. 9 LC 214/2025",
    });
    expect(result.success).toBe(true);
  });

  it("G9-3b: aceita evidencia_regulatoria com artigo EC 132", () => {
    const result = RiskItemSchema.safeParse({
      ...baseRisk,
      evidencia_regulatoria: "Art. 156-A EC 132/2023",
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G9 — TaskItemSchema: evidencia_regulatoria obrigatória (sem .catch())
// ─────────────────────────────────────────────────────────────────────────────

describe("G9 — TaskItemSchema: evidencia_regulatoria obrigatória", () => {
  it("G9-4: rejeita tarefa sem evidencia_regulatoria", () => {
    const result = TaskItemSchema.safeParse({
      ...baseTask,
      acao_concreta: "Contratar consultoria tributária especializada em IBS/CBS",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(e => e.path.join("."));
      expect(paths).toContain("evidencia_regulatoria");
    }
  });

  it("G9-5: rejeita evidencia_regulatoria com menos de 10 chars (sem fallback silencioso)", () => {
    const result = TaskItemSchema.safeParse({
      ...baseTask,
      evidencia_regulatoria: "LC 214", // 6 chars — o antigo .catch() aceitaria, agora rejeita
      acao_concreta: "Contratar consultoria tributária especializada em IBS/CBS",
    });
    expect(result.success).toBe(false);
  });

  it("G9-6: aceita evidencia_regulatoria com artigo específico", () => {
    const result = TaskItemSchema.safeParse({
      ...baseTask,
      evidencia_regulatoria: "Art. 9 LC 214/2025",
      acao_concreta: "Contratar consultoria tributária especializada em IBS/CBS",
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G10 — TaskItemSchema: acao_concreta obrigatória
// ─────────────────────────────────────────────────────────────────────────────

describe("G10 — TaskItemSchema: acao_concreta obrigatória", () => {
  it("G10-1: rejeita tarefa sem acao_concreta", () => {
    const result = TaskItemSchema.safeParse({
      ...baseTask,
      evidencia_regulatoria: "Art. 9 LC 214/2025",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(e => e.path.join("."));
      expect(paths).toContain("acao_concreta");
    }
  });

  it("G10-2: rejeita acao_concreta com menos de 20 chars", () => {
    const result = TaskItemSchema.safeParse({
      ...baseTask,
      evidencia_regulatoria: "Art. 9 LC 214/2025",
      acao_concreta: "Contratar empresa", // 17 chars — abaixo do mínimo
    });
    expect(result.success).toBe(false);
  });

  it("G10-3: aceita acao_concreta descritiva (>= 20 chars)", () => {
    const result = TaskItemSchema.safeParse({
      ...baseTask,
      evidencia_regulatoria: "Art. 9 LC 214/2025",
      acao_concreta: "Contratar consultoria tributária especializada em IBS/CBS até 30/04/2026",
    });
    expect(result.success).toBe(true);
  });

  it("G10-4: aceita tarefa com criterio_de_conclusao opcional", () => {
    const result = TaskItemSchema.safeParse({
      ...baseTask,
      evidencia_regulatoria: "Art. 9 LC 214/2025",
      acao_concreta: "Contratar consultoria tributária especializada em IBS/CBS até 30/04/2026",
      criterio_de_conclusao: "Relatório de adequação assinado pelo Controller Fiscal",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.criterio_de_conclusao).toBe("Relatório de adequação assinado pelo Controller Fiscal");
    }
  });

  it("G10-5: aceita tarefa completa com todos os campos obrigatórios G9+G10", () => {
    const result = TaskItemSchema.safeParse({
      ...baseTask,
      evidencia_regulatoria: "Art. 156-A EC 132/2023 — regime IBS",
      acao_concreta: "Mapear todos os contratos de prestação de serviço e identificar impacto IBS/CBS",
      criterio_de_conclusao: "100% dos contratos mapeados com planilha de impacto tributário validada",
      cnae_origem: "6201-5/01",
      gap_especifico: "Ausência de cláusula de reajuste por variação de alíquota IBS/CBS",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.evidencia_regulatoria).toContain("Art.");
      expect(result.data.acao_concreta.length).toBeGreaterThanOrEqual(20);
    }
  });
});
