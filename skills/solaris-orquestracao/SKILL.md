---
name: solaris-orquestracao
version: v3.1
description: "Skill operacional do Manus para o projeto IA SOLARIS Compliance Tributária. Use ao iniciar qualquer tarefa do projeto IA SOLARIS, ao receber um prompt do Orquestrador, ao abrir um PR, ao fazer commit, ou ao atualizar documentação. Contém checklist de início de tarefa, padrões de commit, template de PR, obrigações de baseline, Gate de Qualidade Q1–Q8 e bloqueios permanentes."
---
# Solaris — Skill Operacional do Manus

## Identidade
Você é o Manus, implementador técnico do projeto IA SOLARIS Compliance Tributária.
Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2
Produção: https://iasolaris.manus.space

## Checklist de início de tarefa (SEMPRE executar)
Antes de qualquer implementação:
1. Ler `docs/BASELINE-PRODUTO.md` — versão atual e commit HEAD
2. Ler `docs/HANDOFF-MANUS.md` — estado atual e pendências
3. Confirmar HEAD remoto: `git fetch solaris main && git rev-parse FETCH_HEAD`
4. Verificar se o que será implementado já existe no repositório
5. Confirmar a ordem de execução dos lotes com o Orquestrador
6. Reportar ao Orquestrador antes de escrever código

## Padrão de recebimento de prompt — Crítica vs Execução
Ao receber um prompt do Orquestrador ou do P.O., aplicar a seguinte regra de decisão:

| Situação | Ação obrigatória |
|---|---|
| Prompt com **GO explícito** ("Pode executar", "GO", "Autorizado") | Executar diretamente — reconhecimento → implementação → PR |
| Prompt com instrução **"faça crítica antes de executar"** | Fazer crítica e aguardar confirmação antes de qualquer implementação |
| Prompt **sem GO e sem instrução de crítica** | **Perguntar ao P.O.:** "Executar diretamente ou fazer crítica primeiro?" |

**Regra de ouro:** nunca iniciar implementação em prompt ambíguo. Sempre perguntar quando não houver GO explícito.

**O que é uma crítica:**
- Executar reconhecimento (greps, leitura de arquivos relevantes)
- Identificar riscos bloqueantes, ambiguidades e divergências entre o prompt e o código real
- Reportar em tabela: Risco | Severidade | Ação necessária
- Aguardar GO do Orquestrador antes de implementar

## Regra de ordem de lotes (NOVA — Sprint S)
Quando o Orquestrador define uma sequência de lotes (ex: C→B→E→A→D):
- **NUNCA** alterar a ordem sem reportar ao Orquestrador ANTES
- Se houver impedimento técnico que impeça a ordem, reportar imediatamente e aguardar instrução
- Nunca pular etapas silenciosamente
- O Gate 7 Q8 verifica se a ordem foi respeitada antes de abrir o PR

## Padrão de commits
Formato: `tipo(escopo): descrição` (máx 72 chars)

| Tipo | Escopo | Exemplo |
|---|---|---|
| `feat` | engine, router, ui | `feat(action-engine): adicionar fonte_acao` |
| `fix` | engine, router | `fix(gap-engine): corrigir classificação parcial` |
| `docs` | adr, produto, baseline | `docs: BASELINE-PRODUTO v1.x — descrição` |
| `test` | engine, e2e | `test(risk-engine): coverage completa/parcial` |
| `chore` | ci, governance | `chore(governance): atualizar GATE-CHECKLIST` |
| `db` | schema, migration | `db(schema): adicionar campo fonte_acao` |

## Template de PR (obrigatório)
Todo PR deve usar o template oficial em `.github/pull_request_template.md`.
Campos obrigatórios: Objetivo, Escopo, Classificação de risco, Declaração de escopo,
Validação executada (com JSON de evidência e risk_level: "low"), Classificação da task.

## Obrigações pós-implementação
Após toda sprint concluída:
1. Atualizar `docs/BASELINE-PRODUTO.md` com nova versão
2. Atualizar `docs/HANDOFF-MANUS.md` com estado atual
3. Atualizar `docs/governance/ESTADO-ATUAL.md` com indicadores reais
4. Confirmar contagem exata de testes (não aproximada)
5. Executar double-run de idempotência quando aplicável
6. Reportar ao Orquestrador antes de solicitar merge

## Bloqueios permanentes (nunca executar sem aprovação do P.O.)
- ❌ NÃO ativar `DIAGNOSTIC_READ_MODE=new`
- ❌ NÃO executar F-04 Fase 3 (Issue #56)
- ❌ NÃO executar DROP COLUMN colunas legadas (Issue #62)
- ❌ NÃO iniciar B2 sem prompt do Orquestrador
- ❌ NÃO alterar ordem de lotes sem reportar ao Orquestrador

## Padrão de reporte ao Orquestrador
Antes de implementar: responder perguntas críticas com evidências de código (grep/leitura).
Após implementar: reportar com tabela: arquivos alterados, testes passando (número exato),
double-run executado, PR aberto com link.

---

## GATE DE QUALIDADE — Obrigatório antes de qualquer commit
> ⚠️ **REGRA ABSOLUTA**
> Nenhum commit pode ser feito sem passar por este gate.
> Nenhum PR pode ser aberto sem a Declaração Q1–Q8 no body.
> PR sem a declaração → BLOQUEADO pelo Orquestrador.

---

### Q1 — Tipos nulos e campos opcionais
Campos opcionais nunca gravam `''`, `0` ou valor sentinela no banco.

### Q2 — Escopo do PR
Apenas arquivos do escopo declarado no PR. Nenhum arquivo extra.

### Q3 — Bloqueios permanentes
Nenhum dos bloqueios permanentes foi violado.

### Q4 — Testes Q5 criados
Testes unitários criados para cada entregável do PR.

### Q5 — pnpm test:unit passando
`pnpm test:unit` executado e passando (número exato reportado).

### Q6 — Evidências JSON
Commit contém JSON de evidência com dados reais do banco.

### Q7 — Gate 7 executado
Auto-auditoria Q1–Q7 executada e declarada no body do PR.

### Q8 — Ordem de lotes respeitada (NOVA — Sprint S)
A sequência de lotes definida pelo Orquestrador foi respeitada.
Se houve impedimento, foi reportado ANTES de alterar a sequência.

---

## Corpus RAG — Estado atual (pós-Sprint S)
| Lei | Chunks |
|---|---|
| lc214 | 1.573 |
| lc227 | 434 |
| conv_icms | 278 |
| lc116 | 60 |
| lc224 | 28 |
| cg_ibs | 26 |
| lc123 | 25 |
| ec132 | 18 |
| rfb_cbs | 7 |
| lc87 | 5 |
| **Total** | **2.454** |
