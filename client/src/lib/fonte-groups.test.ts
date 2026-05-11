/**
 * Issue #1049 — filtro/contador por fonte em /riscos
 *
 * Tests da função pura extraída de RiskDashboardV4.tsx.
 *
 * Mapeamento P.O. (decisão 2026-05-09):
 *   SOLARIS      → source = 'solaris' | 'solaris_hardcode'
 *   Regulatório  → source = 'rag' | 'rag_validated' | 'regulatorio'
 *   IA Gen       → source = 'ia_gen' | 'iagen'
 *
 * Critérios:
 *   - Contagem correta por fonte
 *   - Multi-fonte conta em múltiplos grupos
 *   - Aliases legados reconhecidos
 *   - Risco sem fonte conhecida não conta em nenhum grupo
 */
import { describe, it, expect } from "vitest";
import {
  FONTE_GROUPS,
  riskHasFonteGroup,
  countRisksByFonteGroup,
  countRisksBySourcePriority,
  getSourcePriorityGroup,
  riskMatchesSourcePriority,
} from "./fonte-groups";

describe("Issue #1049 — FONTE_GROUPS mapping", () => {
  it("inclui aliases solaris", () => {
    expect(FONTE_GROUPS.solaris.has("solaris")).toBe(true);
    expect(FONTE_GROUPS.solaris.has("solaris_hardcode")).toBe(true);
  });

  it("inclui aliases regulatorio", () => {
    expect(FONTE_GROUPS.regulatorio.has("regulatorio")).toBe(true);
    expect(FONTE_GROUPS.regulatorio.has("rag")).toBe(true);
    expect(FONTE_GROUPS.regulatorio.has("rag_validated")).toBe(true);
  });

  it("inclui aliases iagen", () => {
    expect(FONTE_GROUPS.iagen.has("iagen")).toBe(true);
    expect(FONTE_GROUPS.iagen.has("ia_gen")).toBe(true);
  });

  it("não confunde grupos — solaris não inclui rag", () => {
    expect(FONTE_GROUPS.solaris.has("rag")).toBe(false);
    expect(FONTE_GROUPS.regulatorio.has("solaris")).toBe(false);
    expect(FONTE_GROUPS.iagen.has("regulatorio")).toBe(false);
  });
});

describe("Issue #1049 — riskHasFonteGroup", () => {
  describe("Match básico (1 fonte)", () => {
    it("solaris bate com grupo solaris", () => {
      expect(riskHasFonteGroup(["solaris"], "solaris")).toBe(true);
    });

    it("solaris_hardcode bate com grupo solaris", () => {
      expect(riskHasFonteGroup(["solaris_hardcode"], "solaris")).toBe(true);
    });

    it("regulatorio bate com grupo regulatorio", () => {
      expect(riskHasFonteGroup(["regulatorio"], "regulatorio")).toBe(true);
    });

    it("rag (alias legado) bate com grupo regulatorio", () => {
      expect(riskHasFonteGroup(["rag"], "regulatorio")).toBe(true);
    });

    it("rag_validated (alias legado) bate com grupo regulatorio", () => {
      expect(riskHasFonteGroup(["rag_validated"], "regulatorio")).toBe(true);
    });

    it("iagen bate com grupo iagen", () => {
      expect(riskHasFonteGroup(["iagen"], "iagen")).toBe(true);
    });

    it("ia_gen (alias legado) bate com grupo iagen", () => {
      expect(riskHasFonteGroup(["ia_gen"], "iagen")).toBe(true);
    });
  });

  describe("Não-match", () => {
    it("solaris NÃO bate com regulatorio", () => {
      expect(riskHasFonteGroup(["solaris"], "regulatorio")).toBe(false);
    });

    it("regulatorio NÃO bate com iagen", () => {
      expect(riskHasFonteGroup(["regulatorio"], "iagen")).toBe(false);
    });

    it("fonte desconhecida não bate com nenhum grupo", () => {
      expect(riskHasFonteGroup(["foo"], "solaris")).toBe(false);
      expect(riskHasFonteGroup(["foo"], "regulatorio")).toBe(false);
      expect(riskHasFonteGroup(["foo"], "iagen")).toBe(false);
    });

    it("array vazio não bate com nenhum grupo", () => {
      expect(riskHasFonteGroup([], "solaris")).toBe(false);
    });
  });

  describe("Multi-fonte (risco com múltiplas fontes)", () => {
    it("[solaris, regulatorio] bate com solaris E regulatorio", () => {
      expect(riskHasFonteGroup(["solaris", "regulatorio"], "solaris")).toBe(true);
      expect(riskHasFonteGroup(["solaris", "regulatorio"], "regulatorio")).toBe(true);
      expect(riskHasFonteGroup(["solaris", "regulatorio"], "iagen")).toBe(false);
    });

    it("[iagen, regulatorio, solaris] bate com os 3 grupos", () => {
      const fontes = ["iagen", "regulatorio", "solaris"];
      expect(riskHasFonteGroup(fontes, "solaris")).toBe(true);
      expect(riskHasFonteGroup(fontes, "regulatorio")).toBe(true);
      expect(riskHasFonteGroup(fontes, "iagen")).toBe(true);
    });
  });
});

describe("Issue #1049 — countRisksByFonteGroup", () => {
  it("array vazio retorna contadores zerados", () => {
    expect(countRisksByFonteGroup([])).toEqual({
      solaris: 0,
      regulatorio: 0,
      iagen: 0,
    });
  });

  it("1 risco com fonte=solaris incrementa solaris=1", () => {
    const counts = countRisksByFonteGroup([["solaris"]]);
    expect(counts).toEqual({ solaris: 1, regulatorio: 0, iagen: 0 });
  });

  it("risco multi-fonte conta em múltiplos grupos", () => {
    const counts = countRisksByFonteGroup([["solaris", "regulatorio"]]);
    expect(counts).toEqual({ solaris: 1, regulatorio: 1, iagen: 0 });
  });

  it("caso canônico #5040001 — distribuição esperada", () => {
    // 8 riscos:
    //   3 com solaris (Split Payment, Confissão Auto, Obrigação Acessória)
    //   4 puramente regulatorio (IS, Inscrição, Regime Dif., Transição ISS/IBS)
    //   1 iagen (enquadramento_geral fallback)
    // Multi-fonte: alguns riscos solaris têm regulatorio também (gaps mistos)
    const fontesPorRisco = [
      ["solaris", "regulatorio"], // Split Payment
      ["solaris", "regulatorio", "iagen"], // Confissão Automática
      ["solaris", "regulatorio"], // Obrigação Acessória
      ["regulatorio"], // IS
      ["regulatorio"], // Inscrição
      ["regulatorio"], // Regime Diferenciado
      ["regulatorio"], // Transição ISS/IBS
      ["iagen"], // enquadramento_geral
    ];
    const counts = countRisksByFonteGroup(fontesPorRisco);
    expect(counts.solaris).toBe(3);
    expect(counts.regulatorio).toBe(7);
    expect(counts.iagen).toBe(2);
  });

  it("aliases legados são contados corretamente", () => {
    const counts = countRisksByFonteGroup([
      ["solaris_hardcode"],
      ["rag_validated"],
      ["ia_gen"],
      ["rag"],
    ]);
    expect(counts).toEqual({ solaris: 1, regulatorio: 2, iagen: 1 });
  });

  it("riscos sem fonte conhecida não inflam contadores", () => {
    const counts = countRisksByFonteGroup([["foo"], ["bar"], []]);
    expect(counts).toEqual({ solaris: 0, regulatorio: 0, iagen: 0 });
  });
});

describe("Issue #1049 — DoD POSITIVO + NEGATIVO", () => {
  it("DoD POSITIVO: funções são puras — mesma entrada produz mesma saída", () => {
    const fontes = [["solaris", "regulatorio"], ["iagen"]];
    const r1 = countRisksByFonteGroup(fontes);
    const r2 = countRisksByFonteGroup(fontes);
    expect(r1).toEqual(r2);
  });

  it("DoD NEGATIVO: regressão proibida — fonte 'inferred' (normative-inference) não inflar grupos", () => {
    const counts = countRisksByFonteGroup([["inferred"]]);
    expect(counts).toEqual({ solaris: 0, regulatorio: 0, iagen: 0 });
  });

  it("DoD POSITIVO: contagem total nunca excede N riscos × 3 (sem dupla contagem dentro de um grupo)", () => {
    const fontes = [["solaris", "solaris_hardcode"]]; // mesma fonte canônica 2x
    const counts = countRisksByFonteGroup(fontes);
    // Conta como 1 risco solaris, não 2 (some retorna após 1ª match)
    expect(counts.solaris).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Issue #1064 — filtro por source_priority (substitui multi-fonte)
// ═══════════════════════════════════════════════════════════════════════════

describe("Issue #1064 — getSourcePriorityGroup", () => {
  it("mapeia source_priority para grupo correto", () => {
    expect(getSourcePriorityGroup("solaris")).toBe("solaris");
    expect(getSourcePriorityGroup("regulatorio")).toBe("regulatorio");
    expect(getSourcePriorityGroup("iagen")).toBe("iagen");
  });

  it("reconhece aliases legados", () => {
    expect(getSourcePriorityGroup("solaris_hardcode")).toBe("solaris");
    expect(getSourcePriorityGroup("rag")).toBe("regulatorio");
    expect(getSourcePriorityGroup("rag_validated")).toBe("regulatorio");
    expect(getSourcePriorityGroup("ia_gen")).toBe("iagen");
  });

  it("retorna null para source_priority fora dos 3 grupos exibidos", () => {
    expect(getSourcePriorityGroup("cnae")).toBeNull();
    expect(getSourcePriorityGroup("ncm")).toBeNull();
    expect(getSourcePriorityGroup("nbs")).toBeNull();
    expect(getSourcePriorityGroup("inferred")).toBeNull();
  });

  it("retorna null para null/undefined/string vazia", () => {
    expect(getSourcePriorityGroup(null)).toBeNull();
    expect(getSourcePriorityGroup(undefined)).toBeNull();
    expect(getSourcePriorityGroup("")).toBeNull();
  });
});

describe("Issue #1064 — riskMatchesSourcePriority", () => {
  it("true quando source_priority pertence ao grupo", () => {
    expect(riskMatchesSourcePriority("solaris", "solaris")).toBe(true);
    expect(riskMatchesSourcePriority("regulatorio", "regulatorio")).toBe(true);
    expect(riskMatchesSourcePriority("iagen", "iagen")).toBe(true);
  });

  it("false quando source_priority pertence a outro grupo", () => {
    expect(riskMatchesSourcePriority("solaris", "regulatorio")).toBe(false);
    expect(riskMatchesSourcePriority("regulatorio", "iagen")).toBe(false);
    expect(riskMatchesSourcePriority("iagen", "solaris")).toBe(false);
  });

  it("false quando source_priority é cnae/ncm/nbs (fora dos 3 grupos)", () => {
    expect(riskMatchesSourcePriority("cnae", "solaris")).toBe(false);
    expect(riskMatchesSourcePriority("ncm", "regulatorio")).toBe(false);
    expect(riskMatchesSourcePriority("nbs", "iagen")).toBe(false);
  });

  it("reconhece aliases (rag → regulatorio, ia_gen → iagen)", () => {
    expect(riskMatchesSourcePriority("rag", "regulatorio")).toBe(true);
    expect(riskMatchesSourcePriority("rag_validated", "regulatorio")).toBe(true);
    expect(riskMatchesSourcePriority("ia_gen", "iagen")).toBe(true);
    expect(riskMatchesSourcePriority("solaris_hardcode", "solaris")).toBe(true);
  });
});

describe("Issue #1064 — countRisksBySourcePriority", () => {
  it("array vazio retorna contadores zerados", () => {
    expect(countRisksBySourcePriority([])).toEqual({
      solaris: 0,
      regulatorio: 0,
      iagen: 0,
    });
  });

  it("cada risco conta em apenas 1 grupo (sem dupla contagem)", () => {
    const counts = countRisksBySourcePriority([
      { source_priority: "solaris" },
      { source_priority: "solaris" },
      { source_priority: "regulatorio" },
    ]);
    expect(counts).toEqual({ solaris: 2, regulatorio: 1, iagen: 0 });
  });

  it("caso canônico #5340031 — soma dos contadores = total de riscos", () => {
    // 6 riscos: 5 solaris + 1 regulatorio + 0 iagen
    const risks = [
      { source_priority: "solaris" },
      { source_priority: "solaris" },
      { source_priority: "solaris" },
      { source_priority: "solaris" },
      { source_priority: "solaris" },
      { source_priority: "regulatorio" },
    ];
    const counts = countRisksBySourcePriority(risks);
    expect(counts).toEqual({ solaris: 5, regulatorio: 1, iagen: 0 });
    // Soma = total
    expect(counts.solaris + counts.regulatorio + counts.iagen).toBe(risks.length);
  });

  it("riscos com source_priority fora dos 3 grupos NÃO entram nos contadores", () => {
    const risks = [
      { source_priority: "solaris" },
      { source_priority: "cnae" },     // fora
      { source_priority: "ncm" },      // fora
      { source_priority: "nbs" },      // fora
      { source_priority: "inferred" }, // fora
    ];
    const counts = countRisksBySourcePriority(risks);
    expect(counts).toEqual({ solaris: 1, regulatorio: 0, iagen: 0 });
    // Total dos 3 grupos < total de riscos quando há fontes fora
    expect(counts.solaris + counts.regulatorio + counts.iagen).toBeLessThan(risks.length);
  });

  it("aliases legados são contados corretamente", () => {
    const counts = countRisksBySourcePriority([
      { source_priority: "solaris_hardcode" },
      { source_priority: "rag" },
      { source_priority: "rag_validated" },
      { source_priority: "ia_gen" },
    ]);
    expect(counts).toEqual({ solaris: 1, regulatorio: 2, iagen: 1 });
  });

  it("null/undefined em source_priority não infla contadores", () => {
    const counts = countRisksBySourcePriority([
      { source_priority: null },
      { source_priority: undefined },
      { source_priority: "solaris" },
    ]);
    expect(counts).toEqual({ solaris: 1, regulatorio: 0, iagen: 0 });
  });
});

describe("Issue #1064 — DoD POSITIVO + NEGATIVO", () => {
  it("DoD POSITIVO: soma dos contadores nunca excede total de riscos", () => {
    const cenarios = [
      [{ source_priority: "solaris" }],
      [{ source_priority: "regulatorio" }, { source_priority: "iagen" }],
      [
        { source_priority: "solaris" },
        { source_priority: "solaris" },
        { source_priority: "regulatorio" },
      ],
    ];
    for (const risks of cenarios) {
      const counts = countRisksBySourcePriority(risks);
      const total = counts.solaris + counts.regulatorio + counts.iagen;
      expect(total).toBeLessThanOrEqual(risks.length);
    }
  });

  it("DoD NEGATIVO: regressão proibida — multi-fonte NÃO conta em múltiplos grupos", () => {
    // Cenário onde o comportamento ANTIGO contaria errado:
    // 1 risco com source_priority='solaris' (mas tem gaps regulatorio + iagen
    // em evidence.gaps[*].fonte).
    // Comportamento NOVO: conta APENAS em solaris.
    const counts = countRisksBySourcePriority([{ source_priority: "solaris" }]);
    expect(counts.solaris).toBe(1);
    expect(counts.regulatorio).toBe(0);
    expect(counts.iagen).toBe(0);
  });

  it("DoD POSITIVO: caso canônico #5340031 — 5+1+0 = 6 (total)", () => {
    const risks = Array.from({ length: 5 }, () => ({ source_priority: "solaris" }))
      .concat([{ source_priority: "regulatorio" }]);
    const counts = countRisksBySourcePriority(risks);
    expect(counts.solaris).toBe(5);
    expect(counts.regulatorio).toBe(1);
    expect(counts.iagen).toBe(0);
    expect(counts.solaris + counts.regulatorio + counts.iagen).toBe(6);
  });
});
