/**
 * form-novo-projeto-baseline.spec.ts — F0 (FORM-NOVO-PROJETO-V2)
 *
 * BASELINE de não-regressão do formulário /projetos/novo (layout ATUAL, flag wizard OFF).
 * Os data-testid ancorados aqui são layout-independentes: migram para o wizard (F1+),
 * então ESTE MESMO spec deve passar com VITE_ENABLE_FORM_WIZARD OFF (form atual) e ON
 * (wizard) — é a prova de não-regressão "antes×depois".
 *
 * REGRA-E2E-PROD-01 (não há staging — só prod iasolaris.manus.space):
 *  - Roda SÓ APÓS o GATE-PO-FLUXO (não sujar a base recém-limpa).
 *  - Projetos criados levam prefixo "E2E-TEST-" → limpeza cirúrgica do Manus depois.
 *  - Execução: Manus (CC não tem browser/env Playwright local).
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

test.describe("F0 baseline — Novo Projeto (flag OFF · golden-path PJ)", () => {
  test("PJ: preenche o form → submit → fluxo chega ao passo de CNAE (createProject OK)", async ({ page }) => {
    await loginViaTestEndpoint(page);
    await page.goto("/projetos/novo");

    // Nome com prefixo obrigatório (REGRA-E2E-PROD-01) para limpeza posterior.
    const nome = `E2E-TEST-golden-PJ-${Date.now()}`;
    await page.getByTestId("input-nome-projeto").fill(nome);

    // Descrição ≥ 100 chars (gate de submit).
    await page.getByTestId("textarea-descricao").fill(
      "E2E-TEST: empresa de fabricação e comércio de produtos diversos, com operações " +
        "tributárias relevantes para o diagnóstico de compliance da reforma tributária (LC 214/2025)."
    );

    // Identidade PJ. O radio só existe sob a flag dual (ENABLE_TAX_ID_DUAL);
    // se ausente, o form já assume CNPJ por padrão.
    const radioPj = page.getByTestId("radio-pj");
    if (await radioPj.isVisible().catch(() => false)) {
      await radioPj.click();
    }
    await page.getByTestId("input-cnpj").fill("11222333000181"); // CNPJ com dígitos válidos

    // Perfil — 5 obrigatórios via SelectCard (testid layout-independente).
    await page.getByTestId("card-tipojuridico-ltda").click();
    await page.getByTestId("card-porte-media").click();
    await page.getByTestId("card-regime-lucro_real").click();
    await page.getByTestId("card-operacao-industria").click();
    await page.getByTestId("card-cliente-b2b").click();

    // O botão só habilita com os obrigatórios + descrição ≥ 100 (gate calcProfileScore).
    const submit = page.getByTestId("btn-criar-projeto");
    await expect(submit).toBeEnabled();
    await submit.click();

    // createProject → extractCnaes → modal de CNAEs (extractCnaes usa LLM → timeout generoso).
    // Baseline: o fluxo crítico chegou ao passo de CNAE sem erro de payload (R1).
    await expect(page.getByText(/CNAE/i).first()).toBeVisible({ timeout: 60000 });
  });
});
