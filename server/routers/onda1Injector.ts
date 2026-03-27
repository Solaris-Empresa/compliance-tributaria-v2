/**
 * onda1Injector.ts — K-2: Pipeline Onda 1 (SOLARIS) no questionEngine
 * Sprint K — ADR-011
 *
 * Responsabilidade:
 *   Busca perguntas ativas da tabela solaris_questions (Onda 1),
 *   filtra por cnaeGroups, e as converte para o formato QuestionSchema
 *   com fonte="solaris" — prontas para serem injetadas ANTES das
 *   perguntas regulatórias (Onda 3) no pipeline generateQuestions.
 *
 * O que NÃO está aqui:
 *   - Badge visual (K-3)
 *   - Onda 2 combinatória (K-4)
 *   - Qualquer alteração de UI
 */

import { getSolarisQuestions } from "../db";
import type { SolarisQuestion } from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Tipos de saída — compatível com QuestionSchema de ai-schemas.ts
// ---------------------------------------------------------------------------

export interface Onda1Question {
  id: string;
  text: string;
  objetivo_diagnostico: string;
  impacto_reforma: string;
  type: "sim_nao";
  peso_risco: "baixo" | "medio" | "alto" | "critico";
  required: boolean;
  options: string[];
  scale_labels: undefined;
  placeholder: undefined;
  fonte: "solaris";
  requirement_id: string;
  source_reference: string;
}

// ---------------------------------------------------------------------------
// Função principal — getOnda1Questions
// ---------------------------------------------------------------------------

/**
 * Retorna perguntas da Onda 1 (SOLARIS) para um CNAE específico.
 *
 * Lógica de filtro (espelha getSolarisQuestions do db.ts):
 *   - cnaeGroups = null → pergunta universal (aparece para todos)
 *   - cnaeGroups = ["11", "1113-5"] → aparece se cnaeCode começa com
 *     algum dos prefixos OU se o prefixo começa com cnaeCode
 *
 * @param cnaeCode  Código CNAE do projeto (ex: "1113-5/02")
 * @returns         Array de perguntas no formato QuestionSchema
 */
export async function getOnda1Questions(cnaeCode: string): Promise<Onda1Question[]> {
  // Normalizar: usar apenas a parte antes da "/" para matching de prefixo
  const cnaePrefix = cnaeCode.split("/")[0].trim();

  const rows: SolarisQuestion[] = await getSolarisQuestions(cnaePrefix);

  return rows.map((q) => mapToOnda1Question(q));
}

/**
 * Converte uma linha de solaris_questions para o formato QuestionSchema.
 * Campos fixos:
 *   - fonte: "solaris" (imutável — identifica Onda 1)
 *   - type: "sim_nao" (padrão para Onda 1; pode ser estendido em K-4)
 *   - requirement_id: "SQ-{id}" (prefixo SQ = Solaris Question)
 *   - source_reference: "SOLARIS — {categoria}"
 */
function mapToOnda1Question(q: SolarisQuestion): Onda1Question {
  return {
    id: `sq-${q.id}`,
    text: q.texto,
    objetivo_diagnostico: q.observacao ?? `Verificação SOLARIS — ${q.categoria}`,
    impacto_reforma: `Compliance interno — categoria: ${q.categoria}`,
    type: "sim_nao",
    peso_risco: q.obrigatorio === 1 ? "alto" : "medio",
    required: q.obrigatorio === 1,
    options: [],
    scale_labels: undefined,
    placeholder: undefined,
    fonte: "solaris",
    requirement_id: `SQ-${q.id}`,
    source_reference: `SOLARIS — ${q.categoria}`,
  };
}

// ---------------------------------------------------------------------------
// Injetor — injectOnda1IntoQuestions
// ---------------------------------------------------------------------------

/**
 * Injeta perguntas Onda 1 ANTES das perguntas regulatórias (Onda 3).
 *
 * Ordem final do questionário:
 *   [Onda 1: SOLARIS] → [Onda 3: regulatório/ia_gen]
 *
 * Onda 2 (K-4) será inserida entre Onda 1 e Onda 3 em sprint futura.
 *
 * @param cnaeCode          Código CNAE do projeto
 * @param regulatorioQuestions  Perguntas já geradas pelo LLM (Onda 3)
 * @returns                 Array combinado com Onda 1 primeiro
 */
export async function injectOnda1IntoQuestions(
  cnaeCode: string,
  regulatorioQuestions: Onda1Question[]
): Promise<Onda1Question[]> {
  const onda1 = await getOnda1Questions(cnaeCode);

  if (onda1.length === 0) {
    // Nenhuma pergunta Onda 1 para este CNAE — retorna apenas regulatório
    return regulatorioQuestions;
  }

  // Re-indexar IDs das perguntas regulatórias para evitar colisão com sq-*
  const regulatorioReindexed = regulatorioQuestions.map((q, i) => ({
    ...q,
    id: q.id.startsWith("sq-") ? q.id : `q${i + 1}`,
  }));

  return [...onda1, ...regulatorioReindexed];
}
