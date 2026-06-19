# SPEC CNAE-ADMIN-01 — exibir + CRUD de `cnae_groups` no Admin SOLARIS

**Gate UX (REGRA-ORQ-09)** · Componente: `client/src/pages/AdminSolarisQuestions.tsx` · Backend: `server/routers/solarisAdmin.ts` (**protegido** → require-investigation) · Mockup: `docs/sprints/cnae-admin-01/MOCKUP_admin_cnae_groups.html`
**Status:** 🟡 aguardando aprovação P.O. (Gate UX) · **Classe B** · **Origem:** despachos Claude Code + Manus (19/06), grep determinístico

## Contexto
A coluna `cnae_groups` existe há muito (`solaris_questions`), mas o Admin **nunca a exibiu** e **não permite editá-la** — assimetria vs `tax_regimes` (F5). F7-C (template CSV, #1527) já mergeado. Esta spec cobre **F7-A** (exibir) + **F7-B** (CRUD edit). F7-D (onda1Injector) = issue #1528 (P3).

## Gaps (verificados, `arquivo:linha`)
| Gap | Evidência |
|---|---|
| F7-A backend | `listQuestions` SELECT (`solarisAdmin.ts:241-243`) não inclui `cnae_groups` |
| F7-A frontend | tabela (`AdminSolarisQuestions.tsx:573-579`) sem coluna CNAE |
| F7-B frontend | `editForm` sem `cnae_groups`; `handleSaveEdit` não envia (só create tem — `:966-971`) |
| F7-B backend | `updateQuestion` Zod (`solarisAdmin.ts` ~520-537) não aceita `cnae_groups` |

## Fases
| Fase | Entregável | Arquivo |
|---|---|---|
| **G1** backend leitura | `cnae_groups` no SELECT de `listQuestions` + no return type | `solarisAdmin.ts:241` |
| **G2** backend escrita | `updateQuestion`: Zod `cnae_groups` + setClause (normalização igual ao create/CSV) | `solarisAdmin.ts` updateQuestion |
| **G3** frontend exibir | coluna "Grupos CNAE" (entre Regimes e Código do Risco); badges; null/[] → "Todos os CNAEs"; `data-testid="col-cnae-groups"` | `AdminSolarisQuestions.tsx` |
| **G4** frontend editar | `cnae_groups` no `editForm` + `openEditModal` (parse) + chip-input (create **e** edit) + envio no `handleSaveEdit`; `data-testid="input-cnae-groups"` / `cnae-chip-{i}` | idem |

## Decisões incorporadas
- **D1 (resolvida):** `area`→`categoria` corrigido no template (F7-C #1527).
- **Formato de armazenamento:** `cnae_groups` = **JSON array string** (igual ao create atual). O chip-input monta `JSON.stringify(chips)`; vazio → `null`. *(Nota: a UI/create usa JSON; o CSV usa `;`-separado — F7-C. A normalização do `updateQuestion` deve aceitar o mesmo formato do create.)*
- **"Excluir grupo" (D2):** = editar removendo chips (deixar universal) → `null`. Não há delete granular de linha.
- **UX:** chip-input aberto (CNAE não é lista fixa, ≠ regime). Espelha o visual do `TaxRegimesMultiSelect` (F5).

## data-testid
`col-cnae-groups` · `input-cnae-groups` · `cnae-chip-{i}` · `cnae-chip-remove-{i}`.

## DoD
**Positivo:**
- [ ] `tsc 0`; listagem exibe grupos CNAE (badges / "Todos os CNAEs").
- [ ] editar pergunta + salvar grupos → `SELECT cnae_groups` reflete (JSON array).
- [ ] teste de `updateQuestion` com `cnae_groups` (REGRA-ORQ-28).

**Negativo (REGRA-ORQ-44 · Lição #138 — exercitar a escrita):**
- [ ] editar pergunta para **sem grupos** (remover todos os chips) → `SELECT cnae_groups WHERE id=? ` = **NULL** (não `[]`, não `["todos"]`).
- [ ] editar pergunta adicionando grupo específico → `cnae_groups` = `["28"]` (JSON array). Confirmar os 2 estados via SQL.

## Classe / risco
Classe B (frontend + 2 procedures). Risco **médio** (CRUD admin + `solarisAdmin.ts` protegido). Aditivo/reversível; coluna já existe.

## Não-implementar (anti scope-creep)
- F7-D (onda1Injector regime) = issue #1528 (P3).
- Autocomplete de CNAEs conhecidos (P3 opcional, despacho) — fora do MVP.
- Harmonizar formato create (JSON) vs CSV (`;`) — fora de escopo (ambos chegam a JSON array no banco).

## Vinculadas
CNAE-ADMIN-01 · ADR-0038 · REGRA-ORQ-09/27/28/44 · Lição #137/#138 · F7-C #1527 · F7-D #1528 · F5 (paridade de padrão).
