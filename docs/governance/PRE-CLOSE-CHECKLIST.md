# PRE-CLOSE-CHECKLIST — Validação de Issue Antes do Fechamento

> **Audiência:** Orquestrador (Claude) — executar ANTES de aceitar que um PR fecha uma issue.
> **Causa raiz:** Sprint Z-16 — #614 fechada por PR #639 (migration) sem UI implementada.
> **Regra:** Nenhuma issue é considerada CLOSED até passar nos 5 gates abaixo.

---

## Quando usar

- Antes de mergear PR que contém `Closes #N` / `Fixes #N`
- Antes de fechar issue manualmente
- No checkpoint pós-merge (validação retroativa)

---

## Gate PC-1 — Escopo do PR vs Escopo da Issue

```bash
# O que a issue pede?
gh issue view [N] --json title,body --jq '.title'

# O que o PR entrega?
gh pr view [PR] --json title,files --jq '{title, files: [.files[].path]}'
```

**Critério:** O PR toca os arquivos mencionados no Bloco 3 (Skeleton) da issue?

| Pergunta | Esperado |
|----------|----------|
| Issue é frontend? PR toca `client/src/`? | SIM |
| Issue é backend? PR toca `server/`? | SIM |
| Issue é migration? PR toca `drizzle/`? | SIM |
| PR toca APENAS docs/migrations mas issue pede UI? | **BLOQUEIO — PR não fecha a issue** |

---

## Gate PC-2 — data-testid implementados

```bash
# Extrair data-testid esperados da issue
gh issue view [N] --json body --jq '.body' | grep -o 'data-testid="[^"]*"' | sort -u

# Extrair data-testid presentes no componente
grep -o 'data-testid="[^"]*"' [arquivo_componente] | sort -u

# Gap
comm -23 <(issue_testids) <(component_testids)
```

**Critério:** Todos os data-testid listados no Bloco 9 da issue estão no componente?

| Gap | Ação |
|-----|------|
| 0 | PASS |
| 1–3 | Avaliar se são opcionais (defer P.O.) |
| > 3 | **BLOQUEIO — implementação incompleta** |

---

## Gate PC-3 — Critérios de Aceite (Bloco 7)

```bash
# Ler critérios de aceite da issue
gh issue view [N] --json body --jq '.body' | sed -n '/Bloco 7/,/Bloco 8/p'
```

**Critério:** Cada checkbox do Bloco 7 pode ser verificado no código?

Para cada critério:
1. Identificar o arquivo/linha que implementa
2. Se critério é `grep X = 0` → executar o grep
3. Se critério é `tsc 0 erros` → já coberto no CI
4. Se critério é comportamental → marcar como "E2E pendente"

| Resultado | Ação |
|-----------|------|
| Todos verificáveis | PASS |
| Algum sem evidência no código | **BLOQUEIO** |

---

## Gate PC-4 — Contrato API (Bloco 5)

```bash
# Procedures esperadas pela issue
gh issue view [N] --json body --jq '.body' | grep -i "procedure\|trpc\.\|mutation\|query"

# Procedures presentes no router
grep -n "protectedProcedure" server/routers/risks-v4.ts | head -20
```

**Critério:** Toda procedure mencionada no Bloco 5 existe e é chamada pelo componente?

```bash
# ORQ-10: Integration checkpoint
grep -n "trpc\." [componente] | head -20
# Cruzar com procedures da issue
```

| Resultado | Ação |
|-----------|------|
| 100% procedures chamadas | PASS |
| Procedure não chamada | **BLOQUEIO — F4.5 falha** |

---

## Gate PC-5 — Tipo de entrega vs Tipo de issue

Classificar o PR:

| Tipo PR | Exemplos | Pode fechar issue de frontend? | Pode fechar issue de engine? | Pode fechar issue de migration? |
|---------|----------|-------------------------------|-----------------------------|---------------------------------|
| `docs:` | Sprint Log, dicionários | NÃO | NÃO | NÃO |
| `db:` / `migration:` | ALTER TABLE, schema | NÃO | NÃO | SIM |
| `feat(engine):` | Score, PLANS | NÃO | SIM | NÃO |
| `feat(dashboard):` | UI componente | SIM (se toca o componente) | NÃO | NÃO |
| `feat(action-plan):` | UI componente | SIM (se toca o componente) | NÃO | NÃO |
| `fix:` | Bug fix | Depende do escopo | Depende do escopo | NÃO |

**Regra absoluta:** PR de migration/docs NUNCA fecha issue de UI/frontend.

---

## Comando rápido — validação em 1 minuto

```bash
# Substituir N pelo número da issue e PR pelo número do PR
N=614; PR=639

echo "=== PC-1: Escopo ==="
ISSUE_TITLE=$(gh issue view $N --json title --jq '.title')
PR_FILES=$(gh pr view $PR --json files --jq '[.files[].path] | join(", ")')
echo "Issue: $ISSUE_TITLE"
echo "PR files: $PR_FILES"

echo "=== PC-2: data-testid ==="
EXPECTED=$(gh issue view $N --json body --jq '.body' | grep -o 'data-testid="[^"]*"' | sort -u | wc -l)
echo "data-testid esperados na issue: $EXPECTED"

echo "=== PC-5: Tipo ==="
PR_TITLE=$(gh pr view $PR --json title --jq '.title')
echo "PR: $PR_TITLE"
echo "Issue frontend? $(echo $ISSUE_TITLE | grep -qi 'feat\|modal\|componente\|badge\|redirect' && echo SIM || echo NAO)"
echo "PR toca client/? $(echo $PR_FILES | grep -q 'client/' && echo SIM || echo NAO)"
```

---

## Exemplo: #614 teria sido barrada

```
PC-1: Issue pede "modal editar tarefa" → PR #639 toca drizzle/ apenas → FALHA
PC-2: Issue lista task-edit-modal, task-data-inicio-input → 0 no código → FALHA
PC-5: PR é db:/migration → Issue é frontend → FALHA

Resultado: 3/5 gates FALHAM → PR #639 NÃO fecha #614
```

---

## Gate PC-0 — Máximo 1 issue por PR

PR com múltiplas `Closes #N` é bloqueado automaticamente.
O script valida apenas a primeira issue — a segunda passaria sem checagem.
Separar em PRs individuais para validação correta de cada entrega.

---

## Inferência de tipo (GAP 3)

O script infere o tipo da issue por 3 fontes (em ordem):
1. Label `frontend` / `engine` (fonte primária)
2. Bloco 3 da issue: menção a `client/src/` ou `.tsx` → frontend; `server/` ou `procedure` → engine
3. Path dos arquivos no PR (para PC-5)

Isso elimina dependência de labels manuais que podem ser esquecidas.

---

### PC-6 — Validação de consumo (REGRA-ORQ-27 / Lição #59)

Se o PR afirma que engine X consome dado Y, existe:

- [ ] Teste com `vi.spyOn` no caller final (LLM/RAG) validando valor dinâmico, OU
- [ ] Citação arquivo:linha do prompt LLM final / contextQuery RAG final no PR body

Se PC-6 falha → **remover `Closes #N` do PR body**. PR de wiring incompleto NÃO fecha issue de "engine consome".

Origem: Sprint M3 (caso EMPRESA TRANSPORTE COMBUSTÍVEL) — 3 engines em dead code passaram PC-1..5.

---

## Integração no fluxo do Orquestrador

### Quando executar

```
F6 (implementação) → PR criado → F4.5 (integration checkpoint)
  → **PRE-CLOSE-CHECKLIST** ← NOVO
  → Merge → Issue fechada automaticamente
```

### Regra para CLAUDE.md

```
Antes de mergear qualquer PR com "Closes #N":
executar PRE-CLOSE-CHECKLIST gates PC-1..PC-6.
Se qualquer gate FALHA: remover "Closes #N" do PR body
e reportar ao Orquestrador.
```
