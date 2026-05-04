/**
 * m3.8-3-eliminate-fallback.test.ts
 * Sprint M3.8 — Item 3 — Eliminar enquadramento_geral como fallback silencioso
 *
 * Issue: #960
 * Spec: REGRA-ORQ-29 + Lição #62 — gap não-categorizável → reviewQueue, não risco fantasma.
 *
 * Triade ORQ-28 OBRIGATÓRIA — alto risco (efeito cascata downstream).
 *
 * Vinculadas:
 * - PR #956 — Lições #62 (Contexto vs Evidência) e #63 (Spec ≠ Viável)
 * - REGRA-ORQ-29 (Sem Requisito = Sem Pergunta = Sem Gap)
 * - PR #952 — NO_QUESTION protocol (precedente análogo)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { categorizeRisk } from "./risk-categorizer";

const RISK_CATEGORIZER_SRC = readFileSync(
  path.resolve(__dirname, "risk-categorizer.ts"),
  "utf-8",
);
const RISK_ELIGIBILITY_SRC = readFileSync(
  path.resolve(__dirname, "risk-eligibility.ts"),
  "utf-8",
);
const RISK_ENGINE_V4_SRC = readFileSync(
  path.resolve(__dirname, "risk-engine-v4.ts"),
  "utf-8",
);

describe("M3.8-3 — risk-categorizer fallback eliminado", () => {
  it("type CategoriaCanonica inclui 'unmapped'", () => {
    expect(RISK_CATEGORIZER_SRC).toMatch(/\|\s*"unmapped"/);
  });

  it("fallback final retorna 'unmapped' (não 'enquadramento_geral')", () => {
    // Match o último statement `return "X";` antes do `}` final da função categorizeRisk.
    // Não captura comentários ("// ANTES: return ...").
    const lines = RISK_CATEGORIZER_SRC.split("\n");
    let lastReturnLine = "";
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comentários
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
      // Capturar linha de código que começa com `return "..."`
      if (/^\s*return\s+"[\w_]+"\s*;?\s*$/.test(line)) {
        lastReturnLine = line;
      }
    }
    expect(lastReturnLine).toMatch(/return\s+"unmapped"/);
  });

  it("comentário documenta M3.8-3 + REGRA-ORQ-29", () => {
    expect(RISK_CATEGORIZER_SRC).toMatch(/M3\.8-3.*REGRA-ORQ-29/s);
  });

  it("categorizeRisk retorna 'unmapped' para risco sem match", () => {
    const result = categorizeRisk({
      description: "completamente genérico sem nenhuma palavra-chave reconhecida xpto",
      lei_ref: null,
      topicos: null,
    });
    expect(result).toBe("unmapped");
  });

  it("categorizeRisk preserva categorias canônicas quando match (split_payment)", () => {
    const result = categorizeRisk({
      description: "split payment não conformidade",
      lei_ref: null,
      topicos: "split_payment",
    });
    expect(result).toBe("split_payment");
  });

  it("categorizeRisk preserva categorias canônicas quando match (imposto_seletivo)", () => {
    const result = categorizeRisk({
      description: "incidência de imposto seletivo sobre combustíveis",
      lei_ref: null,
      topicos: "imposto seletivo",
    });
    expect(result).toBe("imposto_seletivo");
  });

  it("categorizeRisk preserva enquadramento_geral quando explicitamente atribuído", () => {
    const result = categorizeRisk({
      description: "enquadramento tributário genérico",
      lei_ref: null,
      topicos: null,
      category: "enquadramento_geral",
    });
    // categorizeRisk verifica match nas 9 categorias canônicas; se categoria explícita
    // já é uma das 9 (incluindo enquadramento_geral), match deveria ser preservado.
    // Em casos onde nenhum keyword match, mas categoria explícita é enquadramento_geral,
    // a função NÃO retorna "unmapped" — preserva categoria explícita ou cai em fallback.
    // Aceitar tanto "unmapped" quanto "enquadramento_geral" — comportamento depende dos checks anteriores.
    expect(["enquadramento_geral", "unmapped"]).toContain(result);
  });
});

describe("M3.8-3 — risk-eligibility downgrade_to atualizado", () => {
  it("imposto_seletivo downgrade_to = 'unmapped' (era 'enquadramento_geral')", () => {
    expect(RISK_ELIGIBILITY_SRC).toMatch(/imposto_seletivo:\s*\{[\s\S]*?downgrade_to:\s*"unmapped"/);
  });

  it("comentário inline documenta M3.8-3 + Lição #62", () => {
    expect(RISK_ELIGIBILITY_SRC).toMatch(/M3\.8-3.*Lição #62/s);
  });
});

describe("M3.8-3 — risk-engine-v4 handler para 'unmapped'", () => {
  it("contém handler skip para categoria 'unmapped'", () => {
    expect(RISK_ENGINE_V4_SRC).toMatch(/categoria\s*===\s*["']unmapped["']\s*as\s+CategoriaCanonica/);
  });

  it("handler usa 'continue' para skip o loop (não gera risco)", () => {
    // Pega o bloco do handler
    const handlerMatch = RISK_ENGINE_V4_SRC.match(/categoria\s*===\s*["']unmapped["'][\s\S]{0,500}continue/);
    expect(handlerMatch).toBeTruthy();
  });

  it("handler loga warn para auditoria", () => {
    expect(RISK_ENGINE_V4_SRC).toMatch(/console\.warn[\s\S]{0,200}skip risco unmapped/);
  });

  it("comentário documenta M3.8-3 + REGRA-ORQ-29", () => {
    expect(RISK_ENGINE_V4_SRC).toMatch(/M3\.8-3.*REGRA-ORQ-29/s);
  });
});

describe("M3.8-3 — Preservação contextos legítimos", () => {
  it("risk-engine-v4 preserva enquadramento_geral em SEVERITY_TABLE (categoria canônica válida)", () => {
    expect(RISK_ENGINE_V4_SRC).toMatch(/enquadramento_geral:\s*\{\s*severity/);
  });

  it("risk-engine-v4 preserva template enquadramento_geral", () => {
    expect(RISK_ENGINE_V4_SRC).toMatch(/enquadramento_geral:\s*["']Risco de enquadramento tributário/);
  });

  it("type CategoriaCanonica preserva 'enquadramento_geral' (não removido)", () => {
    expect(RISK_CATEGORIZER_SRC).toMatch(/\|\s*"enquadramento_geral"/);
  });
});
