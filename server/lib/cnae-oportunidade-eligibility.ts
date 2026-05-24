/**
 * cnae-oportunidade-eligibility.ts — FEAT-SCOPE-01 (#1177)
 *
 * Filtro data-driven de elegibilidade da oportunidade `aliquota_reduzida`
 * (Art. 127 LC 214/2025 — redução de 30% para profissionais liberais sob
 * conselho) por CNAE do projeto. Espelha o padrão de skip do Imposto
 * Seletivo (risk-eligibility-is-ncm-cnae.ts), mas é DATA-DRIVEN: lê a tabela
 * `cnae_aplicavel_oportunidade` (sem hardcode de CNAEs — REGRA-ORQ-32).
 *
 * Arquitetura (testabilidade + Lição #65):
 *   - `evaluateAliquotaReduzidaEligibility` — FUNÇÃO PURA (cnaes + rows → decisão).
 *     Testada por contract sem DB (cnae-oportunidade-eligibility.test.ts).
 *   - `isAliquotaReduzidaEligible` — orquestrador: lê rows (cache) + chama a pura.
 *     Consumido por consolidateRisks (risk-engine-v4.ts).
 *
 * Comportamento (sign-off P.O. 24/05/2026 — Art. 127 §1º II):
 *   - CNAE 'potencial' → exibe a oportunidade (com gate: questionário §1º II
 *     OU §3º para ed. física, que dispensa as 4 perguntas).
 *   - CNAE 'excluido' / 'pending_legal' / NÃO encontrado → NÃO exibe
 *     (default conservador — benefício não é presumido por omissão de regra).
 */
import { getCnaeOportunidadeRows } from "./db-queries-cnae-oportunidade";

/** Linha da tabela cnae_aplicavel_oportunidade (mysql2 retorna requer_questionario como 0/1). */
export interface CnaeOportunidadeRow {
  cnae_4dig: string;
  elegibilidade: "potencial" | "excluido" | "pending_legal";
  gate_especial: string | null; // null = questionário §1º II ; '§3º' = ed. física
  requer_questionario: boolean | number;
  inciso_art127: string | null;
  conselho_profissional: string | null;
}

export type AliquotaReduzidaGate = "questionario_§1ºII" | "§3º";

export interface AliquotaReduzidaEligibility {
  eligible: boolean;
  matchedCnae: string | null;
  gate: AliquotaReduzidaGate | null;
  requerQuestionario: boolean;
  reason:
    | "potencial"
    | "excluido"
    | "pending_legal"
    | "cnae_nao_encontrado"
    | "sem_cnae"
    | null;
}

export const OPORTUNIDADE_ALIQUOTA_REDUZIDA = "aliquota_reduzida";

/** Normaliza CNAE para o grupo de 4 dígitos (ex: "7112-0/00" → "7112"). */
function cnae4dig(s: string): string {
  return s.replace(/\D/g, "").slice(0, 4);
}

/**
 * FUNÇÃO PURA — decide a elegibilidade a partir dos CNAEs do projeto e das
 * linhas da tabela. Conservadora: só `potencial` exibe; qualquer outro estado
 * (ou ausência) não exibe.
 */
export function evaluateAliquotaReduzidaEligibility(
  cnaes: string[],
  rows: CnaeOportunidadeRow[],
): AliquotaReduzidaEligibility {
  if (!cnaes || cnaes.length === 0) {
    return {
      eligible: false,
      matchedCnae: null,
      gate: null,
      requerQuestionario: false,
      reason: "sem_cnae",
    };
  }

  const byCnae = new Map<string, CnaeOportunidadeRow>();
  for (const r of rows) byCnae.set(r.cnae_4dig, r);

  // 1) Basta UM CNAE 'potencial' para exibir a oportunidade.
  for (const c of cnaes) {
    const row = byCnae.get(cnae4dig(c));
    if (row && row.elegibilidade === "potencial") {
      const isS3 = row.gate_especial === "§3º";
      return {
        eligible: true,
        matchedCnae: cnae4dig(c),
        gate: isS3 ? "§3º" : "questionario_§1ºII",
        // §3º (ed. física) dispensa as 4 perguntas; demais usam o questionário.
        requerQuestionario: isS3 ? false : Boolean(row.requer_questionario),
        reason: "potencial",
      };
    }
  }

  // 2) Nenhum potencial → determina a razão do skip
  //    (excluido tem prioridade > pending_legal > não encontrado).
  let reason: AliquotaReduzidaEligibility["reason"] = "cnae_nao_encontrado";
  for (const c of cnaes) {
    const row = byCnae.get(cnae4dig(c));
    if (row?.elegibilidade === "excluido") {
      reason = "excluido";
      break;
    }
    if (row?.elegibilidade === "pending_legal") {
      reason = "pending_legal";
    }
  }

  return {
    eligible: false,
    matchedCnae: null,
    gate: null,
    requerQuestionario: false,
    reason,
  };
}

/**
 * Orquestrador — lê as linhas (cache TTL 1h) e aplica a função pura.
 * Consumido por consolidateRisks (skip da oportunidade quando não elegível).
 */
export async function isAliquotaReduzidaEligible(
  cnaes: string[],
): Promise<AliquotaReduzidaEligibility> {
  const rows = await getCnaeOportunidadeRows(OPORTUNIDADE_ALIQUOTA_REDUZIDA);
  return evaluateAliquotaReduzidaEligibility(cnaes, rows);
}

/**
 * BUG-BRIEFING-CNAE (#1190 / Opção A'): bloco de restrição IMPERATIVA injetado no
 * prompt do briefing LLM (fluxoV3.generateBriefing) quando o CNAE NÃO é elegível ao
 * Art. 127. Determinístico (string fixa) — instrui o LLM a não sugerir a oportunidade.
 *
 * - eligible=true  → "" (sem restrição; o LLM pode sugerir o Art. 127)
 * - eligible=false → bloco imperativo ("NÃO mencione...")
 */
export function buildArt127PromptRestriction(eligible: boolean): string {
  if (eligible) return "";
  return (
    "\nRESTRIÇÃO NORMATIVA OBRIGATÓRIA: O Art. 127 da LC 214/2025 (e o Art. 202 do " +
    "Decreto 12.955/2026) — alíquota reduzida de 30% para profissionais liberais sob " +
    "fiscalização de conselho — NÃO se aplica ao(s) CNAE(s) deste projeto. NÃO mencione, " +
    "NÃO sugira e NÃO gere gap nem oportunidade relacionada a essa alíquota reduzida. " +
    "Isto é determinístico: ignore qualquer trecho do contexto regulatório que cite o " +
    "Art. 127 / Art. 202 como oportunidade para esta empresa.\n"
  );
}
