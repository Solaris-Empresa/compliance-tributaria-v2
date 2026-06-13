/**
 * guia-pratico.ts — FEAT-GUIA-PRÁTICO (ADR-GP-001 v2 · Classe C · read-only)
 *
 * Procedure `guiaPratico.gerar`: gera um guia prático ILUSTRATIVO (não-vinculante)
 * para uma tarefa do plano de ação, via invokeLLM. SEM persistência (query, não
 * mutation; só SELECT). B-01→B-08.
 *
 * Governança (ADR-GP-001):
 *   - protectedProcedure + validateProjectAccess (auth)              [B-01]
 *   - raw SQL (risks_v4/tasks NÃO são Drizzle) + cascade de setor    [B-03]
 *   - prompt best-effort (Lição #90): evitar ISS vigente / ancorar refs — não garantia
 *   - invokeLLM · temperature 0.1 (REGRA-ORQ-30) · max_tokens por nível  [B-05]
 *   - Zod guiaPraticoResponseSchema + audit_log em falha             [B-06]
 *   - ZERO escrita / ZERO migration                                 [B-07/B-08]
 */
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, getProjectById, safeParseJson, isUserInProject } from "../db";
import { insertAuditLog } from "../lib/db-queries-risks-v4";
import { invokeLLM } from "../_core/llm";
import {
  guiaPraticoInputSchema,
  guiaPraticoResponseSchema,
  type GuiaPraticoInput,
  type GuiaPraticoResponse,
} from "../schemas/guia-pratico.schemas";

// validateProjectAccess — replica do padrão local (routers.ts:18 / routers-actions-crud.ts:14)
const validateProjectAccess = async (ctx: any, projectId: number) => {
  const project = await getProjectById(projectId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  if (ctx.user.role === "equipe_solaris" || ctx.user.role === "advogado_senior") return project;
  const hasAccess = await isUserInProject(ctx.user.id, projectId);
  if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  return project;
};

// B-05: max_tokens acoplado ao detalhamento (ADR-GP-001 — evita truncar guias longos)
const MAX_TOKENS: Record<GuiaPraticoInput["detalhamento"], number> = {
  resumido: 1500,
  normal: 2500,
  detalhado: 4000,
};

// B-03: cascata de "setor" 4 camadas (T-6 — businessType vazio na base de teste).
// Regra de ouro: funciona só com name + taxRegime (camada 4, garantida 100%).
function setorContexto(project: any): string {
  const bt = typeof project?.businessType === "string" ? project.businessType.trim() : "";
  if (bt) return bt;
  const cp = safeParseJson<{ companyType?: string }>(project?.companyProfile, {});
  if (cp?.companyType) return cp.companyType;
  const cnaes = safeParseJson<Array<{ description?: string }>>(project?.confirmedCnaes, []);
  if (Array.isArray(cnaes) && cnaes[0]?.description) return cnaes[0].description;
  return `${project?.name ?? "Empresa"} (${project?.taxRegime ?? "regime não informado"})`;
}

// B-04: System Prompt. B-04b: ISS best-effort + âncora de refs (NÃO linguagem absoluta).
const SYSTEM_PROMPT = `Você é o "Solaris Guia Prático", especialista em Reforma Tributária Brasileira (EC 132/2023, LC 214/2025, Decreto 12.955/2026).

Converta a obrigação de compliance em um guia prático, didático e acionável para gestores e contadores.

Regras:
1. Use os dados reais da empresa/risco/tarefa fornecidos no contexto. Nunca seja genérico.
2. Cada passo deve ter: o QUÊ fazer, COMO fazer e QUAL o entregável.
3. Ancore as referências legais nos artigos fornecidos no contexto (base validada).
4. NÃO apresente o ISS como tributo vigente — ele é substituído por IBS/CBS na Reforma. Use IBS/CBS.
5. Exemplos concretos (sistemas, valores, prazos) devem ser marcados com "(exemplo ilustrativo)".
6. Adapte o vocabulário ao nível técnico e a extensão ao nível de detalhamento solicitados.
7. Responda EXCLUSIVAMENTE em JSON válido, sem markdown, no formato indicado.`;

function buildUserPrompt(
  ctx0: any,
  setor: string,
  taxRegime: string,
  faturamento: number | null,
  input: GuiaPraticoInput
): string {
  return `### PERFIL DA EMPRESA
- Setor/Contexto: ${setor}
- Regime Tributário: ${taxRegime}
- Faturamento Anual Estimado: ${faturamento != null ? `R$ ${faturamento}` : "não informado"}

### RISCO DE COMPLIANCE (base validada — âncora das referências)
- Categoria: ${ctx0.categoria ?? "—"}
- Risco: ${ctx0.risco_titulo ?? "—"}
- Base Legal (âncora): ${ctx0.artigo ?? "—"}
- Origem: ${ctx0.source_priority ?? "—"}
${ctx0.risco_descricao ? `- Detalhe: ${ctx0.risco_descricao}` : ""}

### TAREFA A EXECUTAR
- Tarefa: "${ctx0.tarefa_titulo}"
- Responsável sugerido: ${ctx0.responsavel ?? "—"}

### PERSONALIZAÇÃO
- Detalhamento: ${input.detalhamento}
- Nível técnico: ${input.nivelTecnico}
- Contexto adicional do usuário: "${input.contextoAdicional || "Nenhum"}"

### FORMATO DE SAÍDA (JSON OBRIGATÓRIO)
{
  "contextoEmpresa": "1 linha resumindo o perfil considerado",
  "alertaCritico": "aviso sobre o maior risco de não executar a tarefa",
  "passos": [
    { "numero": 1, "titulo": "...", "descricao": "2-4 frases práticas", "tagTipo": "tempo|atencao|referencia|entregavel", "tagTexto": "ex: ⏱ 6-8 horas | 📌 ${ctx0.artigo ?? "Art."}" }
  ]
}
Entre 2 e 8 passos.`;
}

export const guiaPraticoRouter = router({
  // B-01: query (read-only) — NÃO mutation. B-07/B-08: zero escrita/migration.
  gerar: protectedProcedure
    .input(guiaPraticoInputSchema)
    .query(async ({ input, ctx }): Promise<GuiaPraticoResponse> => {
      const project = await validateProjectAccess(ctx, input.projectId);

      // B-03: SELECT task + risco (raw SQL — risks_v4/tasks são raw, não Drizzle).
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      }
      const res = await db.execute(sql`
        SELECT t.titulo AS tarefa_titulo, t.responsavel,
               r.categoria, r.titulo AS risco_titulo, r.artigo,
               r.descricao AS risco_descricao, r.source_priority
        FROM tasks t
        JOIN risks_v4 r ON t.risk_id = r.id
        WHERE t.id = ${input.taskId} AND t.project_id = ${input.projectId}
        LIMIT 1
      `);
      const rows = (res as unknown as [any[], unknown])[0];
      const ctx0 = Array.isArray(rows) ? rows[0] : undefined;
      if (!ctx0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa/risco não encontrados no projeto" });
      }

      const setor = setorContexto(project);
      const userPrompt = buildUserPrompt(
        ctx0,
        setor,
        String((project as any)?.taxRegime ?? "não informado"),
        (project as any)?.faturamentoAnual ?? null,
        input
      );

      // B-05: invokeLLM determinístico (temp 0.1, REGRA-ORQ-30) + max_tokens por nível.
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: MAX_TOKENS[input.detalhamento],
          response_format: { type: "json_object" },
          timeoutMs: 30000,
        });

        const content = response.choices?.[0]?.message?.content;
        const raw = typeof content === "string" ? content : "";
        // B-06: Zod valida ESTRUTURA (assemble). Conteúdo (consumption) é best-effort.
        return guiaPraticoResponseSchema.parse(JSON.parse(raw));
      } catch (err) {
        // testing.md: toda falha LLM/Zod grava audit_log. Convenção: entity='task',
        // entity_id='llm_error' (marcador na aba Histórico). action ∈ ActionAudit.
        await insertAuditLog({
          project_id: input.projectId,
          entity: "task",
          entity_id: "llm_error",
          action: "created",
          user_id: ctx.user.id,
          user_name: (ctx.user as any).name ?? "—",
          user_role: (ctx.user as any).role ?? "—",
          after_state: {
            task_id: input.taskId,
            error: err instanceof Error ? err.message : String(err),
            generated_by: "llm",
            step: "guiaPratico.gerar",
            detalhamento: input.detalhamento,
          },
        }).catch(() => {});
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível gerar o guia. Tente novamente.",
        });
      }
    }),
});
