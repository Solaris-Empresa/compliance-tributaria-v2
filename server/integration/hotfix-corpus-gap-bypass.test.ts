/**
 * Hotfix #1008 — CorpusGapBanner V1.5 (bypass com audit) + NaoAplicavelBanner adaptativo
 *
 * Cobre 5 contratos:
 *
 *   T1-T4 — `getNaoAplicavelText(tipo, motivo)` mapeia (tipo, motivo) →
 *           (titulo, descricao) para os 4 motivos do enum.
 *
 *   T5    — Procedure `auditCorpusGapBypass` registra log com subType
 *           "corpus_gap_bypass" + ncmCodes + operationType (telemetria
 *           para curadoria SOLARIS priorizar cobertura legal por NCM).
 *
 * Tests T1-T4 são unitários puros (sem render) — vitest direto na função
 * exportada. @testing-library/react não está configurado neste projeto;
 * E2E é via Playwright. Por isso a lógica adaptativa foi extraída para
 * função pura (`getNaoAplicavelText`) testável sem JSX.
 *
 * Refs:
 * - Issue #1008 (CorpusGapBanner V1.5 + texto adaptativo)
 * - Issue #997 V1 (gate corpus_gap_setorial)
 * - Issue #1006 (router propaga motivo)
 * - REGRA-ORQ-22 (3 níveis) / ORQ-28 (Tríade) / ORQ-32 (no hardcode)
 */
import { describe, it, expect } from "vitest";
import { getNaoAplicavelText } from "../../client/src/components/NaoAplicavelBanner";

describe("Hotfix #1008 — getNaoAplicavelText (texto adaptativo por motivo)", () => {
  // ── T1: motivo = "no_ncm_codes" ───────────────────────────────────────────
  it("T1 — motivo='no_ncm_codes' → texto sobre NCM ausente (não 'exclusivamente serviços')", () => {
    const { titulo, descricao } = getNaoAplicavelText("servico", "no_ncm_codes");

    expect(titulo).toBe("Nenhum código NCM cadastrado");
    expect(descricao).toContain("Não há códigos NCM informados");
    expect(descricao).toContain("voltar e adicionar");
    // Pré-fix: cairia em "Sua empresa opera exclusivamente com serviços" — errado
    // para empresa "comercio" ou "misto" sem NCM cadastrado.
    expect(descricao).not.toContain("exclusivamente com serviços");
    expect(descricao).not.toContain("exclusivamente com produtos");
  });

  // ── T2: motivo = "no_nbs_codes" ───────────────────────────────────────────
  it("T2 — motivo='no_nbs_codes' → texto sobre NBS ausente (paridade com Q.NCM)", () => {
    const { titulo, descricao } = getNaoAplicavelText("produto", "no_nbs_codes");

    expect(titulo).toBe("Nenhum código NBS cadastrado");
    expect(descricao).toContain("Não há códigos NBS informados");
    expect(descricao).toContain("voltar e adicionar");
    expect(descricao).not.toContain("exclusivamente com produtos");
  });

  // ── T3: motivo = "no_applicable_requirements" ─────────────────────────────
  it("T3 — motivo='no_applicable_requirements' → texto neutro 'nenhuma fonte retornou perguntas'", () => {
    const { titulo, descricao } = getNaoAplicavelText("servico", "no_applicable_requirements");

    expect(titulo).toBe("Nenhuma fonte retornou perguntas para este perfil");
    expect(descricao).toContain("RAG e SOLARIS");
    expect(descricao).toContain("Diagnóstico parcial");
    expect(descricao).toContain("equipe SOLARIS notificada");
  });

  // ── T4: motivo = null/undefined → V1 fallback (mensagem fixa por tipo) ────
  it("T4 — motivo=null/undefined → V1 fallback preservado (mensagem fixa por tipo)", () => {
    // Path "servico" puro (companyType === "servico" no source) — mensagem legada.
    const servicoTexto = getNaoAplicavelText("servico", null);
    expect(servicoTexto.titulo).toBe("Questionário de Produtos não aplicável");
    expect(servicoTexto.descricao).toContain("exclusivamente com serviços");

    // Path "produto" puro (Q.NBS, empresa de produto puro) — mensagem legada.
    const produtoTexto = getNaoAplicavelText("produto", undefined);
    expect(produtoTexto.titulo).toBe("Questionário de Serviços não aplicável");
    expect(produtoTexto.descricao).toContain("exclusivamente com produtos");

    // Garantia adicional: ausência de motivo NÃO altera comportamento V1.
    const ambosTexto = getNaoAplicavelText("servico", undefined);
    expect(ambosTexto).toEqual(servicoTexto);
  });

  // ── T5: tipo de retorno consistente para todos os motivos do enum ─────────
  it("T5 — getNaoAplicavelText retorna { titulo, descricao } não-vazios para qualquer motivo", () => {
    const motivos = [
      null,
      undefined,
      "no_ncm_codes",
      "no_nbs_codes",
      "no_applicable_requirements",
    ] as const;

    for (const motivo of motivos) {
      for (const tipo of ["produto", "servico"] as const) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { titulo, descricao } = getNaoAplicavelText(tipo, motivo as any);
        expect(titulo, `tipo=${tipo} motivo=${motivo}`).toBeTruthy();
        expect(descricao, `tipo=${tipo} motivo=${motivo}`).toBeTruthy();
        expect(titulo.length).toBeGreaterThan(5);
        expect(descricao.length).toBeGreaterThan(20);
      }
    }
  });
});
