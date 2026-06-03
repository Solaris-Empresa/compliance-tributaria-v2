/**
 * briefingAdapter.test.ts — Testes do adapter UX-BRIEFING-C-V2
 * Issue #1344 | PR-1 (F1) | Contratos: DB-SPEC §2-§4
 *
 * Converte os 10 contratos it.todo (Tríade ORQ-28 A2) em testes reais.
 */
import { describe, it, expect } from "vitest";
import {
  parseBriefingStructured,
  stripLegacyPrefix,
  normalizeSourceType,
  normalizeUrgencia,
  type BriefingAdapted,
  type BriefingLegacy,
} from "./briefingAdapter";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Fixture mínima de um briefingStructured válido (shape confirmado por SQL projeto 5700001) */
const VALID_STRUCTURED = {
  nivel_risco_geral: "alto",
  resumo_executivo: "Resumo do diagnóstico tributário.",
  principais_gaps: [
    {
      gap: "Ausência de inscrição cadastral no IBS/CBS",
      causa_raiz: "Empresa não realizou cadastro no novo sistema",
      evidencia_regulatoria: "Art. 14 LC 214/2025",
      urgencia: "imediata",
      source_type: "iagen",
      source_reference: "pergunta IA Gen: inscrição cadastral IBS/CBS",
      _hallucination_detected: true,
      _hallucinated_articles: ["Art. 14"],
    },
    {
      gap: "Falta de revisão do enquadramento CNAE",
      causa_raiz: "CNAE desatualizado",
      evidencia_regulatoria: "Art. 22 LC 214/2025",
      urgencia: "curto_prazo",
      source_type: "questionario",
      source_reference: "Declaração do contribuinte sobre CNAE",
    },
  ],
  oportunidades: ["Regime diferenciado para alíquota reduzida"],
  recomendacoes_prioritarias: ["Regularizar cadastro IBS/CBS", "Revisar CNAE"],
  top_3_acoes: [
    { acao: "Cadastrar no IBS", justificativa: "Obrigatório", prazo: "imediato" },
    { acao: "Revisar CNAE", justificativa: "Evitar autuação", prazo: "curto_prazo" },
    { acao: "Avaliar IS", justificativa: "Risco seletivo", prazo: "medio_prazo" },
  ],
  inconsistencias: [
    {
      pergunta_origem: "Exporta diretamente?",
      resposta_declarada: "Sim",
      contradicao_detectada: "Não há registro de exportação",
      impacto: "Imunidade tributária indevida",
    },
  ],
  confidence_score: {
    nivel_confianca: 65,
    limitacoes: ["Análise depende de respostas autodeclaradas"],
    recomendacao: "Revisão por advogado tributarista recomendada",
  },
  dismissed_inconsistencias: [],
  approval_reservation: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("briefingAdapter", () => {
  describe("parseBriefingStructured — fallback path (DP-01 P0)", () => {
    it("retorna fallback legado quando briefingStructured é null (DP-01 P0 — 98% dos projetos)", () => {
      const result = parseBriefingStructured(null);
      expect(result.mode).toBe("legacy");
    });

    it("retorna fallback legado quando briefingStructured é undefined", () => {
      const result = parseBriefingStructured(undefined);
      expect(result.mode).toBe("legacy");
    });

    it("retorna fallback legado quando briefingStructured é string vazia", () => {
      const result = parseBriefingStructured("");
      expect(result.mode).toBe("legacy");
    });

    it("retorna fallback legado quando briefingStructured é 'null' (string literal)", () => {
      const result = parseBriefingStructured("null");
      expect(result.mode).toBe("legacy");
    });

    it("retorna fallback legado quando confidence_score está ausente", () => {
      const noConfidence = { ...VALID_STRUCTURED, confidence_score: undefined };
      const result = parseBriefingStructured(noConfidence);
      expect(result.mode).toBe("legacy");
      expect((result as BriefingLegacy).error).toBe("missing-confidence-score");
    });
  });

  describe("parseBriefingStructured — split-view path", () => {
    it("confidence_score.nivel_confianca é number 0-100 (OBJECT, não number direto — ai-schemas.ts:237)", () => {
      const result = parseBriefingStructured(VALID_STRUCTURED);
      expect(result.mode).toBe("split-view");
      const data = (result as BriefingAdapted).data;
      expect(data.confidence_score.nivel_confianca).toBe(65);
      expect(typeof data.confidence_score.nivel_confianca).toBe("number");
      expect(data.confidence_score.limitacoes).toBeInstanceOf(Array);
      expect(data.confidence_score.recomendacao).toBe("Revisão por advogado tributarista recomendada");
    });

    it("gap.gap é string não-vazia (NÃO gap.titulo — campo inexistente)", () => {
      const result = parseBriefingStructured(VALID_STRUCTURED) as BriefingAdapted;
      expect(result.data.principais_gaps[0].gap).toBe("Ausência de inscrição cadastral no IBS/CBS");
      // Confirma que .titulo NÃO existe no tipo
      expect((result.data.principais_gaps[0] as Record<string, unknown>).titulo).toBeUndefined();
    });

    it("_hallucination_detected ausente → false por default (optional chaining)", () => {
      const result = parseBriefingStructured(VALID_STRUCTURED) as BriefingAdapted;
      // Gap 0 tem _hallucination_detected: true
      expect(result.data.principais_gaps[0]._hallucination_detected).toBe(true);
      expect(result.data.principais_gaps[0]._hallucinated_articles).toEqual(["Art. 14"]);
      // Gap 1 não tem o campo → default false
      expect(result.data.principais_gaps[1]._hallucination_detected).toBe(false);
      expect(result.data.principais_gaps[1]._hallucinated_articles).toEqual([]);
    });

    it("recomendacoes_prioritarias existe (NÃO 'recomendacoes' — campo inexistente)", () => {
      const result = parseBriefingStructured(VALID_STRUCTURED) as BriefingAdapted;
      expect(result.data.recomendacoes_prioritarias).toEqual([
        "Regularizar cadastro IBS/CBS",
        "Revisar CNAE",
      ]);
    });

    it("top_3_acoes ausente → array vazio (campo opcional ai-schemas.ts:225)", () => {
      const noAcoes = { ...VALID_STRUCTURED, top_3_acoes: undefined };
      const result = parseBriefingStructured(noAcoes) as BriefingAdapted;
      expect(result.data.top_3_acoes).toEqual([]);
    });

    it("approval_reservation null → estado aprovado sem ressalva", () => {
      const result = parseBriefingStructured(VALID_STRUCTURED) as BriefingAdapted;
      expect(result.data.approval_reservation).toBeNull();
    });

    it("approval_reservation preenchido → dados de ressalva disponíveis", () => {
      const withReservation = {
        ...VALID_STRUCTURED,
        approval_reservation: {
          confidence_at_approval: 62,
          threshold: 85,
          predefined_reason: "Dados insuficientes",
          free_reason: "Faltam documentos fiscais",
          approver_user_id: 42,
          approver_user_name: "João Silva",
          approver_role: "admin",
          approved_at: 1717430400000,
          answered_sources: ["solaris_onda1"],
          missing_sources: ["iagen_onda2", "q_produtos_ncm"],
        },
      };
      const result = parseBriefingStructured(withReservation) as BriefingAdapted;
      expect(result.data.approval_reservation).not.toBeNull();
      expect(result.data.approval_reservation!.confidence_at_approval).toBe(62);
      expect(result.data.approval_reservation!.approver_user_name).toBe("João Silva");
      expect(result.data.approval_reservation!.missing_sources).toContain("iagen_onda2");
    });
  });

  describe("parseBriefingStructured — double-encoding (DP-19/Lição #72)", () => {
    it("double-encoding: briefingStructured string → JSON.parse → objeto", () => {
      // Backend desfaz 1 nível, adapter recebe string (1× encoded)
      const singleEncoded = JSON.stringify(VALID_STRUCTURED);
      const result = parseBriefingStructured(singleEncoded);
      expect(result.mode).toBe("split-view");
      const data = (result as BriefingAdapted).data;
      expect(data.confidence_score.nivel_confianca).toBe(65);
    });

    it("objeto já parseado pelo backend → usa diretamente (Lição #72)", () => {
      // Backend já desfez o parse — adapter recebe objeto
      const result = parseBriefingStructured(VALID_STRUCTURED);
      expect(result.mode).toBe("split-view");
    });

    it("JSON inválido → fallback legado com erro", () => {
      const result = parseBriefingStructured("{invalid json}}}");
      expect(result.mode).toBe("legacy");
      expect((result as BriefingLegacy).error).toBe("json-parse-fail");
    });
  });

  describe("stripLegacyPrefix (N2-b)", () => {
    it("strip 'Aplicação obrigatória: ' do source_reference para dados legados", () => {
      expect(stripLegacyPrefix("Aplicação obrigatória: obrigação cadastral IBS"))
        .toBe("obrigação cadastral IBS");
    });

    it("preserva source_reference sem prefixo", () => {
      expect(stripLegacyPrefix("pergunta IA Gen: inscrição cadastral"))
        .toBe("pergunta IA Gen: inscrição cadastral");
    });

    it("retorna string vazia para null/undefined", () => {
      expect(stripLegacyPrefix(null)).toBe("");
      expect(stripLegacyPrefix(undefined)).toBe("");
    });
  });

  describe("normalizeSourceType", () => {
    it("normaliza aplicacao_obrigatoria → regra_semantica (alias D4)", () => {
      expect(normalizeSourceType("aplicacao_obrigatoria")).toBe("regra_semantica");
    });

    it("preserva source_types válidos", () => {
      expect(normalizeSourceType("iagen")).toBe("iagen");
      expect(normalizeSourceType("solaris")).toBe("solaris");
      expect(normalizeSourceType("rag")).toBe("rag");
      expect(normalizeSourceType("regulatorio")).toBe("regulatorio");
    });

    it("fallback para 'rag' quando source_type desconhecido", () => {
      expect(normalizeSourceType("unknown_type")).toBe("rag");
      expect(normalizeSourceType(null)).toBe("rag");
    });
  });

  describe("normalizeUrgencia", () => {
    it("normaliza valores canônicos", () => {
      expect(normalizeUrgencia("imediata")).toBe("imediata");
      expect(normalizeUrgencia("curto_prazo")).toBe("curto_prazo");
      expect(normalizeUrgencia("medio_prazo")).toBe("medio_prazo");
    });

    it("normaliza aliases do LLM", () => {
      expect(normalizeUrgencia("imediato")).toBe("imediata");
      expect(normalizeUrgencia("curto")).toBe("curto_prazo");
      expect(normalizeUrgencia("medio")).toBe("medio_prazo");
    });

    it("fallback para medio_prazo quando desconhecido", () => {
      expect(normalizeUrgencia("urgente")).toBe("medio_prazo");
      expect(normalizeUrgencia(null)).toBe("medio_prazo");
    });
  });
});
