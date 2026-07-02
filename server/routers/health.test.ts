// health.test.ts — #1689: parseBuildMetaSha (função pura, DB-free)
// Guarda a fonte primária do SHA em /api/health (build-meta.json → runtime do servidor).

import { describe, it, expect } from "vitest";
import { parseBuildMetaSha } from "./health";

describe("#1689 parseBuildMetaSha", () => {
  it("extrai o SHA de um build-meta.json válido", () => {
    expect(parseBuildMetaSha('{"sha":"cc2e1687","builtAt":"2026-07-02T00:00:00Z"}')).toBe("cc2e1687");
  });

  it("aceita SHA full de 40 chars", () => {
    const full = "cc2e1687" + "0".repeat(32);
    expect(parseBuildMetaSha(`{"sha":"${full}"}`)).toBe(full);
  });

  it("retorna null para conteúdo ausente/vazio", () => {
    expect(parseBuildMetaSha(undefined)).toBeNull();
    expect(parseBuildMetaSha(null)).toBeNull();
    expect(parseBuildMetaSha("")).toBeNull();
  });

  it("retorna null para JSON malformado (não lança)", () => {
    expect(parseBuildMetaSha("{sha: not json")).toBeNull();
    expect(parseBuildMetaSha("[object Object]")).toBeNull();
  });

  it("retorna null quando sha não é um hash git válido", () => {
    expect(parseBuildMetaSha('{"sha":"unknown"}')).toBeNull();
    expect(parseBuildMetaSha('{"sha":123}')).toBeNull();
    expect(parseBuildMetaSha('{"builtAt":"x"}')).toBeNull();
  });
});
