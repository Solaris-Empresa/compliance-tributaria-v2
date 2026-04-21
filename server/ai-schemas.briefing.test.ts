/**
 * ai-schemas.briefing.test.ts — auditoria bundle #808/#809/#810/#811
 *
 * Valida que o BriefingStructuredSchema aceita:
 *   - Payloads legados (sem top_3_acoes · sem source_type · sem source_reference)
 *   - Payloads novos (com todos os campos)
 *   - Payloads mistos (alguns gaps com source, outros sem)
 *
 * Garante backward-compat do schema após o bundle.
 */

import { describe, it, expect } from "vitest";
import { BriefingStructuredSchema } from "./ai-schemas";

const GAP_LEGACY = {
  gap: "Ausência de parametrização IBS",
  causa_raiz: "Operação multiestadual sem controle",
  evidencia_regulatoria: "Art. 15 LC 214/2025",
  urgencia: "imediata",
};

const GAP_NOVO = {
  ...GAP_LEGACY,
  source_type: "rag",
  source_reference: "chunk_id:LC214_art15",
};

const PAYLOAD_BASE = {
  nivel_risco_geral: "alto",
  resumo_executivo: "Empresa operando em múltiplos estados apresenta risco potencial de parametrização inadequada de alíquotas IBS. Recomenda-se revisão detalhada.",
  oportunidades: ["Cesta básica pode se aplicar a produtos alimentícios"],
  recomendacoes_prioritarias: ["Implementar parametrização IBS por UF"],
  confidence_score: {
    nivel_confianca: 30,
    limitacoes: ["Sem respostas de questionário"],
    recomendacao: "Revisão por advogado tributarista recomendada",
  },
};

describe("BriefingStructuredSchema — bundle D/A/B/C backward-compat", () => {
  it("aceita payload legado — sem top_3_acoes, sem source_type (briefings pré-#810/#811)", () => {
    const payload = {
      ...PAYLOAD_BASE,
      principais_gaps: [GAP_LEGACY, GAP_LEGACY, GAP_LEGACY],
    };
    const parsed = BriefingStructuredSchema.parse(payload);
    expect(parsed.top_3_acoes).toEqual([]);
    expect(parsed.principais_gaps[0].source_type).toBeUndefined();
    expect(parsed.principais_gaps[0].source_reference).toBeUndefined();
  });

  it("aceita payload novo completo — com top_3_acoes e source_type", () => {
    const payload = {
      ...PAYLOAD_BASE,
      principais_gaps: [GAP_NOVO, GAP_NOVO, GAP_NOVO],
      top_3_acoes: [
        { acao: "Parametrizar IBS", justificativa: "Risco jurídico imediato", prazo: "imediato" },
        { acao: "Atualizar cadastro", justificativa: "Obrigação legal", prazo: "curto_prazo" },
        { acao: "Revisar NCMs", justificativa: "Oportunidade de crédito", prazo: "medio_prazo" },
      ],
    };
    const parsed = BriefingStructuredSchema.parse(payload);
    expect(parsed.top_3_acoes).toHaveLength(3);
    expect(parsed.principais_gaps[0].source_type).toBe("rag");
    expect(parsed.principais_gaps[0].source_reference).toBe("chunk_id:LC214_art15");
  });

  it("aceita payload misto — alguns gaps com source, outros sem", () => {
    const payload = {
      ...PAYLOAD_BASE,
      principais_gaps: [GAP_NOVO, GAP_LEGACY, GAP_NOVO],
      top_3_acoes: [],
    };
    const parsed = BriefingStructuredSchema.parse(payload);
    expect(parsed.principais_gaps[0].source_type).toBe("rag");
    expect(parsed.principais_gaps[1].source_type).toBeUndefined();
    expect(parsed.principais_gaps[2].source_type).toBe("rag");
  });

  it("tolera source_type inválido via .catch (LLM com typo)", () => {
    const payload = {
      ...PAYLOAD_BASE,
      principais_gaps: [
        { ...GAP_LEGACY, source_type: "INVALIDO", source_reference: "ref" },
      ],
    };
    const parsed = BriefingStructuredSchema.parse(payload);
    // .catch(undefined as any) converte valor inválido em undefined
    expect(parsed.principais_gaps[0].source_type).toBeUndefined();
  });

  it("tolera prazo inválido em top_3_acoes via .catch (default curto_prazo)", () => {
    const payload = {
      ...PAYLOAD_BASE,
      principais_gaps: [GAP_LEGACY, GAP_LEGACY, GAP_LEGACY],
      top_3_acoes: [
        { acao: "X", justificativa: "Y", prazo: "INVALIDO" },
      ],
    };
    const parsed = BriefingStructuredSchema.parse(payload);
    expect(parsed.top_3_acoes[0].prazo).toBe("curto_prazo");
  });

  it("top_3_acoes com mais de 3 itens → rejeita", () => {
    const payload = {
      ...PAYLOAD_BASE,
      principais_gaps: [GAP_LEGACY, GAP_LEGACY, GAP_LEGACY],
      top_3_acoes: [
        { acao: "A", justificativa: "j", prazo: "imediato" },
        { acao: "B", justificativa: "j", prazo: "imediato" },
        { acao: "C", justificativa: "j", prazo: "imediato" },
        { acao: "D", justificativa: "j", prazo: "imediato" },
      ],
    };
    expect(() => BriefingStructuredSchema.parse(payload)).toThrow();
  });
});
