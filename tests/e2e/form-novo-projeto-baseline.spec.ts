/**
 * form-novo-projeto-baseline.spec.ts — F0 + D-BASELINE (FORM-NOVO-PROJETO-V2)
 *
 * Golden-path PJ de /projetos/novo, **ADAPTATIVO** ao layout:
 *  - Wizard ON  (VITE_ENABLE_FORM_WIZARD): navega os 5 passos com btn-wizard-avancar →
 *    submit no passo 4 (btn-criar-projeto-wizard). UX-PASSO1 (#1598): Passo 0 funde Tipo+CNPJ/CPF.
 *  - Wizard OFF: preenche single-page → btn-criar-projeto.
 * Mesmos data-testid nos dois fluxos → cumpre o "antes×depois" de verdade (corrige a
 * premissa do F0 que assumia todos os campos numa página só — o wizard pagina por passo).
 *
 * REGRA-E2E-PROD-01 (não há staging — só prod iasolaris.manus.space):
 *  - Roda SÓ APÓS o GATE-PO-FLUXO (não sujar a base recém-limpa).
 *  - Projetos criados levam prefixo "E2E-TEST-" → limpeza cirúrgica do Manus depois.
 *  - Execução: Manus (CC não tem browser/env Playwright local).
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const NOME = () => `E2E-TEST-golden-PJ-${Date.now()}`;
const DESCRICAO =
  "E2E-TEST: empresa de fabricação e comércio de produtos diversos, com operações " +
  "tributárias relevantes para o diagnóstico de compliance da reforma tributária (LC 214/2025).";

test.describe("Baseline adaptativo — Novo Projeto (golden-path PJ · wizard ON/OFF)", () => {
  test("PJ: preenche → submit → fluxo chega ao passo de CNAE (createProject OK)", async ({ page }) => {
    await loginViaTestEndpoint(page);
    await page.goto("/projetos/novo");

    const nome = NOME();
    const isWizard = await page.getByTestId("form-wizard").isVisible({ timeout: 5000 }).catch(() => false);

    if (isWizard) {
      // ── Wizard ON: navega os 5 passos (UX-PASSO1 #1598) ─────────────────────
      const avancar = page.getByTestId("btn-wizard-avancar");

      // Passo 0 — Tipo + Identificação (PJ + CNPJ na mesma tela)
      await page.getByTestId("radio-pj").click();
      await page.getByTestId("input-cnpj").fill("11222333000181");
      await expect(avancar).toBeEnabled();
      await avancar.click();

      // Passo 1 — Perfil (5 obrigatórios)
      await page.getByTestId("card-tipojuridico-ltda").click();
      await page.getByTestId("card-porte-media").click();
      await page.getByTestId("card-regime-lucro_real").click();
      await page.getByTestId("card-operacao-industria").click();
      await page.getByTestId("card-cliente-b2b").click();
      await expect(avancar).toBeEnabled();
      await avancar.click();

      // Passo 2 — Descrição (nome + descrição ≥ 100)
      await page.getByTestId("input-nome-projeto").fill(nome);
      await page.getByTestId("textarea-descricao").fill(DESCRICAO);
      await expect(avancar).toBeEnabled();
      await avancar.click();

      // Passo 3 — Opcionais (sem obrigatório) → avançar
      await avancar.click();

      // Passo 4 — Confirmação → submit
      const submit = page.getByTestId("btn-criar-projeto-wizard");
      await expect(submit).toBeEnabled();
      await submit.click();
    } else {
      // ── Wizard OFF: single-page (fluxo flat original) ───────────────────────
      await page.getByTestId("input-nome-projeto").fill(nome);
      await page.getByTestId("textarea-descricao").fill(DESCRICAO);

      // Radio PJ só existe sob ENABLE_TAX_ID_DUAL; se ausente, o form assume CNPJ.
      const radioPj = page.getByTestId("radio-pj");
      if (await radioPj.isVisible().catch(() => false)) {
        await radioPj.click();
      }
      await page.getByTestId("input-cnpj").fill("11222333000181");

      await page.getByTestId("card-tipojuridico-ltda").click();
      await page.getByTestId("card-porte-media").click();
      await page.getByTestId("card-regime-lucro_real").click();
      await page.getByTestId("card-operacao-industria").click();
      await page.getByTestId("card-cliente-b2b").click();

      const submit = page.getByTestId("btn-criar-projeto");
      await expect(submit).toBeEnabled();
      await submit.click();
    }

    // createProject → extractCnaes (LLM) → passo de CNAE. Baseline: chegou sem erro de payload (R1).
    await expect(page.getByText(/CNAE/i).first()).toBeVisible({ timeout: 60000 });
  });
});
