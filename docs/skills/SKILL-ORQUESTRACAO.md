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

## Estratégia de Labels GitHub (rastreabilidade obrigatória)

Todo PR ou Issue relacionado às 3 Ondas ou ao Cockpit P.O. **DEVE** receber a label correspondente:

| Label | Cor | Quando usar |
|---|---|---|
| `onda:1-solaris` | `#185FA5` (azul) | Issues/PRs da Onda 1 — questionário equipe jurídica SOLARIS |
| `onda:2-iagen` | `#D97706` (laranja) | Issues/PRs da Onda 2 — geração combinatória por IA |
| `onda:3-regulatorio` | `#3B6D11` (verde) | Issues/PRs da Onda 3 — RAG corpus regulatório LC 214/224 |
| `cockpit:3ondas` | `#7C3AED` (roxo) | Issues/PRs do Cockpit 3 Ondas (painel P.O.) |

Regras:
- Um PR pode ter múltiplas labels de onda se tocar mais de uma
- Labels de onda são a fonte de rastreabilidade para o sub-painel 6B do Cockpit
- Ao criar um PR que toca as 3 ondas, aplicar as labels **antes** de solicitar review
- O Cockpit busca issues/PRs por milestone — as labels são filtro adicional de contexto

## Estratégia de Labels GitHub — RAG (rastreabilidade obrigatória)

Todo PR, Issue, RFC ou incidente relacionado ao RAG **DEVE** receber a label correspondente:

| Label | Cor | Quando usar |
|---|---|---------|
| `rag:corpus` | `#0E7490` (ciano) | Ingestão, chunks, embeddings, versionamento de corpus |
| `rag:retriever` | `#0369A1` (azul) | Pipeline de recuperação: retrieveArticles, re-ranking, keywords |
| `rag:incidente` | `#DC2626` (vermelho) | Incidentes: falhas de recuperação, qualidade, hallucination |
| `rag:rfc` | `#7C3AED` (roxo) | RFC: propostas de mudança arquitetural ou de corpus |
| `rag:performance` | `#D97706` (laranja) | Performance: latência, rate limit, cache, otimizações |
| `rag:governanca` | `#16A34A` (verde) | Governança: rastreabilidade, auditoria, versionamento |

Regras RAG:
- **Incidentes** (`rag:incidente`) têm prioridade máxima — abrir issue imediatamente com evidência
- **RFCs** (`rag:rfc`) requerem aprovação do P.O. antes de qualquer implementação
- **Corpus** (`rag:corpus`) deve registrar versão anterior e nova contagem de chunks no PR
- Um PR pode combinar `rag:corpus` + `rag:performance` se tocar ambas as camadas
- O Cockpit P.O. (Seção 7) busca issues/PRs por estas labels via API GitHub
- Ao criar PR RAG, aplicar labels **antes** de solicitar review

## Protocolo de Auditoria RAG (obrigatório em qualquer PR com label rag:*)

Quando um PR ou issue tocar qualquer componente RAG, o Manus DEVE:

**1. Antes de implementar — verificar impacto:**

| Arquivo alterado | Arquivos que DEVEM ser revisados |
|---|---|
| `server/rag-retriever.ts` | `docs/rag/RAG-PROCESSO.md`, `docs/rag/HANDOFF-RAG.md`, `RASTREABILIDADE-RAG-PO.md` |
| `docs/rag/CORPUS-BASELINE.md` | `docs/rag/RAG-GOVERNANCE.md`, `docs/rag/RAG-PROCESSO.md`, `RASTREABILIDADE-RAG-PO.md` |
| Qualquer RFC (`docs/RFC-*.md`) | `docs/rag/CORPUS-BASELINE.md`, `docs/rag/RAG-PROCESSO.md`, `RASTREABILIDADE-RAG-PO.md` |
| Schema `ragDocuments` | `docs/rag/CORPUS-BASELINE.md`, `docs/rag/HANDOFF-RAG.md` |

**2. Durante o PR — checklist obrigatório:**
- Incrementar versão do `CORPUS-BASELINE.md` se corpus mudou (vX.Y → vX.Z)
- Atualizar `RASTREABILIDADE-RAG-PO.md` com nova entrada no histórico
- Atualizar `HANDOFF-RAG.md` se o estado do sistema mudou
- Atualizar skills se processo ou governança mudou

**3. Após o merge — auditoria do cockpit:**
- Verificar se Seção 7A (barras de corpus) reflete os novos totais
- Verificar se Seção 7B (rastreabilidade viva) exibe o PR mergeado
- Verificar se Seção 7D (documentos) carrega a versão atualizada
- Reportar resultado da auditoria ao Orquestrador

**4. Para incidentes (`rag:incidente`):**
- Abrir issue imediatamente com template `rag-change.md`
- Classificar severidade: P0 (crítico) / P1 (alto) / P2 (médio) / P3 (baixo)
- P0 e P1 requerem notificação imediata ao P.O. antes de qualquer ação

**5. Para RFCs (`rag:rfc`):**
- Nunca implementar RFC sem aprovação explícita do P.O.
- Criar issue com template `rag-change.md` e aguardar aprovação
- Após aprovação, criar PR com template `rag-pr.md`

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
