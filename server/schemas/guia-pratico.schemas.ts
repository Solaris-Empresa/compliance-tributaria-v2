/**
 * guia-pratico.schemas.ts — AZ-01 (Artefato Zero, congelado)
 *
 * Feature "Guia Prático" (modal IA generativa no Plano de Ação · Classe C · ADR-GP-001).
 * Contrato Zod CONGELADO antes de qualquer código B (backend) ou F (frontend).
 * Read-only / efêmero — nenhuma persistência (sem migration, sem mutation).
 *
 * Decisões incorporadas (rodadas 1-3 de crítica):
 *   - D-2 Opção (a): guia ILUSTRATIVO não-vinculante (não "tolerância zero").
 *     As restrições de conteúdo (evitar ISS vigente, ancorar refs) são best-effort
 *     no PROMPT — NÃO garantidas por este schema (Lição #90 / REGRA-ORQ-27).
 *   - O schema valida apenas a ESTRUTURA da resposta (assemble), não a veracidade
 *     do conteúdo (consumption — verificável só por smoke runtime amostral).
 *
 * Parâmetros server-side (NÃO neste schema, por design — ficam no procedure/ADR):
 *   - temperature: 0.1   (REGRA-ORQ-30)
 *   - model: gpt-4.1     (invokeLLM)
 *   - max_tokens por detalhamento: resumido 1500 · normal 2500 · detalhado 4000
 *
 * Ref: docs/governance/relatorios/AS-IS-TO-BE-GUIA-PRATICO-20260612.md
 */
import { z } from "zod";

// ─── Enums de tag (cor/ícone por tipo no card do passo) ──────────────────────
export const guiaPraticoTagTipo = z.enum([
  "tempo", // ⏱ estimativa
  "atencao", // ⚠ alerta
  "referencia", // 📌 base legal
  "entregavel", // ✅ output esperado
]);

// ─── Input do procedure (request) ────────────────────────────────────────────
// taskId/projectId: identidade. detalhamento/nivelTecnico: personalização (UI).
// contextoAdicional: textarea do usuário (≤500). Defaults = "normal".
export const guiaPraticoInputSchema = z.object({
  taskId: z.number().int(),
  projectId: z.number().int(),
  detalhamento: z.enum(["resumido", "normal", "detalhado"]).default("normal"),
  nivelTecnico: z.enum(["simples", "normal", "especialista"]).default("normal"),
  contextoAdicional: z.string().max(500).optional(),
});

// ─── Saída do LLM (response) — contrato que o invokeLLM/Zod.parse deve satisfazer ─
// min(2)/max(8) passos. Bounds de char: descricao ≤800 — ver acoplamento com
// max_tokens por detalhamento (detalhado=4000 cobre 8×800; ADR-GP-001).
export const guiaPraticoPassoSchema = z.object({
  numero: z.number().int().min(1).max(8),
  titulo: z.string().min(1).max(120),
  descricao: z.string().min(1).max(800),
  tagTipo: guiaPraticoTagTipo,
  tagTexto: z.string().min(1).max(200),
});

export const guiaPraticoResponseSchema = z.object({
  contextoEmpresa: z.string().min(1), // 1 linha — perfil considerado (businessType/taxRegime)
  alertaCritico: z.string().min(1), // maior risco de não executar a tarefa
  passos: z.array(guiaPraticoPassoSchema).min(2).max(8),
});

// ─── Tipos inferidos ─────────────────────────────────────────────────────────
export type GuiaPraticoTagTipo = z.infer<typeof guiaPraticoTagTipo>;
export type GuiaPraticoInput = z.infer<typeof guiaPraticoInputSchema>;
export type GuiaPraticoPasso = z.infer<typeof guiaPraticoPassoSchema>;
export type GuiaPraticoResponse = z.infer<typeof guiaPraticoResponseSchema>;
