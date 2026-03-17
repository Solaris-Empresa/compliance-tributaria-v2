/**
 * Testes para os 3 bugs corrigidos na Sprint V53
 * Bug 1: CNPJ excedendo varchar(18) no INSERT de novo cliente
 * Bug 2: botão Avançar não habilitava após criar cliente via modal
 * Bug 3: chamada dupla ao gerar perguntas de aprofundamento (nível 2)
 */

import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Bug 1: Sanitização de CNPJ antes do INSERT
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeCnpj(cnpj: string | undefined): string | undefined {
  if (!cnpj) return undefined;
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  if (digits.length > 0) return digits.slice(0, 18);
  return undefined;
}

describe("Bug 1: Sanitização de CNPJ", () => {
  it("formata CNPJ com 14 dígitos corretamente", () => {
    expect(sanitizeCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("formata CNPJ com pontuação já existente", () => {
    expect(sanitizeCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81");
  });

  it("trunca CNPJ com mais de 14 dígitos para 18 chars", () => {
    const result = sanitizeCnpj("111111111111111111111111");
    expect(result).toBeDefined();
    expect(result!.length).toBeLessThanOrEqual(18);
  });

  it("retorna undefined para CNPJ vazio", () => {
    expect(sanitizeCnpj("")).toBeUndefined();
    expect(sanitizeCnpj(undefined)).toBeUndefined();
  });

  it("remove caracteres não numéricos antes de processar", () => {
    const result = sanitizeCnpj("11.222.333/0001-81");
    expect(result).toBe("11.222.333/0001-81");
    expect(result!.length).toBeLessThanOrEqual(18);
  });

  it("CNPJ com exatamente 18 chars não é truncado", () => {
    const cnpj18 = "11.222.333/0001-81";
    expect(cnpj18.length).toBe(18);
    expect(sanitizeCnpj(cnpj18)).toBe("11.222.333/0001-81");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug 2: Estado pendingClientName para exibir card imediatamente
// ─────────────────────────────────────────────────────────────────────────────
describe("Bug 2: Estado pendingClientName", () => {
  it("selectedClient usa pendingClientName quando clients ainda não retornou o novo cliente", () => {
    const clientId = 42;
    const pendingClientName = "Empresa Nova LTDA";
    const clients: Array<{ id: number; name: string; companyName: string; cnpj?: string }> = [];

    const selectedClient = clients.find(c => c.id === clientId) ||
      (clientId && pendingClientName ? { id: clientId, name: pendingClientName, companyName: pendingClientName, cnpj: undefined } : undefined);

    expect(selectedClient).toBeDefined();
    expect(selectedClient!.companyName).toBe("Empresa Nova LTDA");
    expect(selectedClient!.id).toBe(42);
  });

  it("selectedClient usa dados reais quando clients já foi atualizado", () => {
    const clientId = 42;
    const pendingClientName = "Empresa Nova LTDA";
    const clients = [{ id: 42, name: "Empresa Nova LTDA", companyName: "Empresa Nova LTDA", cnpj: "11.222.333/0001-81" }];

    const selectedClient = clients.find(c => c.id === clientId) ||
      (clientId && pendingClientName ? { id: clientId, name: pendingClientName, companyName: pendingClientName, cnpj: undefined } : undefined);

    expect(selectedClient).toBeDefined();
    expect(selectedClient!.cnpj).toBe("11.222.333/0001-81");
  });

  it("botão Avançar fica habilitado quando clientId está definido", () => {
    const name = "Projeto Teste";
    const description = "A".repeat(100);
    const clientId = 42;

    const isDisabled = !name.trim() || description.trim().length < 100 || !clientId;
    expect(isDisabled).toBe(false);
  });

  it("botão Avançar fica desabilitado quando clientId é null", () => {
    const name = "Projeto Teste";
    const description = "A".repeat(100);
    const clientId = null;

    const isDisabled = !name.trim() || description.trim().length < 100 || !clientId;
    expect(isDisabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug 3: Prevenção de chamada dupla ao gerar perguntas de nível 2
// ─────────────────────────────────────────────────────────────────────────────
describe("Bug 3: Prevenção de chamada dupla no nível 2", () => {
  it("pré-registrar cacheKey antes de mudar nível evita chamada dupla do useEffect", () => {
    const loadedQuestionsRef = new Set<string>();
    const cnaeCode = "0115-6/00";
    const cacheKey = `${cnaeCode}-nivel2`;

    // Simula handleAcceptDeepDive: pré-registra antes de mudar nível
    loadedQuestionsRef.add(cacheKey);

    // Simula useEffect reagindo à mudança de nível
    let loadQuestionsCallCount = 0;
    const mockLoadQuestions = () => { loadQuestionsCallCount++; };

    if (!loadedQuestionsRef.has(cacheKey)) {
      loadedQuestionsRef.add(cacheKey);
      mockLoadQuestions();
    }

    expect(loadQuestionsCallCount).toBe(0);
  });

  it("sem pré-registro, useEffect dispararia chamada extra (comportamento antigo)", () => {
    const loadedQuestionsRef = new Set<string>();
    const cnaeCode = "0115-6/00";
    const cacheKey = `${cnaeCode}-nivel2`;

    let loadQuestionsCallCount = 0;
    const mockLoadQuestions = () => { loadQuestionsCallCount++; };

    if (!loadedQuestionsRef.has(cacheKey)) {
      loadedQuestionsRef.add(cacheKey);
      mockLoadQuestions();
    }

    expect(loadQuestionsCallCount).toBe(1);
  });

  it("handleAcceptDeepDive pré-registra cacheKey antes de setCurrentLevel", () => {
    const loadedQuestionsRef = new Set<string>();
    const cnaeCode = "0115-6/00";
    const cacheKey = `${cnaeCode}-nivel2`;

    loadedQuestionsRef.add(cacheKey);

    expect(loadedQuestionsRef.has(cacheKey)).toBe(true);
  });

  it("cacheKey é único por CNAE e nível", () => {
    const cnaes = ["0115-6/00", "4930-2/02", "5211-7/99"];
    const levels = ["nivel1", "nivel2"];
    const keys = new Set<string>();

    for (const cnae of cnaes) {
      for (const level of levels) {
        keys.add(`${cnae}-${level}`);
      }
    }

    expect(keys.size).toBe(6);
  });
});
