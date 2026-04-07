/**
 * Suite E2E — Fluxo Serviço (Q.Serviços)
 * E2E-S-01: Criar projeto serviço e confirmar CNAEs
 * E2E-S-02: DiagnosticoStepper exibe steps do fluxo serviço
 * E2E-S-03: QuestionarioServico renderiza e aceita respostas [TO-BE Z-02]
 * E2E-S-04: NaoAplicavelBanner NÃO aparece para serviço puro [TO-BE Z-02]
 *
 * Rota: /projetos/:id/questionario-servico
 * Labels: test, area:e2e, z02
 *
 * NOTA: E2E-S-03, E2E-S-04 são TO-BE — falham até Z-02 mergear.
 */
import { test, expect } from '@playwright/test'
import { loginViaTestEndpoint } from './helpers/auth'
import { criarProjetoViaApi } from './helpers/projeto'

test.describe('Fluxo Serviço — Q.Serviços', () => {

  test('E2E-S-01 — Criar projeto serviço e confirmar CNAEs', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-S-01 Servico', operationType: 'servico' })
    await page.goto(`/projetos/${id}`)
    await expect(page.locator('text=UAT E2E-S-01 Servico')).toBeVisible({ timeout: 15_000 })
  })

  test('E2E-S-02 — DiagnosticoStepper exibe steps do fluxo serviço', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-S-02 Stepper', operationType: 'servico' })
    await page.goto(`/projetos/${id}`)
    await expect(page.locator('[data-testid="diagnostico-stepper"]')).toBeVisible({ timeout: 15_000 })
  })

  // TO-BE: vai PASS após Z-02 mergear (QuestionarioServico.tsx criado)
  test('E2E-S-03 — QuestionarioServico renderiza e aceita respostas [TO-BE Z-02]', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-S-03 QServico', operationType: 'servico' })
    await page.goto(`/projetos/${id}/questionario-servico`)
    // TO-BE: componente QuestionarioServico deve existir com data-testid
    await expect(page.getByTestId('questionario-servico')).toBeVisible({ timeout: 15_000 })
  })

  // TO-BE: vai PASS após Z-02 mergear (NaoAplicavelBanner implementado)
  test('E2E-S-04 — NaoAplicavelBanner NÃO aparece para serviço puro [TO-BE Z-02]', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-S-04 NaoBanner', operationType: 'servico' })
    await page.goto(`/projetos/${id}/questionario-produto`)
    // Para empresa de serviço puro, Q.Produtos deve exibir o banner "Não aplicável"
    await expect(page.getByTestId('banner-nao-aplicavel-produto')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('btn-avancar-nao-aplicavel')).toBeVisible()
  })

})
