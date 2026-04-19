import { describe, it, expect } from "vitest";
import { computeExecutionScore } from "./compute-execution-score";

describe("computeExecutionScore", () => {
  it("retorna no_plans_yet quando nao ha planos nem tasks", () => {
    const result = computeExecutionScore([], []);
    expect(result).toEqual({ state: "no_plans_yet" });
  });

  it("calcula 60% quando 3 de 5 tasks estao done", () => {
    const plans = [{ status: "aprovado" }];
    const tasks = [
      { status: "done" },
      { status: "done" },
      { status: "done" },
      { status: "todo" },
      { status: "doing" },
    ];
    const result = computeExecutionScore(plans, tasks);
    expect(result).toEqual({
      percent: 60,
      plans: { approved: 1, total: 1 },
      tasks: { done: 3, total: 5 },
    });
  });

  it("calcula 100% quando todas as tasks estao done", () => {
    const plans = [{ status: "aprovado" }, { status: "aprovado" }];
    const tasks = [{ status: "done" }, { status: "done" }];
    const result = computeExecutionScore(plans, tasks);
    expect(result).toEqual({
      percent: 100,
      plans: { approved: 2, total: 2 },
      tasks: { done: 2, total: 2 },
    });
  });

  it("calcula 0% quando nenhuma task esta done mas existem tasks", () => {
    const plans = [{ status: "rascunho" }];
    const tasks = [{ status: "todo" }, { status: "doing" }];
    const result = computeExecutionScore(plans, tasks);
    expect(result).toEqual({
      percent: 0,
      plans: { approved: 0, total: 1 },
      tasks: { done: 0, total: 2 },
    });
  });

  it("arredonda com Math.round quando percentual nao e inteiro", () => {
    const plans = [{ status: "aprovado" }];
    const tasks = [
      { status: "done" },
      { status: "todo" },
      { status: "todo" },
    ];
    const result = computeExecutionScore(plans, tasks);
    expect(result).toMatchObject({ percent: 33 });
  });

  it("conta apenas planos com status aprovado", () => {
    const plans = [
      { status: "aprovado" },
      { status: "rascunho" },
      { status: "em_execucao" },
    ];
    const tasks = [{ status: "done" }];
    const result = computeExecutionScore(plans, tasks);
    expect(result).toMatchObject({
      plans: { approved: 1, total: 3 },
    });
  });

  it("retorna percent=0 quando ha planos mas 0 tasks", () => {
    const plans = [{ status: "aprovado" }];
    const tasks: { status: string }[] = [];
    const result = computeExecutionScore(plans, tasks);
    expect(result).toEqual({
      percent: 0,
      plans: { approved: 1, total: 1 },
      tasks: { done: 0, total: 0 },
    });
  });
});
