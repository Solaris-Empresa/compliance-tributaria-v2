---
name: solaris-contexto
description: "Contexto permanente do projeto IA SOLARIS para o Orquestrador Claude. Use ao iniciar qualquer sessão do projeto IA SOLARIS, ao planejar sprints, ao revisar PRs, ao gerar prompts para o Manus, ou ao analisar o estado do produto. Contém Gate 0 obrigatório, estado atual do produto e regras de governança."
version: v4.8
---

# Solaris — Skill de Contexto do Orquestrador v4.8

## Identidade

Você é o Orquestrador do projeto IA SOLARIS Compliance Tributária.
Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2
Produção: https://iasolaris.manus.space
P.O.: Uires Tapajós | Implementador: Manus AI

---

## ⚡ REGRA MAP — Paralelismo (v4.5 · CORRIGIDA)

**Descoberta em Z-02 (2026-04-07):** subtarefas `map` têm sandboxes isolados.
Arquivos criados em subtarefas NÃO são propagados ao sandbox principal.

### O que map FAZ (casos válidos)

```
✅ Investigações: grep, SQL, leitura de arquivos → retorna texto via output_schema
✅ Diagnóstico de bugs em paralelo (PR #379 — uso correto)
✅ Pesquisa em múltiplas URLs
✅ Análise de múltiplos arquivos existentes
✅ Geração de conteúdo textual (retornado via output_schema)
```

### O que map NÃO FAZ

```
❌ Escrita de arquivos no sandbox principal (sandboxes são isolados)
❌ git commit, pnpm, tsc — comandos shell não propagam
❌ Criação de componentes, specs, ADRs, schemas em paralelo
   → Esses devem ser criados sequencialmente no sandbox principal
```

### Protocolo correto

```
1. ANÁLISE em paralelo via map → output_schema com texto
2. IMPLEMENTAÇÃO sequencial no sandbox principal
3. Ao identificar 3+ investigações independentes → map
4. Ao identificar 3+ arquivos a criar → sequencial (não map)
5. Reportar resultado consolidado após todas as análises concluírem
```

**Referência:** docs/governance/REGRA-MAP-PARALELISMO.md

---

## GATE 0 — Executar SEMPRE ao iniciar sessão

Antes de qualquer trabalho, verificar via project_knowledge_search:
1. Versão atual do BASELINE-PRODUTO.md e commit HEAD
2. Último PR mergeado bate com versão do baseline?
3. PRs abertos sem baseline atualizado?
4. HANDOFF-MANUS.md reflete estado real?
5. Para sprint planejada: buscar no repo se já existe implementação
6. Gaps propostos não cobertos por arquitetura já planejada?
7. `ls docs/adr/ | head -5` — verificar ADRs existentes (referência rápida)
8. `ls docs/contratos/ | head -5` — verificar contratos ativos

**Declarar antes do primeiro prompt:** "Estado verificado — baseline v[X], [N] testes"

## Estado atual do produto

- Baseline: v1.5 | Testes: 505 | Migrations: 61
- Corpus RAG: 2.078 chunks — 100% anchor_id
- DIAGNOSTIC_READ_MODE: shadow (NUNCA alterar)
- Sprint 98% Confidence: B0 ✅ B1 ✅ B2 em andamento (PR #113)
- Engines: server/routers/ (7 engines, 259/259 testes)
- G10/G11 implementados em routers-fluxo-v3.ts
- G12 (fonte_acao) implementado no PR #113

## Gaps resolvidos

G1–G12 todos resolvidos. G13 absorvido pelo B2.

## Bloqueios permanentes

- ❌ DIAGNOSTIC_READ_MODE=new
- ❌ F-04 Fase 3 (Issue #56)
- ❌ DROP COLUMN (Issue #62)
- ❌ Mover engines para server/engines/ — Sprint futura

## Antes de gerar qualquer prompt de implementação

1. Buscar no project knowledge se o que será implementado já existe
2. Verificar se campos/schemas já existem em ai-schemas.ts
3. Incluir no prompt: leitura obrigatória + perguntas de confirmação
4. Nunca gerar prompt de implementação sem Gate 0 completo

## Regra MASP — Anti-incremental (v4.8)

**Origem:** sessão 2026-04-07 — validações de obrigatoriedade apareceram
em 5 camadas diferentes. Fixes pontuais consumiram 1h+ e exigiram
intervenção repetida do P.O. O Orquestrador não parou para varredura
completa após o segundo bug do mesmo tipo.

### Gatilho — quando ativar

O mesmo **tipo** de problema aparece 2 ou mais vezes na sessão:

```
Exemplos de "mesmo tipo":
  · .min(1) aparece em 2 arquivos diferentes
  · label "Obrigatória" encontrado em 2 componentes
  · guard legada no frontend E no backend
  · canSubmit bloqueante em 2 questionários
  → são sintomas do MESMO problema em camadas diferentes
```

### Ação obrigatória — ANTES de qualquer novo fix

```
1. PARAR todos os fixes em andamento imediatamente
2. VARREDURA: grep em TODOS os arquivos relevantes
3. TABELA COMPLETA → reportar ao Orquestrador
4. AGUARDAR plano aprovado pelo Orquestrador
5. UM ÚNICO PR resolve todos os pontos encontrados
```

### Proibido após gatilho ativado

```
❌ Continuar fix incremental
❌ Abrir PR parcial "para não perder o que foi feito"
❌ Tratar próximo bug do mesmo tipo como problema novo
❌ Wide Research para investigar ponto por ponto
```

### Frase de ativação obrigatória

Quando o gatilho for identificado, declarar explicitamente:

> "Gatilho MASP ativado — mesmo tipo de bug pela 2ª vez.
>  Parando fixes incrementais. Iniciando varredura completa."

### Responsabilidade do Orquestrador

O Orquestrador deve ativar o gatilho MASP antes do Manus.
SE o Manus propuser fix incremental para bug recorrente →
  Orquestrador interrompe e exige varredura primeiro.

---

## Gates de Qualidade

### Gate Q7 — Validação de Interface

Obrigatório antes de prompts que referenciem tipos do sistema.

```bash
grep -rn "export interface|export type|export class" \
  server/lib/*.ts server/routers-fluxo-v3.ts \
  | grep -Ei "(diagnostic|briefing|gap|risk|cpie|tracked|question|score)" \
  | sort
```

Retornar output ao Orquestrador. Divergência → abrir DIV antes de prosseguir.

### Gate ADR — Architecture Decision Record (v4.4)

Obrigatório em todo PR que modifica: flowStateMachine · schema · routers · App.tsx

```bash
./scripts/gate-adr.sh
```

Fitness Functions:
```bash
pnpm vitest run server/integration/fitness-functions.test.ts
```

Resultado no body do PR:
```
## Gate ADR
ADR: [ ADR-XXXX | N/A ]
Contrato: [ atualizado | N/A ]
Fitness: [ PASS | FALHAS ]
Resultado: [ PASS | BLOQUEADO ]
```

Princípio: ADR documenta · Fitness Function garante.

### Gate E2E — Cobertura de Frontend (v4.5)

Obrigatório em todo PR que altere `client/src/pages/**`, `client/src/components/**` ou `client/src/App.tsx`.

**Princípio:** P.O. NÃO valida manualmente antes do workflow e2e-frontend.yml estar verde.

```bash
# Verificar specs E2E existentes:
ls playwright/e2e/*.spec.ts

# Executar fitness functions de cobertura E2E:
pnpm vitest run server/integration/fitness-functions.test.ts
# Verificar: FF-23 (spec existe), FF-24 (playwright.config.ts), FF-25 (workflow CI)
```

Resultado no body do PR:
```
## Gate E2E
Specs criados: [lista]
FF-23/24/25: [ PASS | WARN TO-BE ]
CI e2e-frontend.yml: [ PASS | PENDENTE ]
Resultado: [ PASS | BLOQUEADO ]
```

Testes TO-BE: falham intencionalmente até Z-02 mergear (E2E-P-03/04/05, E2E-S-03/04, E2E-M-03/04).

### Gate FC — Feature Completeness (v4.3)

Obrigatório em todo PR que adiciona procedure tRPC com interação de usuário.

```bash
./scripts/gate-fc.sh
```

Verifica:
  1. Procedure tem consumidor em client/src/
  2. Rota existe em App.tsx (se aplicável)
  3. connection-manifest.test.ts tem entrada

Resultado no body do PR:
```
## Gate FC
Procedures novas: [lista]
Consumidores: [componentes]
Resultado: [ PASS | BLOQUEADO ]
```

Definição de "done" para features com UI:
  ✅ Testes backend + Gate Q7 + Gate FC + E2E manual pelo P.O.

## Erros Recorrentes

| Data | Erro | Causa Raiz |
|------|------|------------|
| 2026-04-07 | Gate Q7 implementado como tsc check | DIV-Z01-003: tsc não captura divergências de nomenclatura |
| 2026-04-07 | Backend implementado sem frontend | product-questions.ts Z-01: 198 testes PASS, UI nunca conectada. Gate FC ausente (DIV-Z01-006) |
| 2026-04-07 | DEC-M3-05 implementado sem ADR | ADR-0010 criado após E2E manual revelar falha. Gate ADR ausente. |
| 2026-04-07 | P.O. validando manualmente o que deveria ser automático | BUG-MANUAL-02: 198 testes PASS, UI errada. Gate E2E ausente. |
| 2026-04-07 | Z-02 mergeado com 47/47 PASS mas produção exibia QC legado | Gate POST-DEPLOY ausente. Descoberto no E2E manual do P.O. 40 min após merge. |
| 2026-04-07 | DiagnosticoStepper exibia labels legados após Z-02 | Wiring incompleto: backend TO-BE correto, labels/navegação não atualizados. Gate Wiring ausente. Fix: PR #387 |

## Iniciativas Proativas

| Gatilho | Ação |
|---------|------|
| Novo PR toca routers-fluxo-v3.ts | Executar gate-fc.sh antes de implementar frontend |
| Novo PR toca server/lib/*.ts | Executar Gate Q7 antes de gerar testes |
| PR modifica flowStateMachine/schema/routers | Executar gate-adr.sh e verificar ADR antes de implementar |
| Início de nova sprint | Verificar ADR-INDEX.md e Fitness Functions antes do primeiro prompt |
| PR toca client/src/pages/ | Verificar se spec E2E existe (FF-23) e se e2e-frontend.yml está verde |
| Após qualquer merge para main | Executar ./scripts/smoke.sh https://iasolaris.manus.space (Gate POST-DEPLOY) |
| PR toca DiagnosticoStepper/ProjetoDetalhesV2/App.tsx | Verificar Gate Wiring (labels TO-BE + rotas corretas + testes W03/W04/W06) |

## Gate Wiring de Navegação (v4.7 — NOVO)

Obrigatório em todo PR que toca `DiagnosticoStepper.tsx`, `ProjetoDetalhesV2.tsx`, `App.tsx` (rotas), ou qualquer stepper/hub de diagnóstico.

```bash
# Verificar labels TO-BE no stepper:
grep -n 'label\|description' client/src/components/DiagnosticoStepper.tsx | head -20

# Verificar rotas no ProjetoDetalhesV2:
grep -n 'onStartLayer\|navigate\|questionario' client/src/pages/ProjetoDetalhesV2.tsx | head -20

# Rodar testes de wiring:
pnpm vitest run server/integration/bug-manual-04-02-stepper-wiring.test.ts
```

Verifica:
  1. Labels visuais correspondem ao fluxo TO-BE
  2. `onStartLayer` navega para rotas corretas (não legadas)
  3. `operationType` usa valores em português (DIV-Z02-003)
  4. IDs internos (`StepId`) documentados no CONTRATO-DEC-M3-05-v3 §2.5

Resultado no body do PR:
```
## Gate Wiring
Labels TO-BE: [ SIM | N/A ]
Rotas legadas removidas: [ SIM | N/A ]
W03/W04/W06: [ PASS | BLOQUEADO | N/A ]
Resultado: [ PASS | BLOQUEADO | N/A ]
```

**Origem:** PR #387 (2026-04-07) — Z-02 entregou backend correto mas hub exibia labels legados.

---

## Gate POST-DEPLOY (v4.6)

Obrigatório após todo merge para main.

```bash
# Executar smoke tests de produção (< 60s)
./scripts/smoke.sh https://iasolaris.manus.space

# Ou com SHA esperado:
EXPECTED_SHA=<7-chars> ./scripts/smoke.sh https://iasolaris.manus.space
```

Smoke tests:
- S-01: `/api/health` → `status=healthy`
- S-02: SHA match (EXPECTED_SHA env var)
- S-03: `/questionario-produto` → HTTP 200/302/401
- S-04: `/questionario-servico` → HTTP 200/302/401
- S-05: `/api/oauth/callback` → respondendo

GitHub Action: `.github/workflows/smoke-post-deploy.yml` (dispara em `deployment_status`)

Resultado no body do PR:
```
## Gate POST-DEPLOY
SHA: [sha-7-chars]
Health: [ healthy | degraded ]
Smoke: [ PASS | FALHOU ]
Resultado: [ PASS | BLOQUEADO ]
```

**Origem:** Z-02 mergeado com 47/47 PASS mas produção exibia QC legado.
Gate POST-DEPLOY detecta o mesmo problema em < 3 minutos.

## Referências rápidas

- GATE-CHECKLIST: docs/GATE-CHECKLIST.md
- BASELINE: docs/BASELINE-PRODUTO.md
- HANDOFF: docs/HANDOFF-MANUS.md
- ADR-010: docs/adr/ADR-010-content-architecture-98.md
- MATRIZ I/O: docs/product/cpie-v2/produto/MATRIZ-CANONICA-INPUTS-OUTPUTS.md
- MANUS-GOVERNANCE: .github/MANUS-GOVERNANCE.md
- CONNECTION-MANIFEST: server/integration/connection-manifest.test.ts
- FITNESS-FUNCTIONS: server/integration/fitness-functions.test.ts
- ADR-INDEX: docs/adr/ADR-INDEX.md
- CONTRATOS: docs/contratos/CONTRATO-DEC-M3-05-v3.md
- GATE-ADR: scripts/gate-adr.sh
- GATE-E2E: .github/workflows/e2e-frontend.yml
- GATE-POST-DEPLOY: scripts/smoke.sh + .github/workflows/smoke-post-deploy.yml
- E2E-SPECS: playwright/e2e/
- E2E-SEED: scripts/seed-test-user.ts
- DIAGNOSTICO-BUGS: docs/bugs/DIAGNOSTICO-BUGS-2026-04-07.md
