/**
 * MASP sweep (#1167) — arrays .max(N) dos schemas de geração LLM (fora do briefing).
 * Mesmo padrão do #1166/#1160: trunca em vez de falhar o parse (T=0 → retry não resolve).
 */
import { describe, it, expect, vi } from "vitest";
import {
  CnaesResponseSchema,
  QuestionsResponseSchema,
  RisksResponseSchema,
  TasksResponseSchema,
  DecisaoRecomendadaSchema,
} from "./ai-schemas";

const cnae = (i: number) => ({ code: `123${i}-5/00`, description: "Desc", confidence: 90 });
const question = (i: number) => ({ id: `q${i}`, text: "Pergunta de diagnóstico?" });
const risk = (i: number) => ({ id: `r${i}`, evento: "Evento de risco tributário" });
const task = (i: number) => ({ id: `t${i}`, titulo: "Tarefa de adequação fiscal" });
const decisao = (passos: string[]) => ({
  acao_principal: "Ação principal recomendada",
  risco_se_nao_fazer: "Risco relevante se não agir",
  proximos_passos: passos,
});

describe("MASP sweep #1167 — schemas de geração LLM truncam em vez de falhar", () => {
  it("cnaes > 6 → trunca para 6 + console.warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = CnaesResponseSchema.parse({ cnaes: Array.from({ length: 8 }, (_, i) => cnae(i)) });
    expect(out.cnaes).toHaveLength(6);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it("cnaes no limite (6) → não trunca", () => {
    expect(CnaesResponseSchema.parse({ cnaes: Array.from({ length: 6 }, (_, i) => cnae(i)) }).cnaes).toHaveLength(6);
  });

  it("questions > 20 → trunca para 20", () => {
    const out = QuestionsResponseSchema.parse({ questions: Array.from({ length: 25 }, (_, i) => question(i)) });
    expect(out.questions).toHaveLength(20);
  });
  it("questions no limite (20) → não trunca", () => {
    expect(QuestionsResponseSchema.parse({ questions: Array.from({ length: 20 }, (_, i) => question(i)) }).questions).toHaveLength(20);
  });

  it("risks > 12 → trunca para 12", () => {
    const out = RisksResponseSchema.parse({ risks: Array.from({ length: 15 }, (_, i) => risk(i)) });
    expect(out.risks).toHaveLength(12);
  });
  it("risks no limite (12) → não trunca", () => {
    expect(RisksResponseSchema.parse({ risks: Array.from({ length: 12 }, (_, i) => risk(i)) }).risks).toHaveLength(12);
  });

  it("tasks > 12 → trunca para 12", () => {
    const out = TasksResponseSchema.parse({ tasks: Array.from({ length: 15 }, (_, i) => task(i)) });
    expect(out.tasks).toHaveLength(12);
  });
  it("tasks no limite (12) e dentro (5) → não trunca", () => {
    expect(TasksResponseSchema.parse({ tasks: Array.from({ length: 12 }, (_, i) => task(i)) }).tasks).toHaveLength(12);
    expect(TasksResponseSchema.parse({ tasks: Array.from({ length: 5 }, (_, i) => task(i)) }).tasks).toHaveLength(5);
  });

  it("proximos_passos > 3 → trunca para 3", () => {
    expect(DecisaoRecomendadaSchema.parse(decisao(["a", "b", "c", "d", "e"])).proximos_passos).toHaveLength(3);
  });
  it("proximos_passos no limite (3) → não trunca", () => {
    expect(DecisaoRecomendadaSchema.parse(decisao(["a", "b", "c"])).proximos_passos).toHaveLength(3);
  });
});
