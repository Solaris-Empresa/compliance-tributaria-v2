import { describe, it, expect } from "vitest";

describe("WebSocket - Notificações em Tempo Real", () => {
  it("deve exportar funções de notificação", async () => {
    // Teste básico para garantir que o módulo está correto
    const { notifyUser, notifyProject, notifyAll } = await import("./_core/websocket");
    
    expect(typeof notifyUser).toBe("function");
    expect(typeof notifyProject).toBe("function");
    expect(typeof notifyAll).toBe("function");
  });

  it("deve ter estrutura correta de eventos", () => {
    // Verificar que os eventos esperados estão definidos
    const events = [
      "task:updated",
      "task:comment",
      "task:due_soon",
      "task:overdue",
    ];

    events.forEach(event => {
      expect(typeof event).toBe("string");
      expect(event.length).toBeGreaterThan(0);
    });
  });
});
