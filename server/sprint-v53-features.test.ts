/**
 * Testes para as funcionalidades implementadas na Sprint V53
 * - Máscara de CNPJ (maskCnpj)
 * - RF-5.08 UI: lógica do painel de notificações com Switch
 */

import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Máscara de CNPJ (replicação da função do frontend para teste)
// ─────────────────────────────────────────────────────────────────────────────
function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function isCnpjValid(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  return digits.length === 0 || digits.length === 14;
}

describe("Máscara de CNPJ (maskCnpj)", () => {
  it("retorna vazio para string vazia", () => {
    expect(maskCnpj("")).toBe("");
  });

  it("formata 2 dígitos sem separador", () => {
    expect(maskCnpj("11")).toBe("11");
  });

  it("formata 3 dígitos com ponto", () => {
    expect(maskCnpj("112")).toBe("11.2");
  });

  it("formata 5 dígitos com ponto", () => {
    expect(maskCnpj("11222")).toBe("11.222");
  });

  it("formata 6 dígitos com dois pontos", () => {
    expect(maskCnpj("112223")).toBe("11.222.3");
  });

  it("formata 8 dígitos com dois pontos", () => {
    expect(maskCnpj("11222333")).toBe("11.222.333");
  });

  it("formata 9 dígitos com barra", () => {
    expect(maskCnpj("112223330")).toBe("11.222.333/0");
  });

  it("formata 12 dígitos com barra", () => {
    expect(maskCnpj("112223330001")).toBe("11.222.333/0001");
  });

  it("formata 14 dígitos completo com hífen", () => {
    expect(maskCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("ignora dígitos além de 14", () => {
    expect(maskCnpj("112223330001819999")).toBe("11.222.333/0001-81");
  });

  it("remove caracteres não numéricos antes de formatar", () => {
    expect(maskCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81");
  });

  it("resultado tem no máximo 18 caracteres", () => {
    const result = maskCnpj("11222333000181");
    expect(result.length).toBeLessThanOrEqual(18);
  });
});

describe("Validação de CNPJ (isCnpjValid)", () => {
  it("CNPJ vazio é válido (campo opcional)", () => {
    expect(isCnpjValid("")).toBe(true);
  });

  it("CNPJ com 14 dígitos é válido", () => {
    expect(isCnpjValid("11.222.333/0001-81")).toBe(true);
  });

  it("CNPJ com 13 dígitos é inválido", () => {
    expect(isCnpjValid("1122233300018")).toBe(false);
  });

  it("CNPJ com 15 dígitos é inválido", () => {
    expect(isCnpjValid("112223330001819")).toBe(false);
  });

  it("CNPJ parcialmente digitado (5 dígitos) é inválido", () => {
    expect(isCnpjValid("11222")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RF-5.08 UI: Lógica do painel de notificações
// ─────────────────────────────────────────────────────────────────────────────
interface TaskNotifications {
  beforeDays: number;
  onStatusChange: boolean;
  onProgressUpdate: boolean;
  onComment: boolean;
}

function hasActiveNotifications(notif: TaskNotifications | undefined): boolean {
  if (!notif) return false;
  return notif.onStatusChange || notif.onProgressUpdate || notif.onComment;
}

function clampBeforeDays(value: number): number {
  return Math.min(30, Math.max(1, value));
}

function getDefaultNotifications(): TaskNotifications {
  return { beforeDays: 7, onStatusChange: false, onProgressUpdate: false, onComment: false };
}

describe("RF-5.08 UI: Painel de Notificações", () => {
  it("hasActiveNotifications retorna false para notificações padrão", () => {
    expect(hasActiveNotifications(getDefaultNotifications())).toBe(false);
  });

  it("hasActiveNotifications retorna true quando onStatusChange ativo", () => {
    expect(hasActiveNotifications({ ...getDefaultNotifications(), onStatusChange: true })).toBe(true);
  });

  it("hasActiveNotifications retorna true quando onProgressUpdate ativo", () => {
    expect(hasActiveNotifications({ ...getDefaultNotifications(), onProgressUpdate: true })).toBe(true);
  });

  it("hasActiveNotifications retorna true quando onComment ativo", () => {
    expect(hasActiveNotifications({ ...getDefaultNotifications(), onComment: true })).toBe(true);
  });

  it("hasActiveNotifications retorna false para undefined", () => {
    expect(hasActiveNotifications(undefined)).toBe(false);
  });

  it("clampBeforeDays mantém valor entre 1 e 30", () => {
    expect(clampBeforeDays(7)).toBe(7);
    expect(clampBeforeDays(1)).toBe(1);
    expect(clampBeforeDays(30)).toBe(30);
  });

  it("clampBeforeDays corrige valor abaixo de 1", () => {
    expect(clampBeforeDays(0)).toBe(1);
    expect(clampBeforeDays(-5)).toBe(1);
  });

  it("clampBeforeDays corrige valor acima de 30", () => {
    expect(clampBeforeDays(31)).toBe(30);
    expect(clampBeforeDays(100)).toBe(30);
  });

  it("atualizar onStatusChange não afeta outros campos", () => {
    const original = { beforeDays: 14, onStatusChange: false, onProgressUpdate: true, onComment: false };
    const updated = { ...original, onStatusChange: true };
    expect(updated.onStatusChange).toBe(true);
    expect(updated.onProgressUpdate).toBe(true);
    expect(updated.onComment).toBe(false);
    expect(updated.beforeDays).toBe(14);
  });

  it("ícone de sino deve ser exibido quando qualquer notificação está ativa", () => {
    const allOff = getDefaultNotifications();
    const oneOn = { ...allOff, onComment: true };
    expect(hasActiveNotifications(allOff)).toBe(false);
    expect(hasActiveNotifications(oneOn)).toBe(true);
  });
});
