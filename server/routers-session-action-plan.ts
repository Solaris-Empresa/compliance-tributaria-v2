/**
 * routers-session-action-plan.ts
 * Fase 3 do Novo Fluxo v2.0 — Plano de Ação Consolidado por Sessão
 *
 * Procedures:
 *  - sessionActionPlan.generate   → IA consolida análises de todos os ramos em plano priorizado
 *  - sessionActionPlan.get        → busca plano já gerado para a sessão
 *  - sessionActionPlan.updateItem → atualiza status/responsável de um item do plano
 *  - sessionActionPlan.getMatrix  → retorna dados para matriz de riscos visual
 */

import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { sessions, sessionBranchAnswers, sessionActionPlans } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface PlanItem {
  id: string;
  branchCode: string;
  branchName: string;
  action: string;
  description: string;
  priority: "critica" | "alta" | "media" | "baixa";
  deadline: string; // ex: "30 dias", "3 meses", "6 meses", "1 ano"
  responsible: string; // ex: "Equipe Fiscal", "TI", "Diretoria", "Contabilidade"
  status: "pendente" | "em_andamento" | "concluido";
  riskLevel: "critico" | "alto" | "medio" | "baixo";
  category: string; // ex: "Sistemas", "Treinamento", "Processos", "Documentação"
  estimatedCost: "baixo" | "medio" | "alto"; // custo estimado de implementação
  /** Sprint Z-12: Categoria canônica LC 214/2025 (10 códigos) */
  riskCategoryCode?: string;
}

interface BranchAnalysis {
  branchCode: string;
  branchName: string;
  riskLevel: string;
  aiAnalysis: string;
  answers: Array<{ questionId: string; answer: string | string[] | number }>;
  questions: Array<{ id: string; question: string; type: string; options?: string[] }>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Gera plano de ação consolidado usando IA
 * Consolida análises de todos os ramos em ações priorizadas
 */
async function generateConsolidatedPlan(
  companyDescription: string,
  branchAnalyses: BranchAnalysis[]
): Promise<{
  planItems: PlanItem[];
  executiveSummary: string;
  overallRiskLevel: "baixo" | "medio" | "alto" | "critico";
  complianceScore: number;
}> {
  // Montar contexto das análises por ramo
  const branchContext = branchAnalyses
    .map((b) => {
      const qaText = b.questions
        .map((q) => {
          const ans = b.answers.find((a) => a.questionId === q.id);
          return `  P: ${q.question}\n  R: ${ans?.answer ?? "Não respondido"}`;
        })
        .join("\n");

      return `## Ramo: ${b.branchName} (${b.branchCode})
Nível de Risco: ${b.riskLevel}
Análise: ${b.aiAnalysis}
Respostas do Diagnóstico:
${qaText}`;
    })
    .join("\n\n---\n\n");

  const prompt = `Você é um especialista sênior em compliance tributário da Reforma Tributária Brasileira (IBS, CBS, IS - Lei Complementar 214/2025).

Empresa: ${companyDescription}

Diagnóstico por Ramo de Atividade:
${branchContext}

Com base no diagnóstico acima, gere um PLANO DE AÇÃO CONSOLIDADO com:
1. Entre 8 e 15 ações priorizadas (considerando todos os ramos)
2. Um resumo executivo (3-4 parágrafos)
3. Nível de risco global da empresa
4. Pontuação de compliance (0-100, onde 100 = totalmente adequado)

Retorne APENAS JSON válido com este formato exato:
{
  "planItems": [
    {
      "id": "a1",
      "branchCode": "COM",
      "branchName": "Comércio",
      "action": "Título curto da ação (máx 60 chars)",
      "description": "Descrição detalhada do que precisa ser feito",
      "priority": "critica",
      "deadline": "30 dias",
      "responsible": "Equipe Fiscal",
      "status": "pendente",
      "riskLevel": "critico",
      "category": "Sistemas",
      "estimatedCost": "alto",
      "riskCategoryCode": "split_payment"
    }
  ],
  "executiveSummary": "Texto do resumo executivo...",
  "overallRiskLevel": "alto",
  "complianceScore": 35
}

Regras:
- priority: "critica" (prazo < 30 dias), "alta" (30-90 dias), "media" (90-180 dias), "baixa" (> 180 dias)
- deadline: "15 dias", "30 dias", "60 dias", "3 meses", "6 meses", "1 ano"
- responsible: "Equipe Fiscal", "TI/Sistemas", "Diretoria", "Contabilidade", "RH", "Jurídico", "Todos"
- category: "Sistemas", "Treinamento", "Processos", "Documentação", "Governança", "Consultoria"
- estimatedCost: "baixo" (< R$5k), "medio" (R$5k-50k), "alto" (> R$50k)
- riskCategoryCode: uma das 10 categorias canônicas da LC 214/2025: "imposto_seletivo", "ibs_cbs", "regime_diferenciado", "aliquota_reduzida", "aliquota_zero", "split_payment", "cadastro_fiscal", "obrigacao_acessoria", "transicao", "enquadramento_geral"
- Priorize ações críticas relacionadas ao prazo da Reforma Tributária (2026-2033)`;

  try {
    const response = await invokeLLM({
          enableCache: true,
      messages: [
        {
          role: "system",
          content: "Especialista em compliance tributário. Responda APENAS com JSON válido, sem markdown.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "action_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              planItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    branchCode: { type: "string" },
                    branchName: { type: "string" },
                    action: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string", enum: ["critica", "alta", "media", "baixa"] },
                    deadline: { type: "string" },
                    responsible: { type: "string" },
                    status: { type: "string", enum: ["pendente", "em_andamento", "concluido"] },
                    riskLevel: { type: "string", enum: ["critico", "alto", "medio", "baixo"] },
                    category: { type: "string" },
                    estimatedCost: { type: "string", enum: ["baixo", "medio", "alto"] },
                    riskCategoryCode: { type: "string", enum: ["imposto_seletivo", "ibs_cbs", "regime_diferenciado", "aliquota_reduzida", "aliquota_zero", "split_payment", "cadastro_fiscal", "obrigacao_acessoria", "transicao", "enquadramento_geral"] },
                  },
                  required: ["id", "branchCode", "branchName", "action", "description", "priority", "deadline", "responsible", "status", "riskLevel", "category", "estimatedCost", "riskCategoryCode"],
                  additionalProperties: false,
                },
              },
              executiveSummary: { type: "string" },
              overallRiskLevel: { type: "string", enum: ["baixo", "medio", "alto", "critico"] },
              complianceScore: { type: "integer" },
            },
            required: ["planItems", "executiveSummary", "overallRiskLevel", "complianceScore"],
            additionalProperties: false,
          },
        },
      } as any,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM retornou resposta vazia");

    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return {
      planItems: parsed.planItems as PlanItem[],
      executiveSummary: parsed.executiveSummary,
      overallRiskLevel: parsed.overallRiskLevel,
      complianceScore: Math.max(0, Math.min(100, parsed.complianceScore)),
    };
  } catch (err) {
    console.error("[sessionActionPlan] Erro ao gerar plano consolidado:", err);
    // Fallback: plano padrão
    return generateFallbackPlan(branchAnalyses);
  }
}

/**
 * Plano de ação padrão de fallback
 */
function generateFallbackPlan(branchAnalyses: BranchAnalysis[]): {
  planItems: PlanItem[];
  executiveSummary: string;
  overallRiskLevel: "baixo" | "medio" | "alto" | "critico";
  complianceScore: number;
} {
  const items: PlanItem[] = branchAnalyses.flatMap((b, idx) => [
    {
      id: `a${idx * 3 + 1}`,
      branchCode: b.branchCode,
      branchName: b.branchName,
      action: `Atualizar sistemas fiscais — ${b.branchName}`,
      description: `Adequar os sistemas ERP e fiscais para o ramo ${b.branchName} às exigências do IBS/CBS da Reforma Tributária.`,
      priority: "critica" as const,
      deadline: "30 dias",
      responsible: "TI/Sistemas",
      status: "pendente" as const,
      riskLevel: "critico" as const,
      category: "Sistemas",
      estimatedCost: "alto" as const,
      riskCategoryCode: "ibs_cbs",
    },
    {
      id: `a${idx * 3 + 2}`,
      branchCode: b.branchCode,
      branchName: b.branchName,
      action: `Treinar equipe fiscal — ${b.branchName}`,
      description: `Capacitar a equipe fiscal sobre as mudanças tributárias específicas para o ramo ${b.branchName}.`,
      priority: "alta" as const,
      deadline: "60 dias",
      responsible: "RH",
      status: "pendente" as const,
      riskLevel: "alto" as const,
      category: "Treinamento",
      estimatedCost: "medio" as const,
      riskCategoryCode: "transicao",
    },
    {
      id: `a${idx * 3 + 3}`,
      branchCode: b.branchCode,
      branchName: b.branchName,
      action: `Mapear obrigações acessórias — ${b.branchName}`,
      description: `Documentar todas as obrigações acessórias do ramo ${b.branchName} no novo regime tributário.`,
      priority: "media" as const,
      deadline: "3 meses",
      responsible: "Equipe Fiscal",
      status: "pendente" as const,
      riskLevel: "medio" as const,
      category: "Documentação",
      estimatedCost: "baixo" as const,
      riskCategoryCode: "obrigacao_acessoria",
    },
  ]);

  return {
    planItems: items,
    executiveSummary: `Com base no diagnóstico realizado, identificamos necessidades de adequação em ${branchAnalyses.length} ramo(s) de atividade. As principais prioridades são a atualização dos sistemas fiscais, capacitação da equipe e mapeamento das obrigações acessórias no contexto da Reforma Tributária (IBS/CBS/IS). Recomendamos iniciar imediatamente pelas ações críticas para garantir conformidade dentro dos prazos estabelecidos pela legislação.`,
    overallRiskLevel: "alto",
    complianceScore: 30,
  };
}

// ─── Router ────────────────────────────────────────────────────────────────────

export const sessionActionPlanRouter = router({
  /**
   * Gera o plano de ação consolidado para a sessão
   * Consolida análises de todos os ramos concluídos
   */
  generate: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Verificar sessão
      const [session] = await database
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, input.sessionToken))
        .limit(1);

      if (!session) throw new Error("Sessão não encontrada");

      // Verificar se já existe plano gerado
      const [existing] = await database
        .select()
        .from(sessionActionPlans)
        .where(eq(sessionActionPlans.sessionToken, input.sessionToken))
        .limit(1);

      if (existing && existing.status !== "gerando") {
        return {
          id: existing.id,
          planItems: existing.planItems as PlanItem[],
          executiveSummary: existing.executiveSummary,
          overallRiskLevel: existing.overallRiskLevel,
          complianceScore: existing.complianceScore,
          status: existing.status,
          totalActions: existing.totalActions,
          criticalActions: existing.criticalActions,
        };
      }

      // Buscar análises de todos os ramos concluídos
      const branchAnswersRows = await database
        .select()
        .from(sessionBranchAnswers)
        .where(
          and(
            eq(sessionBranchAnswers.sessionToken, input.sessionToken),
            eq(sessionBranchAnswers.status, "concluido")
          )
        );

      if (branchAnswersRows.length === 0) {
        throw new Error("Nenhum ramo concluído. Complete o questionário antes de gerar o plano.");
      }

      // Montar contexto das análises
      const branchAnalyses: BranchAnalysis[] = branchAnswersRows.map((row) => ({
        branchCode: row.branchCode,
        branchName: row.branchName,
        riskLevel: row.riskLevel ?? "medio",
        aiAnalysis: row.aiAnalysis ?? "",
        answers: (row.answers as Array<{ questionId: string; answer: string | string[] | number }>) ?? [],
        questions: (row.generatedQuestions as Array<{ id: string; question: string; type: string; options?: string[] }>) ?? [],
      }));

      const companyDescription = session.companyDescription ?? "Empresa brasileira";

      // Gerar plano com IA
      const { planItems, executiveSummary, overallRiskLevel, complianceScore } =
        await generateConsolidatedPlan(companyDescription, branchAnalyses);

      const totalActions = planItems.length;
      const criticalActions = planItems.filter((p) => p.priority === "critica").length;

      // Salvar no banco (upsert)
      if (existing) {
        await database
          .update(sessionActionPlans)
          .set({
            planItems: planItems as any,
            executiveSummary,
            overallRiskLevel,
            complianceScore,
            status: "gerado",
            totalActions,
            criticalActions,
          })
          .where(eq(sessionActionPlans.sessionToken, input.sessionToken));
      } else {
        await database.insert(sessionActionPlans).values({
          sessionToken: input.sessionToken,
          planItems: planItems as any,
          executiveSummary,
          overallRiskLevel,
          complianceScore,
          status: "gerado",
          totalActions,
          criticalActions,
        });
      }

      // Atualizar step da sessão
      await database
        .update(sessions)
        .set({ currentStep: "plano_acao" })
        .where(eq(sessions.sessionToken, input.sessionToken));

      return {
        planItems,
        executiveSummary,
        overallRiskLevel,
        complianceScore,
        status: "gerado" as const,
        totalActions,
        criticalActions,
      };
    }),

  /**
   * Busca o plano já gerado para a sessão
   */
  get: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [row] = await database
        .select()
        .from(sessionActionPlans)
        .where(eq(sessionActionPlans.sessionToken, input.sessionToken))
        .limit(1);

      if (!row) return null;

      return {
        id: row.id,
        planItems: (row.planItems as PlanItem[]) ?? [],
        executiveSummary: row.executiveSummary,
        overallRiskLevel: row.overallRiskLevel,
        complianceScore: row.complianceScore,
        status: row.status,
        totalActions: row.totalActions,
        criticalActions: row.criticalActions,
        generatedAt: row.generatedAt,
      };
    }),

  /**
   * Atualiza o status ou responsável de um item do plano
   */
  updateItem: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        itemId: z.string(),
        status: z.enum(["pendente", "em_andamento", "concluido"]).optional(),
        responsible: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [row] = await database
        .select()
        .from(sessionActionPlans)
        .where(eq(sessionActionPlans.sessionToken, input.sessionToken))
        .limit(1);

      if (!row) throw new Error("Plano não encontrado");

      const planItems = (row.planItems as PlanItem[]) ?? [];
      const updatedItems = planItems.map((item) => {
        if (item.id === input.itemId) {
          return {
            ...item,
            ...(input.status && { status: input.status }),
            ...(input.responsible && { responsible: input.responsible }),
          };
        }
        return item;
      });

      await database
        .update(sessionActionPlans)
        .set({ planItems: updatedItems as any })
        .where(eq(sessionActionPlans.sessionToken, input.sessionToken));

      return { success: true };
    }),

  /**
   * Retorna dados formatados para a matriz de riscos visual
   * Eixo X: Probabilidade (riskLevel), Eixo Y: Impacto (priority)
   */
  getMatrix: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [row] = await database
        .select()
        .from(sessionActionPlans)
        .where(eq(sessionActionPlans.sessionToken, input.sessionToken))
        .limit(1);

      if (!row) return { matrixData: [], branches: [] };

      const planItems = (row.planItems as PlanItem[]) ?? [];

      // Agrupar por ramo para a matriz
      const branchMap = new Map<string, { code: string; name: string; items: PlanItem[]; maxRisk: string }>();

      for (const item of planItems) {
        if (!branchMap.has(item.branchCode)) {
          branchMap.set(item.branchCode, {
            code: item.branchCode,
            name: item.branchName,
            items: [],
            maxRisk: "baixo",
          });
        }
        const branch = branchMap.get(item.branchCode)!;
        branch.items.push(item);

        // Determinar risco máximo do ramo
        const riskOrder = { critico: 4, alto: 3, medio: 2, baixo: 1 };
        const currentMax = riskOrder[branch.maxRisk as keyof typeof riskOrder] ?? 1;
        const itemRisk = riskOrder[item.riskLevel as keyof typeof riskOrder] ?? 1;
        if (itemRisk > currentMax) {
          branch.maxRisk = item.riskLevel;
        }
      }

      const branches = Array.from(branchMap.values()).map((b) => ({
        code: b.code,
        name: b.name,
        maxRisk: b.maxRisk,
        totalActions: b.items.length,
        criticalActions: b.items.filter((i) => i.priority === "critica").length,
        completedActions: b.items.filter((i) => i.status === "concluido").length,
      }));

      // Dados para matriz 4x4 (probabilidade x impacto)
      const matrixData = planItems.map((item) => ({
        id: item.id,
        branchCode: item.branchCode,
        branchName: item.branchName,
        action: item.action,
        x: { critico: 4, alto: 3, medio: 2, baixo: 1 }[item.riskLevel] ?? 2,
        y: { critica: 4, alta: 3, media: 2, baixa: 1 }[item.priority] ?? 2,
        priority: item.priority,
        riskLevel: item.riskLevel,
        status: item.status,
        riskCategoryCode: item.riskCategoryCode ?? null,
      }));

      return { matrixData, branches, overallRiskLevel: row.overallRiskLevel, complianceScore: row.complianceScore };
    }),
});
