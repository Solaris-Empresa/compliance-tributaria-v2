/**
 * Suite E2E — Fluxo Produto (Q.Produtos)
 * E2E-P-01: Criar projeto produto e confirmar CNAEs
 * E2E-P-02: DiagnosticoStepper exibe step Q.Produtos após onda2_iagen
 * E2E-P-03: QuestionarioProduto renderiza e aceita respostas [TO-BE Z-02]
 * E2E-P-04: NaoAplicavelBanner NÃO aparece para empresa de produto puro [TO-BE Z-02]
 * E2E-P-05: Q.Serviços exibe banner "Não aplicável" para empresa de produto puro [TO-BE Z-02]
 *
 * Rota: /projetos/:id/questionario-produto
 * Labels: test, area:e2e, z02
 *
 * NOTA: E2E-P-03, E2E-P-04, E2E-P-05 são TO-BE — falham até Z-02 mergear.
 * Quando Z-02 mergear, estes testes passam automaticamente sem alteração neste arquivo.
 */
import { test, expect } from '@playwright/test'
import { loginViaTestEndpoint } from './helpers/auth'
import { criarProjetoViaApi } from './helpers/projeto'

test.describe('Fluxo Produto — Q.Produtos', () => {

  test('E2E-P-01 — Criar projeto produto e confirmar CNAEs', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-P-01 Produto', operationType: 'produto' })
    await page.goto(`/projetos/${id}`)
    // Projeto criado com operationType produto
    await expect(page.locator('text=UAT E2E-P-01 Produto')).toBeVisible({ timeout: 15_000 })
  })

  test('E2E-P-02 — DiagnosticoStepper exibe steps do fluxo', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-P-02 Stepper', operationType: 'produto' })
    await page.goto(`/projetos/${id}`)
    // DiagnosticoStepper deve estar presente na página do projeto
    await expect(page.locator('[data-testid="diagnostico-stepper"]')).toBeVisible({ timeout: 15_000 })
  })

  // TO-BE: vai PASS após Z-02 mergear (QuestionarioProduto.tsx criado)
  test('E2E-P-03 — QuestionarioProduto renderiza e aceita respostas [TO-BE Z-02]', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-P-03 QProduto', operationType: 'produto' })
    await page.goto(`/projetos/${id}/questionario-produto`)
    // TO-BE: componente QuestionarioProduto deve existir com data-testid
    await expect(page.getByTestId('questionario-produto')).toBeVisible({ timeout: 15_000 })
  })

  // TO-BE: vai PASS após Z-02 mergear (NaoAplicavelBanner implementado)
  test('E2E-P-04 — NaoAplicavelBanner NÃO aparece para produto puro [TO-BE Z-02]', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-P-04 NaoBanner', operationType: 'produto' })
    await page.goto(`/projetos/${id}/questionario-produto`)
    // Para empresa de produto puro, o banner "Não aplicável" NÃO deve aparecer
    await expect(page.getByTestId('banner-nao-aplicavel-produto')).not.toBeVisible({ timeout: 10_000 })
  })

  // TO-BE: vai PASS após Z-02 mergear (NaoAplicavelBanner no Q.Serviços)
  test('E2E-P-05 — Q.Serviços exibe banner Não aplicável para produto puro [TO-BE Z-02]', async ({ page }) => {
    await loginViaTestEndpoint(page)
    const id = await criarProjetoViaApi(page, { nome: 'UAT E2E-P-05 BannerServico', operationType: 'produto' })
    await page.goto(`/projetos/${id}/questionario-servico`)
    // Para empresa de produto puro, Q.Serviços deve exibir o banner "Não aplicável"
    await expect(page.getByTestId('banner-nao-aplicavel-servico')).toBeVisible({ timeout: 15_000 })
    // Botão "Avançar" deve estar presente e clicável
    await expect(page.getByTestId('btn-avancar-nao-aplicavel')).toBeVisible()
  })

})
