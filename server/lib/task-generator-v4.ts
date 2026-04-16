// task-generator-v4.ts — Sprint Z-17 #659
// Gera tarefas via LLM contextualizado para carga inicial dos planos.
// Padrão: mesmo de ai-helpers.ts generateWithRetry.
// LLM redige conteúdo contextualizado, engine persiste, advogado revisa.
// Reversão Z-14: "tarefas manuais" → "carga inicial LLM + revisão humana"
// Autorização P.O.: 16/04/2026

import { z } from "zod";
import { generateWithRetry } from "../ai-helpers";

// ─── Types ─────────────────────────────────────────────────────────

export interface TaskGeneratorInput {
  risco: {
    titulo: string;
    categoria: string;
    artigo: string | null; // null para Onda 1 (Solaris) e Onda 2 (IA Gen)
    severidade: string;
    source_priority: string; // cnae | ncm | nbs | solaris | iagen
  };
  plano: {
    titulo: string;
    responsavel: string;
    prazo: string; // 30_dias | 60_dias | 90_dias | 180_dias
  };
  empresa: {
    cnpj: string | null;
    cnaes: string[];
    porte: string | null; // mei | pequena | media | grande
    regime_tributario: string | null;
  };
}

// ─── Schema Zod para validar resposta do LLM ──────────────────────

const TaskSuggestionSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().max(500).default(""),
  responsavel: z.string().min(1),
});

const TaskSuggestionsArraySchema = z.array(TaskSuggestionSchema).min(1).max(4);

export type TaskSuggestion = z.infer<typeof TaskSuggestionSchema>;

// ─── Geração via LLM ──────────────────────────────────────────────

export async function generateTaskSuggestions(
  input: TaskGeneratorInput
): Promise<TaskSuggestion[]> {
  const artigoCtx = input.risco.artigo
    ? `Base legal: ${input.risco.artigo}`
    : `Fonte: ${input.risco.source_priority} (sem artigo específico — questionário ${
        input.risco.source_priority === "solaris" ? "SOLARIS" : "IA Gen"
      })`;

  const empresaCtx =
    [
      input.empresa.cnaes.length > 0
        ? `CNAEs: ${input.empresa.cnaes.join(", ")}`
        : null,
      input.empresa.porte ? `Porte: ${input.empresa.porte}` : null,
      input.empresa.regime_tributario
        ? `Regime tributário: ${input.empresa.regime_tributario}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Perfil da empresa não informado";

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content: `Você é um consultor tributário especializado na Reforma Tributária brasileira (LC 214/2025).
Gere entre 2 e 4 tarefas concretas e executáveis para um plano de ação tributário.
Cada tarefa deve ser uma ação atômica e indivisível.
Considere o contexto específico da empresa.
Retorne APENAS um JSON array com objetos { titulo, descricao, responsavel }.
- titulo: ação concreta (max 80 chars)
- descricao: detalhamento da ação (1-2 frases, max 500 chars)
- responsavel: um de: gestor_fiscal | diretor | ti | juridico | advogado | contador`,
    },
    {
      role: "user",
      content: `Empresa: ${empresaCtx}
Risco: "${input.risco.titulo}" (categoria: ${input.risco.categoria}, severidade: ${input.risco.severidade})
${artigoCtx}
Plano de ação: "${input.plano.titulo}" (responsável: ${input.plano.responsavel}, prazo: ${input.plano.prazo.replace("_", " ")})

Gere as tarefas:`,
    },
  ];

  const result = await generateWithRetry(
    messages,
    TaskSuggestionsArraySchema,
    {
      context: "TaskGenerator",
      temperature: 0.3,
      timeoutMs: 45_000, // 45s por tentativa — pior caso 90s/plano (2 tentativas totais)
      maxRetries: 2, // 2 tentativas totais (attempt 0 + attempt 1)
      enableCache: true, // system prompt fixo → cache GPT-4.1 reduz custo ~75%
    }
  );

  return result.slice(0, 4);
}
