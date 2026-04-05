---
name: solaris-orquestracao
version: v3.2
description: "Skill operacional do Manus para o projeto IA SOLARIS Compliance Tributária. Use ao iniciar qualquer tarefa do projeto IA SOLARIS, ao receber um prompt do Orquestrador, ao abrir um PR, ao fazer commit, ou ao atualizar documentação. Contém checklist de início de tarefa, padrões de commit, template de PR, obrigações de baseline, Gate de Qualidade Q1–Q7 + R9/R10 + Risk Score (v5.0), bloqueios permanentes e checklist de geração de prompts (GOV-03 v3.2)."
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

## Checklist antes de gerar prompt para o Manus (GOV-03 v3.2)

Antes de gerar qualquer prompt de execução:

- [ ] O prompt inclui Gate Q8 para tasks de schema? (SHOW CREATE TABLE / cat arquivo)
- [ ] O prompt declara explicitamente quais arquivos podem ser tocados?
- [ ] O prompt declara a condição de avanço para próxima task?
- [ ] O prompt inclui instrução de "se encontrar X diferente, reportar via RRI"?

Prompt sem esses itens para tasks de schema = prompt incompleto.

**Bloco obrigatório em prompts de schema/banco:**

```markdown
### Gate Q8 — Verificar premissas antes de executar

```bash
# Executar ANTES de qualquer ação
SHOW CREATE TABLE [tabela_envolvida];
# OU
cat [arquivo_envolvido] | head -50
```

⚠️ Se o resultado diferir do esperado abaixo, aplicar Regra RRI:
reportar ao Orquestrador e aguardar decisão antes de continuar.

Esperado: [descrever o que o prompt assume]
```

Este bloco entra em TODOS os prompts de Bloco A (infra/schema)
e Bloco C (engine) do Milestone 1.

---

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

## Bloqueios permanentes (nunca executar sem aprovação do P.O.)

- ❌ NÃO ativar `DIAGNOSTIC_READ_MODE=new`
- ❌ NÃO executar F-04 Fase 3 (Issue #56)
- ❌ NÃO executar DROP COLUMN colunas legadas (Issue #62)
- ❌ NÃO iniciar B2 sem prompt do Orquestrador
- ✅ G17 CONCLUÍDO (Sprint N) — `analyzeSolarisAnswers` em `server/lib/solaris-gap-analyzer.ts` conecta `solaris_answers` ao `project_gaps_v3`
- ❌ NÃO implementar G11 (fonte_risco) sem prompt do Orquestrador

## Padrão de reporte ao Orquestrador

Antes de implementar: responder perguntas críticas com evidências de código (grep/leitura).
Após implementar: reportar com tabela: arquivos alterados, testes passando (número exato),
double-run executado, PR aberto com link.

---

## GATE DE QUALIDADE v5.0 — Obrigatório antes de qualquer commit

> ⚠️ **REGRA ABSOLUTA**
> Nenhum commit pode ser feito sem passar por este gate.
> Nenhum PR pode ser aberto sem a Declaração Q1–Q7 + R9 + S6 no body.
> PR sem a declaração → BLOQUEADO pelo Orquestrador.
> Ref: docs/GATES-DOCUMENTACAO-COMPLETA-v5.md

---

### Q1 — Tipos nulos e campos opcionais

Campos opcionais nunca gravam `''`, `0` ou valor sentinela no banco.

**❌ PROIBIDO:**
```typescript
campo: z.string().optional()
// grava '' quando vazio → quebra filtros IS NULL → bug silencioso
```

**✅ OBRIGATÓRIO:**
```typescript
campo: z.string().optional().transform(v => v?.trim() || null)
// grava NULL quando vazio → filtros IS NULL funcionam
```

Checklist Q1:
- [ ] Todo `z.string().optional()` tem `.transform(v => v?.trim() || null)`
- [ ] Todo `z.number().optional()` não usa `0` como placeholder
- [ ] Campo de data opcional não armazena `''`
- [ ] Confirmar: `SELECT campo FROM tabela WHERE campo = ''` → retorna 0 linhas

---

### Q2 — SQL com DISTINCT (TiDB Cloud)

TiDB rejeita `ORDER BY` em coluna ausente do `SELECT` com `DISTINCT`.

**❌ PROIBIDO:**
```sql
SELECT DISTINCT p.id, p.name FROM projects ORDER BY p.updatedAt
-- TiDB rejeita: updatedAt fora do SELECT com DISTINCT
```

**✅ OBRIGATÓRIO:**
```sql
SELECT p.id, p.name, MAX(p.updatedAt) as updatedAt
FROM projects GROUP BY p.id, p.name ORDER BY updatedAt DESC
```

**TiDB também rejeita `LIMIT ?` e `OFFSET ?` como parâmetros bind via `conn.execute()`:**

**❌ PROIBIDO:**
```typescript
conn.execute(`SELECT ... LIMIT ? OFFSET ?`, [...params, pageSize, offset])
// TiDB lança: Incorrect arguments to LIMIT
```

**✅ OBRIGATÓRIO:**
```typescript
const limitSafe  = parseInt(String(input.pageSize ?? input.limit ?? 20), 10);
const offsetSafe = parseInt(String(offset ?? 0), 10);
conn.execute(`SELECT ... LIMIT ${limitSafe} OFFSET ${offsetSafe}`, params)
// params: apenas os parâmetros do WHERE — sem limit/offset
```

Checklist Q2:
- [ ] `grep -n "SELECT DISTINCT\|distinct:" ARQUIVO` → verificar todo `DISTINCT`
- [ ] `ORDER BY` usa apenas colunas do `SELECT`
- [ ] Se não: refatorar para `GROUP BY + MAX()` antes do commit
- [ ] `grep -n "LIMIT ?\|OFFSET ?" server/routers/` → deve retornar vazio (ou apenas pool.query)

---

### Q3 — Filtros de ausência de valor

Filtros que testam ausência cobrem **NULL e string vazia**.

**❌ FRÁGIL:**
```typescript
where: isNull(table.campo)  // não encontra '' → falso negativo
```

**✅ ROBUSTO:**
```typescript
where: or(isNull(table.campo), eq(table.campo, ''))
// Preferível: garantir via Q1 que '' nunca entra no banco
```

Checklist Q3:
- [ ] Filtros "sem valor" cobrem `IS NULL` e `= ''`
- [ ] Ou Q1 garante que `''` nunca é gravado (preferível)
- [ ] Testar com dado `NULL` e dado `''` separadamente

---

### Q4 — Endpoint registrado e acessível
```bash
grep -n "NOME_DO_ROUTER" server/routers.ts      # router importado?
grep -n "NOME_DA_PROCEDURE" server/routers/ARQUIVO.ts  # procedure existe?
```

Checklist Q4:
- [ ] Router importado em `server/routers.ts`
- [ ] Procedure existe com nome exato que o frontend chama
- [ ] Testado manualmente antes do commit

---

### Q5 — Cobertura mínima de testes

| Caso obrigatório | Exemplo |
|---|---|
| Caminho feliz | dado válido → resultado esperado |
| Campo vazio/opcional | `''` ou `undefined` → grava `NULL`, não explode |
| Filtro sem resultado | query com 0 resultados → retorna `[]`, não erro |

Checklist Q5:
- [ ] Caminho feliz testado
- [ ] Campo opcional testado com valor vazio → grava `NULL`
- [ ] Filtro com 0 resultados → retorna array vazio
- [ ] `pnpm test` passando

---

### Q6 — Retorno explícito em server/lib/ (novo v5.0)

Funções async em `server/lib/` que persistem dados NUNCA retornam `void`.

**❌ PROIBIDO:**
```typescript
async function insertGaps(projectId: number): Promise<void> { ... }
// void impossível de validar via SELECT
```

**✅ OBRIGATÓRIO:**
```typescript
async function insertGaps(projectId: number): Promise<{ inserted: number }> {
  // ...
  return { inserted: rows.length };
}
// Validar: SELECT COUNT(*) FROM tabela WHERE projectId = N → deve = inserted
```

---

### Q7 — Driver único por arquivo (novo v5.0)

Cada arquivo em `server/lib/` usa OU Drizzle ORM OU raw SQL — nunca ambos.

**Declarar no PR body:**
```
Q7 — Driver: [ Opção A — raw MySQL | Opção B — Drizzle ORM | Opção C — Drizzle raw ]
```

**Verificação:**
```bash
grep -c "\.insert(\|\.update(\|\.delete(" ARQUIVO.ts  # ORM
grep -c "conn\.execute\|pool\.execute" ARQUIVO.ts    # raw
# Ambos > 0 → BLOQUEADO
```

---

### R9 — Observabilidade obrigatória em funções de persistência (novo v5.0)

Toda função em `server/lib/` que persiste dados emite 3 eventos estruturados:

```typescript
// Início
console.log(JSON.stringify({ event: 'modulo.operacao.iniciada', projectId, ts: Date.now() }));
// Sucesso
console.log(JSON.stringify({ event: 'modulo.operacao.concluida', projectId, inserted: N, durationMs }));
// Falha
console.error(JSON.stringify({ event: 'modulo.operacao.falhou', projectId, error: String(err) }));
```

---

### R10 — Feature flag para risco medium/high (novo v5.0)

Se Gate 0 D3 classificou a feature como medium ou high, envolver em feature flag:

```typescript
import { isFeatureEnabled } from '../config/feature-flags';

if (!isFeatureEnabled('nome-da-feature', projectId)) {
  return { inserted: 0, skipped: true };
}
```

Registrar em `server/config/feature-flags.ts`.

---

### RISK SCORE — Gate 2.5 (novo v5.0)

| Critério | Pontos |
|---|---|
| Novo arquivo em `server/lib/` | +1 |
| Nova migration | +2 |
| Alteração em pipeline de dados existente | +2 |
| Integração com sistema externo | +2 |
| Mudança em enum global | +2 |
| Fire-and-forget sem teste de integração | +1 |
| Feature flag ausente (risco medium/high) | +1 |

**Score 0–2:** low → CI verde + merge P.O.
**Score 3–4:** medium → revisão Claude + merge P.O.
**Score 5+:** high → revisão Claude + parecer ChatGPT + merge P.O.

---

### Declaração obrigatória — copiar em todo PR body
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

---

## PROTOCOLO DE DEBUG v2 — Gate 3 (v5.0)

### Passo 0 — Fast path (10 padrões — resolver antes de investigar)

| Sintoma | Padrão | Comando direto |
|---|---|---|
| Lista retorna 0 após insert OK | `''` em vez de NULL | `SELECT campo FROM t WHERE campo = ''` |
| TiDB: "Incorrect arguments to LIMIT" | `LIMIT ?` via conn.execute() | `grep -n "LIMIT ?" server/` |
| TiDB: ORDER BY inválido | DISTINCT + ORDER BY fora do SELECT | `grep -n "DISTINCT" server/` |
| Endpoint 404 | Router não registrado | `grep -n "NOME" server/routers.ts` |
| UI vazia sem mensagem | `isError` = lista vazia | `grep -n "isError" client/` |
| Deploy não reflete | Branch não mergeada | `git log main --oneline -3` |
| Query múltiplas vezes | `queryInput` sem `useMemo` | `grep -n "useMemo" client/` |
| INSERT silencioso falha | Enums inválidos + catch engolindo | `grep -n "ausencia\|nao_compliant" server/lib/` |
| Script backfill falha | Import de router (side effects) | `grep -n "from.*routers" scripts/` |
| Mistura de drivers | Drizzle ORM + raw SQL | `grep -n "conn.execute\|\.insert(" FILE.ts` |

**Meta v5.0:** 85%+ dos bugs resolvidos no Passo 0.

---

### Passo 1 — Diagrama do fluxo (obrigatório antes dos comandos)
```
[origem] → [transformação] → [banco]
                                   ↓
                          [query] → [API] → [frontend]

DADO CONFIRMADO EM: [ ] banco  [ ] API  [ ] frontend
DADO AUSENTE EM:    [ ] banco  [ ] API  [ ] frontend
BUG ESTÁ NA CAMADA: ______
```

### Passo 2 — Hipóteses ranqueadas
```
H1 (mais provável): [hipótese]
    Comando: [1 comando único]
    Confirma se: [resultado]
    Nega se:     [resultado]

H2: [hipótese] — Comando: [comando]
H3: [hipótese] — Comando: [comando]
```

### Passo 3 — Executar tudo de uma vez
```bash
# CAMADA 1 — Banco (dado existe e tem valor correto?)
SELECT codigo, campo_suspeito, ativo FROM tabela LIMIT 10;
SELECT COUNT(*) FROM tabela WHERE campo_suspeito = '';

# CAMADA 2 — Backend (filtro oculto na procedure?)
grep -n "IS NULL\|= ''\|ativo\|where\|findMany" server/routers/ARQUIVO.ts

# CAMADA 3 — Mapeamento (campos mapeados corretamente?)
grep -n "transform\|optional\|default\|campo_suspeito" server/routers/ARQUIVO.ts

# CAMADA 4 — Frontend (filtro client-side?)
grep -n "filter\|where\|ativo\|role\|guard" client/src/pages/COMPONENTE.tsx
```

### Passo 4 — Formato de resposta (apenas isso)
```
CAMADA 1 — Banco:      [output bruto]
CAMADA 2 — Backend:    [output bruto]
CAMADA 3 — Mapeamento: [output bruto]
CAMADA 4 — Frontend:   [output bruto]
Hipótese confirmada:   H__ — [1 linha]
Correção:              [1 linha]
```

❌ Não interpretar além do formato.
❌ Não alterar arquivos sem autorização do Orquestrador.

---

## Padrões específicos do stack SOLARIS

### Drizzle ORM — upsert com campos opcionais
```typescript
// ❌ PROIBIDO
await db.insert(table).values({ campo: row.campo })

// ✅ OBRIGATÓRIO — normalizar antes
const valor = row.campo?.trim() || null;
await db.insert(table).values({ campo: valor })
```

### tRPC — tipo de retorno explícito
```typescript
// Declarar nullable, não optional — evita serialização ambígua
campo: z.string().nullable()  // não z.string().optional()
```

### TiDB — DISTINCT com ORDER BY
```typescript
// ❌ PROIBIDO
db.selectDistinct({ id: t.id }).from(t).orderBy(t.updatedAt)

// ✅ OBRIGATÓRIO
db.select({ id: t.id, updatedAt: max(t.updatedAt) })
  .from(t).groupBy(t.id).orderBy(desc(max(t.updatedAt)))
```

---

## Erros recorrentes documentados

| Data | Bug | Causa raiz | Padrão preventivo |
|---|---|---|---|
| 2026-03-30 | `listQuestions` retorna 0 após upsert OK | `vigencia_inicio = ''` em vez de `NULL` | Q1 obrigatório |
| 2026-03-30 | TiDB rejeita query do `scoringEngine` | `SELECT DISTINCT` com `ORDER BY` fora do SELECT | Q2 obrigatório |
| 2026-03-31 | `listQuestions` retorna HTTP 500, UI exibe "0 de 0" | TiDB rejeita `LIMIT ?`/`OFFSET ?` via `conn.execute()` | Q2 — interpolar `LIMIT ${parseInt(...)}` |
| 2026-03-31 | Onda 2 não avança para Corporativo (BUG-UAT-03) | `completeOnda2` salva status de origem em vez de destino | Toda procedure `completeOndaX` deve gravar o status DESTINO, não o status atual |
| 2026-03-31 | DiagnosticoStepper exibe "SOL-001 a SOL-012" hardcoded (BUG-UAT-05) | Contagem de perguntas hardcoded em vez de dinâmica | Buscar contagem do banco — nunca hardcodar range de códigos de pergunta |
| Sprint K | Deploy não reflete implementação | Branch não mergeada em `main` antes do teste | Checklist de início |
| Sprint L | PR com 97 commits de divergência | Branch criada de estado antigo | Sempre basear no `main` atual |
| 2026-03-31 | Briefing pobre mesmo com projeto `aprovado` | `gapEngine` lê `questionnaireAnswersV3` (V1), não `solaris_answers` (V3) — dois pipelines paralelos não conectados | G17 Sprint N — não tentar conectar sem prompt do Orquestrador |
| 2026-03-31 | G17 INSERT silencioso | Enums inválidos + catch engolindo erro | Gate 1.5 R5 + Q6 — retorno explícito |
| 2026-03-31 | Script backfill side effects | Import de router em script | Gate 1.5 R1 — scripts isolados |
| 2026-03-31 | Mistura de drivers | Drizzle ORM + raw SQL no mesmo arquivo | Gate 1.5 R2 + Q7 — driver único |
| 2026-03-31 | `void` impossível de validar | `Promise<void>` em função de persistência | Gate 1.5 R4 + Q6 — retorno explícito |

> Atualizar esta tabela a cada bug encontrado em produção ou UAT.
> Gate 4 obrigatório após qualquer bug em produção — template: `docs/governance/POST-MORTEM-TEMPLATE.md`

---

## Segurança — Regra permanente sobre tokens

**NUNCA** incluir tokens completos em reports ou mensagens.
Formato obrigatório: `ghp_****...****` (mascarado).
Tokens expostos em texto ficam no histórico — risco de segurança mesmo expirados.

---

## Referências

- ESTADO-ATUAL: docs/governance/ESTADO-ATUAL.md (P0 — ler PRIMEIRO)
- BASELINE: docs/BASELINE-PRODUTO.md
- HANDOFF: docs/HANDOFF-MANUS.md
- PROTOCOLO: docs/governance/PROTOCOLO-CONTEXTO.md
- GATE-CHECKLIST: docs/GATE-CHECKLIST.md
- GATES v5.0: docs/GATES-DOCUMENTACAO-COMPLETA-v5.md
- GOVERNANCE: .github/MANUS-GOVERNANCE.md
- CONTRIBUTING: .github/CONTRIBUTING.md
- ADR-010: docs/adr/ADR-010-content-architecture-98.md
- POST-MORTEM TEMPLATE: docs/governance/POST-MORTEM-TEMPLATE.md
- FEATURE FLAGS: server/config/feature-flags.ts
- CI VALIDATE: .github/workflows/validate-implementation.yml
