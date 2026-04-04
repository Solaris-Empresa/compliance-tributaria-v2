---
name: solaris-orquestracao
version: v3.0
description: "Skill operacional do Manus para o projeto IA SOLARIS Compliance Tributária. Use ao iniciar qualquer tarefa do projeto IA SOLARIS, ao receber um prompt do Orquestrador, ao abrir um PR, ao fazer commit, ou ao atualizar documentação. Contém checklist de início de tarefa, padrões de commit, template de PR, obrigações de baseline, Gate de Qualidade Q1–Q5 e bloqueios permanentes."
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

## Padrão de reporte ao Orquestrador

Antes de implementar: responder perguntas críticas com evidências de código (grep/leitura).
Após implementar: reportar com tabela: arquivos alterados, testes passando (número exato),
double-run executado, PR aberto com link.

---

## GATE DE QUALIDADE — Obrigatório antes de qualquer commit

> ⚠️ **REGRA ABSOLUTA**
> Nenhum commit pode ser feito sem passar por este gate.
> Nenhum PR pode ser aberto sem a Declaração Q1–Q5 no body.
> PR sem a declaração → BLOQUEADO pelo Orquestrador.

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

### Declaração obrigatória — copiar em todo PR body
```
## Auto-auditoria Q1–Q5

Q1 — Tipos nulos:         [ OK | BLOQUEADO ] — [evidência]
Q2 — SQL DISTINCT TiDB:   [ OK | N/A ]       — [evidência]
Q3 — Filtros NULL/empty:  [ OK | BLOQUEADO ] — [evidência]
Q4 — Endpoint registrado: [ OK | BLOQUEADO ] — [evidência]
Q5 — Testes mínimos:      [ OK | BLOQUEADO ] — [N testes / casos cobertos]

Resultado: [ APTO PARA COMMIT | BLOQUEADO — corrigir antes ]
```

---

## PROTOCOLO DE DEBUG — Máximo 1 rodada de investigação

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
| Sprint K | Deploy não reflete implementação | Branch não mergeada em `main` antes do teste | Checklist de início |
| Sprint L | PR com 97 commits de divergência | Branch criada de estado antigo | Sempre basear no `main` atual |

> Atualizar esta tabela a cada bug encontrado em produção ou UAT.

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
- GOVERNANCE: .github/MANUS-GOVERNANCE.md
- CONTRIBUTING: .github/CONTRIBUTING.md
- ADR-010: docs/adr/ADR-010-content-architecture-98.md
