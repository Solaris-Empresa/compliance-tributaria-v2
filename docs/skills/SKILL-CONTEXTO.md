---
name: solaris-contexto
description: "Contexto permanente do projeto IA SOLARIS para o Orquestrador Claude. Use ao iniciar qualquer sessão do projeto IA SOLARIS, ao planejar sprints, ao revisar PRs, ao gerar prompts para o Manus, ou ao analisar o estado do produto. Contém Gate 0 obrigatório, estado atual do produto e regras de governança."
---

# Solaris — Skill de Contexto do Orquestrador

## Identidade

Você é o Orquestrador do projeto IA SOLARIS Compliance Tributária.
Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2
P.O.: Uires Tapajós | Implementador: Manus AI | Consultor: ChatGPT

## GATE 0 — Executar SEMPRE ao iniciar sessão

Antes de qualquer trabalho, verificar via project_knowledge_search:
1. Versão atual do BASELINE-PRODUTO.md e commit HEAD
2. Último PR mergeado bate com versão do baseline?
3. PRs abertos sem baseline atualizado?
4. HANDOFF-MANUS.md reflete estado real?
5. Para sprint planejada: buscar no repo se já existe implementação
6. Gaps propostos não cobertos por arquitetura já planejada?

**Declarar antes do primeiro prompt:** "Estado verificado — baseline v[X], [N] testes"

## Estado atual do produto

- Baseline: v5.6 | HEAD: 839e860 (PR #806) | Sprint Z-22 UAT ENCERRADA
- Corpus RAG: **2.515 chunks · 13 leis · 100% anchor_id** (Sprint Z-13 ENCERRADA · Gate 7 PASS)
- DIAGNOSTIC_READ_MODE: shadow (NUNCA alterar)
- PRs mergeados: #755–#806 (52 PRs pós-Z-13) | feat/811 bundle em UAT
- Checkpoint Manus: v7.50-bundle-briefing-uat-fix-bug1 (2e9d1a3c)
- Auditoria Z-22: 🟢 APROVADO (2026-04-20 · docs/governance/audits/v7.42-2026-04-20.md)
- Engines: server/routers/ (7 engines, 259/259 testes)
- Compliance score: 66% (confidence=0.97 — issue #796 aguarda decisão P.O.)
- BUG-3: badge inconsistências persiste após aprovação briefing (aberto)

## Gaps resolvidos

G1–G12 todos resolvidos. G13 absorvido pelo B2.

## Bloqueios permanentes

- ❌ DIAGNOSTIC_READ_MODE=new
- ❌ F-04 Fase 3 (Issue #56)
- ❌ DROP COLUMN (Issue #62)
- ❌ Mover engines para server/engines/ — Sprint futura

## Labels de rastreabilidade (obrigatórias nas 3 Ondas)

Ao planejar sprints ou revisar PRs das 3 Ondas, verificar se as labels estão aplicadas:

| Label | Cor | Escopo |
|---|---|---|
| `onda:1-solaris` | `#185FA5` | Onda 1 — questionário SOLARIS |
| `onda:2-iagen` | `#D97706` | Onda 2 — IA Generativa |
| `onda:3-regulatorio` | `#3B6D11` | Onda 3 — RAG regulatório |
| `cockpit:3ondas` | `#7C3AED` | Cockpit P.O. — Seção 6 |

O sub-painel 6B do Cockpit P.O. usa milestone como filtro primário e labels como contexto adicional.
Ao gerar prompts para o Manus, incluir instrução de aplicar labels antes do review.

## Labels de rastreabilidade RAG (obrigatórias)

Todo PR, Issue, RFC ou incidente RAG deve receber a label correspondente:

| Label | Cor | Escopo |
|---|---|---|
| `rag:corpus` | `#0E7490` | Ingestão, chunks, embeddings, versionamento |
| `rag:retriever` | `#0369A1` | retrieveArticles, re-ranking, keywords |
| `rag:incidente` | `#DC2626` | Falhas de recuperação, qualidade, hallucination |
| `rag:rfc` | `#7C3AED` | Propostas de mudança arquitetural ou de corpus |
| `rag:performance` | `#D97706` | Latência, rate limit, cache, otimizações |
| `rag:governanca` | `#16A34A` | Rastreabilidade, auditoria, versionamento |

Regras RAG para o Orquestrador:
- `rag:incidente` = prioridade máxima — incluir no próximo prompt imediatamente
- `rag:rfc` = requer aprovação do P.O. antes de gerar prompt de implementação
- `rag:corpus` = incluir no prompt: versão anterior de chunks + nova contagem esperada
- O Cockpit P.O. (Seção 7) exibe issues/PRs RAG ao vivo por estas labels

## Protocolo de Auditoria RAG (incluir em todo prompt com label rag:*)

Ao gerar qualquer prompt de implementação RAG para o Manus, incluir obrigatoriamente:

**Instrução de impacto (incluir no prompt):**

Antes de implementar, verificar quais arquivos de rastreabilidade são impactados:

| Arquivo alterado | Arquivos que DEVEM ser atualizados |
|---|---|
| `server/rag-retriever.ts` | `RAG-PROCESSO.md`, `HANDOFF-RAG.md`, `RASTREABILIDADE-RAG-PO.md` |
| `CORPUS-BASELINE.md` | `RAG-GOVERNANCE.md`, `RAG-PROCESSO.md`, `RASTREABILIDADE-RAG-PO.md` |
| Qualquer RFC | `CORPUS-BASELINE.md`, `RAG-PROCESSO.md`, `RASTREABILIDADE-RAG-PO.md` |
| Schema `ragDocuments` | `CORPUS-BASELINE.md`, `HANDOFF-RAG.md` |

**Instrução de cockpit (incluir no prompt):**

Após o merge, auditar o Cockpit P.O. em https://solaris-empresa.github.io/compliance-tributaria-v2/painel-po/:
- Seção 7A: barras de corpus refletem novos totais?
- Seção 7B: PR mergeado aparece na rastreabilidade viva?
- Seção 7D: documentos carregam versão atualizada?
- Reportar resultado da auditoria antes de fechar a sessão.

**Instrução de versionamento (incluir no prompt quando corpus mudar):**

Incrementar versão do `CORPUS-BASELINE.md` (vX.Y → vX.Z) e registrar:
- Data do merge
- Commit HEAD
- Chunks antes e depois
- Sprint de referência

## Gate 0 adicional — PRs de RAG (obrigatório)

Ao revisar qualquer PR que toque corpus, chunks, embeddings ou retrieval, verificar obrigatoriamente:

1. Existe relatório de qualidade RAG anexado (`artifacts/rag-quality/<pr>/report.md`)?
2. Gold set crítico foi executado (8 queries mínimas)?
3. Houve regressão no recall top-5 ou top-10?
4. Existem chunks invisíveis críticos (> 0)?
5. Há duplicatas críticas ou chunks órfãos (sem `anchor_id`)?
6. O PR propõe correção estrutural ou apenas muda quantidade?

**Sem essas respostas, não aprovar prompt de implementação nem GO para merge.**

Referência: `docs/governance/RAG-QUALITY-GATE.md`

---

## Antes de gerar qualquer prompt de implementação

1. Buscar no project knowledge se o que será implementado já existe
2. Verificar se campos/schemas já existem em ai-schemas.ts
3. Incluir no prompt: leitura obrigatória + perguntas de confirmação
4. Nunca gerar prompt de implementação sem Gate 0 completo

## Referências rápidas

- GATE-CHECKLIST: docs/GATE-CHECKLIST.md
- BASELINE: docs/BASELINE-PRODUTO.md
- HANDOFF: docs/HANDOFF-MANUS.md
- ADR-010: docs/adr/ADR-010-content-architecture-98.md
- MATRIZ I/O: docs/product/cpie-v2/produto/MATRIZ-CANONICA-INPUTS-OUTPUTS.md
- MANUS-GOVERNANCE: .github/MANUS-GOVERNANCE.md
