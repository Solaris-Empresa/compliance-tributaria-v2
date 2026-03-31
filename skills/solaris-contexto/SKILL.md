---
name: solaris-contexto
version: v3.0
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

## PROTOCOLO DE DEBUG — Geração obrigatória de prompts de causa raiz

> **Regra absoluta:** Nenhum bug é considerado resolvido sem causa raiz identificada,
> evidência reproduzível e hipótese confirmada por output de comando.
> Claude não gera prompt de correção antes da causa raiz estar confirmada.

---

### Passo 0 — Verificar padrões conhecidos (fast path)

Antes de gerar qualquer bloco de investigação, verificar se o bug se enquadra
em padrão já documentado na tabela de erros recorrentes do `solaris-orquestracao/SKILL.md`:

| Sintoma | Padrão conhecido | Comando direto |
|---|---|---|
| Lista retorna 0 após insert/upsert OK | `''` em vez de `NULL` em campo opcional | `SELECT campo FROM tabela WHERE campo = ''` |
| TiDB rejeita query em produção | `SELECT DISTINCT` com `ORDER BY` fora do SELECT | `grep -n "DISTINCT" ARQUIVO` |
| Endpoint retorna 404 em produção | Router não registrado em `server/routers.ts` | `grep -n "NOME_ROUTER" server/routers.ts` |
| Filtro não encontra dado existente | Tipo incompatível (string vs number, null vs undefined) | `SELECT tipo_coluna FROM information_schema.columns WHERE table_name=X` |
| Deploy não reflete código | Branch não mergeada em `main` | `git log main --oneline -3` |

**Se o sintoma bater com padrão conhecido:** gerar prompt com o comando direto — não investigação completa.
**Se não bater:** executar o protocolo completo abaixo.

---

### Passo 1 — Definição objetiva do problema

Claude estrutura o problema em 4 campos antes de gerar qualquer comando:

```
SINTOMA:    [observável, sem interpretação — o que o usuário viu]
ESPERADO:   [estado correto — o que deveria acontecer]
REAL:       [estado atual — o que aconteceu]
DELTA:      [diferença entre esperado e real — onde está a divergência]
```

Regra: se Claude não consegue preencher DELTA com precisão, falta informação — pedir ao P.O. antes de gerar o prompt.

---

### Passo 2 — Diagrama de fluxo obrigatório

Claude mapeia o caminho completo do dado antes de qualquer grep:

```
Input/CSV → Parser/Zod → upsert() → banco (TiDB)
                                          ↓
                              procedure() → tRPC response → React state → UI

DADO CONFIRMADO EM: [ ] input  [ ] banco  [ ] tRPC response  [ ] React state
DADO AUSENTE EM:    [ ] input  [ ] banco  [ ] tRPC response  [ ] React state
CAMADA DO BUG: ______
```

A camada identificada determina quais comandos incluir. Não investigar camadas que o diagrama já eliminou.

---

### Passo 3 — Hipóteses ranqueadas por probabilidade

Claude gera mínimo 3 hipóteses, da mais à menos provável:

```
H1 — [hipótese mais provável dado o stack TiDB/Drizzle/tRPC]
     Comando: [1 comando único — grep ou SQL]
     ✅ Confirma se: [output exato que confirma]
     ❌ Nega se:     [output exato que nega]

H2 — [hipótese alternativa]
     Comando: [1 comando]
     ✅ Confirma se: [output]
     ❌ Nega se:     [output]

H3 — [hipótese fallback]
     Comando: [1 comando]
     ✅ Confirma se: [output]
     ❌ Nega se:     [output]
```

Hipóteses prioritárias para o stack SOLARIS (verificar sempre em H1 ou H2):
- **Dados:** campo opcional gravado como `''` em vez de `NULL` (Q1)
- **SQL:** `SELECT DISTINCT` com `ORDER BY` coluna fora do SELECT (Q2)
- **Filtro:** `WHERE campo IS NULL` não encontra `''` (Q3)
- **Registro:** procedure/router não registrado em `server/routers.ts` (Q4)
- **Frontend:** filtro client-side aplicado por padrão (ex: status `ativo=1`) (Q5)

---

### Passo 4 — Bloco de investigação (executar tudo de uma vez)

Claude gera **um único bloco** com todos os comandos agrupados por camada.
O Manus executa tudo de uma vez e reporta os outputs brutos — sem interpretação.

```bash
# ═══ CAMADA 1 — BANCO ═══
SELECT campo_suspeito, ativo, COUNT(*) as total
FROM tabela GROUP BY campo_suspeito, ativo;

SELECT COUNT(*) as registros_com_string_vazia
FROM tabela WHERE campo_suspeito = '';

# ═══ CAMADA 2 — BACKEND (filtro oculto?) ═══
grep -n "IS NULL\|= ''\|ativo\|where\|findMany\|eq(\|or(" \
  server/routers/ARQUIVO.ts | head -30

# ═══ CAMADA 3 — MAPEAMENTO (tipos e transforms) ═══
grep -n "transform\|\.trim\|optional\|default\|null\|''" \
  server/routers/ARQUIVO.ts | head -20

# ═══ CAMADA 4 — REGISTRO (endpoint existe?) ═══
grep -n "NOME_ROUTER" server/routers.ts

# ═══ CAMADA 5 — FRONTEND (filtro client-side?) ═══
grep -n "filter\|ativo\|role\|guard\|default\|useState" \
  client/src/pages/COMPONENTE.tsx | head -20
```

**Proibições absolutas:**
- ❌ Não alterar nenhum arquivo antes da causa raiz confirmada
- ❌ Não usar "acho que" ou "possivelmente"
- ❌ Não sugerir correção antes do Passo 5 completo
- ❌ Não sequenciar — executar tudo de uma vez

---

### Passo 5 — Formato de resposta fechado

Claude inclui este formato no prompt enviado ao Manus.
O Manus só pode responder neste formato — nada mais:

```
## OUTPUTS BRUTOS

### CAMADA 1 — BANCO
[output exato do SELECT]

### CAMADA 2 — BACKEND
[output exato do grep]

### CAMADA 3 — MAPEAMENTO
[output exato do grep]

### CAMADA 4 — REGISTRO
[output exato do grep]

### CAMADA 5 — FRONTEND
[output exato do grep]

## CHECKLIST Q1–Q5

Q1 — Tipos nulos:        [ OK | FALHOU ] → [linha do output como evidência]
Q2 — SQL DISTINCT:       [ OK | N/A ]    → [linha do output como evidência]
Q3 — Filtros NULL/'':    [ OK | FALHOU ] → [linha do output como evidência]
Q4 — Endpoint existe:    [ OK | FALHOU ] → [linha do output como evidência]
Q5 — Filtro frontend:    [ OK | FALHOU ] → [linha do output como evidência]

## HIPÓTESE CONFIRMADA
H__ — [1 frase objetiva]

## CAUSA RAIZ
Descrição: [sem qualificadores — "o campo X grava Y em vez de Z"]
Camada:    [banco | query | backend | frontend]
Evidência: [comando + output exato]
Tipo:      [dados | estrutura | lógica | integração]

## VALIDAÇÃO DA CORREÇÃO
[comando ou fluxo que confirma resolução]
```

---

### Passo 6 — Gate de bloqueio

Claude não gera prompt de correção se:

| Condição | Ação |
|---|---|
| Causa raiz não identificada | Nova rodada com comandos mais específicos |
| Output ausente ou "achei que" | Rejeitar — exigir output de comando |
| Hipótese não confirmada | Bloquear — exigir output antes de corrigir |
| Manus sugeriu correção antes da causa raiz | Bloquear — exigir causa raiz primeiro |

---

### Referência rápida — diagnóstico por tipo de bug

**Campo NULL/empty:**
```bash
SELECT campo, COUNT(*) FROM tabela GROUP BY campo ORDER BY 2 DESC;
# '' com N registros → Q1 falhou → causa raiz confirmada
```

**Filtro eliminando dados:**
```bash
SELECT COUNT(*) FROM tabela WHERE ativo = 1;  -- com filtro
SELECT COUNT(*) FROM tabela;                   -- sem filtro
# diferença > 0 → filtro é a causa
```

**Endpoint não registrado:**
```bash
grep -n "NOME_ROUTER" server/routers.ts
grep -rn "export.*router\|export.*Router" server/routers/ARQUIVO.ts
```

**SQL TiDB rejeitado:**
```bash
grep -rn "SELECT DISTINCT\|\.distinct(" server/routers/ | grep -v test
# qualquer hit → verificar ORDER BY das colunas
```

> **Regra final:** Bug documentado = regressão evitada.
> A cada bug resolvido, atualizar a tabela de erros recorrentes
> em `skills/solaris-orquestracao/SKILL.md`.

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
