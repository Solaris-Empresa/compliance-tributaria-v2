/**
 * AI Helpers — Utilitários para chamadas LLM com retry, validação e scoring
 * Sprint V60: generateWithRetry + temperatura 0.2
 * Sprint V61: calculateGlobalScore com tradução financeira
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import type { ScoringDataSchema } from "./ai-schemas";

// ─────────────────────────────────────────────────────────────────────────────
// RETRY COM VALIDAÇÃO ZOD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chama o LLM com retry automático (2 tentativas) e valida o output com schema Zod.
 * Temperatura padrão: 0.2 (determinístico para diagnóstico tributário).
 */
/**
 * Extrai o maior JSON válido de uma string de resposta do LLM.
 * Suporta: markdown code blocks, Gemini thinking blocks, JSON inline.
 */
function extractJsonFromLLMResponse(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;

  // 1. Remover blocos de thinking do Gemini (```thinking ... ```)
  const withoutThinking = raw.replace(/```thinking[\s\S]*?```/gi, "").trim();

  // 2. Tentar extrair de markdown code blocks (```json ... ``` ou ``` ... ```)
  const codeBlockMatch = withoutThinking.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const candidate = codeBlockMatch[1].trim();
    if (candidate.startsWith("{") || candidate.startsWith("[")) {
      return candidate;
    }
  }

  // 3. Tentar extrair o maior bloco JSON { ... } da resposta
  // Usa busca gulosa para pegar o JSON mais externo
  let depth = 0;
  let start = -1;
  let bestStart = -1;
  let bestEnd = -1;
  let bestLength = 0;

  for (let i = 0; i < withoutThinking.length; i++) {
    const ch = withoutThinking[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const len = i - start + 1;
        if (len > bestLength) {
          bestLength = len;
          bestStart = start;
          bestEnd = i;
        }
      }
    }
  }

  if (bestStart !== -1) {
    return withoutThinking.substring(bestStart, bestEnd + 1);
  }

  return null;
}

export async function generateWithRetry<T extends z.ZodTypeAny>(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  schema: T,
  options: {
    temperature?: number;
    maxRetries?: number;
    context?: string; // Para mensagens de erro mais descritivas
    /** Timeout em ms para cada tentativa individual. Padrão: 90s */
    timeoutMs?: number;
    /**
     * Habilita Prompt Caching do GPT-4.1 (reduz custo em até 75% em prompts repetidos).
     * Padrão: true — todos os prompts de compliance tributário são longos e repetidos.
     */
    enableCache?: boolean;
  } = {}
): Promise<z.infer<T>> {
  const { maxRetries = 2, context = "LLM", temperature, timeoutMs, enableCache = true } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await invokeLLM({
        messages,
        enableCache,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
      } as any);

      // Gemini pode retornar content como array de TextContent
      const rawContent = response.choices[0]?.message?.content;
      let content: string;
      if (typeof rawContent === "string") {
        content = rawContent;
      } else if (Array.isArray(rawContent)) {
        // Concatenar todos os blocos de texto
        content = rawContent
          .filter((c: any) => c?.type === "text")
          .map((c: any) => c.text ?? "")
          .join("\n");
      } else {
        throw new Error(`${context}: IA não retornou conteúdo (tentativa ${attempt + 1})`);
      }

      if (!content) {
        throw new Error(`${context}: IA retornou conteúdo vazio (tentativa ${attempt + 1})`);
      }

      // Extrair JSON robusto (suporta Gemini thinking blocks e markdown)
      const jsonStr = extractJsonFromLLMResponse(content);
      if (!jsonStr) {
        throw new Error(`${context}: Resposta não contém JSON válido (tentativa ${attempt + 1}). Preview: ${content.substring(0, 200)}`);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseErr) {
        throw new Error(`${context}: JSON malformado (tentativa ${attempt + 1}): ${String(parseErr)}`);
      }

      const validated = schema.parse(parsed);
      return validated;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Propagar RateLimitError imediatamente sem retry (não adianta tentar novamente)
      const errMsg = lastError.message.toLowerCase();
      if (errMsg.includes("rate limit") || errMsg.includes("429") || errMsg.includes("too many requests")) {
        throw lastError;
      }
      // Propagar timeout imediatamente sem retry (não adianta tentar novamente)
      if (errMsg.includes("timeout") || errMsg.includes("timed out") || errMsg.includes("request timeout")) {
        throw lastError;
      }

      // Se for erro de validação Zod na última tentativa, propaga
      if (attempt === maxRetries - 1) {
        break;
      }

      // Aguarda 1s antes do retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `${context}: Falha após ${maxRetries} tentativas. Último erro: ${lastError?.message}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING GLOBAL COM TRADUÇÃO FINANCEIRA (Sprint V61)
// ─────────────────────────────────────────────────────────────────────────────

const SEVERIDADE_SCORE_MAP: Record<string, number> = {
  "Baixa": 2,
  "Média": 5,
  "Alta": 7,
  "Crítica": 9,
};

const FATOR_RISCO_MAP = {
  critico: 0.22,
  alto: 0.12,
  medio: 0.06,
  baixo: 0.02,
};

/**
 * Calcula o score global de risco de forma determinística no servidor.
 * Nunca delegado à IA — garante auditabilidade e consistência.
 */
export function calculateGlobalScore(
  risks: Array<{ severidade: string; severidade_score?: number }>,
  faturamentoAnual?: number
): z.infer<typeof ScoringDataSchema> {
  if (!risks || risks.length === 0) {
    return {
      score_global: 0,
      nivel: "baixo",
      impacto_estimado: "Nenhum risco identificado",
      custo_inacao: "Monitoramento preventivo recomendado",
      prioridade: "monitoramento",
      total_riscos: 0,
      riscos_criticos: 0,
      riscos_altos: 0,
    };
  }

  // Normalizar scores: usa severidade_score se disponível, senão mapeia pelo texto
  const scores = risks.map(r => {
    if (typeof r.severidade_score === "number" && r.severidade_score >= 1 && r.severidade_score <= 9) {
      return r.severidade_score;
    }
    return SEVERIDADE_SCORE_MAP[r.severidade] ?? 3;
  });

  const totalScore = scores.reduce((acc, s) => acc + s, 0);
  const maxPossible = risks.length * 9;
  const scoreGlobal = Math.round((totalScore / maxPossible) * 100);

  const riscosCriticos = risks.filter(r => r.severidade === "Crítica").length;
  const riscosAltos = risks.filter(r => r.severidade === "Alta").length;

  // Determinar nível
  let nivel: "baixo" | "medio" | "alto" | "critico";
  if (scoreGlobal >= 70 || riscosCriticos >= 2) nivel = "critico";
  else if (scoreGlobal >= 45 || riscosCriticos >= 1) nivel = "alto";
  else if (scoreGlobal >= 25) nivel = "medio";
  else nivel = "baixo";

  // Tradução financeira
  const fator = FATOR_RISCO_MAP[nivel];
  let impactoEstimado: string;
  let custoInacao: string;

  if (faturamentoAnual && faturamentoAnual > 0) {
    const impactoValor = faturamentoAnual * fator;
    const impactoK = impactoValor >= 1_000_000
      ? `R$ ${(impactoValor / 1_000_000).toFixed(1)}M`
      : `R$ ${Math.round(impactoValor / 1_000)}K`;
    impactoEstimado = `${impactoK}/ano em risco fiscal estimado`;
    custoInacao = nivel === "critico"
      ? `Perda de créditos e autuações fiscais estimadas em ${impactoK} após jan/2027`
      : nivel === "alto"
        ? `Risco de inadequação com impacto de ${impactoK} no regime tributário`
        : "Risco de inadequação gradual ao novo regime";
  } else {
    impactoEstimado = nivel === "critico"
      ? "Risco fiscal crítico — solicite avaliação financeira detalhada"
      : nivel === "alto"
        ? "Risco fiscal elevado — impacto financeiro significativo esperado"
        : "Risco fiscal moderado — monitoramento e adequação recomendados";
    custoInacao = nivel === "critico"
      ? "Perda de créditos e autuações fiscais após jan/2027"
      : "Risco de inadequação gradual ao novo regime tributário";
  }

  const prioridade: "imediata" | "planejada" | "monitoramento" =
    nivel === "critico" ? "imediata" :
    nivel === "alto" ? "planejada" : "monitoramento";

  return {
    score_global: scoreGlobal,
    nivel,
    impacto_estimado: impactoEstimado,
    custo_inacao: custoInacao,
    prioridade,
    total_riscos: risks.length,
    riscos_criticos: riscosCriticos,
    riscos_altos: riscosAltos,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRATO DE SAÍDA (auto-crítica da IA)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Instrução de contrato de saída adicionada ao final dos prompts críticos.
 * Força a IA a verificar se o output permite decisão prática.
 */
export const OUTPUT_CONTRACT = `
CONTRATO DE SAÍDA (verifique antes de responder):
1. Cada item permite uma decisão prática imediata? Se não → reescreva.
2. Há citação de artigo legal inventado? Se sim → remova ou substitua por "verificar com advogado".
3. O output está no formato JSON exato solicitado? Se não → corrija.
4. Há generalidades sem aplicação ao CNAE específico? Se sim → torne específico.
`;
