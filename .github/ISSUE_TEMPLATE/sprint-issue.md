---
name: Sprint Issue (Fluxo v1.1)
about: Template obrigatorio para issues de sprint
labels: ''
assignees: ''
---

## [ISSUE-XXX] — Titulo da feature/componente

**Sprint:** Z-XX | **Lote:** A/B/C | **Prioridade:** P0/P1/P2
**Executor principal:** Claude Code / Manus
**Esforco:** P (< 2h) / M (2-4h) / G (4h+)
**Dependencias:** Closes apos #N, #M

---

## Bloco 1 — Contexto

**O que:** [uma frase descrevendo o que sera feito]
**Por que:** [impacto no usuario se nao for feito]
**Aceite minimo:** [o minimo para esta issue ser considerada done]

---

## Bloco 2 — UX Spec

> REGRA: spec funcional OBRIGATORIA inline.
> Arquivo completo como referencia adicional.
> Implementador DEVE conseguir codar sem abrir o arquivo.

**Arquivo fonte:** `docs/sprints/Z-XX/UX_SPEC_XXX.md`

### Resumo funcional (obrigatorio inline)
[estados do componente, acoes disponiveis, validacoes, toasts]

### Estados
| Estado | Visual | Acoes disponiveis |
|---|---|---|

### Modais (se houver)
[descrever cada modal: campos, validacoes, botoes]

### Diagrama de estados (apenas se houver fluxo real)
```
estado_A → [acao] → estado_B
estado_B → [acao] → estado_C
```

> Se UI pura (sem transicao de estado): substituir por "N/A — UI sem estado"

---

## Bloco 3 — Skeleton

> Delta apenas — o que MUDA, nao a estrutura completa.
> Nao copiar codigo existente.

```tsx
// O que adicionar / modificar
// Indicar arquivo + linha aproximada de insercao
```

---

## Bloco 4 — Schema do banco

> OBRIGATORIO: dados reais de SHOW FULL COLUMNS.
> Nunca preencher de memoria.

| Tabela | Campo | Tipo | Observacao critica |
|---|---|---|---|

---

## Bloco 5 — Contrato API

| Procedure | Existe no router? | Chamada pelo componente? | Acao |
|---|---|---|---|
| `trpc.risksV4.xxx` | SIM/NAO | SIM/NAO | usar/criar/conectar |

---

## Bloco 6 — Estado atual do componente

> Gerado via grep — nao estimado manualmente.

**Arquivo:** `client/src/...`
**Linhas:** `wc -l resultado`
**Procedures chamadas:** `grep -c "trpc\." resultado`

| Funcionalidade | Status | Observacao |
|---|---|---|
| ... | implementado | ... |
| ... | ausente | ... |
| ... | parcial | ... |

---

## Bloco 7 — Criterios de aceite + Testes

> Criterios BINARIOS: pass/fail. Sem "deve funcionar bem".

### Criterios de aceite
- [ ] [criterio mensuravel 1]
- [ ] [criterio mensuravel 2]

### Plano de testes

| Teste | Tipo | Criterio PASS |
|---|---|---|
| T1: ... | Unit | ... |
| T2: ... | Integration | ... |
| T3: ... | UAT manual | ... |

---

## Bloco 8 — Armadilhas + Impacto (opcional)

> Preencher apenas quando houver historico relevante.

### 8a. Armadilhas conhecidas
> O que parece certo mas esta errado neste contexto.
- NAO usar `tipoOperacao` — usar `operationType` (B-Z13.5-002)
- NAO chamar `JSON.parse()` em campo JSON — usar `safeParseObject()` (B-Z13.5-001)

### 8b. Impacto em features existentes
> O que pode regredir com esta mudanca.
- Componente X usa a mesma procedure — verificar se mudanca afeta
- Migration afeta todos os projetos com schema legado

---

## Checklist de auditoria (preencher em F3)

- [ ] Bloco 1: contexto e dependencias claros
- [ ] Bloco 2: spec inline suficiente para implementar sem arquivo externo
- [ ] Bloco 3: skeleton mostra o delta (nao estrutura completa)
- [ ] Bloco 4: schema veio de SHOW FULL COLUMNS real
- [ ] Bloco 5: procedures com status confirmados
- [ ] Bloco 6: estado atual gerado via grep
- [ ] Bloco 7: criterios de aceite sao binarios
- [ ] Bloco 8: armadilhas documentadas (ou "N/A — sem historico relevante")

**Auditor:** @nome | **Data:** DD/MM/AAAA | **Resultado:** APROVADA / DEVOLVIDA
**Motivo se devolvida:** [...]
