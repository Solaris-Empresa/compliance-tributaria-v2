/**
 * Suite E2E — Fluxo Misto (Produto + Serviço)
 * E2E-M-01: Criar projeto misto e confirmar CNAEs
 * E2E-M-02: DiagnosticoStepper exibe steps do fluxo misto
 * E2E-M-03: Q.Produtos aparece sem banner "Não aplicável" [TO-BE Z-02]
 * E2E-M-04: Q.Serviços aparece sem banner "Não aplicável" [TO-BE Z-02]
 *
 * Labels: test, area:e2e, z02
 *
 * NOTA: E2E-M-03, E2E-M-04 são TO-BE — falham até Z-02 mergear.
 * Para empresa mista (produto + serviço), NENHUM banner deve aparecer.
 */
import { test, expect } from '@playwright/test'
import { loginViaTestEndpoint } from './helpers/auth'
import { criarProjetoViaApi } from './helpers/projeto'

test.describe('Fluxo Misto — Produto + Serviço', () => {

  test('E2E-M-01 — Criar projeto misto e confirmar CNAEs', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-M-01 Misto', operationType: 'misto' })
    await page.goto(`/projetos/${id}`)
    await expect(page.locator('text=UAT E2E-M-01 Misto')).toBeVisible({ timeout: 15_000 })
  })

  test('E2E-M-02 — DiagnosticoStepper exibe steps do fluxo misto', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-M-02 Stepper', operationType: 'misto' })
    await page.goto(`/projetos/${id}`)
    await expect(page.locator('[data-testid="diagnostico-stepper"]')).toBeVisible({ timeout: 15_000 })
  })

  // TO-BE: vai PASS após Z-02 mergear (QuestionarioProduto.tsx criado)
  test('E2E-M-03 — Q.Produtos aparece sem banner Não aplicável para misto [TO-BE Z-02]', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-M-03 QProdMisto', operationType: 'misto' })
    await page.goto(`/projetos/${id}/questionario-produto`)
    // Para empresa mista, Q.Produtos deve renderizar o questionário (sem banner)
    await expect(page.getByTestId('questionario-produto')).toBeVisible({ timeout: 15_000 })
    // Banner NÃO deve aparecer para empresa mista
    await expect(page.getByTestId('banner-nao-aplicavel-produto')).not.toBeVisible()
  })

  // TO-BE: vai PASS após Z-02 mergear (QuestionarioServico.tsx criado)
  test('E2E-M-04 — Q.Serviços aparece sem banner Não aplicável para misto [TO-BE Z-02]', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-M-04 QServMisto', operationType: 'misto' })
    await page.goto(`/projetos/${id}/questionario-servico`)
    // Para empresa mista, Q.Serviços deve renderizar o questionário (sem banner)
    await expect(page.getByTestId('questionario-servico')).toBeVisible({ timeout: 15_000 })
    // Banner NÃO deve aparecer para empresa mista
    await expect(page.getByTestId('banner-nao-aplicavel-servico')).not.toBeVisible()
  })

})
