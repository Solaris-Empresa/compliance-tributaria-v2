/**
 * k2-onda1-injector.test.ts — Testes K-2: Pipeline Onda 1 no questionEngine
 * Sprint K — ADR-011
 *
 * Testa:
 *   T-K2-01: mapToOnda1Question — campos obrigatórios corretos
 *   T-K2-02: fonte sempre "solaris"
 *   T-K2-03: requirement_id prefixado com "SQ-"
 *   T-K2-04: obrigatorio=1 → peso_risco="alto", required=true
 *   T-K2-05: obrigatorio=0 → peso_risco="medio", required=false
 *   T-K2-06: injectOnda1IntoQuestions — Onda 1 vem ANTES das regulatórias
 *   T-K2-07: injectOnda1IntoQuestions — sem Onda 1 retorna apenas regulatório
 *   T-K2-08: injectOnda1IntoQuestions — IDs sq-* não colidem com q1, q2...
 *   T-K2-09: getOnda1Questions — filtra por cnaeGroups corretamente
 *   T-K2-10: getOnda1Questions — pergunta universal (cnaeGroups=null) aparece para qualquer CNAE
 *   T-K2-11: cnaeCode com "/" é normalizado para prefixo antes do "/"
 *   T-K2-12: injectOnda1IntoQuestions — total = onda1 + regulatorio
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock do db.getSolarisQuestions para isolar do banco real
// ---------------------------------------------------------------------------

vi.mock("./db", () => ({
  getSolarisQuestions: vi.fn(),
}));

import { getSolarisQuestions } from "./db";
import {
  getOnda1Questions,
  injectOnda1IntoQuestions,
  type Onda1Question,
} from "./routers/onda1Injector";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockQuestionObrigatorio = {
  id: 1,
  texto: "A empresa possui mapeamento de NCM atualizado?",
  categoria: "NCM",
  cnaeGroups: null, // universal
  obrigatorio: 1,
  ativo: 1,
  observacao: "Verificar NCM conforme LC 214/2025",
  fonte: "solaris",
  criadoPorId: null,
  criadoEm: 1700000000000,
  atualizadoEm: 1700000000000,
};

const mockQuestionOpcional = {
  id: 2,
  texto: "A empresa possui CEST cadastrado?",
  categoria: "CEST",
  cnaeGroups: ["11", "1113-5"], // apenas cervejarias
  obrigatorio: 0,
  ativo: 1,
  observacao: null,
  fonte: "solaris",
  criadoPorId: null,
  criadoEm: 1700000000000,
  atualizadoEm: 1700000000000,
};

const mockRegulatorioQuestions: Onda1Question[] = [
  {
    id: "q1",
    text: "Pergunta regulatória 1",
    objetivo_diagnostico: "Diagnóstico LC 214",
    impacto_reforma: "IBS/CBS",
    type: "sim_nao",
    peso_risco: "alto",
    required: true,
    options: [],
    scale_labels: undefined,
    placeholder: undefined,
    fonte: "regulatorio",
    requirement_id: "RF-001",
    source_reference: "LC 214/2025 Art. 9",
  },
  {
    id: "q2",
    text: "Pergunta regulatória 2",
    objetivo_diagnostico: "Diagnóstico EC 132",
    impacto_reforma: "IS",
    type: "sim_nao",
    peso_risco: "medio",
    required: true,
    options: [],
    scale_labels: undefined,
    placeholder: undefined,
    fonte: "regulatorio",
    requirement_id: "RF-002",
    source_reference: "EC 132/2023 Art. 1",
  },
];

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("K-2: Onda 1 Injector — getOnda1Questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T-K2-01: campos obrigatórios presentes na pergunta mapeada", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([mockQuestionObrigatorio] as any);
    const questions = await getOnda1Questions("1113-5/02");
    expect(questions).toHaveLength(1);
    const q = questions[0];
    expect(q.id).toBeDefined();
    expect(q.text).toBeDefined();
    expect(q.type).toBeDefined();
    expect(q.fonte).toBeDefined();
    expect(q.requirement_id).toBeDefined();
    expect(q.source_reference).toBeDefined();
  });

  it("T-K2-02: fonte sempre 'solaris'", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([mockQuestionObrigatorio] as any);
    const questions = await getOnda1Questions("1113-5");
    expect(questions[0].fonte).toBe("solaris");
  });

  it("T-K2-03: requirement_id prefixado com 'SQ-'", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([mockQuestionObrigatorio] as any);
    const questions = await getOnda1Questions("1113-5");
    expect(questions[0].requirement_id).toBe("SQ-1");
  });

  it("T-K2-04: obrigatorio=1 → peso_risco='alto' e required=true", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([mockQuestionObrigatorio] as any);
    const questions = await getOnda1Questions("1113-5");
    expect(questions[0].peso_risco).toBe("alto");
    expect(questions[0].required).toBe(true);
  });

  it("T-K2-05: obrigatorio=0 → peso_risco='medio' e required=false", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([mockQuestionOpcional] as any);
    const questions = await getOnda1Questions("1113-5");
    expect(questions[0].peso_risco).toBe("medio");
    expect(questions[0].required).toBe(false);
  });

  it("T-K2-09: filtra por cnaeGroups — CNAE compatível retorna pergunta", async () => {
    // getSolarisQuestions já faz o filtro; mock retorna a pergunta filtrada
    vi.mocked(getSolarisQuestions).mockResolvedValue([mockQuestionOpcional] as any);
    const questions = await getOnda1Questions("1113-5");
    expect(questions).toHaveLength(1);
  });

  it("T-K2-10: pergunta universal (cnaeGroups=null) aparece para qualquer CNAE", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([mockQuestionObrigatorio] as any);
    const questions = await getOnda1Questions("4711-3/01"); // varejo — CNAE diferente
    expect(questions).toHaveLength(1);
    expect(questions[0].fonte).toBe("solaris");
  });

  it("T-K2-11: cnaeCode com '/' é normalizado — getSolarisQuestions recebe apenas prefixo", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([]);
    await getOnda1Questions("1113-5/02");
    expect(getSolarisQuestions).toHaveBeenCalledWith("1113-5");
  });
});

describe("K-2: Onda 1 Injector — injectOnda1IntoQuestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T-K2-06: Onda 1 vem ANTES das perguntas regulatórias", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([mockQuestionObrigatorio] as any);
    const result = await injectOnda1IntoQuestions("1113-5", mockRegulatorioQuestions);
    expect(result[0].fonte).toBe("solaris");
    expect(result[1].fonte).toBe("regulatorio");
    expect(result[2].fonte).toBe("regulatorio");
  });

  it("T-K2-07: sem Onda 1 (banco vazio) retorna apenas regulatório inalterado", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([]);
    const result = await injectOnda1IntoQuestions("9999-9", mockRegulatorioQuestions);
    expect(result).toHaveLength(2);
    expect(result.every(q => q.fonte !== "solaris")).toBe(true);
  });

  it("T-K2-08: IDs sq-* não colidem com q1, q2 das regulatórias", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([mockQuestionObrigatorio] as any);
    const result = await injectOnda1IntoQuestions("1113-5", mockRegulatorioQuestions);
    const ids = result.map(q => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length); // sem duplicatas
    expect(ids[0]).toMatch(/^sq-/); // Onda 1 primeiro
  });

  it("T-K2-12: total = onda1 + regulatorio", async () => {
    vi.mocked(getSolarisQuestions).mockResolvedValue([
      mockQuestionObrigatorio,
      mockQuestionOpcional,
    ] as any);
    const result = await injectOnda1IntoQuestions("1113-5", mockRegulatorioQuestions);
    const onda1Count = result.filter(q => q.fonte === "solaris").length;
    const regulatorioCount = result.filter(q => q.fonte !== "solaris").length;
    expect(onda1Count).toBe(2);
    expect(regulatorioCount).toBe(2);
    expect(result).toHaveLength(4);
  });
});
