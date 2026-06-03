# PLANO DE TESTES — SOLARIS Gap Classification (TO-BE)

**Data:** 2026-06-01 · **Companion de:** `AS-IS-TO-BE-SOLARIS-GAP-CLASSIFICACAO-20260601.md` · **Padrão:** REGRA-ORQ-28 (Artefato 2 — Test contracts skeleton).

---

## 0. Estratégia de teste

| Camada | Padrão | Justificativa |
|---|---|---|
| **Função pura `classifyForGap`** | Unitário sem DB (`pnpm vitest run`) | Replica padrão `credito-presumido-eligibility.test.ts` (15 PASS hoje, zero DB) |
| **Integração G17 end-to-end** | `dbDescribe` skipIf-sem-DATABASE_URL | Lição CI-01 — não bloqueia CI sem DB; roda em ambiente com TiDB |
| **E2E UI** | Manus smoke pós-deploy | Lição #115 — script ≠ realidade UI |

---

## 1. Test contracts da função pura (PR-FIX F1+F2)

**Arquivo:** `server/lib/solaris-gap-analyzer.test.ts` (criar)
**Total:** 15 testes (1 por linha da matriz AS-IS seção 6.4)

```ts
// Esqueleto (it.todo até implementação):
import { describe, it, expect } from "vitest";
import { classifyForGap } from "./solaris-gap-analyzer";  // helper a ser extraído em F1

describe("classifyForGap — semântica TO-BE FEAT-SOL-UX-01 + meta 98%", () => {
  // INV-1: resposta_opcao é canônica quando presente
  describe("INV-1 — resposta_opcao prioriza sobre texto", () => {
    it.todo("L7  · opcao='sim'           + texto=''           → 'atendido' (sem gap)");
    it.todo("L8  · opcao='nao'           + texto=''           → 'nao_atendido' (gera gap — corrige BUG B1)");
    it.todo("L9  · opcao='nao_sei'       + texto=''           → 'nao_atendido' (conservador)");
    it.todo("L10 · opcao='nao_se_aplica' + texto=''           → 'nao_aplicavel' (sem gap)");
    it.todo("L11 · opcao='sim'           + texto='Sim.'       → 'atendido' (consistente)");
    it.todo("L12 · opcao='nao'           + texto='Não.'       → 'nao_atendido' (consistente)");
    it.todo("L13 · opcao='sim'           + texto='Não.'       → 'atendido' (radio prioriza — corrige BUG B2)");
    it.todo("L14 · opcao='nao'           + texto='Sim.'       → 'nao_atendido' (radio prioriza — corrige BUG B2 simétrico)");
    it.todo("L15 · opcao='nao_sei'       + texto='Sim, mas…'  → 'nao_atendido' (conservador prevalece)");
  });

  // INV-2: fallback texto-livre apenas quando resposta_opcao IS NULL
  describe("INV-2 — fallback texto-livre (back-compat pré-PR-C)", () => {
    it.todo("L1 · opcao=null + texto=''           → 'nao_iniciado' (não responde, não gap)");
    it.todo("L2 · opcao=null + texto='Sim.'       → 'atendido' (sem gap)");
    it.todo("L3 · opcao=null + texto='Não.'       → 'nao_atendido' (gera gap — preserva legado)");
    it.todo("L4 · opcao=null + texto='N/A.'       → 'nao_aplicavel' (sem gap — preserva legado)");
    it.todo("L5 · opcao=null + texto='não se aplica' → 'nao_aplicavel' (sem gap — corrige BUG B4)");
    it.todo("L6 · opcao=null + texto='não sei'    → 'nao_atendido' (gera gap — preserva legado conservador)");
  });

  // Sanity check do contrato Drizzle
  describe("Contrato com Drizzle row type", () => {
    it.todo("aceita row.resposta_opcao como string|null (não throws em null)");
    it.todo("aceita row.resposta como string|null (não throws em null)");
    it.todo("undefined resposta_opcao trata como null (Drizzle pode omitir campo)");
  });
});
```

### Asserts canônicos (preencher no PR-FIX)

```ts
// L8 — caso canônico que corrige BUG B1
expect(classifyForGap('nao', '')).toBe('nao_atendido');

// L13 — radio prioriza sobre texto (corrige BUG B2)
expect(classifyForGap('sim', 'não')).toBe('atendido');

// L5 — texto-livre não-bug "não se aplica" (corrige BUG B4)
expect(classifyForGap(null, 'não se aplica')).toBe('nao_aplicavel');

// L1 — sem resposta vs resposta negativa (semântica distinta)
expect(classifyForGap(null, '')).toBe('nao_iniciado');
expect(classifyForGap('nao', '')).toBe('nao_atendido');  // ≠ L1
```

---

## 2. Test de integração end-to-end (opcional na sprint inicial)

**Arquivo:** `server/integration/feat-sol-ux-01-gap-integration.test.ts` (futuro)

Padrão `dbDescribe` (`server/test-helpers.ts`):

```ts
import { dbDescribe } from "../test-helpers";
import { analyzeSolarisAnswers } from "../lib/solaris-gap-analyzer";
import { db } from "../db";
import { solarisAnswers, projectGapsV3 } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

dbDescribe("FEAT-SOL-UX-01 — G17 consome resposta_opcao (integração)", () => {
  it.todo("dado projeto teste com (resposta='', resposta_opcao='nao'), analyzer gera gap em project_gaps_v3");
  it.todo("dado projeto teste com (resposta='', resposta_opcao='sim'), analyzer NÃO gera gap");
  it.todo("dado projeto pré-PR-C (resposta='Não.', resposta_opcao=NULL), analyzer gera gap (back-compat)");
  it.todo("idempotência preservada — rodar 2× → mesmo conjunto de gaps");
});
```

**Justificativa de "opcional":** o contrato runtime já vai ser comprovado pelo DoD do Manus em produção (Q-DOD-1 do DB-SPEC). Test de integração é tech debt rastreado para sprint posterior, paralelo a TD-2 da audit v7.71.

---

## 3. Regressão dos testes existentes

| Teste existente | Risco de quebra | Ação |
|---|---|---|
| `server/integration/g17-solaris-gap.test.ts` (138 LOC) | Médio — testa a lógica `isNegative = startsWith('não')` que vai mudar | Atualizar para chamar `classifyForGap` ou marcar `it.todo` os asserts obsoletos |
| `server/lib/analyze-gaps-questionnaires.test.ts` (Z-11) | Baixo — Z-11 marcado para remoção (F3) | DELETE junto com `analyze-gaps-questionnaires.ts` se P.O. decidir F0 (a) |
| `server/lib/credito-presumido-eligibility.test.ts` (15 PASS) | **Zero** — função pura intocada (PR-B usou helper de coerção separado) | nenhuma ação |
| `server/lib/iagen-gap-analyzer.ts` testes (se houver) | Zero — paridade IAGEN é sprint futura | nenhuma ação |
| Snapshots `.snap` (3 arquivos) | Zero — nenhum fixa `resposta_opcao` (P7) | nenhuma ação |
| `briefing-fingerprint.ts` testes | Zero — lê `resposta` (text) para hash, não muda | nenhuma ação |

---

## 4. CI gate sugerido (opcional, fora do escopo cirúrgico)

```yaml
# .github/workflows/feat-sol-ux-01-gap-classification.yml (proposta)
name: FEAT-SOL-UX-01 Gap Classification Contract
on:
  pull_request:
    paths:
      - 'server/lib/solaris-gap-analyzer.ts'
      - 'server/lib/solaris-gap-analyzer.test.ts'

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - name: Run classifyForGap contract
        run: pnpm vitest run server/lib/solaris-gap-analyzer.test.ts
      - name: Assert no it.todo() remaining
        run: |
          if grep -E "^\s*it\.todo" server/lib/solaris-gap-analyzer.test.ts; then
            echo "ERROR: it.todo() should be converted to it() in PR-FIX implementation"
            exit 1
          fi
```

---

## 5. DoD do plano de testes

| # | Critério | Verificação |
|---|---|---|
| T-1 | 15 testes contracts implementados (sem `it.todo`) | `grep -c "^\s*it\." solaris-gap-analyzer.test.ts` ≥ 15 |
| T-2 | `pnpm vitest run server/lib/solaris-gap-analyzer.test.ts` → 15/15 PASS | local + CI |
| T-3 | `pnpm tsc --noEmit` → 0 erros (helper `classifyForGap` exported) | local |
| T-4 | `g17-solaris-gap.test.ts` ou atualizado ou pendingado | review manual |
| T-5 | Test de integração `dbDescribe` é tech debt declarado (TD futuro) | PR body |

---

## 6. Estimativa de esforço

| Etapa | LOC | Tempo Claude Code |
|---|---|---|
| F1 — Edit `solaris-gap-analyzer.ts` | ~30 | 15 min |
| F2 — `solaris-gap-analyzer.test.ts` (15 contracts) | ~80 | 30 min |
| F3 — DELETE Z-11 (se P.O. autorizar) | -342 (deletadas) | 5 min |
| F6 — ADR-NN sucessor de ADR-0027 | ~150 (docs) | 20 min |
| PR body + REGRA-ORQ-28 + CHECKLIST-VAL-01 | ~100 (docs) | 15 min |
| **Total se F0-F6** | ~+360 LOC líquidas | **~85 min Claude Code** |

**Manus:** Q-DOD-1..3 (smoke em produção) + cleanup F5 — ~30 min adicional após deploy.

---

## Vinculações

- AS-IS-TO-BE principal · DB-SPEC companion
- REGRA-ORQ-28 (Triade) — este é Artefato 2 (test contracts skeleton)
- REGRA-ORQ-31 (98%) — Q-DOD-1 prova cobertura
- REGRA-ORQ-CI-01 (CI verde) — gate proposto bloqueia PR sem testes verdes
- `credito-presumido-eligibility.test.ts` (15 PASS) — padrão a replicar
