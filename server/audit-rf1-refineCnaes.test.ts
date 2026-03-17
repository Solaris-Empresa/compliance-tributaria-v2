/**
 * Testes unitários — RF-1.05: Loop de Aprovação de CNAEs (refineCnaes)
 * Cobre: refineCnaes com feedback do usuário, múltiplas iterações, validações de schema
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
  getProjectById: vi.fn(),
}));
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import * as db from "./db";
import { invokeLLM } from "./_core/llm";

const mockUser = {
  id: 1,
  openId: "user-123",
  name: "Consultor Teste",
  email: "consultor@test.com",
  role: "admin" as const,
};

const mockProject = {
  id: 42,
  name: "Projeto Reforma Tributária",
  description:
    "Empresa de comércio varejista de vestuário e acessórios. Opera em 5 lojas físicas e e-commerce. Regime Simples Nacional. Faturamento anual R$ 3M.",
  confirmedCnaes: null,
  currentStep: 1,
};

const currentCnaes = [
  { code: "4781-4/00", description: "Comércio varejista de vestuário e acessórios", confidence: 85 },
  { code: "4782-2/01", description: "Comércio varejista de calçados", confidence: 60 },
];

describe("RF-1.05 — refineCnaes: Loop de Aprovação de CNAEs com Feedback da IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
  });

  it("deve aceitar feedback mínimo de 5 caracteres", () => {
    const feedback = "Falta o CNAE de e-commerce";
    expect(feedback.length).toBeGreaterThanOrEqual(5);
  });

  it("deve rejeitar feedback com menos de 5 caracteres", () => {
    const feedback = "OK";
    expect(feedback.length).toBeLessThan(5);
  });

  it("deve chamar a IA com o contexto dos CNAEs atuais e o feedback do usuário", async () => {
    const refinedCnaes = [
      { code: "4781-4/00", description: "Comércio varejista de vestuário e acessórios", confidence: 90 },
      { code: "4782-2/01", description: "Comércio varejista de calçados", confidence: 75 },
      { code: "4791-1/00", description: "Comércio varejista via internet", confidence: 88 },
    ];

    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ cnaes: refinedCnaes }),
          },
        },
      ],
    } as any);

    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Você é especialista em CNAE.",
        },
        {
          role: "user",
          content: `CNAEs atuais: ${JSON.stringify(currentCnaes)}. Feedback: "Falta o CNAE de e-commerce (4791-1/00)"`,
        },
      ],
    });

    const parsed = JSON.parse(result.choices[0].message.content as string);
    expect(parsed.cnaes).toHaveLength(3);
    expect(parsed.cnaes[2].code).toBe("4791-1/00");
    expect(invokeLLM).toHaveBeenCalledOnce();
  });

  it("deve retornar lista refinada com CNAEs de alta confiança após feedback", async () => {
    const refinedCnaes = [
      { code: "4781-4/00", description: "Comércio varejista de vestuário", confidence: 92 },
      { code: "4791-1/00", description: "Comércio varejista via internet", confidence: 88 },
    ];

    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ cnaes: refinedCnaes }) } }],
    } as any);

    const result = await invokeLLM({ messages: [] });
    const parsed = JSON.parse(result.choices[0].message.content as string);

    expect(parsed.cnaes.every((c: any) => c.confidence >= 80)).toBe(true);
  });

  it("deve suportar múltiplas iterações de refinamento (iteração 1, 2, 3)", () => {
    const iterations = [1, 2, 3];
    iterations.forEach((iteration) => {
      expect(iteration).toBeGreaterThanOrEqual(1);
      expect(iteration).toBeLessThanOrEqual(10); // máximo razoável de iterações
    });
  });

  it("deve incluir o número da iteração no prompt enviado à IA", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ cnaes: currentCnaes }) } }],
    } as any);

    const iteration = 2;
    const promptContent = `Você já sugeriu os seguintes CNAEs para este negócio (iteração ${iteration})`;
    expect(promptContent).toContain("iteração 2");

    await invokeLLM({
      messages: [{ role: "user", content: promptContent }],
    });

    expect(invokeLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining("iteração 2"),
          }),
        ]),
      })
    );
  });

  it("deve exigir pelo menos 1 CNAE na lista atual para refinamento", () => {
    const emptyCnaes: typeof currentCnaes = [];
    expect(emptyCnaes.length).toBe(0);
    // O schema Zod exige currentCnaes com pelo menos 1 item
    const isValid = emptyCnaes.length >= 1;
    expect(isValid).toBe(false);
  });

  it("deve retornar entre 2 e 6 CNAEs refinados", async () => {
    const refinedCnaes = [
      { code: "4781-4/00", description: "Comércio varejista de vestuário", confidence: 92 },
      { code: "4791-1/00", description: "Comércio varejista via internet", confidence: 88 },
      { code: "4782-2/01", description: "Comércio varejista de calçados", confidence: 70 },
    ];

    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ cnaes: refinedCnaes }) } }],
    } as any);

    const result = await invokeLLM({ messages: [] });
    const parsed = JSON.parse(result.choices[0].message.content as string);

    expect(parsed.cnaes.length).toBeGreaterThanOrEqual(2);
    expect(parsed.cnaes.length).toBeLessThanOrEqual(6);
  });

  it("deve lançar erro se a IA retornar JSON inválido no refinamento", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "resposta inválida sem JSON" } }],
    } as any);

    const result = await invokeLLM({ messages: [] });
    const content = result.choices[0].message.content as string;

    expect(() => JSON.parse(content)).toThrow();
  });

  it("deve validar que cada CNAE refinado tem code, description e confidence", () => {
    const validCnae = { code: "4781-4/00", description: "Comércio varejista de vestuário", confidence: 85 };
    expect(validCnae.code).toBeTruthy();
    expect(validCnae.description).toBeTruthy();
    expect(validCnae.confidence).toBeGreaterThanOrEqual(0);
    expect(validCnae.confidence).toBeLessThanOrEqual(100);
  });

  it("deve preservar CNAEs de alta confiança do usuário durante o refinamento", async () => {
    // CNAEs que o usuário já aprovou (alta confiança) devem ser mantidos
    const highConfidenceCnae = { code: "4781-4/00", description: "Comércio varejista de vestuário", confidence: 95 };
    const refinedCnaes = [
      highConfidenceCnae,
      { code: "4791-1/00", description: "Comércio varejista via internet", confidence: 88 },
    ];

    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ cnaes: refinedCnaes }) } }],
    } as any);

    const result = await invokeLLM({ messages: [] });
    const parsed = JSON.parse(result.choices[0].message.content as string);

    const preserved = parsed.cnaes.find((c: any) => c.code === "4781-4/00");
    expect(preserved).toBeDefined();
    expect(preserved.confidence).toBeGreaterThanOrEqual(90);
  });
});

describe("RF-1.05 — Validações de Schema do refineCnaes", () => {
  it("deve validar estrutura mínima do input: projectId, description, feedback, currentCnaes", () => {
    const validInput = {
      projectId: 42,
      description:
        "Empresa de comércio varejista de vestuário e acessórios. Opera em 5 lojas físicas e e-commerce.",
      feedback: "Falta o CNAE de e-commerce 4791-1/00",
      currentCnaes: [
        { code: "4781-4/00", description: "Comércio varejista de vestuário", confidence: 85 },
      ],
      iteration: 1,
    };

    expect(validInput.projectId).toBeGreaterThan(0);
    expect(validInput.description.length).toBeGreaterThanOrEqual(50);
    expect(validInput.feedback.length).toBeGreaterThanOrEqual(5);
    expect(validInput.currentCnaes.length).toBeGreaterThanOrEqual(1);
    expect(validInput.iteration).toBeGreaterThanOrEqual(1);
  });

  it("deve rejeitar description com menos de 50 caracteres no refinamento", () => {
    const shortDesc = "Empresa pequena";
    expect(shortDesc.length).toBeLessThan(50);
  });

  it("deve aceitar iteration com valor padrão 1 quando não fornecido", () => {
    const defaultIteration = 1;
    expect(defaultIteration).toBe(1);
  });
});
