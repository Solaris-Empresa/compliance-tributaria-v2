/**
 * extract-json.test.ts — Testes unitários para extractJsonFromLLMResponse
 *
 * Previne regressão na função de parsing JSON de respostas LLM.
 * Causa raiz: extractJsonFromLLMResponse ignorava arrays [] (apenas extraía {}),
 * causando falha em toda feature que dependia de resposta LLM em formato array.
 *
 * Sprint Z-17 — lição aprendida: 5 PRs de fix (#664 #666 #667 #673 #674)
 */
import { describe, it, expect } from "vitest";
import { extractJsonFromLLMResponse } from "../ai-helpers";

describe("extractJsonFromLLMResponse", () => {
  // ─── Array direto ─────────────────────────────────────────────────
  it("extrai array direto simples", () => {
    const input = '[{"titulo":"Tarefa 1","descricao":"Desc","responsavel":"ti"}]';
    const result = extractJsonFromLLMResponse(input);
    expect(result).toBe(input);
    expect(JSON.parse(result!)).toHaveLength(1);
  });

  it("extrai array com múltiplos itens", () => {
    const input =
      '[{"titulo":"T1","descricao":"D1","responsavel":"ti"},{"titulo":"T2","descricao":"D2","responsavel":"juridico"}]';
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toHaveLength(2);
  });

  it("extrai array vazio", () => {
    const result = extractJsonFromLLMResponse("[]");
    expect(result).toBe("[]");
  });

  // ─── Objeto direto ────────────────────────────────────────────────
  it("extrai objeto direto", () => {
    const input = '{"tarefas":[{"titulo":"T1"}]}';
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed).toHaveProperty("tarefas");
  });

  it("extrai objeto wrapper com array interno", () => {
    const input = '{"resultado":[{"titulo":"T1","descricao":"D","responsavel":"ti"}]}';
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!).resultado).toHaveLength(1);
  });

  // ─── Markdown code fence ──────────────────────────────────────────
  it("extrai array de markdown fence json", () => {
    const input = '```json\n[{"titulo":"T1","responsavel":"ti"}]\n```';
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toHaveLength(1);
  });

  it("extrai objeto de markdown fence", () => {
    const input = '```json\n{"tarefas":[{"titulo":"T1"}]}\n```';
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toHaveProperty("tarefas");
  });

  it("extrai de markdown fence sem tag json", () => {
    const input = '```\n[{"titulo":"T1"}]\n```';
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toHaveLength(1);
  });

  // ─── Thinking blocks ─────────────────────────────────────────────
  it("ignora thinking block e extrai JSON após", () => {
    const input =
      '```thinking\nVou pensar nas tarefas...\n```\n[{"titulo":"T1","responsavel":"ti"}]';
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toHaveLength(1);
  });

  // ─── Texto misto ──────────────────────────────────────────────────
  it("extrai JSON de texto com prefixo", () => {
    const input =
      'Aqui estão as tarefas sugeridas:\n[{"titulo":"T1","descricao":"D1","responsavel":"ti"}]';
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toHaveLength(1);
  });

  it("extrai JSON de texto com sufixo", () => {
    const input =
      '[{"titulo":"T1","responsavel":"ti"}]\nEspero que seja útil!';
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toHaveLength(1);
  });

  it("prefere o maior bloco JSON quando há múltiplos", () => {
    const input =
      '{"small":1} e também [{"titulo":"T1"},{"titulo":"T2"},{"titulo":"T3"}]';
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    // O array com 3 itens é maior que o objeto com 1 campo
    const parsed = JSON.parse(result!);
    expect(Array.isArray(parsed)).toBeTruthy();
    expect(parsed).toHaveLength(3);
  });

  // ─── Edge cases ───────────────────────────────────────────────────
  it("retorna null para texto sem JSON", () => {
    expect(extractJsonFromLLMResponse("Sem json aqui")).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(extractJsonFromLLMResponse("")).toBeNull();
  });

  it("retorna null para null/undefined", () => {
    expect(extractJsonFromLLMResponse(null as any)).toBeNull();
    expect(extractJsonFromLLMResponse(undefined as any)).toBeNull();
  });

  // ─── Formatos reais do GPT-4.1 / Gemini ──────────────────────────
  it("extrai resposta típica GPT-4.1 com wrapper 'tarefas'", () => {
    const input = `{
      "tarefas": [
        {"titulo": "Mapear operações sujeitas ao IS", "descricao": "Identificar todas as operações", "responsavel": "gestor_fiscal"},
        {"titulo": "Configurar ERP", "descricao": "Parametrizar módulo fiscal", "responsavel": "ti"}
      ]
    }`;
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
  });

  it("extrai resposta típica Gemini com thinking + array", () => {
    const input = `\`\`\`thinking
Vou analisar o contexto da empresa e o plano de ação...
O risco é de split payment, severidade alta.
\`\`\`

[
  {"titulo": "Adequar sistema de pagamentos", "descricao": "Implementar split", "responsavel": "ti"},
  {"titulo": "Treinar equipe financeira", "descricao": "Capacitar sobre novo fluxo", "responsavel": "gestor_fiscal"}
]`;
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toHaveLength(2);
  });
});
