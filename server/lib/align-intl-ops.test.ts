// align-intl-ops.test.ts — F2 dual-name (SPEC-F2-dual-name.md)
import { describe, it, expect, afterEach } from "vitest";
import { alignIntlOps } from "./align-intl-ops";

const FLAG = "ENABLE_INTL_OPS_ALIGN";

afterEach(() => {
  delete process.env[FLAG];
});

describe("alignIntlOps — F2 (flag ENABLE_INTL_OPS_ALIGN)", () => {
  it("flag ON + hasImportExport=true → deriva hasInternationalOps=true", () => {
    process.env[FLAG] = "true";
    expect(alignIntlOps({ hasImportExport: true })).toEqual({
      hasImportExport: true,
      hasInternationalOps: true,
    });
  });

  it("flag ON + hasImportExport=false → deriva hasInternationalOps=false", () => {
    process.env[FLAG] = "true";
    expect(alignIntlOps({ hasImportExport: false }).hasInternationalOps).toBe(false);
  });

  it("flag OFF → não deriva (comportamento atual, sem hasInternationalOps)", () => {
    delete process.env[FLAG];
    expect(alignIntlOps({ hasImportExport: true })).toEqual({ hasImportExport: true });
  });

  it("flag ON mas hasInternationalOps JÁ presente → NÃO sobrescreve", () => {
    process.env[FLAG] = "true";
    expect(alignIntlOps({ hasImportExport: true, hasInternationalOps: false })).toEqual({
      hasImportExport: true,
      hasInternationalOps: false,
    });
  });

  it("aditivo: NÃO renomeia — hasImportExport permanece", () => {
    process.env[FLAG] = "true";
    expect(alignIntlOps({ hasImportExport: true }).hasImportExport).toBe(true);
  });

  it("null/undefined → retorna como está (flag ON)", () => {
    process.env[FLAG] = "true";
    expect(alignIntlOps(null)).toBeNull();
    expect(alignIntlOps(undefined)).toBeUndefined();
  });
});
