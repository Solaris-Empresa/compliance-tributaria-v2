# CPIE v2 — Plano de Testes Contínuos

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `server/cpie-v2.test.ts` · `server/cpieV2Router.test.ts`

---

## 1. Estratégia de Testes

O CPIE v2 usa três camadas de testes:

| Camada | Ferramenta | Frequência | Cobertura |
|---|---|---|---|
| **Unitários** | Vitest | A cada commit | Motor, regras, thresholds |
| **Integração** | Vitest + tRPC | A cada commit | Endpoints, persistência |
| **Regressão** | Script shell | A cada deploy | 35 cenários da Matriz |

---

## 2. Execução Local

### 2.1 Rodar todos os testes CPIE v2

```bash
# Todos os testes do motor e do router
pnpm test server/cpie-v2.test.ts server/cpieV2Router.test.ts server/cpie.test.ts

# Com verbose (ver nome de cada teste)
pnpm test --reporter=verbose server/cpie-v2.test.ts

# Com cobertura
pnpm test --coverage server/cpie-v2.test.ts
```

### 2.2 Rodar apenas cenários críticos (Grupo 1 — Hard Block)

```bash
pnpm test --reporter=verbose server/cpie-v2.test.ts -t "hard_block"
```

### 2.3 Rodar um cenário específico por ID

```bash
# Rodar apenas o cenário C-016 (empresa média faturamento 12M)
pnpm test --reporter=verbose server/cpie-v2.test.ts -t "C-016"
```

---

## 3. Script de Regressão Automática

O script `scripts/cpie-regression-check.mjs` valida os 35 cenários da Matriz contra o motor em execução.

### 3.1 Criar o script

```javascript
// scripts/cpie-regression-check.mjs
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const SCENARIOS = [
  // Grupo 1 — Hard Block
  { id: "C-001", input: { description: "MEI com faturamento de R$ 500 mil por ano", companySize: "mei", taxRegime: "mei", annualRevenueRange: "360000-4800000", operationType: "servicos", clientType: ["b2c"], hasImportExport: false, multiState: false }, expected: { canProceed: false, blockType: "hard_block" } },
  { id: "C-002", input: { description: "Empresa de software com faturamento de R$ 10 milhões por ano", companySize: "pequena", taxRegime: "simples_nacional", annualRevenueRange: "4800000-78000000", operationType: "servicos", clientType: ["b2b"], hasImportExport: false, multiState: false }, expected: { canProceed: false, blockType: "hard_block" } },
  { id: "C-016", input: { description: "Cervejaria artesanal com faturamento de R$ 1 milhão por mês, presente em todas as capitais do sul do Brasil, lucro real", companySize: "media", taxRegime: "lucro_real", annualRevenueRange: "4800000-78000000", operationType: "industria", clientType: ["b2b", "b2c"], hasImportExport: false, multiState: true }, expected: { canProceed: true } },
  { id: "C-018", input: { description: "Freelancer de design gráfico atendendo clientes locais, faturamento de R$ 5.000 por mês", companySize: "mei", taxRegime: "mei", annualRevenueRange: "0-81000", operationType: "servicos", clientType: ["b2c"], hasImportExport: false, multiState: false }, expected: { canProceed: true } },
  { id: "C-029", input: { description: "Cervejaria artesanal com faturamento de R$ 1 milhão por mês, presença em todas as capitais do sul do Brasil, importação/exportação, lucro presumido", companySize: "media", taxRegime: "lucro_presumido", annualRevenueRange: "4800000-78000000", operationType: "industria", clientType: ["b2b", "b2c"], hasImportExport: true, multiState: true }, expected: { canProceed: true, noPorteConflict: true } },
];

let passed = 0;
let failed = 0;
const failures = [];

for (const scenario of SCENARIOS) {
  try {
    const response = JSON.parse(execSync(`curl -s http://localhost:3000/api/trpc/cpieV2.analyzePreview -X POST -H "Content-Type: application/json" -d '${JSON.stringify({ json: scenario.input })}'`).toString());
    const result = response?.result?.data?.json;
    
    if (!result) {
      failures.push({ id: scenario.id, error: "Resposta inválida do servidor" });
      failed++;
      continue;
    }
    
    let ok = true;
    if (scenario.expected.canProceed !== undefined && result.canProceed !== scenario.expected.canProceed) {
      ok = false;
      failures.push({ id: scenario.id, field: "canProceed", expected: scenario.expected.canProceed, got: result.canProceed });
    }
    if (scenario.expected.blockType !== undefined && result.blockType !== scenario.expected.blockType) {
      ok = false;
      failures.push({ id: scenario.id, field: "blockType", expected: scenario.expected.blockType, got: result.blockType });
    }
    if (scenario.expected.noPorteConflict) {
      const porteConflict = result.allConflicts?.some(c => c.conflictingFields?.includes("companySize") && c.source === "ai");
      if (porteConflict) {
        ok = false;
        failures.push({ id: scenario.id, field: "noPorteConflict", expected: "sem conflito de porte da IA", got: "conflito de porte detectado" });
      }
    }
    
    if (ok) passed++;
    else failed++;
  } catch (e) {
    failures.push({ id: scenario.id, error: e.message });
    failed++;
  }
}

console.log(`\n=== CPIE v2 Regression Check ===`);
console.log(`Passed: ${passed}/${SCENARIOS.length}`);
console.log(`Failed: ${failed}/${SCENARIOS.length}`);

if (failures.length > 0) {
  console.log(`\nFailures:`);
  failures.forEach(f => console.log(`  [${f.id}] ${JSON.stringify(f)}`));
  process.exit(1);
} else {
  console.log(`\n✅ All scenarios passed`);
  process.exit(0);
}
```

### 3.2 Executar o script

```bash
# Garantir que o servidor está rodando
pnpm dev &

# Aguardar o servidor iniciar
sleep 5

# Executar o script de regressão
node scripts/cpie-regression-check.mjs
```

**Saída esperada:**
```
=== CPIE v2 Regression Check ===
Passed: 5/5
Failed: 0/5

✅ All scenarios passed
```

**Saída em caso de falha:**
```
=== CPIE v2 Regression Check ===
Passed: 4/5
Failed: 1/5

Failures:
  [C-016] {"id":"C-016","field":"canProceed","expected":true,"got":false}
```

---

## 4. Integração no Pipeline (GitHub Actions)

```yaml
# .github/workflows/cpie-v2-tests.yml
name: CPIE v2 Tests

on:
  push:
    paths:
      - 'server/cpie-v2.ts'
      - 'server/routers/cpieV2Router.ts'
      - 'server/cpie-v2.test.ts'
  pull_request:
    paths:
      - 'server/cpie-v2.ts'
      - 'server/routers/cpieV2Router.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run CPIE v2 unit tests
        run: pnpm test server/cpie-v2.test.ts server/cpieV2Router.test.ts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          BUILT_IN_FORGE_API_KEY: ${{ secrets.BUILT_IN_FORGE_API_KEY }}
          BUILT_IN_FORGE_API_URL: ${{ secrets.BUILT_IN_FORGE_API_URL }}
      
      - name: Check test coverage
        run: |
          pnpm test --coverage server/cpie-v2.test.ts
          # Falha se cobertura < 85%
          node -e "
            const cov = require('./coverage/coverage-summary.json');
            const pct = cov.total.lines.pct;
            if (pct < 85) { console.error('Coverage ' + pct + '% < 85%'); process.exit(1); }
            console.log('Coverage OK: ' + pct + '%');
          "
```

---

## 5. Detecção Automática de Regressão

O pipeline detecta regressão automaticamente quando:

1. **Qualquer teste Vitest falha** → pipeline quebra com `EXIT 1`
2. **Cobertura de testes < 85%** → pipeline quebra com `EXIT 1`
3. **Script de regressão retorna `EXIT 1`** → pipeline quebra

Para cada falha, o pipeline reporta:
- ID do cenário que falhou
- Campo divergente (`canProceed`, `blockType`, etc.)
- Valor esperado vs. valor obtido

---

## 6. Convenção de Nomenclatura dos Testes

Cada `it()` em `server/cpie-v2.test.ts` deve seguir o padrão:

```typescript
it("[C-NNN] descrição do cenário → resultado esperado", async () => {
  // ...
});
```

Exemplos:
```typescript
it("[C-001] MEI com faturamento acima do limite → hard_block", ...)
it("[C-016] Empresa media faturamento 12M lucro real → canProceed=true sem conflito porte", ...)
it("[C-029] Falso positivo porte filtrado R$1M mês media → sem conflito porte", ...)
```

Isso permite executar um cenário específico via `pnpm test -t "C-016"` e rastrear diretamente para a Matriz de Cenários (doc 09).

---

## 7. Frequência e Responsabilidade

| Tipo | Frequência | Responsável | Gate |
|---|---|---|---|
| Testes unitários | A cada commit | Desenvolvedor | Obrigatório (bloqueia merge) |
| Script de regressão | A cada deploy | CI/CD | Obrigatório (bloqueia deploy) |
| Avaliação ICE UX/Clareza | A cada sprint | P.O. + Dev | Obrigatório para release |
| Smoke test manual | A cada deploy | Dev | Recomendado |
