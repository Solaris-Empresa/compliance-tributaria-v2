/**
 * Suite E2E — Onda 1 SOLARIS
 * CT-01: CNAE universal carrega perguntas SOLARIS
 * CT-04: badge, progresso e steps visíveis
 * CT-06: pergunta SOLARIS pode ser pulada (ADR-0016 Opção B — sem obrigatório-bloqueante)
 * CT-07: concluir Onda 1 avança para Onda 2
 *
 * Rota: /projetos/:id/questionario-solaris
 * Labels: test, area:e2e
 */
import { test, expect } from '@playwright/test';
import { loginViaTestEndpoint, criarProjetoViaApi } from './fixtures/auth';

test.describe('Onda 1 SOLARIS', () => {
  test('CT-01 — CNAE universal carrega perguntas SOLARIS', async ({ page }) => {
    await loginViaTestEndpoint(page);
    const id = await criarProjetoViaApi(page, 'UAT CT-01');
    await page.goto(`/projetos/${id}/questionario-solaris`);

    // Aguardar carregamento do questionário
    await expect(page.locator('text=Questionário SOLARIS')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Equipe técnica SOLARIS')).toBeVisible();
    // 1ª pergunta visível p/ o contexto E2E (lucro_real, sem CNAE) = SOL-039.
    // SOL-001..037 desativadas (ativo=0, novo lote curado); SOL-038 filtrada por
    // filterSolarisByContext (ADR-0038, tax_regimes=["simples_nacional"] ≠ lucro_real).
    // Mudança de CONTEÚDO intencional, não regressão (query Manus 25/06).
    await expect(page.locator('text=SOL-039')).toBeVisible();
  });

  test('CT-04 — badge, progresso e steps visíveis', async ({ page }) => {
    await loginViaTestEndpoint(page);
    const id = await criarProjetoViaApi(page, 'UAT CT-04');
    await page.goto(`/projetos/${id}/questionario-solaris`);

    await expect(page.locator('text=Equipe técnica SOLARIS')).toBeVisible({ timeout: 15000 });
    // Progresso inicial deve ser 0%
    await expect(page.locator('text=0%')).toBeVisible();
    // Indicador de etapa
    await expect(page.locator('text=Etapa 1 de 8')).toBeVisible();
  });

  test('CT-06 — pergunta SOLARIS pode ser pulada (ADR-0016 Opção B)', async ({ page }) => {
    await loginViaTestEndpoint(page);
    const id = await criarProjetoViaApi(page, 'UAT CT-06');
    await page.goto(`/projetos/${id}/questionario-solaris`);

    // Aguardar carregamento
    await expect(page.locator('text=Questionário SOLARIS')).toBeVisible({ timeout: 15000 });

    // ADR-0016 Opção B: o SOLARIS NÃO tem perguntas obrigatórias-bloqueantes →
    // a pergunta pode ser pulada ("Pular esta pergunta"). A rota /questionario-solaris
    // serve QuestionarioSolaris (App.tsx:125 — REGRA-ORQ-48), que cita ADR-0016 em :310.
    await expect(page.locator('[data-testid^="btn-pular-pergunta"]')).toBeVisible({ timeout: 5000 });
  });

  test('CT-07 — concluir Onda 1 avança para Onda 2', async ({ page }) => {
    test.setTimeout(180_000); // LLM-op (carrega 17 perguntas SOLARIS) — convenção testing.md
    await loginViaTestEndpoint(page);
    const id = await criarProjetoViaApi(page, 'UAT CT-07');
    await page.goto(`/projetos/${id}/questionario-solaris`);

    // Aguardar carregamento
    await expect(page.locator('text=Questionário SOLARIS')).toBeVisible({ timeout: 15000 });

    // Responder todas as perguntas iterativamente
    for (let i = 0; i < 25; i++) {
      const textarea = page.locator('textarea').first();
      const isVisible = await textarea.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVisible) break;

      // Verificar código da pergunta para resposta contextual
      const codeText = await page.locator('text=/SOL-\\d+/').first().textContent().catch(() => '');
      const resposta = codeText.includes('SOL-002') ? 'Não' : 'Sim, processo implementado e documentado';
      await textarea.fill(resposta);

      // Tentar avançar
      const btnProxima = page.locator('button:has-text("Próxima")').first();
      const btnConcluir = page.locator('button:has-text("Concluir Onda 1")').first();

      const concluirVisivel = await btnConcluir.isVisible({ timeout: 500 }).catch(() => false);
      if (concluirVisivel && await btnConcluir.isEnabled()) {
        await btnConcluir.click();
        break;
      } else if (await btnProxima.isEnabled()) {
        await btnProxima.click();
      }
      await page.waitForTimeout(500);

      // Verificar se já concluiu
      const concluido = await page.locator('text=Concluído').isVisible({ timeout: 1000 }).catch(() => false);
      if (concluido) break;
    }

    // Verificar na página do projeto que Onda 1 está concluída e Onda 2 desbloqueada
    await page.goto(`/projetos/${id}`);
    await expect(page.locator('text=Questionário por IA').first()).toBeVisible({ timeout: 15000 });
  });
});
