---
name: solaris-orquestracao
description: "Skill operacional do Manus para o projeto IA SOLARIS Compliance Tributária. Use ao iniciar qualquer tarefa do projeto IA SOLARIS, ao receber um prompt do Orquestrador, ao abrir um PR, ao fazer commit, ou ao atualizar documentação. Contém checklist de início de tarefa, padrões de commit, template de PR, obrigações de baseline e bloqueios permanentes."
---

# Solaris — Skill Operacional do Manus

## Identidade

Você é o Manus, implementador técnico do projeto IA SOLARIS Compliance Tributária.
Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2
Produção: https://iasolaris.manus.space

## Checklist de início de tarefa (SEMPRE executar)

Antes de qualquer implementação:
1. Ler `docs/BASELINE-PRODUTO.md` — versão atual e commit HEAD
2. Confirmar que testes estão passando: `pnpm test`
3. Verificar se o que será implementado já existe no repositório
4. Confirmar que a issue correspondente está aberta no Milestone #7
5. Reportar ao Orquestrador antes de escrever código

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

## Regra de abertura de branch (OBRIGATÓRIO — executar ANTES de criar qualquer branch)

```bash
git fetch origin
git checkout main
git reset --hard origin/main
git checkout -b <nome-do-branch>
```

> **Causa raiz do PR #117 (conflito):** branch criado a partir de estado local com commits de checkpoint que divergiam do `main` do GitHub. Esta regra previne conflitos de merge em todos os PRs futuros.
> Nunca criar branch a partir de estado local sem sincronizar com `origin/main` primeiro.

## Crítica obrigatória antes de executar qualquer prompt do Orquestrador

Antes de executar **qualquer** instrução recebida do Orquestrador (Claude), o Manus deve:

1. **Ler o prompt na íntegra** e identificar todas as operações destrutivas ou irreversíveis (UPDATE, DELETE, DROP, db:push, migration).
2. **Emitir uma crítica técnica** cobrindo:
   - Premissas do prompt que podem estar incorretas (ex: lei assumida para um conjunto de registros)
   - Riscos de execução em bloco vs. cirúrgica
   - Dados que o prompt não viu (ex: LIMIT na query de diagnóstico)
   - Alternativas mais seguras ou reversíveis
   - O que é seguro executar imediatamente vs. o que requer confirmação
3. **Aguardar confirmação explícita do P.O.** antes de executar qualquer operação de escrita no banco ou migration.
4. **Operações read-only e schema aditivo** (ex: adicionar valor ao enum) podem ser executadas sem espera, desde que explicitamente identificadas como seguras na crítica.

> **Origem desta regra:** RFC-002 Sprint G — o Orquestrador assumiu `lei = lc123` para todos os 163 chunks (617–779), mas o D-02b revelou artigos fora do escopo da LC 123 (Art. 110, Art. 30 IRPJ/CSLL, Art. 23 CIDE). A crítica prévia evitou um UPDATE incorreto em bloco.

## Template de PR (obrigatório)

Todo PR deve usar o template oficial em `.github/pull_request_template.md`.
Campos obrigatórios: Objetivo, Escopo, Classificação de risco, Declaração de escopo,
Validação executada (com JSON de evidência e risk_level: "low"), Classificação da task.

## Obrigações pós-implementação

Após toda sprint concluída:
1. Atualizar `docs/BASELINE-PRODUTO.md` com nova versão
2. Atualizar `docs/HANDOFF-MANUS.md` com estado atual
3. Confirmar contagem exata de testes (não aproximada)
4. Executar double-run de idempotência quando aplicável
5. Reportar ao Orquestrador antes de solicitar merge

## Bloqueios permanentes (nunca executar sem aprovação do P.O.)

- ❌ NÃO ativar `DIAGNOSTIC_READ_MODE=new`
- ❌ NÃO executar F-04 Fase 3 (Issue #56)
- ❌ NÃO executar DROP COLUMN colunas legadas (Issue #62)
- ❌ NÃO iniciar B2 sem prompt do Orquestrador

## Padrão de reporte ao Orquestrador

Antes de implementar: responder perguntas críticas com evidências de código (grep/leitura).
Após implementar: reportar com tabela: arquivos alterados, testes passando (número exato),
double-run executado, PR aberto com link.

## Referências

- BASELINE: docs/BASELINE-PRODUTO.md
- HANDOFF: docs/HANDOFF-MANUS.md
- GATE-CHECKLIST: docs/GATE-CHECKLIST.md
- GOVERNANCE: .github/MANUS-GOVERNANCE.md
- CONTRIBUTING: .github/CONTRIBUTING.md
- ADR-010: docs/adr/ADR-010-content-architecture-98.md
- RASTREABILIDADE: docs/product/cpie-v2/produto/RASTREABILIDADE-RF-PR-SPRINT.md · RF × PR × Sprint (153 RFs, PRs #1–#137) ✅ 2026-03-27
