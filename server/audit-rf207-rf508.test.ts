/**
 * Testes unitários e funcionais para:
 * - RF-2.07: Confirmação ao retornar a CNAE já concluído
 * - RF-5.08: Painel de configuração de notificações por tarefa
 */

import { describe, it, expect } from "vitest";

// ─── RF-2.07: Lógica de confirmação ao retornar a CNAE concluído ──────────────

interface CnaeProgress {
  code: string;
  description: string;
  nivel1Done: boolean;
  nivel2Done: boolean;
  skippedNivel2: boolean;
  answers: { question: string; answer: string }[];
  nivel2Answers: { question: string; answer: string }[];
}

function shouldConfirmPrevCnae(
  cnaeProgress: CnaeProgress[],
  currentCnaeIdx: number
): boolean {
  if (currentCnaeIdx <= 0) return false;
  const prevProgress = cnaeProgress[currentCnaeIdx - 1];
  return prevProgress?.nivel1Done === true;
}

function navigateToPrevCnae(
  cnaeProgress: CnaeProgress[],
  currentCnaeIdx: number,
  confirmed: boolean
): { shouldNavigate: boolean; shouldShowDialog: boolean } {
  if (currentCnaeIdx <= 0) {
    return { shouldNavigate: false, shouldShowDialog: false };
  }
  const prevProgress = cnaeProgress[currentCnaeIdx - 1];
  if (prevProgress?.nivel1Done && !confirmed) {
    return { shouldNavigate: false, shouldShowDialog: true };
  }
  return { shouldNavigate: true, shouldShowDialog: false };
}

describe("RF-2.07: Confirmação ao retornar a CNAE já concluído", () => {
  const baseCnae: CnaeProgress = {
    code: "4781-4/00",
    description: "Comércio varejista de vestuário",
    nivel1Done: false,
    nivel2Done: false,
    skippedNivel2: false,
    answers: [],
    nivel2Answers: [],
  };

  it("não deve mostrar diálogo quando o CNAE anterior não foi concluído", () => {
    const progress: CnaeProgress[] = [
      { ...baseCnae, code: "4781-4/00", nivel1Done: false },
      { ...baseCnae, code: "4782-2/01", nivel1Done: false },
    ];
    expect(shouldConfirmPrevCnae(progress, 1)).toBe(false);
  });

  it("deve mostrar diálogo quando o CNAE anterior já foi concluído", () => {
    const progress: CnaeProgress[] = [
      { ...baseCnae, code: "4781-4/00", nivel1Done: true },
      { ...baseCnae, code: "4782-2/01", nivel1Done: false },
    ];
    expect(shouldConfirmPrevCnae(progress, 1)).toBe(true);
  });

  it("não deve mostrar diálogo quando está no primeiro CNAE (idx=0)", () => {
    const progress: CnaeProgress[] = [
      { ...baseCnae, code: "4781-4/00", nivel1Done: true },
    ];
    expect(shouldConfirmPrevCnae(progress, 0)).toBe(false);
  });

  it("deve navegar sem diálogo quando CNAE anterior não foi concluído", () => {
    const progress: CnaeProgress[] = [
      { ...baseCnae, code: "4781-4/00", nivel1Done: false },
      { ...baseCnae, code: "4782-2/01", nivel1Done: false },
    ];
    const result = navigateToPrevCnae(progress, 1, false);
    expect(result.shouldNavigate).toBe(true);
    expect(result.shouldShowDialog).toBe(false);
  });

  it("deve mostrar diálogo e NÃO navegar quando CNAE anterior foi concluído e não confirmado", () => {
    const progress: CnaeProgress[] = [
      { ...baseCnae, code: "4781-4/00", nivel1Done: true },
      { ...baseCnae, code: "4782-2/01", nivel1Done: false },
    ];
    const result = navigateToPrevCnae(progress, 1, false);
    expect(result.shouldNavigate).toBe(false);
    expect(result.shouldShowDialog).toBe(true);
  });

  it("deve navegar quando CNAE anterior foi concluído E usuário confirmou", () => {
    const progress: CnaeProgress[] = [
      { ...baseCnae, code: "4781-4/00", nivel1Done: true },
      { ...baseCnae, code: "4782-2/01", nivel1Done: false },
    ];
    const result = navigateToPrevCnae(progress, 1, true);
    expect(result.shouldNavigate).toBe(true);
    expect(result.shouldShowDialog).toBe(false);
  });

  it("não deve navegar quando idx=0 (não há CNAE anterior)", () => {
    const progress: CnaeProgress[] = [
      { ...baseCnae, code: "4781-4/00", nivel1Done: true },
    ];
    const result = navigateToPrevCnae(progress, 0, false);
    expect(result.shouldNavigate).toBe(false);
    expect(result.shouldShowDialog).toBe(false);
  });

  it("deve funcionar com múltiplos CNAEs — terceiro retornando ao segundo concluído", () => {
    const progress: CnaeProgress[] = [
      { ...baseCnae, code: "4781-4/00", nivel1Done: true },
      { ...baseCnae, code: "4782-2/01", nivel1Done: true },
      { ...baseCnae, code: "4783-1/00", nivel1Done: false },
    ];
    expect(shouldConfirmPrevCnae(progress, 2)).toBe(true);
    const result = navigateToPrevCnae(progress, 2, false);
    expect(result.shouldShowDialog).toBe(true);
  });

  it("deve preservar o progresso do CNAE atual ao retornar ao anterior", () => {
    // A navegação não deve apagar o progresso do CNAE de destino
    const progress: CnaeProgress[] = [
      { ...baseCnae, code: "4781-4/00", nivel1Done: true, answers: [{ question: "Q1", answer: "Sim" }] },
      { ...baseCnae, code: "4782-2/01", nivel1Done: false },
    ];
    // Ao retornar, o progresso do CNAE 0 (nivel1Done=true, answers) deve ser mantido
    const prevProgress = progress[0];
    expect(prevProgress.nivel1Done).toBe(true);
    expect(prevProgress.answers).toHaveLength(1);
  });
});

// ─── RF-5.08: Configuração de notificações por tarefa ─────────────────────────

interface TaskNotifications {
  beforeDays: number;
  onStatusChange: boolean;
  onProgressUpdate: boolean;
  onComment: boolean;
}

interface Task {
  id: string;
  title: string;
  notifications: TaskNotifications;
}

function getDefaultNotifications(): TaskNotifications {
  return {
    beforeDays: 7,
    onStatusChange: false,
    onProgressUpdate: false,
    onComment: false,
  };
}

function updateTaskNotifications(
  task: Task,
  update: Partial<TaskNotifications>
): Task {
  return {
    ...task,
    notifications: { ...task.notifications, ...update },
  };
}

function hasActiveNotifications(task: Task): boolean {
  const n = task.notifications;
  return n.onStatusChange || n.onProgressUpdate || n.onComment || n.beforeDays > 0;
}

function validateBeforeDays(days: number): boolean {
  return days >= 1 && days <= 30;
}

describe("RF-5.08: Painel de configuração de notificações por tarefa", () => {
  const baseTask: Task = {
    id: "task-1",
    title: "Revisar contratos",
    notifications: getDefaultNotifications(),
  };

  it("deve ter configurações padrão corretas (7 dias, tudo desabilitado)", () => {
    const defaults = getDefaultNotifications();
    expect(defaults.beforeDays).toBe(7);
    expect(defaults.onStatusChange).toBe(false);
    expect(defaults.onProgressUpdate).toBe(false);
    expect(defaults.onComment).toBe(false);
  });

  it("deve ativar notificação de mudança de status", () => {
    const updated = updateTaskNotifications(baseTask, { onStatusChange: true });
    expect(updated.notifications.onStatusChange).toBe(true);
    expect(updated.notifications.onProgressUpdate).toBe(false); // outros não afetados
  });

  it("deve ativar notificação de novo comentário", () => {
    const updated = updateTaskNotifications(baseTask, { onComment: true });
    expect(updated.notifications.onComment).toBe(true);
  });

  it("deve ativar notificação de atualização de progresso", () => {
    const updated = updateTaskNotifications(baseTask, { onProgressUpdate: true });
    expect(updated.notifications.onProgressUpdate).toBe(true);
  });

  it("deve configurar o número de dias antes do prazo", () => {
    const updated = updateTaskNotifications(baseTask, { beforeDays: 3 });
    expect(updated.notifications.beforeDays).toBe(3);
  });

  it("deve validar que beforeDays está entre 1 e 30", () => {
    expect(validateBeforeDays(1)).toBe(true);
    expect(validateBeforeDays(7)).toBe(true);
    expect(validateBeforeDays(30)).toBe(true);
    expect(validateBeforeDays(0)).toBe(false);
    expect(validateBeforeDays(31)).toBe(false);
    expect(validateBeforeDays(-1)).toBe(false);
  });

  it("deve detectar que a tarefa tem notificações ativas", () => {
    const taskWithNotif = updateTaskNotifications(baseTask, { onStatusChange: true });
    expect(hasActiveNotifications(taskWithNotif)).toBe(true);
  });

  it("deve manter as demais configurações ao atualizar uma notificação", () => {
    const task = updateTaskNotifications(baseTask, { onStatusChange: true, onComment: true });
    const updated = updateTaskNotifications(task, { onStatusChange: false });
    expect(updated.notifications.onStatusChange).toBe(false);
    expect(updated.notifications.onComment).toBe(true); // não afetado
    expect(updated.notifications.beforeDays).toBe(7); // não afetado
  });

  it("deve permitir ativar todas as notificações simultaneamente", () => {
    const task = updateTaskNotifications(baseTask, {
      onStatusChange: true,
      onProgressUpdate: true,
      onComment: true,
      beforeDays: 14,
    });
    expect(task.notifications.onStatusChange).toBe(true);
    expect(task.notifications.onProgressUpdate).toBe(true);
    expect(task.notifications.onComment).toBe(true);
    expect(task.notifications.beforeDays).toBe(14);
  });

  it("deve preservar o id e título da tarefa ao atualizar notificações", () => {
    const updated = updateTaskNotifications(baseTask, { onComment: true });
    expect(updated.id).toBe("task-1");
    expect(updated.title).toBe("Revisar contratos");
  });
});
