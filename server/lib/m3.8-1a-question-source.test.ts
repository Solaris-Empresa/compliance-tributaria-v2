/**
 * m3.8-1a-question-source.test.ts
 * Sprint M3.8 — Item 1A — Backend gapEngine retorna question_source
 *
 * Issue: #957
 * Spec: gapEngine.analyzeGaps deve retornar campo question_source em cada gap.
 * Em M3.8 Fase 1A, apenas 1 fonte é ativa (questionnaireAnswersV3 → "qcnae_onda3").
 * Gaps sem resposta correspondente recebem "regulatory_only".
 * M3.8-2 expandirá com outras fontes; M3.8-1B usará no frontend.
 *
 * REGRA-ORQ-27 Plano B: leitura source code + regex match.
 * Tests funcionais de gapEngine.analyzeGaps exigem DB integration — não cobertos aqui.
 *
 * Vinculadas:
 * - PR #956 — Lições #62 (Contexto vs Evidência) e #63 (Spec ≠ Viável)
 * - Issue #957 (esta)
 * - Issue #958 (M3.8-1B) — usa question_source para derivar sourceOrigin
 * - Issue #959 (M3.8-2) — expande para outras fontes
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const GAP_ENGINE_SRC = readFileSync(
  path.resolve(__dirname, "..", "routers", "gapEngine.ts"),
  "utf-8",
);

describe("M3.8-1A — Schema declara QuestionSource enum", () => {
  it("QuestionSourceSchema é zod enum com 6 valores", () => {
    expect(GAP_ENGINE_SRC).toMatch(/QuestionSourceSchema\s*=\s*z\.enum\(\[/);
    // Verifica os 6 valores canônicos
    expect(GAP_ENGINE_SRC).toMatch(/"qnbs_regulatorio"/);
    expect(GAP_ENGINE_SRC).toMatch(/"qnbs_solaris"/);
    expect(GAP_ENGINE_SRC).toMatch(/"solaris_onda1"/);
    expect(GAP_ENGINE_SRC).toMatch(/"iagen_onda2"/);
    expect(GAP_ENGINE_SRC).toMatch(/"qcnae_onda3"/);
    expect(GAP_ENGINE_SRC).toMatch(/"regulatory_only"/);
  });

  it("type QuestionSource é exportado", () => {
    expect(GAP_ENGINE_SRC).toMatch(/export\s+type\s+QuestionSource\s*=/);
  });

  it("GapSchema declara campo question_source obrigatório", () => {
    // Não permite optional/nullable — todo gap precisa ter question_source
    expect(GAP_ENGINE_SRC).toMatch(/question_source:\s*QuestionSourceSchema(?!\.optional|\.nullable)/);
  });
});

describe("M3.8-1A — answerMap registra questionSource", () => {
  it("type do answerMap inclui questionSource", () => {
    expect(GAP_ENGINE_SRC).toMatch(/questionSource:\s*QuestionSource/);
  });

  it("respostas de questionnaireAnswersV3 marcadas como qcnae_onda3", () => {
    // Em M3.8 Fase 1A, apenas 1 fonte é ativa
    expect(GAP_ENGINE_SRC).toMatch(/questionSource:\s*["']qcnae_onda3["']/);
  });
});

describe("M3.8-1A — Gap construído com question_source", () => {
  it("gap recebe question_source do answerData OU 'regulatory_only' como fallback", () => {
    expect(GAP_ENGINE_SRC).toMatch(
      /question_source:\s*answerData\?\.questionSource\s*\?\?\s*["']regulatory_only["']/
    );
  });

  it("comentário inline marca M3.8-1A como origem", () => {
    expect(GAP_ENGINE_SRC).toMatch(/M3\.8-1A.*fonte da resposta/i);
  });
});

describe("M3.8-1A — Preserva contratos existentes", () => {
  it("requirement_id continua obrigatório (ADR-010)", () => {
    expect(GAP_ENGINE_SRC).toMatch(/requirement_id:\s*z\.string\(\)\.min\(1\)/);
  });

  it("evaluation_confidence continua obrigatório (ADR-010)", () => {
    expect(GAP_ENGINE_SRC).toMatch(/evaluation_confidence:\s*z\.number\(\)\.min\(0\)\.max\(1\)/);
  });

  it("source_reference continua obrigatório", () => {
    expect(GAP_ENGINE_SRC).toMatch(/source_reference:\s*z\.string\(\)\.min\(1\)/);
  });
});
