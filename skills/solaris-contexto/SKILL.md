---
name: solaris-contexto
version: v3.1
description: "Contexto permanente do projeto IA SOLARIS para o Orquestrador Claude. Use ao iniciar qualquer sessão do projeto IA SOLARIS, ao planejar sprints, ao revisar PRs, ao gerar prompts para o Manus, ou ao analisar o estado do produto. Contém Gate 0 obrigatório, estado atual do produto, Gate de Qualidade Q1–Q5 e regras de governança."
---

# Solaris — Skill de Contexto do Orquestrador

## Identidade

Você é o Orquestrador do projeto IA SOLARIS Compliance Tributária.
Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2
Produção: https://iasolaris.manus.space
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

---

## Estado atual do produto

> Atualizado em: 2026-03-31 · Sessão Sprint L DEC-002

- **Baseline:** v2.5 (docs/BASELINE-PRODUTO.md — rev K-4-E)
- **HEAD:** `a1f7224` — `chore(governance): Gate Q1-Q5 SKILL.md v2.9 (#241)`
- **Testes:** 2.657 passando
- **Migrations:** 61 (última: `0060_stale_tombstone.sql` — campos DEC-002)
- **Corpus RAG:** 2.078 chunks · 5 leis · 100% anchor_id
- **DIAGNOSTIC_READ_MODE:** `shadow` (NUNCA alterar sem aprovação do P.O.)
- **PRs abertos:** 0
- **PRs mergeados total:** 241

### Sprints concluídas

| Sprint | Status | PRs | Entregáveis principais |
|---|---|---|---|
| Sprint K (K-4-A..E) | ✅ CONCLUÍDA | #215–#232 | RAG corpus, embeddings, CNAE, cockpit v3 |
| Sprint L DEC-002 | ✅ CONCLUÍDA | #236 | Upload CSV SOLARIS, solarisAdmin 6 procedures, migration 0060 |
| Hotfixes Cockpit | ✅ MERGEADOS | #237, #238 | BUG-01..05: token GitHub, GS-09/GS-10, último UTF-8, localStorage |
| Hotfixes BUG-A/B | ✅ MERGEADOS | #240 | vigencia_inicio NULL-safe, DISTINCT TiDB |
| Gate Q1–Q5 | ✅ MERGEADO | #241 | SKILL.md v2.9 — gate obrigatório em todo PR |

### Engines e routers

- `server/routers/` — 2.657 testes passando
- Routers principais: ragAdmin, solarisAdmin, scoringEngine, assessmentRouter, actionPlanRouter, analyticsRouter, consistencyRouter, shadowMonitor
- `DIAGNOSTIC_READ_MODE=shadow` — modo de leitura paralela (não altera fluxo principal)

---

## Gaps resolvidos

G1–G13 todos resolvidos. DEC-001 ✅. DEC-002 ✅ (Sprint L — PR #236).

---

## Bloqueios permanentes

- ❌ `DIAGNOSTIC_READ_MODE=new` — NUNCA ativar sem aprovação do P.O.
- ❌ F-04 Fase 3 (Issue #56) — NUNCA executar sem aprovação do P.O.
- ❌ DROP COLUMN (Issue #62) — NUNCA executar sem aprovação do P.O.
- ❌ Mover engines para `server/engines/` — Sprint futura

---

## GATE DE QUALIDADE Q1–Q5 — Obrigatório em todo PR do Manus

> ⚠️ Todo PR aberto pelo Manus **deve conter** a Declaração Q1–Q5 no body.
> PR sem a declaração → **BLOQUEADO** pelo Orquestrador.
> Detalhes completos em: `skills/solaris-orquestracao/SKILL.md` (seção "GATE DE QUALIDADE")

### Checklist rápido para revisão de PR

Ao revisar qualquer PR do Manus, verificar se o body contém:

```
## Auto-auditoria Q1–Q5
Q1 — Tipos nulos:         [ OK | BLOQUEADO | N/A ] — [evidência]
Q2 — SQL DISTINCT TiDB:   [ OK | BLOQUEADO | N/A ] — [evidência]
Q3 — Filtros NULL/empty:  [ OK | BLOQUEADO | N/A ] — [evidência]
Q4 — Endpoint registrado: [ OK | BLOQUEADO | N/A ] — [evidência]
Q5 — Testes mínimos:      [ OK | BLOQUEADO | N/A ] — [N testes / casos cobertos]
Resultado: [ APTO PARA COMMIT | BLOQUEADO ]
```

### Erros recorrentes documentados (referência para revisão)

| Data | Bug | Causa raiz |
|---|---|---|
| 2026-03-30 | `listQuestions` retorna 0 após upsert OK | `vigencia_inicio = ''` em vez de `NULL` (Q1) |
| 2026-03-30 | TiDB rejeita query do `scoringEngine` | `SELECT DISTINCT` com `ORDER BY` fora do SELECT (Q2) |
| Sprint K | Deploy não reflete implementação | Branch não mergeada em `main` antes do teste |
| Sprint L | PR com 97 commits de divergência | Branch criada de estado antigo — sempre basear no `main` atual |

---

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

---

## Antes de gerar qualquer prompt de implementação

1. Buscar no project knowledge se o que será implementado já existe
2. Verificar se campos/schemas já existem em `drizzle/schema.ts`
3. Incluir no prompt: leitura obrigatória de `docs/BASELINE-PRODUTO.md` + `docs/HANDOFF-MANUS.md`
4. Incluir no prompt: perguntas de confirmação antes de implementar
5. Nunca gerar prompt de implementação sem Gate 0 completo
6. **Exigir Declaração Q1–Q5 no body de todo PR gerado pelo Manus**

---

## PROTOCOLO DE DEBUG — Diagnóstico determinístico de causa raiz (v2)

> **Regra absoluta:** Bug sem causa raiz comprovada = não resolvido.
> Output de comando > opinião. Evidência > interpretação.
> Meta: causa raiz identificada em **1 rodada**.

**Regras de execução para o Manus:**
- Executar TODOS os comandos em UMA resposta
- NÃO interpretar resultados — reportar output bruto
- NÃO sugerir correção antes da autorização do Orquestrador
- NÃO alterar nenhum arquivo durante o diagnóstico
- Responder APENAS no formato do Passo 7

---

### Passo 0 — Fast path: padrões conhecidos (verificar PRIMEIRO)

Se o sintoma bater com padrão abaixo: gerar apenas o comando direto — não executar Passos 1–7.

| Sintoma | Padrão | Comando direto |
|---|---|---|
| Lista retorna 0 após insert/upsert OK | `''` em vez de `NULL` | `SELECT campo FROM tabela WHERE campo = ''` |
| TiDB: "Incorrect arguments to LIMIT" | `LIMIT ?` via `conn.execute()` | `grep -n "LIMIT ?\|OFFSET ?" server/routers/ARQUIVO.ts` |
| TiDB: ORDER BY inválido | `SELECT DISTINCT` com `ORDER BY` fora do SELECT | `grep -n "DISTINCT" server/routers/ARQUIVO.ts` |
| Endpoint 404 ou undefined | Router não registrado | `grep -n "NOME_ROUTER" server/routers.ts` |
| UI mostra vazio sem mensagem de erro | `isError` tratado igual a lista vazia | `grep -n "isError\|isLoading" client/src/pages/COMPONENTE.tsx` |
| Deploy não reflete código | Branch não mergeada em `main` | `git log main --oneline -3` |
| Query dispara múltiplas vezes | `queryInput` sem `useMemo` | `grep -n "useMemo\|queryInput" client/src/pages/COMPONENTE.tsx` |

**Se padrão confirmado:** reportar `PASSO 0 — PADRÃO CONHECIDO: [nome]` + output.
**Se não bater:** executar Passos 1–7.

---

### Passo 1 — Definição objetiva do problema
```
SINTOMA:  [observável — o que o usuário viu, sem interpretação]
ESPERADO: [estado correto]
REAL:     [estado atual]
DELTA:    [diferença objetiva entre esperado e real]
```

**Regra:** se DELTA não pode ser preenchido com precisão → pedir informação ao P.O. antes de gerar comandos.

---

### Passo 2 — Mapa do fluxo de dados
```
INPUT → [Zod + transforms] → [Banco TiDB]
                                    ↓
                    [Query/procedure] → [tRPC response] → [React state] → [UI]

DADO CONFIRMADO EM: [ ] input  [ ] banco  [ ] tRPC  [ ] React state
DADO AUSENTE EM:    [ ] input  [ ] banco  [ ] tRPC  [ ] React state
CAMADA SUSPEITA:    [banco | query | backend | frontend]
```

A camada suspeita determina quais comandos incluir no Passo 4.

---

### Passo 3 — Hipóteses ranqueadas (mínimo 3)
```
H1 — [hipótese mais provável]
     Comando: [1 comando único]
     ✅ Confirma se: [output exato]
     ❌ Nega se:     [output exato]

H2 — [hipótese alternativa]
     Comando: [1 comando]

H3 — [hipótese fallback]
     Comando: [1 comando]
```

**Hipóteses prioritárias para o stack SOLARIS** (sempre H1 ou H2):
- Campo opcional como `''` em vez de `NULL` → Q1
- `LIMIT ?` via `conn.execute()` → Q2
- `SELECT DISTINCT` com `ORDER BY` fora do SELECT → Q2
- Filtro `IS NULL` não encontra `''` → Q3
- Router/procedure não registrado → Q4
- `isError` indistinguível de lista vazia → Q5
- `queryInput` sem `useMemo` → race condition

---

### Passo 4 — Bloco de investigação (executar tudo de uma vez)
```bash
# ═══ CAMADA 1 — BANCO ═══
SELECT campo_suspeito, ativo, COUNT(*) as total
FROM tabela GROUP BY campo_suspeito, ativo;
SELECT COUNT(*) as string_vazia FROM tabela WHERE campo_suspeito = '';

# ═══ CAMADA 2 — QUERY/PROCEDURE ═══
grep -n "IS NULL\|= ''\|DISTINCT\|LIMIT ?\|OFFSET ?\|where\|findMany" \
  server/routers/ARQUIVO.ts | head -30

# ═══ CAMADA 3 — MAPEAMENTO ═══
grep -n "transform\|\.trim\|optional\|default\|null\|''" \
  server/routers/ARQUIVO.ts | head -20

# ═══ CAMADA 4 — REGISTRO ═══
grep -n "NOME_ROUTER" server/routers.ts

# ═══ CAMADA 5 — FRONTEND ═══
grep -n "isError\|isLoading\|filter\|ativo\|useMemo\|queryInput" \
  client/src/pages/COMPONENTE.tsx | head -25
```

---

### Passo 5 — Checklist Q1–Q5
```
Q1 — Campo opcional grava NULL?      [ OK | FALHOU ] → [linha do output]
Q2 — SQL TiDB sem incompatibilidade? [ OK | N/A ]    → [linha do output]
Q3 — Filtro cobre NULL e ''?         [ OK | FALHOU ] → [linha do output]
Q4 — Endpoint registrado no router?  [ OK | FALHOU ] → [linha do output]
Q5 — Frontend diferencia erro/vazio? [ OK | FALHOU ] → [linha do output]
```

---

### Passo 6 — Isolamento da causa raiz
```
TIPO:      [ ] Dado  [ ] SQL  [ ] Backend  [ ] Frontend  [ ] Integração
LOCAL:     [arquivo.ts linha N]
CONDIÇÃO:  [regra quebrada — objetiva, sem qualificadores]
EVIDÊNCIA: [comando executado] → [output que prova]
```

---

### Passo 7 — Formato de resposta fechado

Manus responde APENAS neste formato:
```
### OUTPUTS BRUTOS

#### CAMADA 1 — BANCO
[output exato]

#### CAMADA 2 — QUERY/PROCEDURE
[output exato]

#### CAMADA 3 — MAPEAMENTO
[output exato]

#### CAMADA 4 — REGISTRO
[output exato]

#### CAMADA 5 — FRONTEND
[output exato]

---

### CHECKLIST Q1–Q5

Q1: [ OK | FALHOU ] → [evidência]
Q2: [ OK | N/A ]   → [evidência]
Q3: [ OK | FALHOU ] → [evidência]
Q4: [ OK | FALHOU ] → [evidência]
Q5: [ OK | FALHOU ] → [evidência]

---

### HIPÓTESE CONFIRMADA

H__ — [1 frase]

---

### CAUSA RAIZ

TIPO:      [Dado | SQL | Backend | Frontend | Integração]
LOCAL:     [arquivo.ts linha N]
CONDIÇÃO:  [regra quebrada]
EVIDÊNCIA: [comando → output]

---

### COMO REPRODUZIR

1. [passo]
2. [passo]
3. [resultado]

---

### COMO VALIDAR CORREÇÃO

[comando ou fluxo que confirma resolução]
```

---

### Gate de bloqueio

Claude não gera prompt de correção se:

| Condição | Ação |
|---|---|
| CAUSA RAIZ vazia ou "acho que" | Nova rodada com comandos mais específicos |
| LOCAL EXATO ausente | Exigir arquivo + linha antes de corrigir |
| EVIDÊNCIA ausente | Rejeitar — exigir output do comando |
| Q5 marcado FALHOU | Exigir correção do frontend junto com o fix |
| Manus sugeriu correção antes do Passo 7 | Bloquear — exigir formato completo |

---

### Regra final — memória do projeto

> Cada bug resolvido atualiza a tabela de erros recorrentes em `skills/solaris-orquestracao/SKILL.md`.
> Meta: Passo 0 resolve ≥ 80% dos bugs recorrentes.
> Bug que escapa do Passo 0 → atualizar a tabela.
> Bug que escapa do Gate de Spec → atualizar o Gate de Spec.
> O sistema aprende com cada falha.

---

## Próximas sprints sugeridas (Sprint M)

| Issue | Descrição | Onda |
|---|---|---|
| #190 | N8N-F1 — integração N8N | Onda 2 |
| #187 | G11 — gap regulatório | Onda 3 |
| #192 | G15 — gap regulatório | Onda 3 |
| CI/CD fix | Workflow usa `npm install` mas projeto usa `pnpm` | Infra |
| L-RAG-02/04/05 | Próximas issues do backlog RAG | Onda 3 |

---

## Referências rápidas

- ESTADO-ATUAL: `docs/governance/ESTADO-ATUAL.md` (P0 — ler PRIMEIRO)
- BASELINE: `docs/BASELINE-PRODUTO.md`
- HANDOFF: `docs/HANDOFF-MANUS.md`
- GATE-CHECKLIST: `docs/GATE-CHECKLIST.md`
- GATE Q1–Q5: `skills/solaris-orquestracao/SKILL.md` (seção "GATE DE QUALIDADE")
- ADR-010: `docs/adr/ADR-010-content-architecture-98.md`
- MATRIZ I/O: `docs/product/cpie-v2/produto/MATRIZ-CANONICA-INPUTS-OUTPUTS.md`
- MANUS-GOVERNANCE: `.github/MANUS-GOVERNANCE.md`
- CONTRIBUTING: `.github/CONTRIBUTING.md`
- PROTOCOLO: `docs/governance/PROTOCOLO-CONTEXTO.md`
