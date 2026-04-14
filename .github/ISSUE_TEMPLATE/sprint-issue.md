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

### Fluxo relacionado (obrigatorio para frontend — REGRA-ORQ-13)

> Ver `docs/governance/FLOW_DICTIONARY.md` para o mapa completo.

**Step:** [numero] — [nome do step]
**Fluxo:** [step anterior] → [AQUI] → [step seguinte]
**Integracao upstream:** [de onde vem o usuario / componente anterior]
**Integracao downstream:** [para onde vai / componente seguinte]
**Triggers automaticos:** [useEffect ou outros, se aplicavel, ou "nenhum"]

### Efeitos cascata (obrigatorio se issue implementa uma acao — REGRA-ORQ-14)
**Efeito imediato:** [o que acontece no banco/estado]
**Efeito cascata:** [o que deve acontecer automaticamente depois]
**Formato dos dados:** [schema/enum/status exatos do resultado]
**Navegacao pos-acao:** [redirect? permanecer? qual rota?]

---

## Bloco 2 — UX Spec

> REGRA: spec funcional OBRIGATORIA inline.
> Arquivo completo como referencia adicional.
> Implementador DEVE conseguir codar sem abrir o arquivo.

**Arquivos de referencia obrigatorios:**

| Arquivo | Tipo | Uso |
|---|---|---|
| `docs/sprints/Z-XX/UX_SPEC_XXX.md` | Spec textual | estados, validacoes, toasts |
| `docs/sprints/Z-XX/MOCKUPS_XXX.md` | Mockup ASCII | layout, estrutura |
| `docs/sprints/Z-XX/MOCKUP_XXX.html` | Mockup interativo | estados reais, cores, seletores CSS |

> O mockup HTML e obrigatorio para issues de frontend.
> Abrir no browser antes de implementar — nao apenas ler o .md.
> Seletores no Bloco 9 devem ser baseados no HTML renderizado.
> Se o mockup HTML nao existe: solicitar ao Orquestrador ANTES de produzir a issue.

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

## Bloco 9 — Referencias de codigo (obrigatorio se componente existente >200L)

> Preencher com dados LIDOS DO CODIGO — nunca de memoria.
> Obrigatorio quando a issue toca componente existente com mais de 200 linhas.

### Procedure — schema Zod real
```typescript
// Colar trecho do router: input Zod schema
```

### Localizacao no componente
**Arquivo:** `client/src/...`
**Linha de insercao:** ~L[N] (apos/antes de [referencia])
**Estados existentes que podem conflitar:** [lista ou "nenhum"]

### Tipos TypeScript relevantes
```typescript
// Interfaces/tipos que o implementador vai usar
```

> Se a issue NAO toca componente existente (>200L): substituir por "N/A — componente novo ou <200L"

---

## ADR — Decisao arquitetural

> OBRIGATORIO — ou documentar "N/A" com justificativa.

**Decisao:** [uma frase descrevendo a decisao]
**Alternativas consideradas:**
- Opcao A: [descricao] — descartada por: [motivo]
- Opcao B: [descricao] — descartada por: [motivo]

**Tradeoffs aceitos:** [o que abrimos mao com esta decisao]

> Se nao ha decisao arquitetural: "N/A — issue de UI sem decisao estrutural. Segue padrao existente."

---

## Contrato de integracao

> OBRIGATORIO para issues que chamam procedures.

### Input
```typescript
// Tipo exato enviado pelo frontend
```

### Output (sucesso)
```typescript
// Tipo exato retornado pelo backend
```

### Output (erro)
| Cenario | Erro | Tratamento frontend |
|---|---|---|
| Validacao Zod | TRPC BAD_REQUEST | Toast vermelho |
| Nao encontrado | TRPC NOT_FOUND | Toast vermelho |
| Rede | timeout | Toast "Tente novamente" |

---

## Fluxo E2E completo

> OBRIGATORIO — passo a passo do usuario ate o banco.

```
USUARIO clica em [botao]
  -> frontend valida [campos]
  -> chama [procedure] com [input]
    -> backend valida com Zod
    -> executa [SQL]
    -> retorna [output]
  -> frontend recebe [output]
  -> atualiza [query]
  -> exibe [toast/feedback]

CENARIO DE ERRO:
  [passo que falha] -> [tratamento] -> [feedback]
```

---

## Checklist spec completa (para aplicar labels)

- [ ] `spec-bloco9` — Bloco 9 preenchido com dados do codigo
- [ ] `spec-adr` — ADR preenchido ou "N/A" documentado
- [ ] `spec-contrato` — Contrato com input/output/erro
- [ ] `spec-e2e` — Fluxo E2E passo a passo
- [ ] `spec-aprovada` — P.O. aprovou (ULTIMA label — so apos as 4 anteriores)

---

## Checklist de auditoria (preencher em F3)

- [ ] Bloco 1: contexto e dependencias claros
- [ ] Bloco 1: step do fluxo declarado? upstream/downstream documentados? (REGRA-ORQ-13)
- [ ] Bloco 1: efeitos cascata documentados (4 elementos)? (REGRA-ORQ-14)
- [ ] Bloco 7: criterio para cada efeito cascata?
- [ ] Bloco 7: invariante do estado final verificavel?
- [ ] Bloco 2: spec inline suficiente para implementar sem arquivo externo
- [ ] Bloco 3: skeleton mostra o delta (nao estrutura completa)
- [ ] Bloco 4: schema veio de SHOW FULL COLUMNS real
- [ ] Bloco 5: procedures com status confirmados
- [ ] Bloco 6: estado atual gerado via grep
- [ ] Bloco 7: criterios de aceite sao binarios
- [ ] Bloco 8: armadilhas documentadas (ou "N/A — sem historico relevante")
- [ ] Bloco 9 (se componente existente >200L): Zod schema lido do router? Linha de insercao documentada? Tipos TS confirmados?
- [ ] Gate 0 verificacao dupla: SHOW FULL COLUMNS cruzado com migration? (migration e fonte de verdade)

**Auditor:** @nome | **Data:** DD/MM/AAAA | **Resultado:** APROVADA / DEVOLVIDA
**Motivo se devolvida:** [...]
