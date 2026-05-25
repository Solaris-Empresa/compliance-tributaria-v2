# ADR-ARCH-01 — Governança do Modelo Tributário

**Status:** Accepted
**Data:** 2026-05-25
**Autores:** P.O. + Consultor Jurídico + Manus

---

## Contexto

8 categorias criadas em 1 sprint (FASE 4). O sistema saiu de
"assistente tributário" para "motor tributário multicamada".
Sintomas:
- `cnae_codes`, `vigencia_inicio`, `normative_status`, `cnae_filter`
  todos no bundle/coluna
- `severidade`/`tipo` preenchidos como placeholder (não consumidos)
- categorias grounding-only não aparecem na matriz → divergência
  briefing × matriz possível

## Decisão atual (FASE 4)

1. Categorias FASE 4 = grounding-only.
   NÃO acopladas ao engine/matriz nesta sprint.
2. `severidade`/`tipo` = placeholder "oportunidade".
   NÃO consumir sem decisão P.O. explícita.
3. Gate CNAE+vigência em `shouldInjectCategory()` = runtime.
   `pending_vigency` flip em 2027 = cosmético.
4. Coupling no engine = sprint futura (Lição #88).

## Consequências

- Briefing pode citar Art. 234 (reabilitacao_urbana).
  Matriz NÃO mostra essa categoria. Divergência conhecida e aceita.
- Gatilho para revisão: > 15 categorias grounding-only
  OU smoke detectar divergência briefing × matriz.

## Decisão futura (backlog P2)

Definir regra: quando criar categoria vs subtipo vs benefit_type.
Avaliar modelo:
  `{ categoria, subtipo, benefit_type, benefit_scope }`
Avaliar `benefit_engine_v1` quando volume justificar.

## Referências

- Consultor Jurídico: crítica FASE 4 (explosão combinatória normativa)
- Manus: crítica FASE 4 (severidade/tipo acoplamento latente)
- Lição #88: coupling no engine diferido
- Lição #93: migrations manuais pós-merge

---

## Nota de implementação (Claude Code, 2026-05-25)

**Precisão sobre o item 3 (Decisão atual) — `pending_vigency` flip em 2027:**

A afirmação "flip = cosmético" vale para categorias **`confirmed`** com
`vigencia_inicio` futura — aí o gate `shouldInjectCategory()` bloqueia em runtime,
e o flip apenas alinha o dado.

Porém as 3 categorias diferidas da FASE 4 (`credito_presumido_reciclagem`,
`credito_presumido_bens_usados`, `regime_diferenciado_produtor_rural_credito`)
estão como **`pending_vigency`** — e o `fetchDeterministicGrounding` filtra
`WHERE normative_status = 'confirmed'` (deterministic-grounding.ts), ou seja, **a
query nem alcança essas categorias**. Logo, para elas o **flip de 2027 é
NECESSÁRIO** (não cosmético) — é o gatilho real que as faz entrar no grounding.

Decisão preservada; apenas o mecanismo do flip é necessário (query-level), não
cosmético (gate-level), para o subconjunto `pending_vigency`. Ver
`docs/deploy/FASE-4-runbook.md` §7.
