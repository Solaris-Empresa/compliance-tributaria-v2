/**
 * cnae-pipeline-validator.ts — Teste Automatizado do Pipeline CNAE Discovery
 *
 * Executa uma validação end-to-end do pipeline após o rebuild semanal de embeddings.
 * Verifica que o pipeline continua funcional em produção sem intervenção manual.
 *
 * Estratégia de validação:
 * 1. Busca semântica: verifica que o embedding de "cervejaria artesanal" retorna
 *    o CNAE 1113-5/02 (Fabricação de cervejas e chopes) entre os top-5
 * 2. Cobertura mínima: verifica que o banco tem ≥ 95% dos 1.332 CNAEs esperados
 * 3. Dimensionalidade: verifica que os embeddings têm 1.536 dimensões (text-embedding-3-small)
 *
 * Resultado é reportado via notifyOwner() com detalhes de cada verificação.
 *
 * Sprint v5.4.0
 */

import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { cnaeEmbeddings } from "../drizzle/schema";
import { count } from "drizzle-orm";
import { CNAE_TABLE } from "../shared/cnae-table";
import { ENV } from "./_core/env";

/** Caso de teste: query de busca e CNAE esperado no top-N */
interface ValidationCase {
  query: string;
  expectedCnaeCode: string;
  expectedDescription: string;
  topN: number;
}

/** Resultado de um caso de teste individual */
interface CaseResult {
  query: string;
  expectedCode: string;
  found: boolean;
  rank: number | null;
  topResults: string[];
  durationMs: number;
  error?: string;
}

/** Resultado completo da validação */
export interface PipelineValidationResult {
  success: boolean;
  timestamp: string;
  durationMs: number;
  embeddingCount: number;
  expectedCount: number;
  coverage: number;
  dimensionCheck: boolean;
  cases: CaseResult[];
  failedCases: string[];
  summary: string;
}

/**
 * Casos de teste canônicos para validação do pipeline.
 * Representam setores econômicos distintos para cobertura ampla.
 */
const VALIDATION_CASES: ValidationCase[] = [
  {
    query: "fabricação de cerveja artesanal stout e trapista",
    expectedCnaeCode: "1113-5/02",
    expectedDescription: "Fabricação de cervejas e chopes",
    topN: 5,
  },
  {
    query: "desenvolvimento de software aplicativo mobile",
    expectedCnaeCode: "6201-5/01",
    expectedDescription: "Desenvolvimento de programas de computador sob encomenda",
    topN: 5,
  },
  {
    query: "restaurante e lanchonete alimentação",
    expectedCnaeCode: "5611-2/01",
    expectedDescription: "Restaurantes e similares",
    topN: 5,
  },
  {
    query: "comércio varejista de medicamentos farmácia drogaria",
    expectedCnaeCode: "4771-7/01",
    expectedDescription: "Comércio varejista de produtos farmacêuticos",
    topN: 5,
  },
];

/**
 * Executa o teste de busca semântica para um caso de validação.
 * Retorna se o CNAE esperado aparece entre os top-N resultados.
 */
async function runValidationCase(
  testCase: ValidationCase,
  apiKey: string
): Promise<CaseResult> {
  const start = Date.now();

  try {
    // 1. Gerar embedding da query de teste
    const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: testCase.query,
        encoding_format: "float",
      }),
    });

    if (!embResponse.ok) {
      const errText = await embResponse.text();
      throw new Error(`OpenAI Embeddings API error ${embResponse.status}: ${errText}`);
    }

    const embData = await embResponse.json();
    const queryEmbedding: number[] = embData.data[0].embedding;

    // 2. Carregar embeddings do banco (via módulo de cache)
    const { findSimilarCnaes } = await import("./cnae-embeddings");
    const results = await findSimilarCnaes(testCase.query, testCase.topN);

    // 3. Verificar se o CNAE esperado está nos top-N
    const topResults = results.map((r) => `${r.code} (${Math.round(r.similarity * 100)}%)`);
    const rank = results.findIndex((r) => r.code === testCase.expectedCnaeCode);
    const found = rank !== -1;

    return {
      query: testCase.query,
      expectedCode: testCase.expectedCnaeCode,
      found,
      rank: found ? rank + 1 : null,
      topResults,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      query: testCase.query,
      expectedCode: testCase.expectedCnaeCode,
      found: false,
      rank: null,
      topResults: [],
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Executa a validação completa do pipeline CNAE.
 * Chamado automaticamente após o rebuild semanal de embeddings.
 *
 * @returns Resultado detalhado da validação
 */
export async function validateCnaePipeline(): Promise<PipelineValidationResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log("[cnae-validator] Iniciando validação automática do pipeline CNAE...");

  // ── 1. Verificar pré-condições ────────────────────────────────────────────
  const apiKey = ENV.openAiApiKey;
  if (!apiKey) {
    const result: PipelineValidationResult = {
      success: false,
      timestamp,
      durationMs: Date.now() - startTime,
      embeddingCount: 0,
      expectedCount: CNAE_TABLE.length,
      coverage: 0,
      dimensionCheck: false,
      cases: [],
      failedCases: ["OPENAI_API_KEY não configurada"],
      summary: "Validação abortada: OPENAI_API_KEY não configurada",
    };
    return result;
  }

  // ── 2. Verificar cobertura no banco ───────────────────────────────────────
  let embeddingCount = 0;
  let dimensionCheck = false;

  const db = await getDb();
  if (db) {
    try {
      const [countRow] = await db
        .select({ total: count() })
        .from(cnaeEmbeddings);
      embeddingCount = Number(countRow?.total ?? 0);

      // Verificar dimensionalidade de uma amostra (1 embedding)
      const [sample] = await db
        .select({ embeddingJson: cnaeEmbeddings.embeddingJson })
        .from(cnaeEmbeddings)
        .limit(1);

      if (sample?.embeddingJson) {
        const embedding = JSON.parse(sample.embeddingJson) as number[];
        dimensionCheck = embedding.length === 1536; // text-embedding-3-small
      }
    } catch (err) {
      console.error("[cnae-validator] Erro ao verificar banco:", err);
    }
  }

  const expectedCount = CNAE_TABLE.length;
  const coverage = expectedCount > 0
    ? Math.round((embeddingCount / expectedCount) * 100)
    : 0;

  // ── 3. Executar casos de teste ────────────────────────────────────────────
  const caseResults: CaseResult[] = [];
  for (const testCase of VALIDATION_CASES) {
    const result = await runValidationCase(testCase, apiKey);
    caseResults.push(result);
    console.log(
      `[cnae-validator] Caso "${testCase.query.substring(0, 40)}...": ${
        result.found ? `✅ rank #${result.rank}` : "❌ não encontrado"
      } (${result.durationMs}ms)`
    );
  }

  // ── 4. Calcular resultado final ───────────────────────────────────────────
  const failedCases: string[] = [];

  if (coverage < 95) {
    failedCases.push(`Cobertura insuficiente: ${embeddingCount}/${expectedCount} CNAEs (${coverage}%)`);
  }
  if (!dimensionCheck) {
    failedCases.push("Dimensionalidade incorreta: esperado 1536 dims (text-embedding-3-small)");
  }
  for (const c of caseResults) {
    if (!c.found) {
      failedCases.push(
        c.error
          ? `Busca falhou para "${c.query.substring(0, 50)}": ${c.error}`
          : `CNAE ${c.expectedCode} não encontrado no top-${VALIDATION_CASES.find((v) => v.expectedCnaeCode === c.expectedCode)?.topN ?? 5} para "${c.query.substring(0, 50)}"`
      );
    }
  }

  const success = failedCases.length === 0;
  const durationMs = Date.now() - startTime;

  const summary = success
    ? `✅ Pipeline CNAE validado: ${embeddingCount} embeddings (${coverage}%), ${caseResults.filter((c) => c.found).length}/${caseResults.length} casos passaram em ${Math.round(durationMs / 1000)}s`
    : `❌ Pipeline CNAE com falhas: ${failedCases.length} problema(s) detectado(s)`;

  return {
    success,
    timestamp,
    durationMs,
    embeddingCount,
    expectedCount,
    coverage,
    dimensionCheck,
    cases: caseResults,
    failedCases,
    summary,
  };
}

/**
 * Executa a validação e notifica o owner com o resultado.
 * Chamado pelo embeddings-scheduler após o rebuild semanal.
 */
export async function runAndNotifyValidation(): Promise<void> {
  console.log("[cnae-validator] Executando validação pós-rebuild...");

  let result: PipelineValidationResult;
  try {
    result = await validateCnaePipeline();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[cnae-validator] Erro fatal na validação:", err);
    await notifyOwner({
      title: "❌ Validação CNAE — Erro Fatal",
      content: `A validação automática pós-rebuild encontrou um erro fatal:\n\n**Erro:** ${errMsg}`,
    }).catch(() => {});
    return;
  }

  // Formatar detalhes dos casos de teste para a notificação
  const casesDetail = result.cases
    .map((c) => {
      const icon = c.found ? "✅" : "❌";
      const rankInfo = c.found ? ` (rank #${c.rank})` : "";
      const errorInfo = c.error ? ` — Erro: ${c.error}` : "";
      return `${icon} \`${c.expectedCode}\` para "${c.query.substring(0, 45)}"${rankInfo}${errorInfo}`;
    })
    .join("\n");

  if (result.success) {
    await notifyOwner({
      title: "✅ Validação CNAE Pós-Rebuild — Aprovada",
      content: `A validação automática do pipeline CNAE foi **aprovada** após o rebuild semanal.\n\n**Resumo:** ${result.summary}\n\n**Cobertura:** ${result.embeddingCount}/${result.expectedCount} CNAEs (${result.coverage}%)\n**Dimensionalidade:** ${result.dimensionCheck ? "✅ 1536 dims (text-embedding-3-small)" : "❌ Incorreta"}\n**Duração:** ${Math.round(result.durationMs / 1000)}s\n\n**Casos de teste:**\n${casesDetail}`,
    }).catch(() => {});
  } else {
    const failureDetail = result.failedCases.map((f) => `- ${f}`).join("\n");
    await notifyOwner({
      title: "❌ Validação CNAE Pós-Rebuild — Falhou",
      content: `A validação automática do pipeline CNAE **falhou** após o rebuild semanal.\n\n**Resumo:** ${result.summary}\n\n**Problemas detectados:**\n${failureDetail}\n\n**Cobertura:** ${result.embeddingCount}/${result.expectedCount} CNAEs (${result.coverage}%)\n**Dimensionalidade:** ${result.dimensionCheck ? "✅ 1536 dims" : "❌ Incorreta"}\n**Duração:** ${Math.round(result.durationMs / 1000)}s\n\n**Casos de teste:**\n${casesDetail}\n\n**Ação necessária:** Verifique os logs do servidor e o status da OPENAI_API_KEY.`,
    }).catch(() => {});
  }

  console.log(`[cnae-validator] Validação ${result.success ? "aprovada" : "reprovada"}: ${result.summary}`);
}
