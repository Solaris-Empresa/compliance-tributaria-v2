/**
 * flowStateMachine-mud3.test.ts — Mud.3 (#1568) roteamento NCM/NBS
 *
 * DoD discriminante (REGRA-ORQ-47): os 4 casos do TO-BE + a transição FSM
 * que habilita os casos 3/4. O caso 4 (nenhum → diagnostico_cnae) é o
 * negativo discriminante: prova que NÃO passa por Produto nem Serviço.
 */
import { describe, it, expect } from "vitest";
import {
  getNextStateAfterOnda2,
  VALID_TRANSITIONS,
} from "./flowStateMachine";

describe("getNextStateAfterOnda2 (Mud.3 #1568)", () => {
  it("Caso 1 — tem NCM e NBS → q_produto (Produto → Serviço → CNAE)", () => {
    expect(getNextStateAfterOnda2(true, true)).toBe("q_produto");
  });

  it("Caso 2 — só NCM → q_produto (Produto → CNAE)", () => {
    expect(getNextStateAfterOnda2(true, false)).toBe("q_produto");
  });

  it("Caso 3 — só NBS → q_servico (Serviço direto, sem Produto vazio)", () => {
    expect(getNextStateAfterOnda2(false, true)).toBe("q_servico");
  });

  it("Caso 4 (discriminante) — nenhum → diagnostico_cnae (NÃO passa por Produto nem Serviço)", () => {
    expect(getNextStateAfterOnda2(false, false)).toBe("diagnostico_cnae");
  });
});

describe("FSM onda2_iagen — transições liberadas p/ Mud.3", () => {
  it("permite q_produto, q_servico e diagnostico_cnae (casos 1/2, 3, 4)", () => {
    const t = VALID_TRANSITIONS["onda2_iagen"];
    expect(t).toContain("q_produto");
    expect(t).toContain("q_servico");
    expect(t).toContain("diagnostico_cnae");
  });
});
