/**
 * cnae-oportunidade-eligibility.test.ts — FEAT-SCOPE-01 (#1177)
 *
 * Test contracts (REGRA-ORQ-28) do filtro CNAE da oportunidade
 * `aliquota_reduzida` (Art. 127 LC 214/2025). Testa a FUNÇÃO PURA
 * `evaluateAliquotaReduzidaEligibility` com fixture (sem DB → CI-green).
 *
 * Consumo real (engine consolidateRisks → isAliquotaReduzidaEligible →
 * esta função pura) é validado em E2E/smoke pós-deploy (Lição #65).
 */
import { describe, it, expect } from "vitest";
import {
  evaluateAliquotaReduzidaEligibility,
  type CnaeOportunidadeRow,
} from "./cnae-oportunidade-eligibility";

// Fixture espelhando o seed Fase 1 (#1177) + 1 linha pending_legal (Fase 2)
// para cobrir o caminho conservador.
const SEED: CnaeOportunidadeRow[] = [
  { cnae_4dig: "6911", elegibilidade: "potencial", gate_especial: null, requer_questionario: 1, inciso_art127: "II — Advogados", conselho_profissional: "OAB" },
  { cnae_4dig: "7112", elegibilidade: "potencial", gate_especial: null, requer_questionario: 1, inciso_art127: "XI — Engenheiros/Agrônomos", conselho_profissional: "CREA/CONFEA" },
  { cnae_4dig: "9311", elegibilidade: "potencial", gate_especial: "§3º", requer_questionario: 0, inciso_art127: "X — Ed. Física (§3º)", conselho_profissional: "CREF" },
  { cnae_4dig: "8591", elegibilidade: "potencial", gate_especial: "§3º", requer_questionario: 0, inciso_art127: "X — Ed. Física (§3º)", conselho_profissional: "CREF" },
  { cnae_4dig: "4120", elegibilidade: "excluido", gate_especial: null, requer_questionario: 0, inciso_art127: null, conselho_profissional: null },
  { cnae_4dig: "8630", elegibilidade: "excluido", gate_especial: null, requer_questionario: 0, inciso_art127: null, conselho_profissional: "CFM/CFO" },
  { cnae_4dig: "7490", elegibilidade: "pending_legal", gate_especial: null, requer_questionario: 0, inciso_art127: null, conselho_profissional: "CRA" },
];

describe("FEAT-SCOPE-01 — filtro CNAE aliquota_reduzida (Art. 127)", () => {
  // Contract 1 — construtora NÃO vê a oportunidade
  it("CNAE 4120 (construtora) → NÃO elegível (excluido)", () => {
    const r = evaluateAliquotaReduzidaEligibility(["4120-4/00"], SEED);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("excluido");
    expect(r.gate).toBeNull();
  });

  // Contract 2 — engenharia vê COM ressalva do questionário §1º II
  it("CNAE 7112 (engenharia) → elegível com gate questionário §1º II", () => {
    const r = evaluateAliquotaReduzidaEligibility(["7112-0/00"], SEED);
    expect(r.eligible).toBe(true);
    expect(r.gate).toBe("questionario_§1ºII");
    expect(r.requerQuestionario).toBe(true);
    expect(r.matchedCnae).toBe("7112");
  });

  // Contract 3 — ed. física vê com gate §3º (sem as 4 perguntas)
  it("CNAE 9311 (academia) → elegível com gate §3º (sem questionário)", () => {
    const r = evaluateAliquotaReduzidaEligibility(["9311-5/00"], SEED);
    expect(r.eligible).toBe(true);
    expect(r.gate).toBe("§3º");
    expect(r.requerQuestionario).toBe(false);
    expect(r.matchedCnae).toBe("9311");
  });

  // Edge — default conservador: CNAE não encontrado → não exibe
  it("CNAE não seedado → NÃO elegível (cnae_nao_encontrado)", () => {
    const r = evaluateAliquotaReduzidaEligibility(["6201-5/00"], SEED);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("cnae_nao_encontrado");
  });

  // Edge — pending_legal NÃO exibe (conservador, aguarda sign-off)
  it("CNAE 7490 (pending_legal) → NÃO elegível", () => {
    const r = evaluateAliquotaReduzidaEligibility(["7490-1/01"], SEED);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("pending_legal");
  });

  // Edge — sem CNAE
  it("sem CNAE → NÃO elegível (sem_cnae)", () => {
    const r = evaluateAliquotaReduzidaEligibility([], SEED);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("sem_cnae");
  });

  // Multi-CNAE — basta 1 potencial para exibir (preferindo o potencial)
  it("multi-CNAE [4120 excluido, 7112 potencial] → elegível (acha o potencial)", () => {
    const r = evaluateAliquotaReduzidaEligibility(["4120-4/00", "7112-0/00"], SEED);
    expect(r.eligible).toBe(true);
    expect(r.matchedCnae).toBe("7112");
  });
});
