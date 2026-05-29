/**
 * bug-agro-cpf.test.ts — Testes bloqueantes BUG-AGRO-CPF F5 (#1290) + UX (#1299)
 *
 * Spec original: docs/governance/relatorios/PLANO-TESTES-BUG-AGRO-CPF.md §C.1-3.
 * Spec UX:       Issue #1299 (Lição #109 + #110 + REGRA-ORQ-42).
 *
 * Cobertura:
 *   TB-01: schema REAL aceita PF com CPF válido + companyType null (UX #1299).
 *          BUG-AGRO-CPF-UX corrigiu Lição #110: importa o schema canônico
 *          `companyProfileSchema` exportado em routers-fluxo-v3, não replicado.
 *   TB-02: schema REAL rejeita CPF com comprimento errado, erro em path ['taxId'].
 *   TB-03: schema REAL aceita PJ legacy (sem taxIdType → default 'cnpj') com
 *          companyType/companySize/taxRegime válidos PJ.
 *   TB-04: perfilHash(PF) ≠ perfilHash(PJ) — discriminação ADR-0033 D-1.
 *   TB-05: perfilHash sem cnpj/cpf/taxId/taxIdType → não crasha (regressão
 *          TR-03 integração; Gate 3 F0 — 3202/3400 projetos sem profile).
 *   TB-06 (UX #1299): schema backend aceita payload PF SEM campos PJ
 *          (`companyType=null`, `companySize=null`, `taxRegime=null`).
 *   TB-07 (UX #1299): schema backend REJEITA payload PJ sem companyType
 *          (regressão — Cenário 4 do DoD da Issue #1299).
 *
 * Nenhum destes testes precisa de DATABASE_URL nem OpenAI — rodam sempre em
 * CI puro (Vitest unit + integration sem DB).
 */
import { describe, it, expect } from "vitest";
import { computePerfilHash } from "../lib/archetype/perfilHash";
import { companyProfileSchema } from "../routers-fluxo-v3";
import {
  mockProjectPF,
  mockProjectPFSemProfile,
  mockProjectPJLegacy,
} from "../test-helpers";

describe("BUG-AGRO-CPF — 7 testes bloqueantes (TB)", () => {
  // ── TB-01 ─────────────────────────────────────────────────────────────────
  it("TB-01: schema REAL aceita PF com CPF válido (Lição #110 — não replicado)", () => {
    const result = companyProfileSchema.safeParse(mockProjectPF.companyProfile);
    expect(result.success).toBe(true);
    if (result.success) {
      const derived =
        result.data.taxId ??
        (result.data.taxIdType === "cpf" ? result.data.cpf : result.data.cnpj);
      expect(derived?.replace(/\D/g, "").length).toBe(11);
    }
  });

  // ── TB-02 ─────────────────────────────────────────────────────────────────
  // superRefine UX #1299 rejeita taxId com comprimento errado, erro em ['taxId'].
  it("TB-02: schema REAL rejeita CPF com comprimento errado", () => {
    const result = companyProfileSchema.safeParse({
      ...mockProjectPF.companyProfile,
      cpf: "12345", // 5 dígitos — nem CPF nem CNPJ
      taxId: undefined, // força derivação via cpf
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasTaxIdError = result.error.issues.some((i) =>
        i.path.includes("taxId"),
      );
      expect(hasTaxIdError).toBe(true);
    }
  });

  // ── TB-03 ─────────────────────────────────────────────────────────────────
  // Retrocompat F1↔F2: payload PJ legacy sem taxIdType herda default 'cnpj'.
  it("TB-03: schema REAL aceita PJ legacy (default cnpj + 3 enums PJ válidos)", () => {
    const result = companyProfileSchema.safeParse(
      mockProjectPJLegacy.companyProfile,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxIdType).toBe("cnpj");
      const derived = result.data.taxId ?? result.data.cnpj;
      expect(derived?.replace(/\D/g, "").length).toBe(14);
    }
  });

  // ── TB-04 ─────────────────────────────────────────────────────────────────
  it("TB-04: perfilHash(PF) ≠ perfilHash(PJ) — ADR-0033 D-1", () => {
    const baseInput = {
      project_id: 1,
      confirmedCnaes: [],
      ncms_canonicos_array: [],
      nbss_canonicos_array: [],
      dim_objeto: [],
      dim_papel_na_cadeia: "",
      dim_tipo_de_relacao: [],
      dim_territorio: "",
      dim_regime: "",
      natureza_operacao_principal: [],
      tax_regime: "",
      company_size: "",
    };

    const hashPF = computePerfilHash({
      ...baseInput,
      taxIdType: "cpf",
      cpf: "52998224725",
      taxId: "52998224725",
    });
    const hashPJ = computePerfilHash({
      ...baseInput,
      taxIdType: "cnpj",
      cnpj: "11222333000181",
      taxId: "11222333000181",
    });

    expect(hashPF).not.toBe(hashPJ);
    expect(hashPF).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPJ).toMatch(/^[a-f0-9]{64}$/);
  });

  // ── TB-05 ─────────────────────────────────────────────────────────────────
  it("TB-05: perfilHash com companyProfile=null → não crasha (Gate 3 F0)", () => {
    const cp = (mockProjectPFSemProfile.companyProfile ?? {}) as Record<
      string,
      unknown
    >;
    const cnpj = (cp.cnpj ?? "") as string;
    const cpf = cp.cpf as string | undefined;
    const taxIdType = cp.taxIdType as "cnpj" | "cpf" | undefined;
    const taxId = cp.taxId as string | undefined;

    expect(() =>
      computePerfilHash({
        project_id: mockProjectPFSemProfile.id,
        cnpj,
        cpf,
        taxIdType,
        taxId,
        confirmedCnaes: [],
        ncms_canonicos_array: [],
        nbss_canonicos_array: [],
        dim_objeto: [],
        dim_papel_na_cadeia: "",
        dim_tipo_de_relacao: [],
        dim_territorio: "",
        dim_regime: "",
        natureza_operacao_principal: [],
        tax_regime: "",
        company_size: "",
      }),
    ).not.toThrow();
  });

  // ── TB-06 (UX #1299) ──────────────────────────────────────────────────────
  // DoD §3 Critério de aceite: payload PF com companyType=null → ✅ aceito.
  it("TB-06: schema REAL aceita payload PF sem campos PJ (UX #1299)", () => {
    const payloadPF = {
      taxIdType: "cpf" as const,
      taxId: "529.982.247-25",
      cpf: "52998224725",
      companyType: null,
      companySize: null,
      taxRegime: null,
    };
    const result = companyProfileSchema.safeParse(payloadPF);
    expect(result.success).toBe(true);
  });

  // ── TB-07 (UX #1299) ──────────────────────────────────────────────────────
  // DoD §3 Critério de aceite: payload PJ com companyType=null → ❌ rejeitado.
  // Regressão: superRefine só passa companyType/companySize/taxRegime quando PF.
  // Para PJ, ausência de qualquer um dos 3 vira erro custom em path específico.
  it("TB-07: schema REAL rejeita payload PJ sem companyType (regressão UX #1299)", () => {
    const payloadPJIncompleto = {
      taxIdType: "cnpj" as const,
      cnpj: "11.222.333/0001-81",
      companyType: null,
      companySize: "media" as const,
      taxRegime: "lucro_presumido" as const,
    };
    const result = companyProfileSchema.safeParse(payloadPJIncompleto);
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasCompanyTypeError = result.error.issues.some((i) =>
        i.path.includes("companyType"),
      );
      expect(hasCompanyTypeError).toBe(true);
    }
  });
});
