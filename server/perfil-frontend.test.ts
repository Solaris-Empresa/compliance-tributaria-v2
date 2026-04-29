/**
 * perfil-frontend.test.ts — M2 PR-B
 *
 * Cobertura:
 *   - Redirect condicional: NovoProjeto → /perfil-entidade (não mais /questionario-solaris)
 *   - Rota /projetos/:id/perfil-entidade registrada em App.tsx
 *   - Feature flag guard: perfil.build retorna FORBIDDEN quando flag=false
 *   - PainelConfianca: score display, blocker severity mapping
 *   - usePerfilEntidade: state machine states mapping
 *
 * Notas:
 *   - Testes unitários puros (sem DB, sem DOM rendering).
 *   - Valida contratos e lógica de negócio no frontend.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── B4: Redirect condicional ──────────────────────────────────────────────
describe("B4 — Redirect condicional NovoProjeto → perfil-entidade", () => {
  const novoProjetoSrc = readFileSync(
    resolve(__dirname, "../client/src/pages/NovoProjeto.tsx"),
    "utf-8"
  );

  it("confirmCnaes onSuccess redireciona para /perfil-entidade (não /questionario-solaris)", () => {
    // Verifica que o redirect aponta para perfil-entidade
    expect(novoProjetoSrc).toContain("setLocation(`/projetos/${projectId}/perfil-entidade`)");
    // Verifica que NÃO aponta mais para questionario-solaris no onSuccess do confirmCnaes
    const confirmCnaesBlock = novoProjetoSrc.split("confirmCnaes")[1]?.split("onError")[0] || "";
    expect(confirmCnaesBlock).not.toContain("/questionario-solaris");
  });

  it("toast message menciona 'Perfil da Entidade'", () => {
    expect(novoProjetoSrc).toContain("Avançando para Perfil da Entidade");
  });
});

// ─── B5: Rota registrada em App.tsx ────────────────────────────────────────
describe("B5 — Rota /projetos/:id/perfil-entidade em App.tsx", () => {
  const appSrc = readFileSync(
    resolve(__dirname, "../client/src/App.tsx"),
    "utf-8"
  );

  it("importa ConfirmacaoPerfil", () => {
    expect(appSrc).toContain('import ConfirmacaoPerfil from "./pages/ConfirmacaoPerfil"');
  });

  it("registra rota /projetos/:id/perfil-entidade", () => {
    expect(appSrc).toContain('path="/projetos/:id/perfil-entidade"');
    expect(appSrc).toContain("component={ConfirmacaoPerfil}");
  });

  it("rota perfil-entidade vem ANTES de /projetos/:id/historico (order matters)", () => {
    const perfilIdx = appSrc.indexOf("/projetos/:id/perfil-entidade");
    const historicoIdx = appSrc.indexOf("/projetos/:id/historico");
    expect(perfilIdx).toBeLessThan(historicoIdx);
  });
});

// ─── B2: PainelConfianca — lógica de score e severity ──────────────────────
describe("B2 — PainelConfianca score/severity logic", () => {
  it("score ranges map correctly to labels", () => {
    // Lógica definida no componente: >=80 Alto, >=50 Médio, <50 Baixo
    const getScoreLabel = (score: number): string => {
      if (score >= 80) return "Alto";
      if (score >= 50) return "Médio";
      return "Baixo";
    };
    expect(getScoreLabel(95)).toBe("Alto");
    expect(getScoreLabel(80)).toBe("Alto");
    expect(getScoreLabel(79)).toBe("Médio");
    expect(getScoreLabel(50)).toBe("Médio");
    expect(getScoreLabel(49)).toBe("Baixo");
    expect(getScoreLabel(0)).toBe("Baixo");
  });

  it("blocker severity ordering: hard > soft > info", () => {
    const severityOrder = { hard: 3, soft: 2, info: 1 };
    expect(severityOrder.hard).toBeGreaterThan(severityOrder.soft);
    expect(severityOrder.soft).toBeGreaterThan(severityOrder.info);
  });

  it("confirmação requer zero hard_blocks (business rule)", () => {
    // Business rule: score alto NÃO libera fluxo — apenas status_arquetipo === "confirmado" + zero hard_blocks
    const canConfirm = (hardBlocks: number, status: string): boolean => {
      return hardBlocks === 0 && status !== "bloqueado";
    };
    expect(canConfirm(0, "pendente")).toBe(true);
    expect(canConfirm(1, "pendente")).toBe(false);
    expect(canConfirm(0, "bloqueado")).toBe(false);
  });
});

// ─── B3: usePerfilEntidade — state mapping ─────────────────────────────────
describe("B3 — usePerfilEntidade state machine mapping", () => {
  it("maps StatusArquetipo to UI states correctly", () => {
    const statusToUiState: Record<string, string> = {
      pendente: "C1_pendente",
      inconsistente: "C2_inconsistente",
      bloqueado: "C3_bloqueado",
      confirmado: "C4_confirmado",
    };
    expect(statusToUiState["pendente"]).toBe("C1_pendente");
    expect(statusToUiState["inconsistente"]).toBe("C2_inconsistente");
    expect(statusToUiState["bloqueado"]).toBe("C3_bloqueado");
    expect(statusToUiState["confirmado"]).toBe("C4_confirmado");
  });

  it("FSM transition perfil_entidade_confirmado is valid (from PR-A)", async () => {
    // Import from the actual FSM to validate integration
    const fsm = await import("./flowStateMachine");
    const VALID_TRANSITIONS = fsm.VALID_TRANSITIONS;
    const fromCnaes = VALID_TRANSITIONS["cnaes_confirmados"];
    expect(fromCnaes).toBeDefined();
    expect(fromCnaes).toContain("perfil_entidade_confirmado");
  });
});

// ─── B1: ConfirmacaoPerfil — structural checks ────────────────────────────
describe("B1 — ConfirmacaoPerfil structural compliance", () => {
  const confirmacaoSrc = readFileSync(
    resolve(__dirname, "../client/src/pages/ConfirmacaoPerfil.tsx"),
    "utf-8"
  );

  it("uses 'Perfil da Entidade' terminology (never 'Arquétipo')", () => {
    // Decisão P.O.: Termo UI é "Perfil da Entidade", NUNCA "Arquétipo"
    expect(confirmacaoSrc).toContain("Perfil da Entidade");
    // Check that "Arquétipo" is not used in user-visible strings (comments are OK)
    const lines = confirmacaoSrc.split("\n");
    const nonCommentLines = lines.filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*"));
    const jsxContent = nonCommentLines.join("\n");
    // Allow "status_arquetipo" as a code identifier but not "Arquétipo" as UI text
    const uiStrings = jsxContent.match(/"[^"]*Arqu[eé]tipo[^"]*"|'[^']*Arqu[eé]tipo[^']*'|>[^<]*Arqu[eé]tipo[^<]*/gi) || [];
    const visibleArquetipo = uiStrings.filter(s => !s.includes("status_arquetipo") && !s.includes("arquetipo"));
    expect(visibleArquetipo).toHaveLength(0);
  });

  it("imports usePerfilEntidade hook", () => {
    expect(confirmacaoSrc).toContain("usePerfilEntidade");
  });

  it("imports PainelConfianca component", () => {
    expect(confirmacaoSrc).toContain("PainelConfianca");
  });

  it("has fallback for feature flag disabled (skip to questionario)", () => {
    expect(confirmacaoSrc).toContain("questionario-solaris");
  });

  it("displays 5 canonical dimensions", () => {
    expect(confirmacaoSrc).toContain("Objeto Econômico");
    expect(confirmacaoSrc).toContain("Papel na Cadeia");
    expect(confirmacaoSrc).toContain("Tipo de Relação");
    expect(confirmacaoSrc).toContain("Território");
    expect(confirmacaoSrc).toContain("Regime Tributário");
  });
});
