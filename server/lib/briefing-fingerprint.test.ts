/**
 * briefing-fingerprint.test.ts — fingerprint canônico + diff.
 * Testa partes puras (sem queries DB).
 */

import { describe, it, expect } from "vitest";
import {
  canonicalize,
  hashContent,
  diffFingerprints,
  hasDivergence,
  type BriefingFingerprints,
} from "./briefing-fingerprint";

describe("canonicalize — JSON determinístico", () => {
  it("chaves ordenadas alfabeticamente", () => {
    expect(canonicalize({ z: 1, a: 2 })).toBe(canonicalize({ a: 2, z: 1 }));
  });

  it("aninhamento profundo preserva ordenação", () => {
    const a = { outer: { z: 1, a: 2 }, list: [{ b: 3, a: 4 }] };
    const b = { outer: { a: 2, z: 1 }, list: [{ a: 4, b: 3 }] };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("arrays preservam ordem (não reordena)", () => {
    expect(canonicalize([1, 2, 3])).toBe("[1,2,3]");
    expect(canonicalize([3, 2, 1])).toBe("[3,2,1]");
    expect(canonicalize([1, 2, 3])).not.toBe(canonicalize([3, 2, 1]));
  });

  it("null/undefined tratados", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(undefined)).toBe(undefined as any);
  });
});

describe("hashContent — SHA256 determinístico", () => {
  it("mesmo conteúdo → mesmo hash", () => {
    expect(hashContent({ a: 1, b: 2 })).toBe(hashContent({ b: 2, a: 1 }));
  });

  it("conteúdo diferente → hash diferente", () => {
    expect(hashContent({ a: 1 })).not.toBe(hashContent({ a: 2 }));
  });

  it("produz SHA256 hex (64 chars)", () => {
    const h = hashContent({ test: "value" });
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("diffFingerprints — detecção de mudança", () => {
  function fp(hash: string, ts: string | null = "2026-04-21T14:29:00Z") {
    return { ts, hash };
  }

  function makeFingerprints(overrides: Partial<BriefingFingerprints> = {}): BriefingFingerprints {
    const base: BriefingFingerprints = {
      perfil: fp("HASH_PERFIL_V1"),
      q1_solaris: fp("HASH_Q1_V1"),
      q2_iagen: fp("HASH_Q2_V1"),
      q3_cnae: fp("HASH_Q3CNAE_V1"),
      q3_produtos: fp("HASH_Q3P_V1"),
      q3_servicos: fp("HASH_Q3S_V1"),
    };
    return { ...base, ...overrides };
  }

  it("sem snapshot prévio → nenhum diff é 'changed'", () => {
    const after = makeFingerprints();
    const diffs = diffFingerprints(null, after);
    expect(diffs.every((d) => !d.changed)).toBe(true);
    expect(diffs.every((d) => d.reason === "none")).toBe(true);
  });

  it("tudo igual → zero diffs", () => {
    const a = makeFingerprints();
    const b = makeFingerprints();
    const diffs = diffFingerprints(a, b);
    expect(hasDivergence(diffs)).toBe(false);
  });

  it("hash mudou → changed=true, reason='hash'", () => {
    const before = makeFingerprints();
    const after = makeFingerprints({ perfil: fp("HASH_PERFIL_V2") });
    const diffs = diffFingerprints(before, after);
    const perfilDiff = diffs.find((d) => d.source === "perfil")!;
    expect(perfilDiff.changed).toBe(true);
    expect(perfilDiff.reason).toBe("hash");
    expect(hasDivergence(diffs)).toBe(true);
  });

  it("só ts mudou (hash igual) → changed=false, reason='ts_only' (save sem alteração)", () => {
    const before: BriefingFingerprints = makeFingerprints({
      perfil: fp("HASH_PERFIL_V1", "2026-04-21T14:00:00Z"),
    });
    const after: BriefingFingerprints = makeFingerprints({
      perfil: fp("HASH_PERFIL_V1", "2026-04-21T15:00:00Z"), // ts mudou mas hash igual
    });
    const diffs = diffFingerprints(before, after);
    const perfilDiff = diffs.find((d) => d.source === "perfil")!;
    expect(perfilDiff.changed).toBe(false);
    expect(perfilDiff.reason).toBe("ts_only");
    expect(hasDivergence(diffs)).toBe(false);
  });

  it("múltiplas fontes mudam simultaneamente", () => {
    const before = makeFingerprints();
    const after = makeFingerprints({
      perfil: fp("HASH_PERFIL_V2"),
      q3_produtos: fp("HASH_Q3P_V2"),
    });
    const diffs = diffFingerprints(before, after);
    const changedSources = diffs.filter((d) => d.changed).map((d) => d.source);
    expect(changedSources).toEqual(["perfil", "q3_produtos"]);
  });

  it("retorna todos 6 pilares sempre (mesmo os inalterados)", () => {
    const before = makeFingerprints();
    const after = makeFingerprints({ perfil: fp("HASH_PERFIL_V2") });
    const diffs = diffFingerprints(before, after);
    expect(diffs.map((d) => d.source).sort()).toEqual([
      "perfil",
      "q1_solaris",
      "q2_iagen",
      "q3_cnae",
      "q3_produtos",
      "q3_servicos",
    ]);
  });
});
