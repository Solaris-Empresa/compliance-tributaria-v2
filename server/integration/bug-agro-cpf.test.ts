/**
 * bug-agro-cpf.test.ts — Testes bloqueantes BUG-AGRO-CPF F5 (#1290)
 *
 * Spec: docs/governance/relatorios/PLANO-TESTES-BUG-AGRO-CPF.md §C.1-3 (resumo
 * dos contratos consolidados no F5 — fase final do bug agro).
 *
 * Cobertura:
 *   TB-01: Zod refine aceita PF com CPF válido (caminho cpf).
 *   TB-02: Zod refine rejeita CPF com comprimento errado (length != 11 e 14).
 *   TB-03: Zod refine aceita PJ legacy (sem taxIdType → default 'cnpj').
 *   TB-04: perfilHash(PF) ≠ perfilHash(PJ) — discriminação ADR-0033 D-1.
 *   TB-05: perfilHash sem cnpj/cpf/taxId/taxIdType → não crasha (TR-03
 *          integração: cobre o achado do Gate 3 F0 — 3202 projetos sem profile).
 *
 * Paradigma F1: replica a sub-schema `companyProfile` do
 * `server/routers-fluxo-v3.ts:203-263` localmente para isolar o refine sem
 * depender do router completo (mesma estratégia de
 * `test-e2e-v212.test.ts:20-43`).
 *
 * Nenhum destes testes precisa de DATABASE_URL nem OpenAI — rodam sempre em
 * CI puro (Vitest unit + integration sem DB).
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { computePerfilHash } from "../lib/archetype/perfilHash";
import {
  mockProjectPF,
  mockProjectPFSemProfile,
  mockProjectPJLegacy,
} from "../test-helpers";

// ─── Sub-schema companyProfile replicado de routers-fluxo-v3.ts:203-263 ─────
// Espelho fiel do schema F1 que valida identidade fiscal dual via refine.
// Manter SINCRONIZADO se F1 evoluir (PLANO-TESTES §C.2 cobre o mesmo refine).
const companyProfileSchema = z
  .object({
    cnpj: z.string().optional(),
    companyType: z.string(),
    companySize: z.enum(["mei", "micro", "pequena", "media", "grande"]),
    taxRegime: z.enum([
      "simples_nacional",
      "lucro_presumido",
      "lucro_real",
    ]),
    cpf: z.string().optional(),
    taxIdType: z.enum(["cnpj", "cpf"]).default("cnpj"),
    taxId: z.string().optional(),
  })
  .refine(
    (data) => {
      const taxId =
        data.taxId ?? (data.taxIdType === "cpf" ? data.cpf : data.cnpj);
      if (!taxId) return false;
      const d = taxId.replace(/\D/g, "");
      return d.length === 11 || d.length === 14;
    },
    {
      message:
        "Documento inválido — CPF (11 dígitos) ou CNPJ (14 dígitos)",
      path: ["taxId"],
    },
  );

describe("BUG-AGRO-CPF F5 — 5 testes bloqueantes (TB)", () => {
  // ── TB-01 ─────────────────────────────────────────────────────────────────
  it("TB-01: companyProfileSchema aceita PF com CPF válido (refine PASS)", () => {
    const result = companyProfileSchema.safeParse(mockProjectPF.companyProfile);
    expect(result.success).toBe(true);
    // Sanity: o refine derivou taxId via cpf (taxIdType='cpf')
    if (result.success) {
      const derived =
        result.data.taxId ??
        (result.data.taxIdType === "cpf" ? result.data.cpf : result.data.cnpj);
      expect(derived?.replace(/\D/g, "").length).toBe(11);
    }
  });

  // ── TB-02 ─────────────────────────────────────────────────────────────────
  // Refine F1 valida comprimento (11=CPF, 14=CNPJ). Comprimento errado FAIL.
  // DV inválido é coberto separadamente em client/src/lib/validate-cpf.test.ts
  // (13 TC do F1) — aqui basta provar que o refine REJEITA payload inválido.
  it("TB-02: companyProfileSchema rejeita CPF com comprimento errado", () => {
    const result = companyProfileSchema.safeParse({
      ...mockProjectPF.companyProfile,
      cpf: "12345", // 5 dígitos — nem CPF nem CNPJ
      taxId: undefined, // força derivação via cpf
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // F1: erro do refine tem path ['taxId'] (não 'cpf' nem 'cnpj')
      const hasTaxIdError = result.error.issues.some((i) =>
        i.path.includes("taxId"),
      );
      expect(hasTaxIdError).toBe(true);
    }
  });

  // ── TB-03 ─────────────────────────────────────────────────────────────────
  // Retrocompat F1↔F2: payload legacy sem taxIdType herda default 'cnpj' do
  // schema e o refine deriva taxId de cnpj automaticamente. Garante que
  // frontend pre-F2 continua funcionando sem mudanças.
  it("TB-03: companyProfileSchema aceita PJ legacy (sem taxIdType → default cnpj)", () => {
    const result = companyProfileSchema.safeParse(
      mockProjectPJLegacy.companyProfile,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      // default do Zod aplicou 'cnpj' mesmo o payload original não declarando
      expect(result.data.taxIdType).toBe("cnpj");
      // refine derivou taxId via cnpj (14 dígitos)
      const derived = result.data.taxId ?? result.data.cnpj;
      expect(derived?.replace(/\D/g, "").length).toBe(14);
    }
  });

  // ── TB-04 ─────────────────────────────────────────────────────────────────
  // ADR-0033 D-1: taxIdType discrimina PF de PJ no canonical do snapshot.
  // Hash deve ser distinto mesmo se a string do documento fosse igual
  // (cenário sintético: o refine não permitiria iguais em produção).
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
  // Regressão integração para TR-03 (perfilHash.test.ts:75): simula o callsite
  // real (server/routers/perfil.ts:233,353) lendo de mockProjectPFSemProfile
  // (companyProfile=null). Garante null-safety end-to-end.
  it("TB-05: perfilHash com companyProfile=null → não crasha (regressão Gate 3 F0)", () => {
    // Simula leitura null-safe do callsite (cp = companyProfile ?? {})
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
});
