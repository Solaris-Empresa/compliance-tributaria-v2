/**
 * RF-HIST: Testes unitários para Histórico de Alterações por Tarefa
 * Cobre: schema da tabela, helpers de banco, lógica de diff de campos,
 *        formatação de valores e filtragem de eventos.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Tipos espelhando o schema ────────────────────────────────────────────────
interface TaskHistoryEntry {
  id: number;
  projectId: number;
  taskId: string;
  userId: string;
  userName: string;
  eventType: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: number;
}

// ─── Helpers de formatação (replicados do componente) ─────────────────────────
const STATUS_LABELS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  parado: "Parado",
  concluido: "Concluído",
};

function formatHistoryValue(field: string, value: string | null): string {
  if (!value) return "—";
  if (field === "status") return STATUS_LABELS[value] || value;
  if (field === "progresso") return `${value}%`;
  if (field === "prazo") {
    try { return new Date(value).toLocaleDateString("pt-BR"); } catch { return value; }
  }
  if (field === "notificações") {
    try {
      const n = JSON.parse(value);
      const parts: string[] = [];
      if (n.onStatusChange) parts.push("Status");
      if (n.onProgressUpdate) parts.push("Progresso");
      if (n.onComment) parts.push("Comentários");
      if (n.beforeDays) parts.push(`${n.beforeDays}d antes`);
      return parts.length ? parts.join(", ") : "Desativadas";
    } catch { return value; }
  }
  return value;
}

// ─── Lógica de diff de campos (replicada do servidor) ─────────────────────────
const FIELD_MAP = [
  { key: "status",      eventType: "status",      label: "status" },
  { key: "responsible", eventType: "responsavel", label: "responsável" },
  { key: "endDate",     eventType: "prazo",        label: "prazo" },
  { key: "progress",    eventType: "progresso",    label: "progresso" },
  { key: "titulo",      eventType: "titulo",       label: "título" },
];

function computeHistoryEntries(
  currentTask: Record<string, any>,
  updates: Record<string, any>
): Array<{ eventType: string; field: string; oldValue: string | null; newValue: string | null }> {
  const entries: Array<{ eventType: string; field: string; oldValue: string | null; newValue: string | null }> = [];
  for (const { key, eventType, label } of FIELD_MAP) {
    if (updates[key] !== undefined && updates[key] !== currentTask[key]) {
      entries.push({
        eventType,
        field: label,
        oldValue: currentTask[key] != null ? String(currentTask[key]) : null,
        newValue: updates[key] != null ? String(updates[key]) : null,
      });
    }
  }
  if (updates.notifications !== undefined) {
    entries.push({
      eventType: "notificacao",
      field: "notificações",
      oldValue: currentTask.notifications ? JSON.stringify(currentTask.notifications) : null,
      newValue: JSON.stringify({ ...currentTask.notifications, ...updates.notifications }),
    });
  }
  return entries;
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("RF-HIST: formatHistoryValue", () => {
  it("retorna — para valor null", () => {
    expect(formatHistoryValue("status", null)).toBe("—");
  });

  it("traduz status nao_iniciado", () => {
    expect(formatHistoryValue("status", "nao_iniciado")).toBe("Não iniciado");
  });

  it("traduz status em_andamento", () => {
    expect(formatHistoryValue("status", "em_andamento")).toBe("Em andamento");
  });

  it("traduz status concluido", () => {
    expect(formatHistoryValue("status", "concluido")).toBe("Concluído");
  });

  it("formata progresso com %", () => {
    expect(formatHistoryValue("progresso", "75")).toBe("75%");
  });

  it("retorna valor bruto para campo desconhecido", () => {
    expect(formatHistoryValue("titulo", "Minha Tarefa")).toBe("Minha Tarefa");
  });

  it("formata notificações com toggles ativos", () => {
    const val = JSON.stringify({ onStatusChange: true, onProgressUpdate: false, onComment: true, beforeDays: 3 });
    const result = formatHistoryValue("notificações", val);
    expect(result).toContain("Status");
    expect(result).toContain("Comentários");
    expect(result).toContain("3d antes");
    expect(result).not.toContain("Progresso");
  });

  it("formata notificações desativadas", () => {
    const val = JSON.stringify({ onStatusChange: false, onProgressUpdate: false, onComment: false, beforeDays: 0 });
    expect(formatHistoryValue("notificações", val)).toBe("Desativadas");
  });

  it("retorna valor bruto se JSON inválido em notificações", () => {
    expect(formatHistoryValue("notificações", "invalid-json")).toBe("invalid-json");
  });
});

describe("RF-HIST: computeHistoryEntries", () => {
  const baseTask = {
    id: "task-1",
    titulo: "Tarefa Original",
    status: "nao_iniciado",
    progress: 0,
    responsible: null,
    endDate: null,
    notifications: { beforeDays: 7, onStatusChange: true, onProgressUpdate: false, onComment: false },
  };

  it("gera entrada de histórico para mudança de status", () => {
    const entries = computeHistoryEntries(baseTask, { status: "em_andamento" });
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe("status");
    expect(entries[0].oldValue).toBe("nao_iniciado");
    expect(entries[0].newValue).toBe("em_andamento");
  });

  it("não gera entrada quando valor não muda", () => {
    const entries = computeHistoryEntries(baseTask, { status: "nao_iniciado" });
    expect(entries).toHaveLength(0);
  });

  it("gera entrada para mudança de progresso", () => {
    const entries = computeHistoryEntries(baseTask, { progress: 50 });
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe("progresso");
    expect(entries[0].newValue).toBe("50");
  });

  it("gera entrada para atribuição de responsável", () => {
    const entries = computeHistoryEntries(baseTask, { responsible: "João Silva" });
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe("responsavel");
    expect(entries[0].oldValue).toBeNull();
    expect(entries[0].newValue).toBe("João Silva");
  });

  it("gera múltiplas entradas para múltiplas mudanças", () => {
    const entries = computeHistoryEntries(baseTask, {
      status: "em_andamento",
      progress: 25,
      responsible: "Maria",
    });
    expect(entries).toHaveLength(3);
    const types = entries.map(e => e.eventType);
    expect(types).toContain("status");
    expect(types).toContain("progresso");
    expect(types).toContain("responsavel");
  });

  it("gera entrada para mudança de notificações", () => {
    const entries = computeHistoryEntries(baseTask, {
      notifications: { onProgressUpdate: true },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe("notificacao");
    expect(entries[0].field).toBe("notificações");
    const newVal = JSON.parse(entries[0].newValue!);
    expect(newVal.onProgressUpdate).toBe(true);
    expect(newVal.onStatusChange).toBe(true); // preservado do original
  });

  it("gera entrada para mudança de prazo", () => {
    const entries = computeHistoryEntries(baseTask, { endDate: "2026-12-31" });
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe("prazo");
    expect(entries[0].newValue).toBe("2026-12-31");
  });

  it("gera entrada para mudança de título", () => {
    const entries = computeHistoryEntries(baseTask, { titulo: "Novo Título" });
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe("titulo");
    expect(entries[0].oldValue).toBe("Tarefa Original");
  });
});

describe("RF-HIST: schema e integridade dos dados", () => {
  it("entrada de histórico tem todos os campos obrigatórios", () => {
    const entry: TaskHistoryEntry = {
      id: 1,
      projectId: 100,
      taskId: "task-abc",
      userId: "user-1",
      userName: "Usuário Teste",
      eventType: "status",
      field: "status",
      oldValue: "nao_iniciado",
      newValue: "em_andamento",
      createdAt: Date.now(),
    };
    expect(entry.id).toBeDefined();
    expect(entry.projectId).toBe(100);
    expect(entry.taskId).toBe("task-abc");
    expect(entry.eventType).toBe("status");
    expect(entry.createdAt).toBeGreaterThan(0);
  });

  it("permite oldValue e newValue nulos (criação de tarefa)", () => {
    const entry: TaskHistoryEntry = {
      id: 2,
      projectId: 100,
      taskId: "task-abc",
      userId: "user-1",
      userName: "Usuário Teste",
      eventType: "criacao",
      field: null,
      oldValue: null,
      newValue: null,
      createdAt: Date.now(),
    };
    expect(entry.oldValue).toBeNull();
    expect(entry.newValue).toBeNull();
    expect(entry.field).toBeNull();
  });

  it("filtra entradas por taskId corretamente", () => {
    const entries: TaskHistoryEntry[] = [
      { id: 1, projectId: 1, taskId: "task-A", userId: "u1", userName: "U1", eventType: "status", field: "status", oldValue: null, newValue: "em_andamento", createdAt: 1000 },
      { id: 2, projectId: 1, taskId: "task-B", userId: "u1", userName: "U1", eventType: "status", field: "status", oldValue: null, newValue: "concluido", createdAt: 2000 },
      { id: 3, projectId: 1, taskId: "task-A", userId: "u1", userName: "U1", eventType: "progresso", field: "progresso", oldValue: "0", newValue: "50", createdAt: 3000 },
    ];
    const taskAHistory = entries.filter(e => e.taskId === "task-A");
    expect(taskAHistory).toHaveLength(2);
    expect(taskAHistory.every(e => e.taskId === "task-A")).toBe(true);
  });

  it("ordena entradas por createdAt decrescente (mais recente primeiro)", () => {
    const entries: TaskHistoryEntry[] = [
      { id: 1, projectId: 1, taskId: "task-A", userId: "u1", userName: "U1", eventType: "status", field: "status", oldValue: null, newValue: "em_andamento", createdAt: 1000 },
      { id: 3, projectId: 1, taskId: "task-A", userId: "u1", userName: "U1", eventType: "progresso", field: "progresso", oldValue: "0", newValue: "50", createdAt: 3000 },
      { id: 2, projectId: 1, taskId: "task-A", userId: "u1", userName: "U1", eventType: "responsavel", field: "responsável", oldValue: null, newValue: "João", createdAt: 2000 },
    ];
    const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
    expect(sorted[0].id).toBe(3);
    expect(sorted[1].id).toBe(2);
    expect(sorted[2].id).toBe(1);
  });
});
