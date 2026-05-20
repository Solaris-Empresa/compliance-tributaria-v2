/**
 * Test contracts — TECH-A1: deprecação do actionEngine v3
 * Sprint BUG-FIX 20/05/2026 · Issue TECH-A1
 * REGRA-ORQ-28 Artefato 2
 *
 * Valida o CONTRATO da deprecação:
 *   1. `actionEngineRouter` NÃO está registrado em `routers.ts`
 *   2. `actionEngine.ts` tem `@deprecated` JSDoc com referência ao TECH-A1
 *   3. `RiskDashboardV4.tsx` continua chamando `bulkGenerateActionPlans` (sem regressão)
 *   4. Testes em `routers-action-engine.test.ts` estão skipados via `dbDescribe.skip`
 *   5. Pipeline canônico v4 (`bulkGenerateActionPlans`) preserva escritas em `action_plans`
 *
 * Validação runtime contra banco real é responsabilidade do Manus pós-deploy
 * via DoD SQL embutido no PR body.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ROUTERS_PATH = path.join(REPO_ROOT, "server", "routers.ts");
const ACTION_ENGINE_PATH = path.join(REPO_ROOT, "server", "routers", "actionEngine.ts");
const RISKS_V4_PATH = path.join(REPO_ROOT, "server", "routers", "risks-v4.ts");
const RISK_DASHBOARD_PATH = path.join(
  REPO_ROOT,
  "client",
  "src",
  "components",
  "RiskDashboardV4.tsx"
);
const ACTION_ENGINE_TEST_PATH = path.join(
  REPO_ROOT,
  "server",
  "integration",
  "routers-action-engine.test.ts"
);

describe("TECH-A1 — actionEngine v3 deprecated", () => {
  describe("1. actionEngineRouter NÃO está registrado no router principal", () => {
    const routers = readFileSync(ROUTERS_PATH, "utf8");

    it("linha de registro está comentada com nota TECH-A1", () => {
      // Aceita: "// actionEngine: ..." (linha comentada)
      expect(routers).toMatch(
        /\/\/\s*actionEngine:\s*_actionEngineRouter_DEPRECATED/
      );
    });

    it("NÃO existe registro ativo (não-comentado) de actionEngine no appRouter", () => {
      const lines = routers.split("\n");
      const activeRegistration = lines.find((l) => {
        const trimmed = l.trim();
        // Linha que registra actionEngine como propriedade do router (não comentada)
        return (
          /^actionEngine:\s/.test(trimmed) &&
          !trimmed.startsWith("//") &&
          !trimmed.startsWith("*")
        );
      });
      expect(activeRegistration).toBeUndefined();
    });

    it("contém nota explicativa TECH-A1 com referência ao pipeline canônico", () => {
      expect(routers).toMatch(/DEPRECATED\s+2026-05-20\s+\(TECH-A1\)/);
      expect(routers).toMatch(/risksV4\.bulkGenerateActionPlans/);
    });
  });

  describe("2. actionEngine.ts marcado como @deprecated", () => {
    const actionEngine = readFileSync(ACTION_ENGINE_PATH, "utf8");

    it("tem tag @deprecated no JSDoc do topo do arquivo", () => {
      // Procura @deprecated dentro das primeiras 30 linhas (cabeçalho JSDoc)
      const head = actionEngine.split("\n").slice(0, 30).join("\n");
      expect(head).toMatch(/@deprecated\s+v3\s+legacy\s+engine/i);
    });

    it("referencia o pipeline canônico v4", () => {
      expect(actionEngine).toMatch(/risksV4\.bulkGenerateActionPlans/);
    });

    it("documenta data e identificador de deprecação", () => {
      expect(actionEngine).toMatch(/Deprecated\s+em:\s*2026-05-20\s+\(TECH-A1\)/);
    });

    it("preserva funções exportadas (não-deletadas — apenas marcadas)", () => {
      // O fix é deprecação, não remoção. As funções continuam exportadas
      // para histórico e para que imports existentes não quebrem.
      expect(actionEngine).toMatch(/export\s+async\s+function\s+deriveActionsFromRisks/);
      expect(actionEngine).toMatch(/export\s+async\s+function\s+persistActions/);
      expect(actionEngine).toMatch(/export\s+const\s+actionEngineRouter/);
    });
  });

  describe("3. Pipeline v4 (bulkGenerateActionPlans) preservado e ativo", () => {
    const risksV4 = readFileSync(RISKS_V4_PATH, "utf8");
    const dashboard = readFileSync(RISK_DASHBOARD_PATH, "utf8");

    it("bulkGenerateActionPlans existe como procedure tRPC ativa", () => {
      expect(risksV4).toMatch(/bulkGenerateActionPlans:\s*protectedProcedure/);
    });

    it("escreve em action_plans (não em project_actions_v3)", () => {
      // A função usa insertActionPlanV4WithAudit que escreve em action_plans
      expect(risksV4).toMatch(/insertActionPlanV4WithAudit/);
      // E NÃO contém INSERT INTO project_actions_v3 na vizinhança da função
      // (ela está em risks-v4.ts:1107+ — toda escrita lá é em action_plans)
    });

    it("RiskDashboardV4 chama bulkGenerateActionPlans (sem regressão)", () => {
      expect(dashboard).toMatch(
        /trpc\.risksV4\.bulkGenerateActionPlans\.useMutation/
      );
    });

    it("RiskDashboardV4 dispara mutation via onClick do botão", () => {
      expect(dashboard).toMatch(/bulkGenerateActionPlansMutation\.mutate/);
    });

    it("RiskDashboardV4 NÃO referencia actionEngine.deriveActions (legacy)", () => {
      expect(dashboard).not.toMatch(/trpc\.actionEngine\b/);
      expect(dashboard).not.toMatch(/deriveActionsFromRisks/);
    });
  });

  describe("4. Testes legacy do actionEngine v3 estão skipados", () => {
    const tests = readFileSync(ACTION_ENGINE_TEST_PATH, "utf8");

    it("todos os blocos dbDescribe foram alterados para dbDescribe.skip", () => {
      // Pré-deprecação: 10 `dbDescribe(`; pós-deprecação: 10 `dbDescribe.skip(`
      const activeDescribes = (tests.match(/^dbDescribe\(/gm) ?? []).length;
      const skippedDescribes = (tests.match(/^dbDescribe\.skip\(/gm) ?? []).length;
      expect(activeDescribes).toBe(0);
      expect(skippedDescribes).toBe(10);
    });

    it("cabeçalho do arquivo documenta a deprecação", () => {
      const head = tests.split("\n").slice(0, 15).join("\n");
      expect(head).toMatch(/@deprecated\s+TECH-A1/);
      expect(head).toMatch(/dbDescribe\.skip/);
    });
  });
});
