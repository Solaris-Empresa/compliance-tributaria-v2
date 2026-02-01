import { describe, it, expect } from "vitest";

describe("Action Plans JSON Parsing", () => {
  // Simula a lógica de parsing usada em routers-action-plans.ts
  function parseAIResponse(content: string | null): { tasks: any[] } {
    const cleanContent = typeof content === 'string' 
      ? content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
      : '{"tasks":[]}';
    return JSON.parse(cleanContent);
  }

  it("deve fazer parse de JSON puro sem markdown", () => {
    const jsonPuro = '{"tasks":[{"title":"Tarefa 1","description":"Descrição"}]}';
    const result = parseAIResponse(jsonPuro);
    
    expect(result).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0].title).toBe("Tarefa 1");
  });

  it("deve fazer parse de JSON com markdown code blocks (```json ... ```)", () => {
    const jsonComMarkdown = '```json\n{"tasks":[{"title":"Tarefa 2","description":"Com markdown"}]}\n```';
    const result = parseAIResponse(jsonComMarkdown);
    
    expect(result).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0].title).toBe("Tarefa 2");
  });

  it("deve fazer parse de JSON com espaços extras e markdown", () => {
    const jsonComEspacos = '  ```json  \n  {"tasks":[{"title":"Tarefa 3"}]}  \n  ```  ';
    const result = parseAIResponse(jsonComEspacos);
    
    expect(result).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0].title).toBe("Tarefa 3");
  });

  it("deve fazer parse de JSON com múltiplas tarefas", () => {
    const jsonMultiplo = '```json\n{"tasks":[{"title":"T1"},{"title":"T2"},{"title":"T3"}]}\n```';
    const result = parseAIResponse(jsonMultiplo);
    
    expect(result).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(result.tasks.length).toBe(3);
    expect(result.tasks[0].title).toBe("T1");
    expect(result.tasks[1].title).toBe("T2");
    expect(result.tasks[2].title).toBe("T3");
  });

  it("deve retornar tasks vazio para conteúdo null", () => {
    const result = parseAIResponse(null);
    
    expect(result).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(result.tasks.length).toBe(0);
  });

  it("deve fazer parse de JSON complexo com todos os campos", () => {
    const jsonComplexo = '```json\n{"tasks":[{"title":"Implementar sistema","description":"Descrição detalhada","responsibleArea":"TI","taskType":"STRATEGIC","priority":"ALTA","estimatedDays":30}]}\n```';
    const result = parseAIResponse(jsonComplexo);
    
    expect(result).toBeDefined();
    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0].title).toBe("Implementar sistema");
    expect(result.tasks[0].responsibleArea).toBe("TI");
    expect(result.tasks[0].taskType).toBe("STRATEGIC");
    expect(result.tasks[0].priority).toBe("ALTA");
    expect(result.tasks[0].estimatedDays).toBe(30);
  });
});
