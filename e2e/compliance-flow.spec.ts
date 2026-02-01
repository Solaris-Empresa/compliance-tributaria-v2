import { test, expect } from '@playwright/test';

test.describe('Fluxo Completo de Compliance', () => {
  test('deve completar fluxo: criar projeto → selecionar ramos → responder questionários → gerar planos', async ({ page }) => {
    // 1. Acessar página inicial
    await page.goto('/');
    await expect(page).toHaveTitle(/IA SOLARIS|Compliance/i);

    // 2. Verificar se está autenticado ou fazer login
    const loginButton = page.getByRole('link', { name: /entrar|login/i });
    if (await loginButton.isVisible()) {
      console.log('Usuário não autenticado - teste requer autenticação prévia');
      test.skip();
    }

    // 3. Navegar para criação de projeto
    await page.click('text=Novo Projeto');
    await expect(page).toHaveURL(/\/projetos\/novo/);

    // 4. Preencher formulário de novo projeto
    const projectName = `Projeto Teste E2E ${Date.now()}`;
    await page.fill('input[name="name"]', projectName);
    
    // Selecionar cliente (assumindo que existe pelo menos um)
    const clientSelect = page.locator('select[name="clientId"]');
    if (await clientSelect.isVisible()) {
      await clientSelect.selectOption({ index: 1 });
    }

    // Criar projeto
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/projetos\/\d+/);

    // 5. Verificar que projeto foi criado
    await expect(page.locator('h1')).toContainText(projectName);

    // 6. Iniciar Questionário Corporativo
    await page.click('text=Iniciar Questionário Corporativo');
    await expect(page).toHaveURL(/\/questionario-corporativo/);

    // 7. Preencher Questionário Corporativo (campos básicos)
    await page.selectOption('select[name="taxRegime"]', 'Lucro Real');
    await page.selectOption('select[name="companySize"]', 'Média Empresa');
    await page.check('input[name="hasAccountingDept"]');
    await page.check('input[name="hasTaxDept"]');

    // Salvar e avançar
    await page.click('button:has-text("Salvar e Continuar")');
    
    // 8. Aguardar geração de perguntas dinâmicas (Fase 2)
    await page.waitForSelector('text=Perguntas Geradas', { timeout: 30000 });

    // Responder primeira pergunta
    const firstQuestion = page.locator('textarea').first();
    if (await firstQuestion.isVisible()) {
      await firstQuestion.fill('Resposta de teste para validação E2E');
    }

    // Concluir questionário
    await page.click('button:has-text("Concluir Questionário")');

    // 9. Selecionar Ramos de Atividade
    await page.click('text=Selecionar Ramos');
    await page.waitForSelector('text=Ramos de Atividade');

    // Selecionar primeiro ramo disponível
    const firstBranch = page.locator('input[type="checkbox"]').first();
    await firstBranch.check();
    await page.click('button:has-text("Salvar Seleção")');

    // 10. Responder Questionário por Ramo
    await page.click('text=Questionários por Ramo');
    await page.waitForSelector('text=Gerar Questionário');
    
    // Gerar questionário para o ramo
    await page.click('button:has-text("Gerar Questionário")');
    await page.waitForSelector('textarea', { timeout: 30000 });

    // Responder primeira pergunta do ramo
    await page.locator('textarea').first().fill('Resposta específica do ramo');
    await page.click('button:has-text("Próxima")');

    // 11. Gerar Plano de Ação
    await page.click('text=Gerar Plano de Ação');
    await page.waitForSelector('text=Plano de Ação', { timeout: 60000 });

    // Verificar que plano foi gerado
    await expect(page.locator('text=Tarefas')).toBeVisible();

    // 12. Verificar Dashboard Executivo
    await page.click('text=Painel de Indicadores Executivo');
    await expect(page).toHaveURL(/\/painel-indicadores/);

    // Verificar que métricas estão visíveis
    await expect(page.locator('text=Total de Projetos')).toBeVisible();
    await expect(page.locator('text=Questionários Corporativos')).toBeVisible();

    // 13. Verificar notificações em tempo real
    const notificationBell = page.locator('[aria-label="Notificações"]').or(page.locator('svg').filter({ hasText: 'Bell' }));
    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await expect(page.locator('text=Notificações')).toBeVisible();
    }

    console.log('✅ Fluxo E2E completo executado com sucesso!');
  });

  test('deve validar Dashboard Executivo com métricas', async ({ page }) => {
    await page.goto('/painel-indicadores');

    // Verificar cards de métricas
    await expect(page.locator('text=Total de Projetos')).toBeVisible();
    await expect(page.locator('text=Total de Tarefas')).toBeVisible();

    // Verificar que gráficos estão renderizados
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();

    // Selecionar um projeto específico
    const projectSelect = page.locator('select');
    if (await projectSelect.isVisible()) {
      const optionCount = await projectSelect.locator('option').count();
      if (optionCount > 1) {
        await projectSelect.selectOption({ index: 1 });
        
        // Aguardar atualização das métricas
        await page.waitForTimeout(1000);
        
        // Verificar seções específicas do projeto
        await expect(page.locator('text=Prazos Críticos')).toBeVisible();
        await expect(page.locator('text=Tarefas Atrasadas')).toBeVisible();
      }
    }
  });

  test('deve validar sistema de notificações WebSocket', async ({ page }) => {
    await page.goto('/');

    // Aguardar conexão WebSocket
    await page.waitForTimeout(2000);

    // Verificar indicador de conexão
    const connectionIndicator = page.locator('[class*="bg-green"]').filter({ hasText: '' });
    
    // Abrir painel de notificações
    const bellIcon = page.locator('button').filter({ has: page.locator('svg') }).first();
    await bellIcon.click();

    // Verificar que painel abre
    await expect(page.locator('text=Notificações')).toBeVisible();

    // Verificar estrutura do painel
    await expect(page.locator('button:has-text("Marcar todas como lidas")')).toBeVisible();
  });
});
