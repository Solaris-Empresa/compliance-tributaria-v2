// health.test.ts — #1689: resolveInjectedSha (função pura, DB-free)
// Guarda a normalização do SHA injetado no bundle (esbuild --define __BUILD_SHA__).

import { describe, it, expect } from "vitest";
import { resolveInjectedSha } from "./health";

describe("#1689 resolveInjectedSha", () => {
  it("aceita SHA git curto injetado", () => {
    expect(resolveInjectedSha("b425a8fe")).toBe("b425a8fe");
  });

  it("aceita SHA full de 40 chars", () => {
    const full = "cc2e1687" + "0".repeat(32);
    expect(resolveInjectedSha(full)).toBe(full);
  });

  it("retorna null para 'unknown' (fallback resolve nas env/git)", () => {
    expect(resolveInjectedSha("unknown")).toBeNull();
  });

  it("retorna null para ausente/vazio (constante não injetada em dev)", () => {
    expect(resolveInjectedSha(undefined)).toBeNull();
    expect(resolveInjectedSha(null)).toBeNull();
    expect(resolveInjectedSha("")).toBeNull();
  });

  it("retorna null para valor não-hex", () => {
    expect(resolveInjectedSha("not-a-sha")).toBeNull();
    expect(resolveInjectedSha("[object Object]")).toBeNull();
  });
});
