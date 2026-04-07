// playwright.config.ts — Gate E2E v4.5 · ADR-0010 · DEC-M3-05
// Baseado em: lackeyjb/playwright-skill (1.5k ⭐) + microsoft/playwright-mcp
// Princípio: testes E2E automatizados protegem o P.O. de validar manualmente
// o que deve ser verificado automaticamente. P.O. valida julgamento, não cliques.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Inclui ambos os diretórios: specs legados (tests/e2e) + specs Z-02 (playwright/e2e)
  testDir: '.',
  testMatch: ['tests/e2e/**/*.spec.ts', 'playwright/e2e/**/*.spec.ts'],
  timeout:   60_000,          // 60s por teste (fluxo completo)
  retries:   process.env.CI ? 2 : 0,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers:   process.env.CI ? 1 : 2,
  reporter:  [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-results.json' }],
  ],

  use: {
    baseURL:       process.env.PLAYWRIGHT_BASE_URL ?? process.env.E2E_BASE_URL ?? 'https://iasolaris.manus.space',
    headless:      true,
    screenshot:    'only-on-failure',
    video:         'retain-on-failure',
    trace:         'retain-on-failure',
    // data-testid como seletor padrão (conforme contrato DEC-M3-05 Parte 5)
    testIdAttribute: 'data-testid',
  },

  projects: [
    {
      name:  'chromium',
      use:   { ...devices['Desktop Chrome'] },
    },
  ],
});
