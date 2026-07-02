// action-plan-engine-v4.ts — Engine determinístico de planos de ação (Sprint Z-07 / ADR-0022)
// oportunidade → [] sempre. Função pura.
// Sprint Z-14: catálogo PLANS por ruleId (RN_PLANOS_TAREFAS_V4.md)
// BUG-PLAN-TITLE (2026-06-02): +4 entries no PLANS (confissao_automatica,
// inscricao_cadastral, obrigacao_acessoria, regime_diferenciado) + defaultSuggestion
// sem `${risk.artigo}` (que duplicava o badge verde em ActionPlanPage.tsx:556)
// + CATEGORIA_LABELS local em PT-BR.

import type { RiskV4, ActionPlanV4 } from "./risk-engine-v4";
// F0-3 (Sprint 5, 2026-06-02): consolidação de 5 cópias duplicadas.
// Era cópia local com comentário "sync com 4 cópias frontend"; agora ÚNICO em shared/.
import { CATEGORIA_LABELS } from "@shared/categoria-labels";

// ─── Catálogo canônico de planos por ruleId ─────────────────────────────────

export interface ActionPlanSuggestion {
  titulo: string;
  responsavel: string;
  prazo: "30_dias" | "60_dias" | "90_dias" | "180_dias";
}

export const PLANS: Record<string, ActionPlanSuggestion[]> = {
  // ─── Por ruleId (prioridade máxima) ───
  "GAP-IS-001": [
    { titulo: "Implantar controle de apuração do IS", responsavel: "gestor_fiscal", prazo: "90_dias" },
    { titulo: "Contratar assessoria tributária IS", responsavel: "diretor", prazo: "30_dias" },
  ],
  "GAP-SP-001": [
    { titulo: "Adequar sistema para split payment", responsavel: "ti", prazo: "90_dias" },
  ],
  "GAP-AZ-001": [
    { titulo: "Parametrizar alíquota zero nos produtos elegíveis", responsavel: "gestor_fiscal", prazo: "60_dias" },
  ],
  "GAP-TR-001": [
    { titulo: "Plano de transição ISS para IBS 2026 a 2032", responsavel: "juridico", prazo: "180_dias" },
  ],
  // ─── Por categoria (fallback hierárquico — #611) ───
  "imposto_seletivo": [
    { titulo: "Implantar controle de apuração do IS", responsavel: "gestor_fiscal", prazo: "90_dias" },
    { titulo: "Contratar assessoria tributária IS", responsavel: "diretor", prazo: "30_dias" },
  ],
  "split_payment": [
    { titulo: "Adequar sistema para split payment", responsavel: "ti", prazo: "90_dias" },
  ],
  "aliquota_zero": [
    { titulo: "Parametrizar alíquota zero nos produtos elegíveis", responsavel: "gestor_fiscal", prazo: "60_dias" },
  ],
  "transicao_iss_ibs": [
    { titulo: "Plano de transição ISS para IBS 2026 a 2032", responsavel: "juridico", prazo: "180_dias" },
  ],
  // ─── BUG-PLAN-TITLE (2026-06-02): 4 categorias faltantes que caíam em ───
  // defaultSuggestion (título genérico `Avaliar e mitigar: ${categoria} — ${artigo}`).
  // PDF E2E projeto 5640001 evidenciou títulos ilegíveis em 4/6 planos. Estas
  // são as únicas categorias do `Categoria` type (risk-engine-v4.ts:27-37) que
  // gerariam plano (severity != oportunidade) e não tinham entrada no catálogo.
  "confissao_automatica": [
    { titulo: "Implantar controle preventivo de confissão automática de débitos",
      responsavel: "advogado", prazo: "30_dias" },
  ],
  "inscricao_cadastral": [
    { titulo: "Regularizar inscrição cadastral IBS/CBS",
      responsavel: "advogado", prazo: "30_dias" },
  ],
  "obrigacao_acessoria": [
    { titulo: "Mapear e adequar obrigações acessórias IBS/CBS",
      responsavel: "gestor_fiscal", prazo: "60_dias" },
  ],
  "regime_diferenciado": [
    { titulo: "Avaliar enquadramento em regime diferenciado aplicável",
      responsavel: "advogado", prazo: "60_dias" },
  ],

  // ─── 9 categorias construção civil Fase 3a #1607 (migrations 0128-0129) ───
  // D-1/T1b: títulos acionáveis. Antes caíam no defaultSuggestion genérico
  // ("Avaliar e mitigar risco de {label}"). Lição #74/#137 (propagar a todos os consumers).
  "risco_redutor_ajuste": [
    { titulo: "Levantar e documentar o Redutor de Ajuste aplicável às operações com imóveis",
      responsavel: "advogado", prazo: "30_dias" },
  ],
  "risco_sinter_avaliacao": [
    { titulo: "Mapear imóveis sujeitos à avaliação pelo SINTER e contestar divergências",
      responsavel: "advogado", prazo: "30_dias" },
  ],
  "risco_cib_cadastro": [
    { titulo: "Regularizar inscrição dos imóveis no Cadastro Imobiliário Brasileiro (CIB)",
      responsavel: "advogado", prazo: "30_dias" },
  ],
  "risco_controle_empreendimento": [
    { titulo: "Implantar apuração segregada de IBS/CBS por empreendimento de construção civil",
      responsavel: "gestor_fiscal", prazo: "30_dias" },
  ],
  "risco_permuta_imoveis": [
    { titulo: "Avaliar impacto tributário nas operações de permuta de imóveis (torna e redutor)",
      responsavel: "advogado", prazo: "60_dias" },
  ],
  "risco_tributacao_parcelas": [
    { titulo: "Adequar sistema de apuração para tributar IBS/CBS no recebimento de cada parcela",
      responsavel: "gestor_fiscal", prazo: "90_dias" },
  ],
  "risco_sujeicao_passiva_scp": [
    { titulo: "Verificar sujeição passiva do sócio ostensivo em SCP para recolhimento de IBS/CBS",
      responsavel: "advogado", prazo: "90_dias" },
  ],
  "risco_custos_historicos": [
    { titulo: "Levantar custos históricos dos imóveis até 31/12/2026 para cálculo do Redutor de Ajuste",
      responsavel: "gestor_fiscal", prazo: "60_dias" },
  ],
  "risco_credito_condicionado_obra": [
    { titulo: "Mapear créditos de IBS/CBS condicionados à conclusão da obra e controlar estornos",
      responsavel: "advogado", prazo: "30_dias" },
  ],

  // #1691 — art_269_270 re-escopado (269 cadastro da obra + 270 §único doc fiscal).
  // Fecha o último título genérico (BUG-PLANS-TITLE residual). A apuração (270 caput)
  // é coberta por risco_controle_empreendimento (plano próprio acima).
  "risco_art_269_270": [
    { titulo: "Cadastrar a obra no CIB e indicar o número do cadastro nos documentos fiscais",
      responsavel: "gestor_fiscal", prazo: "30_dias" },
  ],
};

/**
 * BUG-PLAN-TITLE (2026-06-02): fallback usado quando categoria não tem entrada
 * em PLANS. Anteriormente incluía `${risk.artigo}` no título — mas UI já
 * renderiza badge verde separado com o artigo (ActionPlanPage.tsx:556),
 * resultando em duplicação visual ilegível.
 *
 * Mudanças:
 *   - Remove `${risk.artigo}` do título
 *   - Usa CATEGORIA_LABELS (PT-BR) em vez de snake_case da categoria
 *   - Exportada para test contract (era `function`, virou `export function`)
 */
export function defaultSuggestion(risk: RiskV4): ActionPlanSuggestion {
  const prazoMap: Record<string, "30_dias" | "60_dias" | "90_dias" | "180_dias"> = {
    imediata: "30_dias",
    curto_prazo: "60_dias",
    medio_prazo: "90_dias",
  };
  const label = CATEGORIA_LABELS[risk.categoria] ?? risk.categoria;
  return {
    titulo: `Avaliar e mitigar risco de ${label}`,
    responsavel: "advogado",
    prazo: prazoMap[risk.urgency] ?? "60_dias",
  };
}

// ─── buildActionPlans ───────────────────────────────────────────────────────

export function buildActionPlans(risks: RiskV4[]): ActionPlanV4[] {
  const plans: ActionPlanV4[] = [];

  for (const risk of risks) {
    // RN-AP-09: oportunidade NUNCA gera plano
    if (risk.severity === "oportunidade") continue;

    const suggestions = PLANS[risk.ruleId]
      ?? PLANS[risk.categoria]
      ?? [defaultSuggestion(risk)];

    for (const s of suggestions) {
      plans.push({
        riskRuleId: risk.ruleId,
        categoria: risk.categoria,
        artigo: risk.artigo,
        prioridade: risk.urgency,
        breadcrumb: risk.breadcrumb,
        severity: risk.severity,
        titulo: s.titulo,
        responsavel: s.responsavel,
        prazo: s.prazo,
      });
    }
  }

  return plans;
}
