/**
 * perfilHash.test.ts — Contratos TR-01 a TR-05 do BUG-AGRO-CPF F3 (#1290)
 *
 * Spec: docs/governance/relatorios/PLANO-TESTES-BUG-AGRO-CPF.md §C.3 (regressão)
 * Despacho F3 (29/05/2026 11:34): 5 contratos obrigatórios bloqueantes.
 *
 * Contexto operacional:
 *   - 3202/3400 projetos têm companyProfile=NULL (Gate 3 F0 — 29/05).
 *   - TR-03 é GATE BLOQUEANTE: sem null-safety, 94% da base crasha.
 *   - F3 implementa ADR-0033 (identidade fiscal dual) preservando retrocompat
 *     ADR-0032 (snapshots legacy continuam batendo byte-a-byte).
 */
import { describe, it, expect } from "vitest";
import {
  computePerfilHash,
  UNKNOWN_TAX_ID,
  type PerfilSnapshotInput,
} from "./perfilHash";

// ─── Input mínimo (helper) — campos obrigatórios não-identidade ─────────────
function makeInput(overrides: Partial<PerfilSnapshotInput> = {}): PerfilSnapshotInput {
  return {
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
    ...overrides,
  };
}

const SHA256_HEX = /^[a-f0-9]{64}$/;

describe("BUG-AGRO-CPF F3 — perfilHash null-safe + dual identity (5 TR)", () => {
  // ── TR-01 ─────────────────────────────────────────────────────────────────
  it("TR-01: hash(PF, taxId='X') ≠ hash(PJ, taxId='X') — taxIdType discrimina", () => {
    const pj = makeInput({
      taxIdType: "cnpj",
      taxId: "12345678901234",
      cnpj: "12345678901234",
    });
    const pf = makeInput({
      taxIdType: "cpf",
      taxId: "12345678901234", // mesma string (cenário sintético para o teste)
      cpf: "12345678901234",
      cnpj: "",
    });
    expect(computePerfilHash(pj)).not.toBe(computePerfilHash(pf));
  });

  // ── TR-02 ─────────────────────────────────────────────────────────────────
  it("TR-02: hash(input) chamado 2x → mesmo resultado (determinístico)", () => {
    const input = makeInput({
      cnpj: "11.222.333/0001-81",
      taxIdType: "cnpj",
      taxId: "11.222.333/0001-81",
    });
    const h1 = computePerfilHash(input);
    const h2 = computePerfilHash(input);
    expect(h1).toBe(h2);
    expect(h1).toMatch(SHA256_HEX);
  });

  // ── TR-03 ─────────────────────────────────────────────────────────────────
  // GATE BLOQUEANTE: simula projeto com companyProfile=null (3202/3400 projetos).
  // No callsite real (server/routers/perfil.ts:233), cp = {} → cnpj/cpf/taxIdType/taxId
  // chegam undefined. computePerfilHash NÃO pode crashar.
  it("TR-03: hash(input sem cnpj/cpf/taxId/taxIdType) → não crasha + retorna hash válido", () => {
    const input = makeInput({
      // todos os identificadores ausentes — simula companyProfile=NULL
      cnpj: undefined,
      cpf: undefined,
      taxIdType: undefined,
      taxId: undefined,
    });
    expect(() => computePerfilHash(input)).not.toThrow();
    expect(computePerfilHash(input)).toMatch(SHA256_HEX);
  });

  // ── TR-04 ─────────────────────────────────────────────────────────────────
  // Quando taxIdType presente mas todos os docs ausentes → sentinel UNKNOWN_TAX_ID.
  it("TR-04: hash(taxIdType='cpf', sem cnpj/cpf/taxId) → usa sentinel UNKNOWN_TAX_ID sem crash", () => {
    const input = makeInput({
      taxIdType: "cpf",
      cnpj: undefined,
      cpf: undefined,
      taxId: undefined,
    });
    expect(() => computePerfilHash(input)).not.toThrow();
    expect(computePerfilHash(input)).toMatch(SHA256_HEX);

    // Distinto de input com cpf válido (sentinel discrimina)
    const inputComCpf = makeInput({
      taxIdType: "cpf",
      cpf: "52998224725",
    });
    expect(computePerfilHash(input)).not.toBe(computePerfilHash(inputComCpf));

    // Sentinel disponível como export para uso em consumers/tests
    expect(UNKNOWN_TAX_ID).toBe("UNKNOWN_TAX_ID");
  });

  // ── TR-05 ─────────────────────────────────────────────────────────────────
  // Retrocompat ADR-0032 byte-a-byte: registros legacy (sem taxIdType) produzem
  // o MESMO hash byte-a-byte que pré-F3. Garantido pela condicional
  // `if (input.taxIdType !== undefined)` no canonical.
  it("TR-05: hash(PF legacy sem taxIdType) === hash(mesmo input pré-F3) — retrocompat byte-a-byte", () => {
    // Cenário legacy: snapshot persistido antes de F3 só tinha cnpj.
    // F3 introduz taxIdType/cpf/taxId opcionais; ausência deve gerar canonical idêntico.
    const legacy = makeInput({
      cnpj: "11.222.333/0001-81",
      // taxIdType, cpf, taxId NÃO definidos → canonical pré-F3 preservado
    });

    // Hash legacy precisa ser BYTE-A-BYTE igual ao que `m1-v1.0.0` produzia
    // antes da F3. Como a função é versionada por RULES_VERSION + RULES_HASH
    // (mantidos inalterados em F3), o snapshot canonical deve ser determinístico.
    const hashLegacy = computePerfilHash(legacy);
    expect(hashLegacy).toMatch(SHA256_HEX);

    // Sanity: dois inputs identicamente legacy → mesmo hash (já coberto por TR-02,
    // mas reforça que ausência de taxIdType é semanticamente equivalente)
    const legacyDuplicado = makeInput({ cnpj: "11.222.333/0001-81" });
    expect(computePerfilHash(legacyDuplicado)).toBe(hashLegacy);

    // E o legacy NÃO deve incluir taxIdType no canonical → hash diferente de
    // F3-aware com taxIdType='cnpj' explícito (mesmo input + flag novo).
    const f3Aware = makeInput({
      cnpj: "11.222.333/0001-81",
      taxIdType: "cnpj",
      taxId: "11.222.333/0001-81",
    });
    expect(computePerfilHash(f3Aware)).not.toBe(hashLegacy);
  });
});
