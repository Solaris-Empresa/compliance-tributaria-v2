/**
 * form-wizard-cenario4.spec.ts — F2.4 (FORM-NOVO-PROJETO-V2)
 *
 * DoD bloqueante do F2: **Cenário 4 — PJ → (volta) → PF** (cascata #1299 limpa os 6 campos
 * PJ-only e o passo 2 esconde TJ/Porte/Regime).
 *
 * D8 (decisão P.O.): duas camadas, por causa da REGRA-E2E-PROD-01 (só prod, flag wizard OFF):
 *  1. CASCATA (core do risco) — roda no form ATUAL (flag wizard OFF) → valida AGORA em prod.
 *  2. NAVEGAÇÃO WIZARD — só com VITE_ENABLE_FORM_WIZARD ON → skip-guard; gateia o FLIP (pós-F4).
 *
 * REGRA-E2E-PROD-01: roda só pós-GATE-PO; projetos com prefixo "E2E-TEST-"; Manus limpa depois;
 * execução pelo Manus (CC não tem browser/Playwright local).
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const DESC =
  "E2E-TEST: empresa para validar a cascata PJ→PF do perfil — operações tributárias " +
  "relevantes ao diagnóstico de compliance da reforma tributária (LC 214/2025).";

test.describe("F2.4 — Cenário 4 (PJ → volta → PF)", () => {
  // ── Camada 1: CASCATA no form atual (flag wizard OFF) — roda em prod ──────────────
  test("cascata: PJ→PF esconde TJ/Porte/Regime e limpa os obrigatórios (submit volta a bloquear)", async ({ page }) => {
    await loginViaTestEndpoint(page);
    await page.goto("/projetos/novo");

    // Sem o radio dual (ENABLE_TAX_ID_DUAL OFF) não há PJ/PF → cenário não se aplica.
    const radioPf = page.getByTestId("radio-pf");
    if (!(await radioPf.isVisible().catch(() => false))) {
      test.skip(true, "ENABLE_TAX_ID_DUAL OFF — sem radio PJ/PF neste ambiente.");
    }

    // Preenche como PJ até o submit habilitar.
    await page.getByTestId("input-nome-projeto").fill(`E2E-TEST-cenario4-${Date.now()}`);
    await page.getByTestId("textarea-descricao").fill(DESC);
    await page.getByTestId("radio-pj").click();
    await page.getByTestId("input-cnpj").fill("11222333000181");
    await page.getByTestId("card-tipojuridico-ltda").click();
    await page.getByTestId("card-porte-media").click();
    await page.getByTestId("card-regime-lucro_real").click();
    await page.getByTestId("card-operacao-industria").click();
    await page.getByTestId("card-cliente-b2b").click();
    await expect(page.getByTestId("btn-criar-projeto")).toBeEnabled();

    // Troca para PF → os campos PJ-only somem (gate !isPF) e o CPF aparece.
    await radioPf.click();
    await expect(page.getByTestId("card-tipojuridico-ltda")).toBeHidden();
    await expect(page.getByTestId("card-porte-media")).toBeHidden();
    await expect(page.getByTestId("card-regime-lucro_real")).toBeHidden();
    await expect(page.getByTestId("input-cpf")).toBeVisible();

    // Volta para PJ → os campos reaparecem, mas VAZIOS (cascata limpou) → submit BLOQUEADO.
    // (prova da limpeza: TJ/Porte/Regime/Operação ficaram missing-required.)
    await page.getByTestId("radio-pj").click();
    await expect(page.getByTestId("card-tipojuridico-ltda")).toBeVisible();
    await expect(page.getByTestId("btn-criar-projeto")).toBeDisabled();
  });

  // ── Camada 2: NAVEGAÇÃO WIZARD (flag ON) — skip se wizard ausente; gateia o flip ──
  test("wizard: passo2 (PJ) → volta passo0 → PF → passo2 esconde TJ/Porte/Regime", async ({ page }) => {
    await loginViaTestEndpoint(page);
    await page.goto("/projetos/novo");

    // Skip-guard: sem o wizard (flag VITE_ENABLE_FORM_WIZARD OFF) este cenário não existe.
    const wizard = page.getByTestId("form-wizard");
    if (!(await wizard.isVisible().catch(() => false))) {
      test.skip(true, "VITE_ENABLE_FORM_WIZARD OFF — wizard inativo; spec gateia o flip (pós-F4).");
    }

    // Passo 0 (Tipo): PJ → Avançar.
    await page.getByTestId("radio-pj").click();
    await page.getByTestId("btn-wizard-avancar").click();
    // Passo 1 (Identificação): CNPJ → Avançar.
    await page.getByTestId("input-cnpj").fill("11222333000181");
    await page.getByTestId("btn-wizard-avancar").click();
    // Passo 2 (Perfil): preenche os obrigatórios PJ.
    await page.getByTestId("card-tipojuridico-ltda").click();
    await page.getByTestId("card-porte-media").click();
    await page.getByTestId("card-regime-lucro_real").click();
    await page.getByTestId("card-operacao-industria").click();
    await page.getByTestId("card-cliente-b2b").click();
    await expect(page.getByTestId("card-tipojuridico-ltda")).toBeVisible();

    // Volta ao passo 0 (Voltar ×2) e troca para PF.
    await page.getByTestId("btn-wizard-voltar").click();
    await page.getByTestId("btn-wizard-voltar").click();
    await page.getByTestId("radio-pf").click();

    // Avança até o passo 2 e confirma que TJ/Porte/Regime estão escondidos (PF) e Cliente visível.
    await page.getByTestId("btn-wizard-avancar").click(); // passo 1 (CPF)
    await page.getByTestId("input-cpf").fill("52998224725");
    await page.getByTestId("btn-wizard-avancar").click(); // passo 2 (Perfil)
    await expect(page.getByTestId("card-tipojuridico-ltda")).toBeHidden();
    await expect(page.getByTestId("card-porte-media")).toBeHidden();
    await expect(page.getByTestId("card-regime-lucro_real")).toBeHidden();
    await expect(page.getByTestId("card-cliente-b2b")).toBeVisible();
  });
});
