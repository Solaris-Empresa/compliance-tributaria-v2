/**
 * Suite E2E — Caminho crítico completo
 * CT-37: Onda 1 → Onda 2 → Corporativo desbloqueado
 *
 * Verifica o fix BUG-UAT-03: após concluir Onda 2, o status deve avançar
 * para 'diagnostico_corporativo' (não permanecer em 'onda2_iagen').
 *
 * Labels: test, area:e2e
 */
import { test, expect } from '@playwright/test';
import { loginViaTestEndpoint, criarProjetoViaApi } from './fixtures/auth';

/**
 * Helper: responde todas as perguntas de um questionário iterativamente.
 * Suporta textarea (resposta livre) e radio buttons (sim/não).
 */
async function responderQuestionario(
  page: import('@playwright/test').Page,
  btnConcluirText: string,
  maxIteracoes: number = 25
): Promise<void> {
  for (let i = 0; i < maxIteracoes; i++) {
    // Tentar textarea primeiro
    const textarea = page.locator('textarea').first();
    const textareaVisivel = await textarea.isVisible({ timeout: 2000 }).catch(() => false);

    if (textareaVisivel) {
      const codeText = await page.locator('text=/SOL-\\d+|IAG-\\d+/').first().textContent().catch(() => '');
      const resposta = codeText.includes('SOL-002') ? 'Não' : 'Sim, processo implementado e documentado';
      await textarea.fill(resposta);
    } else {
      // Tentar radio button (Sim)
      const radioSim = page.locator('input[type="radio"][value="sim"], label:has-text("Sim")').first();
      const radioVisivel = await radioSim.isVisible({ timeout: 1000 }).catch(() => false);
      if (radioVisivel) await radioSim.click();
    }

    // Verificar botão Concluir
    const btnConcluir = page.locator(`button:has-text("${btnConcluirText}")`).first();
    const concluirVisivel = await btnConcluir.isVisible({ timeout: 500 }).catch(() => false);
    if (concluirVisivel && await btnConcluir.isEnabled()) {
      await btnConcluir.click();
      await page.waitForTimeout(1000);
      break;
    }

    // Avançar para próxima pergunta
    const btnProxima = page.locator('button:has-text("Próxima")').first();
    if (await btnProxima.isEnabled()) {
      await btnProxima.click();
    }
    await page.waitForTimeout(500);

    // Verificar se já concluiu
    const concluido = await page.locator('text=Concluído').isVisible({ timeout: 500 }).catch(() => false);
    if (concluido) break;
  }
}

test('CT-37 — E2E Onda 1 → Onda 2 → Corporativo desbloqueado', async ({ page }) => {
  // ── Autenticação ──────────────────────────────────────────────────────────
  await loginViaTestEndpoint(page);
  const id = await criarProjetoViaApi(page, 'UAT CT-37 E2E');
  expect(id).toBeTruthy();

  // ── ETAPA 1: Onda 1 (Questionário SOLARIS) ────────────────────────────────
  await page.goto(`/projetos/${id}/questionario-solaris`);
  await expect(page.locator('text=Questionário SOLARIS')).toBeVisible({ timeout: 15000 });

  await responderQuestionario(page, 'Concluir Onda 1');

  // Verificar que Onda 1 foi concluída — Onda 2 deve aparecer no stepper
  await page.goto(`/projetos/${id}`);
  await expect(page.locator('text=Questionário por IA').first()).toBeVisible({ timeout: 15000 });

  // ── ETAPA 2: Onda 2 (Questionário por IA) ────────────────────────────────
  // Navegar diretamente para a rota de Onda 2
  await page.goto(`/projetos/${id}/questionario-iagen`);
  await expect(page.locator('text=Questionário por IA')).toBeVisible({ timeout: 15000 });

  await responderQuestionario(page, 'Concluir Onda 2');

  // ── ETAPA 3: Verificar Corporativo desbloqueado ───────────────────────────
  // BUG-UAT-03 fix: status deve ser 'diagnostico_corporativo', não 'onda2_iagen'
  await page.goto(`/projetos/${id}`);

  // O stepper deve mostrar Questionário Corporativo como próxima etapa desbloqueada
  await expect(
    page.locator('text=Questionário Corporativo').first()
  ).toBeVisible({ timeout: 15000 });

  // Deve haver um botão "Iniciar" para o Corporativo (segunda etapa disponível)
  const btnIniciarCorporativo = page.locator('button:has-text("Iniciar")').nth(1);
  await expect(btnIniciarCorporativo).toBeVisible({ timeout: 10000 });
});
