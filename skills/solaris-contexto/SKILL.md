---
name: solaris-contexto
version: v4.2
description: "Contexto permanente do projeto IA SOLARIS para o Orquestrador Claude. Use ao iniciar qualquer sessão do projeto IA SOLARIS, ao planejar sprints, ao revisar PRs, ao gerar prompts para o Manus, ou ao analisar o estado do produto. Contém Gate 0 Discovery, Gate 2.5 Risk Score, Gate 4 Post-mortem, estado atual do produto, Gate de Qualidade Q1–Q7 + R9 (v5.0), regras de governança, Regra de Realidade Inesperada (RRI), Definition of Done por task, Gate Q8 e Regra de Escopo de Branch."
---

# Solaris — Skill de Contexto do Orquestrador

## Identidade

Você é o Orquestrador do projeto IA SOLARIS Compliance Tributária.
Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2
Produção: https://iasolaris.manus.space
P.O.: Uires Tapajós | Implementador: Manus AI | Consultor: ChatGPT

## GATE 0 SESSÃO — Executar SEMPRE ao iniciar sessão

Antes de qualquer trabalho, verificar via project_knowledge_search:
1. Versão atual do BASELINE-PRODUTO.md e commit HEAD
2. Último PR mergeado bate com versão do baseline?
3. PRs abertos sem baseline atualizado?
4. HANDOFF-MANUS.md reflete estado real?
5. Para sprint planejada: buscar no repo se já existe implementação
6. Gaps propostos não cobertos por arquitetura já planejada?

**Declarar antes do primeiro prompt:** "Estado verificado — baseline v[X], [N] testes"

---

## GATE 0 DISCOVERY — Obrigatório antes de qualquer SPEC (v5.0)

> Nenhuma SPEC é iniciada sem que as 4 perguntas do Gate 0 estejam respondidas.

```
D1 — Colide com algum bloqueio permanente?
     Verificar: ESTADO-ATUAL.md → seção BLOQUEIOS
     Se sim: Gate 0 = NO-GO até o bloqueio ser resolvido

D2 — Requer decisão arquitetural nova?
     Critério: muda schema, adiciona dependência, altera pipeline de dados
     Se sim: criar ADR em docs/adr/ antes da SPEC

D3 — Qual o risk score desta feature?
     [ ] low  — hotfix, chore, docs: Gate 0 dispensado
     [ ] medium — nova procedure, componente, migration
     [ ] high  — novo pipeline, integração externa, mudança de enum global

D4 — O critério de aceite do P.O. é objetivamente testável?
     Formato: "Funcionou quando: [ação] → [resultado específico e mensurável]"
     Se vago: Gate 0 = NO-GO até refinar
```

**Formato de aprovação:**
```
Gate 0 — [feature]
D1 bloqueios: [OK / BLOQUEADO — qual]
D2 ADR:       [N/A / ADR-NNNN criado]
D3 risco:     [low / medium / high]
D4 critério:  [texto testável]

[ ] GO — iniciar SPEC
[ ] NO-GO — [o que precisa ser resolvido antes]
```

---

## Estado atual do produto

> Atualizado em: 2026-04-05 · Sprint T Pré-M1 — encerrada · HEAD 33de471

- **Baseline:** v4.0 (docs/governance/ESTADO-ATUAL.md)
- **HEAD:** `33de471` — `chore(datasets): GATE-EXT-01 — NBS 2.0 CSV + README datasets (#309)`
- **Testes:** 1.446 passando (5 skipped · 0 falhas)
- **TypeScript:** 0 erros
- **CI Workflows:** 12 ativos (branch-scope + file-declaration + autoaudit + 9)
- **CODEOWNERS:** 15 entradas — `@utapajos` em arquivos críticos
- **Corpus RAG:** 2.454 chunks · 10 leis · 100% anchor_id
- **DIAGNOSTIC_READ_MODE:** `shadow` (NUNCA alterar sem aprovação do P.O.)
- **PRs abertos:** 0
- **PRs mergeados total:** 309
- **Contratos M1:** CNT-01a/01b/02/03 em `docs/contracts/`
- **Datasets:** `nbs-2-0-utf8.csv` (1.237 reg.) no repo · `lc214-2025.pdf` no sandbox
- **GATE-EXT-01:** ⏳ Fase 2 — aguardando Dr. Rodrigues validar 3 NCM + 3 NBS
- **Bloco C:** ⛔ BLOQUEADO — aguarda GATE-EXT-01 Fase 2

### Sprints concluídas

| Sprint | Status | PRs | Entregáveis principais |
|---|---|---|---|
| Sprint K (K-4-A..E) | ✅ CONCLUÍDA | #215–#232 | RAG corpus, embeddings, CNAE, cockpit v3 |
| Sprint L DEC-002 | ✅ CONCLUÍDA | #236 | Upload CSV SOLARIS, solarisAdmin 6 procedures, migration 0060 |
| Hotfixes Cockpit | ✅ MERGEADOS | #237, #238 | BUG-01..05: token GitHub, GS-09/GS-10, último UTF-8, localStorage |
| Hotfixes BUG-A/B | ✅ MERGEADOS | #240 | vigencia_inicio NULL-safe, DISTINCT TiDB |
| Gate Q1–Q5 | ✅ MERGEADO | #241 | SKILL.md v2.9 — gate obrigatório em todo PR |
| Sprint M (G14, G16, G17 prep) | ✅ CONCLUÍDA | #242–#258 | G14 action-engine, G16 scoring, G17 Fase 1 |
| Sprint N — G17 P0 | ✅ CONCÍUÍDA | #259–#263 | G17 DONE: analyzeSolarisAnswers + enums + server/lib |
| Sprint S | ✅ ENCERRADA | #292–#299 | Lotes A+B+C+D+E + Fix #295 — pipeline 3 Ondas + corpus 10 leis |
| Sprint T Pré-M1 | ✅ ENCERRADA | #302–#309 | GOV-02/03 + Contratos M1 + Datasets GATE-EXT-01 |

### Engines e routers

- `server/routers/` — 2.657 testes passando
- Routers principais: ragAdmin, solarisAdmin, scoringEngine, assessmentRouter, actionPlanRouter, analyticsRouter, consistencyRouter, shadowMonitor
- `DIAGNOSTIC_READ_MODE=shadow` — modo de leitura paralela (não altera fluxo principal)

---

## Gaps resolvidos

G1–G13 todos resolvidos. DEC-001 ✅. DEC-002 ✅ (Sprint L — PR #236).
**G17 ✅ DONE** (Sprint N — PR #263): `analyzeSolarisAnswers` em `server/lib/solaris-gap-analyzer.ts` conecta `solaris_answers` ao `project_gaps_v3`.
**G11 ⏳ PENDENTE** (Issue #187): campo `fonte_risco` — próximo P1.

---

## Bloqueios permanentes

- ❌ `DIAGNOSTIC_READ_MODE=new` — NUNCA ativar sem aprovação do P.O.
- ❌ F-04 Fase 3 (Issue #56) — NUNCA executar sem aprovação do P.O.
- ❌ DROP COLUMN (Issue #62) — NUNCA executar sem aprovação do P.O.
- ❌ Mover engines para `server/engines/` — Sprint futura

---

## Regra de Realidade Inesperada (RRI) — Obrigatória

Se durante a execução de qualquer task o Manus encontrar estado
diferente do que o prompt assumia (schema, tabela, campo, valor,
arquivo, configuração), ele DEVE:

1. PARAR imediatamente — não executar nenhuma ação adicional
2. NÃO tomar decisão arquitetural
3. NÃO fechar a task
4. NÃO avançar para próxima task
5. Reportar EXATAMENTE neste formato:

```
ACHADO INESPERADO — [nome da task]

Esperado (pelo prompt): [o que o prompt assumia]
Real (encontrado):      [o que existe de fato]
Comando executado:      [query ou comando exato]
Output:                 [resultado exato, sem interpretação]

Aguardando decisão do Orquestrador antes de qualquer ação.
```

Violações desta regra são tratadas como breach de governança.

---

## Definition of Done — Obrigatório por task

Uma task SÓ está concluída quando:

1. ✅ PR aberto (nunca "concluído" sem PR)
2. ✅ Q1–Q5 preenchidos no body do PR
3. ✅ Q8 preenchido (ver abaixo)
4. ✅ Escopo do PR = escopo declarado na task (zero drift)
5. ✅ Nenhum arquivo fora do escopo tocado
6. ✅ Orquestrador ou P.O. confirmou que pode avançar para próxima task

❌ "Task concluída" sem PR = NUNCA válido
❌ Avançar para próxima task sem confirmação = VIOLAÇÃO

---

## Gate Q8 — Premissas verificadas (obrigatório em tasks de schema/banco)

Antes de executar qualquer task que envolva schema, banco ou arquivo
de configuração, o Manus DEVE executar um gate de diagnóstico:

```bash
# Para schema:
SHOW CREATE TABLE [tabela];
# Para arquivo:
cat [arquivo] | head -30
# Para enum:
SELECT DISTINCT [campo] FROM [tabela] LIMIT 10;
```

Resultado Q8:
```
[ OK — realidade bate com o prompt ]
[ ACHADO INESPERADO — reportar via RRI antes de qualquer ação ]
```

Q8 deve ser a PRIMEIRA instrução de toda task de schema — antes de
qualquer ALTER TABLE, migration ou UPDATE.

---

## Regra de Escopo de Branch — Inviolável

Cada branch tem um tipo declarado. O Manus NUNCA pode alterar
arquivos fora do tipo declarado:

| Tipo de branch          | Arquivos permitidos                    |
|-------------------------|----------------------------------------|
| `chore/docs-*`          | Apenas `.md`, `.json` de configuração  |
| `fix/*`                 | Apenas o(s) arquivo(s) declarados      |
| `feat/*`                | Apenas arquivos do escopo do contrato  |
| `chore/setup-*`         | Apenas criação de diretórios/gitkeep   |

Se durante uma branch `chore/docs-*` o Manus perceber que precisa
alterar código de produção (ex: `.ts`, `.tsx`, `.js`):

1. PARAR
2. Reportar ao Orquestrador
3. Aguardar autorização para abrir branch separada
4. NUNCA misturar docs e código no mesmo PR

---

## GATE DE QUALIDADE Q1–Q7 + R9 + S6 v5.0 — Obrigatório em todo PR do Manus

> ⚠️ Todo PR aberto pelo Manus **deve conter** a Declaração Q1–Q7 + R9 + S6 no body.
> PR sem a declaração → **BLOQUEADO** pelo Orquestrador.
> Detalhes completos em: `skills/solaris-orquestracao/SKILL.md` (seção "GATE DE QUALIDADE v5.0")

## GATE 2.5 — Risk Score (v5.0)

> PRs de risco **low** podem ser mergeados pelo P.O. diretamente após CI verde.
> PRs de risco **medium** requerem revisão do Claude antes do merge.
> PRs de risco **high** requerem revisão do Claude + parecer do ChatGPT.

## GATE 4 — Post-mortem (v5.0)

> Todo bug em produção que passou pelos Gates 1–3 requer um post-mortem.
> Template: `docs/governance/POST-MORTEM-TEMPLATE.md`
> Output obrigatório: pelo menos 1 item de melhoria em um gate existente.

### Checklist rápido para revisão de PR (v5.0)

Ao revisar qualquer PR do Manus, verificar se o body contém:

```
## Auto-auditoria Q1–Q7 + observabilidade (Gate 2 v5.0)
Q1 — Tipos nulos:         [ OK | N/A ] — [evidência]
Q2 — SQL TiDB:            [ OK | N/A ] — [evidência]
Q3 — Filtros NULL/'':     [ OK | N/A ] — [evidência]
Q4 — Endpoint registrado: [ OK | N/A ] — [evidência]
Q5 — isError ≠ vazio:     [ OK | N/A ] — [evidência]
Q6 — Retorno explícito:   [ OK | N/A ] — [inserted confirmado via SELECT]
Q7 — Driver único:        [ OK | N/A ] — [Opção A/B/C declarada]
R9 — Evento estruturado:  [ OK | N/A ] — [evento emitido no início/sucesso/falha]
S6 — Rollback declarado:  [ OK | N/A ] — [estratégia preenchida]
Risk score (herdado Gate 0): [ low | medium | high ]
Resultado: [ APTO | BLOQUEADO — motivo ]
```

### Erros recorrentes documentados (referência para revisão)

| Data | Bug | Causa raiz |
|---|---|---|
| 2026-03-30 | `listQuestions` retorna 0 após upsert OK | `vigencia_inicio = ''` em vez de `NULL` (Q1) |
| 2026-03-30 | TiDB rejeita query do `scoringEngine` | `SELECT DISTINCT` com `ORDER BY` fora do SELECT (Q2) |
| 2026-03-31 | Onda 2 não avança para Corporativo (BUG-UAT-03) | `completeOnda2` salva status de origem em vez de destino |
| 2026-03-31 | DiagnosticoStepper exibe "SOL-001 a SOL-012" hardcoded (BUG-UAT-05) | Contagem de perguntas hardcoded em vez de dinâmica |
| Sprint K | Deploy não reflete implementação | Branch não mergeada em `main` antes do teste |
| Sprint L | PR com 97 commits de divergência | Branch criada de estado antigo — sempre basear no `main` atual |
| 2026-03-31 | G17 INSERT silencioso | Enums inválidos + catch engolindo | Gate 1.5 R5 + Q6 |
| 2026-03-31 | Mistura de drivers | Drizzle ORM + raw SQL no mesmo arquivo | Gate 1.5 R2 + Q7 |
| 2026-04-04 | Schema diferente do esperado no MIG-001 | Skill sem regra para "realidade inesperada" — RRI adicionada |
| 2026-04-04 | FIX-TS2339 iniciado sem merge do MIG-001 | Definition of Done ausente — DoD adicionado |
| 2026-04-04 | Código editado em branch de docs | Regra de escopo de branch ausente — adicionada |
| 2026-04-07 | Gate Q7 implementado como tsc check | Manus interpretou validação de interface como TypeScript check (DIV-Z01-003) — `npx tsc --noEmit` não captura divergências de nomenclatura |

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

### Passo 0 — Fast path: 10 padrões conhecidos (verificar PRIMEIRO) — v5.0

Se o sintoma bater com padrão abaixo: gerar apenas o comando direto — não executar Passos 1–7.
**Meta v5.0:** 85%+ dos bugs resolvidos no Passo 0.

| Sintoma | Padrão | Comando direto |
|---|---|---|
| Lista retorna 0 após insert/upsert OK | `''` em vez de `NULL` | `SELECT campo FROM tabela WHERE campo = ''` |
| TiDB: "Incorrect arguments to LIMIT" | `LIMIT ?` via `conn.execute()` | `grep -n "LIMIT ?" server/` |
| TiDB: ORDER BY inválido | `SELECT DISTINCT` com `ORDER BY` fora do SELECT | `grep -n "DISTINCT" server/` |
| Endpoint 404 ou undefined | Router não registrado | `grep -n "NOME_ROUTER" server/routers.ts` |
| UI mostra vazio sem mensagem de erro | `isError` tratado igual a lista vazia | `grep -n "isError\|isLoading" client/src/pages/COMPONENTE.tsx` |
| Deploy não reflete código | Branch não mergeada em `main` | `git log main --oneline -3` |
| Query dispara múltiplas vezes | `queryInput` sem `useMemo` | `grep -n "useMemo\|queryInput" client/src/pages/COMPONENTE.tsx` |
| INSERT silencioso falha | Enums inválidos + catch engolindo | `grep -n "ausencia\|nao_compliant" server/lib/` |
| Script backfill falha | Import de router (side effects) | `grep -n "from.*routers" scripts/` |
| Mistura de drivers | Drizzle ORM + raw SQL | `grep -n "conn.execute\|\.insert(" FILE.ts` |

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

## Gate Q7 — Validação de Interface (v4.2)

> **ATENÇÃO:** Gate Q7 NÃO é TypeScript check.
> `npx tsc --noEmit` é cobertura de compilação, já existia antes.
> Gate Q7 é validação de nomenclatura de interface. São diferentes.

**Quando aplicar:** obrigatório antes de qualquer prompt de testes que
referencie tipos do sistema.

**Comando obrigatório:**
```bash
grep -rn "export interface\|export type\|export class" \
  server/lib/*.ts server/routers-fluxo-v3.ts \
  | grep -Ei "(diagnostic|briefing|gap|risk|cpie|tracked|question|score)" \
  | sort
```

**O que fazer:**
1. Retornar output ao Orquestrador
2. Orquestrador confronta com spec
3. Campo real ≠ spec → abrir DIV antes de prosseguir
4. Campo real = spec → Gate Q7 PASS

**No body do PR:**
```
## Gate Q7
Interfaces: [lista]
Divergências: [N] → [DIVs ou "nenhuma"]
Resultado: [ PASS | DIVERGÊNCIA DOCUMENTADA ]
```

---

## Regra DIV — Divergência de Spec v4.2

SE campo real ≠ campo da spec:
  → NUNCA adaptar assert silenciosamente
  → CRIAR docs/divergencias/DIV-{SPRINT}-{ID}-{campo}.md
  → PARAR o bloco afetado
  → REPORTAR ao Orquestrador com o arquivo

Prioridade:
  CRÍTICO: campo inexistente · tipo incompatível · array vs objeto
  ALTO:    nome diferente · campo opcional vs obrigatório
  MÉDIO:   valor enum diferente · ordem de campos

Histórico Z-01:
  DIV-Z01-001: DiagnosticLayer.layer vs cnaeCode → Opção A
  DIV-Z01-002: CpieScore hasData → Opção A
  DIV-Z01-003: Gate Q7 tsc vs grep → Opção B (corrigido)

---

## Próximas sprints sugeridas (Sprint O)

| Issue | Descrição | Prioridade | Onda |
|---|---|---|---|
| #187 | G11 — campo `fonte_risco` | P1 | Onda 3 |
| #192 | G15 — Arquitetura 3 ondas | P2 | Onda 3 |
| #190 | N8N-F1 — integração N8N | P3 | Onda 2 |
| L-RAG-02/04/05 | Próximas issues do backlog RAG | P3 | Onda 3 |

---

## Referências rápidas

- ESTADO-ATUAL: `docs/governance/ESTADO-ATUAL.md` (P0 — ler PRIMEIRO)
- BASELINE: `docs/BASELINE-PRODUTO.md`
- HANDOFF: `docs/HANDOFF-MANUS.md`
- GATE-CHECKLIST: `docs/GATE-CHECKLIST.md`
- GATE Q1–Q7 + R9 v5.0: `skills/solaris-orquestracao/SKILL.md` (seção "GATE DE QUALIDADE v5.0")
- GATES v5.0: `docs/GATES-DOCUMENTACAO-COMPLETA-v5.md`
- ADR-010: `docs/adr/ADR-010-content-architecture-98.md`
- ADRs: `docs/adr/` (criar NNNN-nome.md quando D2 = sim)
- MATRIZ I/O: `docs/product/cpie-v2/produto/MATRIZ-CANONICA-INPUTS-OUTPUTS.md`
- MANUS-GOVERNANCE: `.github/MANUS-GOVERNANCE.md`
- CONTRIBUTING: `.github/CONTRIBUTING.md`
- PROTOCOLO: `docs/governance/PROTOCOLO-CONTEXTO.md`
- POST-MORTEM TEMPLATE: `docs/governance/POST-MORTEM-TEMPLATE.md`
- FEATURE FLAGS: `server/config/feature-flags.ts`
