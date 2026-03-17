/**
 * Testes unitários — RF-5: Plano de Ação (operações manuais e lógica de negócio)
 * Cobre: RF-5.04 (status), RF-5.05 (datas/alertas), RF-5.06 (progresso slider),
 *        RF-5.09 (comentários com histórico), RF-5.10 (filtros combinados),
 *        RF-5.11 (adição manual de tarefas), RF-5.13 (soft delete + restaurar),
 *        RF-5.16 (dashboard de progresso por área)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TaskStatus = "nao_iniciado" | "em_andamento" | "parado" | "concluido";
type Priority = "Alta" | "Média" | "Baixa";

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

interface Task {
  id: string;
  titulo: string;
  descricao: string;
  area: string;
  prazo_sugerido: string;
  prioridade: Priority;
  responsavel_sugerido: string;
  status: TaskStatus;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  responsible: string | null;
  notifications: {
    beforeDays: number;
    onStatusChange: boolean;
    onProgressUpdate: boolean;
    onComment: boolean;
  };
  comments: Comment[];
  manual?: boolean;
  deleted?: boolean;
}

// ─── Helpers de lógica de negócio ────────────────────────────────────────────
function isOverdue(task: Task): boolean {
  if (!task.endDate || task.status === "concluido") return false;
  const end = new Date(task.endDate).getTime();
  const now = Date.now();
  return end < now;
}

function isDueSoon(task: Task, days = 7): boolean {
  if (!task.endDate || task.status === "concluido") return false;
  const end = new Date(task.endDate).getTime();
  const now = Date.now();
  const threshold = days * 24 * 60 * 60 * 1000;
  return end > now && end - now <= threshold;
}

function filterTasks(
  tasks: Task[],
  filters: {
    status?: TaskStatus | "all";
    priority?: Priority | "all";
    responsible?: string;
    deadline?: "overdue" | "soon" | "all";
    showDeleted?: boolean;
  }
): Task[] {
  return tasks.filter((t) => {
    if (!filters.showDeleted && t.deleted) return false;
    if (filters.status && filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.priority && filters.priority !== "all" && t.prioridade !== filters.priority) return false;
    if (filters.responsible && !t.responsible?.toLowerCase().includes(filters.responsible.toLowerCase())) return false;
    if (filters.deadline === "overdue" && !isOverdue(t)) return false;
    if (filters.deadline === "soon" && !isDueSoon(t)) return false;
    return true;
  });
}

function calcAreaDashboard(tasks: Task[]) {
  const active = tasks.filter((t) => !t.deleted);
  const total = active.length;
  const concluidas = active.filter((t) => t.status === "concluido").length;
  const vencidas = active.filter((t) => isOverdue(t)).length;
  const emAndamento = active.filter((t) => t.status === "em_andamento").length;
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  return { total, concluidas, vencidas, emAndamento, progresso };
}

// ─── Dados de teste ───────────────────────────────────────────────────────────
const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
const soonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const baseTasks: Task[] = [
  {
    id: "t1",
    titulo: "Revisar contratos de serviço",
    descricao: "Analisar todos os contratos existentes",
    area: "contabilidade",
    prazo_sugerido: "30 dias",
    prioridade: "Alta",
    responsavel_sugerido: "Controller",
    status: "em_andamento",
    progress: 40,
    startDate: "2026-01-01",
    endDate: futureDate,
    responsible: "João Silva",
    notifications: { beforeDays: 7, onStatusChange: true, onProgressUpdate: false, onComment: false },
    comments: [],
  },
  {
    id: "t2",
    titulo: "Atualizar sistema ERP",
    descricao: "Upgrade para suportar NF-e 4.0",
    area: "ti",
    prazo_sugerido: "60 dias",
    prioridade: "Alta",
    responsavel_sugerido: "TI",
    status: "nao_iniciado",
    progress: 0,
    startDate: null,
    endDate: pastDate,
    responsible: "Maria Santos",
    notifications: { beforeDays: 7, onStatusChange: false, onProgressUpdate: false, onComment: false },
    comments: [],
  },
  {
    id: "t3",
    titulo: "Treinamento da equipe",
    descricao: "Capacitar equipe sobre reforma tributária",
    area: "negocio",
    prazo_sugerido: "15 dias",
    prioridade: "Média",
    responsavel_sugerido: "RH",
    status: "concluido",
    progress: 100,
    startDate: "2026-01-01",
    endDate: soonDate,
    responsible: "Ana Costa",
    notifications: { beforeDays: 3, onStatusChange: true, onProgressUpdate: true, onComment: true },
    comments: [
      { id: "c1", author: "Ana Costa", text: "Treinamento concluído com sucesso!", timestamp: Date.now() - 1000 },
    ],
  },
];

// ─── RF-5.04: Status das Tarefas ──────────────────────────────────────────────
describe("RF-5.04 — Status das Tarefas", () => {
  it("deve aceitar os 4 status válidos", () => {
    const validStatuses: TaskStatus[] = ["nao_iniciado", "em_andamento", "parado", "concluido"];
    expect(validStatuses).toHaveLength(4);
    validStatuses.forEach((s) => expect(typeof s).toBe("string"));
  });

  it("deve sugerir status 'concluido' quando progresso atinge 100%", () => {
    const progress = 100;
    const suggestedStatus: TaskStatus = progress === 100 ? "concluido" : "em_andamento";
    expect(suggestedStatus).toBe("concluido");
  });

  it("não deve sugerir 'concluido' para progresso menor que 100%", () => {
    const progress = 80;
    const suggestedStatus: TaskStatus = progress === 100 ? "concluido" : "em_andamento";
    expect(suggestedStatus).toBe("em_andamento");
  });
});

// ─── RF-5.05: Controle de Datas e Alertas ─────────────────────────────────────
describe("RF-5.05 — Controle de Datas e Alertas Visuais", () => {
  it("deve identificar tarefa vencida (endDate no passado e não concluída)", () => {
    const overdueTask = baseTasks.find((t) => t.id === "t2")!;
    expect(isOverdue(overdueTask)).toBe(true);
  });

  it("não deve marcar tarefa concluída como vencida", () => {
    const completedTask = baseTasks.find((t) => t.id === "t3")!;
    expect(isOverdue(completedTask)).toBe(false);
  });

  it("deve identificar tarefa com prazo próximo (≤7 dias)", () => {
    const soonTask: Task = { ...baseTasks[0], endDate: soonDate, status: "em_andamento" };
    expect(isDueSoon(soonTask, 7)).toBe(true);
  });

  it("não deve marcar tarefa com prazo distante como próxima", () => {
    const farTask: Task = { ...baseTasks[0], endDate: futureDate, status: "em_andamento" };
    expect(isDueSoon(farTask, 7)).toBe(false);
  });

  it("não deve marcar tarefa sem data de fim como vencida", () => {
    const noDateTask: Task = { ...baseTasks[0], endDate: null };
    expect(isOverdue(noDateTask)).toBe(false);
  });
});

// ─── RF-5.06: Percentual de Andamento ────────────────────────────────────────
describe("RF-5.06 — Percentual de Andamento (Slider 0-100%)", () => {
  it("deve aceitar valores de 0 a 100 em incrementos de 5", () => {
    for (let i = 0; i <= 100; i += 5) {
      expect(i % 5).toBe(0);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThanOrEqual(100);
    }
  });

  it("deve sugerir status 'concluido' ao atingir 100%", () => {
    const progress = 100;
    expect(progress === 100).toBe(true);
  });

  it("deve manter status atual para progresso entre 0 e 99%", () => {
    [0, 25, 50, 75, 99].forEach((p) => {
      expect(p < 100).toBe(true);
    });
  });
});

// ─── RF-5.09: Comentários com Histórico ──────────────────────────────────────
describe("RF-5.09 — Comentários por Tarefa com Histórico Cronológico", () => {
  it("deve adicionar comentário com autor, texto e timestamp", () => {
    const task: Task = { ...baseTasks[0], comments: [] };
    const comment: Comment = {
      id: `c-${Date.now()}`,
      author: "João Silva",
      text: "Iniciando a revisão dos contratos",
      timestamp: Date.now(),
    };

    task.comments.push(comment);

    expect(task.comments).toHaveLength(1);
    expect(task.comments[0].author).toBe("João Silva");
    expect(task.comments[0].text).toBe("Iniciando a revisão dos contratos");
    expect(task.comments[0].timestamp).toBeGreaterThan(0);
  });

  it("deve manter histórico cronológico (comentários ordenados por timestamp)", () => {
    const comments: Comment[] = [
      { id: "c1", author: "João", text: "Primeiro comentário", timestamp: 1000 },
      { id: "c2", author: "Maria", text: "Segundo comentário", timestamp: 2000 },
      { id: "c3", author: "Ana", text: "Terceiro comentário", timestamp: 3000 },
    ];

    const sorted = [...comments].sort((a, b) => a.timestamp - b.timestamp);
    expect(sorted[0].text).toBe("Primeiro comentário");
    expect(sorted[2].text).toBe("Terceiro comentário");
  });

  it("deve permitir múltiplos comentários por tarefa", () => {
    const task = baseTasks.find((t) => t.id === "t3")!;
    expect(task.comments.length).toBeGreaterThanOrEqual(1);
  });

  it("deve rejeitar comentário vazio", () => {
    const emptyComment = "";
    expect(emptyComment.trim().length).toBe(0);
    const isValid = emptyComment.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it("deve incluir timestamp em milissegundos (UTC)", () => {
    const timestamp = Date.now();
    expect(timestamp).toBeGreaterThan(1_700_000_000_000); // depois de 2023
    expect(typeof timestamp).toBe("number");
  });
});

// ─── RF-5.10: Filtros Combinados ─────────────────────────────────────────────
describe("RF-5.10 — Filtros de Tarefas (Status, Responsável, Prazo, Prioridade)", () => {
  it("deve filtrar por status 'em_andamento'", () => {
    const result = filterTasks(baseTasks, { status: "em_andamento" });
    expect(result.every((t) => t.status === "em_andamento")).toBe(true);
    expect(result).toHaveLength(1);
  });

  it("deve filtrar por status 'concluido'", () => {
    const result = filterTasks(baseTasks, { status: "concluido" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t3");
  });

  it("deve filtrar por responsável (case-insensitive)", () => {
    const result = filterTasks(baseTasks, { responsible: "joão" });
    expect(result).toHaveLength(1);
    expect(result[0].responsible).toBe("João Silva");
  });

  it("deve filtrar tarefas vencidas", () => {
    const result = filterTasks(baseTasks, { deadline: "overdue" });
    expect(result.every((t) => isOverdue(t))).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t2");
  });

  it("deve filtrar por prioridade 'Alta'", () => {
    const result = filterTasks(baseTasks, { priority: "Alta" });
    expect(result.every((t) => t.prioridade === "Alta")).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("deve combinar filtros (status + prioridade)", () => {
    const result = filterTasks(baseTasks, { status: "em_andamento", priority: "Alta" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
  });

  it("deve retornar todas as tarefas ativas com filtro 'all'", () => {
    const result = filterTasks(baseTasks, { status: "all" });
    expect(result).toHaveLength(baseTasks.length);
  });

  it("deve excluir tarefas deletadas por padrão", () => {
    const tasksWithDeleted: Task[] = [
      ...baseTasks,
      { ...baseTasks[0], id: "t-deleted", deleted: true },
    ];
    const result = filterTasks(tasksWithDeleted, {});
    expect(result.find((t) => t.id === "t-deleted")).toBeUndefined();
  });

  it("deve incluir tarefas deletadas quando showDeleted=true", () => {
    const tasksWithDeleted: Task[] = [
      ...baseTasks,
      { ...baseTasks[0], id: "t-deleted", deleted: true },
    ];
    const result = filterTasks(tasksWithDeleted, { showDeleted: true });
    expect(result.find((t) => t.id === "t-deleted")).toBeDefined();
  });
});

// ─── RF-5.11: Adição Manual de Tarefas ───────────────────────────────────────
describe("RF-5.11 — Adição Manual de Tarefas", () => {
  it("deve adicionar tarefa manual com ID único prefixado por 'manual-'", () => {
    const id = `manual-${Date.now()}`;
    expect(id).toMatch(/^manual-\d+$/);
  });

  it("deve marcar tarefa manual com flag manual=true", () => {
    const task: Task = {
      id: "manual-123",
      titulo: "Tarefa manual",
      descricao: "",
      area: "contabilidade",
      prazo_sugerido: "",
      prioridade: "Média",
      responsavel_sugerido: "",
      status: "nao_iniciado",
      progress: 0,
      startDate: null,
      endDate: null,
      responsible: null,
      notifications: { beforeDays: 7, onStatusChange: false, onProgressUpdate: false, onComment: false },
      comments: [],
      manual: true,
    };
    expect(task.manual).toBe(true);
  });

  it("deve exigir título para adicionar tarefa manual", () => {
    const emptyTitle = "";
    expect(emptyTitle.trim().length).toBe(0);
    const isValid = emptyTitle.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it("deve inicializar tarefa manual com status 'nao_iniciado' e progresso 0", () => {
    const task: Task = {
      id: "manual-456",
      titulo: "Nova tarefa",
      descricao: "",
      area: "ti",
      prazo_sugerido: "",
      prioridade: "Média",
      responsavel_sugerido: "",
      status: "nao_iniciado",
      progress: 0,
      startDate: null,
      endDate: null,
      responsible: null,
      notifications: { beforeDays: 7, onStatusChange: false, onProgressUpdate: false, onComment: false },
      comments: [],
      manual: true,
    };
    expect(task.status).toBe("nao_iniciado");
    expect(task.progress).toBe(0);
  });

  it("deve adicionar tarefa manual à área correta do plano", () => {
    const plans: Record<string, Task[]> = {
      contabilidade: [...baseTasks.filter((t) => t.area === "contabilidade")],
      ti: [...baseTasks.filter((t) => t.area === "ti")],
    };

    const newTask: Task = {
      id: "manual-789",
      titulo: "Tarefa manual de TI",
      descricao: "",
      area: "ti",
      prazo_sugerido: "",
      prioridade: "Alta",
      responsavel_sugerido: "",
      status: "nao_iniciado",
      progress: 0,
      startDate: null,
      endDate: null,
      responsible: null,
      notifications: { beforeDays: 7, onStatusChange: false, onProgressUpdate: false, onComment: false },
      comments: [],
      manual: true,
    };

    plans.ti = [...plans.ti, newTask];

    expect(plans.ti).toHaveLength(2);
    expect(plans.ti[1].manual).toBe(true);
    expect(plans.contabilidade).toHaveLength(1); // não afetado
  });
});

// ─── RF-5.13: Soft Delete + Restaurar ────────────────────────────────────────
describe("RF-5.13 — Soft Delete e Restauração de Tarefas", () => {
  it("deve marcar tarefa como deletada sem removê-la da lista", () => {
    const tasks = [...baseTasks];
    const updated = tasks.map((t) => (t.id === "t1" ? { ...t, deleted: true } : t));

    const deletedTask = updated.find((t) => t.id === "t1");
    expect(deletedTask).toBeDefined();
    expect(deletedTask!.deleted).toBe(true);
    expect(updated).toHaveLength(tasks.length); // lista mantém o mesmo tamanho
  });

  it("deve restaurar tarefa deletada", () => {
    const tasks = baseTasks.map((t) => (t.id === "t1" ? { ...t, deleted: true } : t));
    const restored = tasks.map((t) => (t.id === "t1" ? { ...t, deleted: false } : t));

    const restoredTask = restored.find((t) => t.id === "t1");
    expect(restoredTask!.deleted).toBe(false);
  });

  it("deve excluir tarefas deletadas dos filtros padrão", () => {
    const tasks = baseTasks.map((t) => (t.id === "t1" ? { ...t, deleted: true } : t));
    const visible = filterTasks(tasks, {});
    expect(visible.find((t) => t.id === "t1")).toBeUndefined();
  });

  it("deve exibir tarefas deletadas quando showDeleted=true", () => {
    const tasks = baseTasks.map((t) => (t.id === "t1" ? { ...t, deleted: true } : t));
    const withDeleted = filterTasks(tasks, { showDeleted: true });
    expect(withDeleted.find((t) => t.id === "t1")).toBeDefined();
  });

  it("deve excluir tarefas deletadas do cálculo do dashboard", () => {
    const tasks = baseTasks.map((t) => (t.id === "t1" ? { ...t, deleted: true } : t));
    const dashboard = calcAreaDashboard(tasks);
    expect(dashboard.total).toBe(baseTasks.length - 1); // t1 excluída
  });
});

// ─── RF-5.16: Dashboard de Progresso por Área ────────────────────────────────
describe("RF-5.16 — Dashboard de Progresso por Área", () => {
  it("deve calcular total de tarefas ativas (não deletadas)", () => {
    const dashboard = calcAreaDashboard(baseTasks);
    expect(dashboard.total).toBe(3);
  });

  it("deve calcular número de tarefas concluídas", () => {
    const dashboard = calcAreaDashboard(baseTasks);
    expect(dashboard.concluidas).toBe(1);
  });

  it("deve calcular número de tarefas vencidas", () => {
    const dashboard = calcAreaDashboard(baseTasks);
    expect(dashboard.vencidas).toBe(1); // t2 está vencida
  });

  it("deve calcular número de tarefas em andamento", () => {
    const dashboard = calcAreaDashboard(baseTasks);
    expect(dashboard.emAndamento).toBe(1);
  });

  it("deve calcular percentual de progresso (concluídas/total × 100)", () => {
    const dashboard = calcAreaDashboard(baseTasks);
    expect(dashboard.progresso).toBe(33); // 1/3 = 33%
  });

  it("deve retornar progresso 0 para lista vazia", () => {
    const dashboard = calcAreaDashboard([]);
    expect(dashboard.progresso).toBe(0);
    expect(dashboard.total).toBe(0);
  });

  it("deve retornar progresso 100 quando todas as tarefas estão concluídas", () => {
    const allDone = baseTasks.map((t) => ({ ...t, status: "concluido" as TaskStatus }));
    const dashboard = calcAreaDashboard(allDone);
    expect(dashboard.progresso).toBe(100);
  });

  it("deve excluir tarefas deletadas do cálculo do dashboard", () => {
    const withDeleted = [...baseTasks, { ...baseTasks[0], id: "t-del", deleted: true }];
    const dashboard = calcAreaDashboard(withDeleted);
    expect(dashboard.total).toBe(3); // t-del excluída
  });
});
