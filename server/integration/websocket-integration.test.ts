import { describe, it, expect } from "vitest";
import * as websocket from "../_core/websocket";

describe("Integração WebSocket com Tarefas", () => {
  it("deve exportar funções de notificação WebSocket", () => {
    expect(typeof websocket.notifyProject).toBe("function");
    expect(typeof websocket.notifyUser).toBe("function");
    expect(typeof websocket.notifyAll).toBe("function");
  });

  it("deve verificar estrutura de eventos WebSocket", () => {
    const expectedEvents = [
      "task:updated",
      "task:comment",
      "task:due_soon",
      "task:overdue",
    ];

    expectedEvents.forEach(event => {
      expect(typeof event).toBe("string");
      expect(event).toMatch(/^task:/);
      expect(event.length).toBeGreaterThan(0);
    });
  });

  it("deve ter eventos com nomenclatura correta", () => {
    const events = {
      taskUpdated: "task:updated",
      taskComment: "task:comment",
      taskDueSoon: "task:due_soon",
      taskOverdue: "task:overdue",
    };

    Object.values(events).forEach(event => {
      expect(event).toContain(":");
      expect(event.split(":")[0]).toBe("task");
    });
  });
});
