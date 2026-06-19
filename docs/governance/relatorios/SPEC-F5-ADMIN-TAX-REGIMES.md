# SPEC F5 — Admin SOLARIS · gestão de `tax_regimes` (ADR-0038)

**Gate UX (REGRA-ORQ-09)** · Componente-alvo: `client/src/pages/AdminSolarisQuestions.tsx` (1329 LOC) · Mockup: `docs/sprints/regime-tributario/MOCKUP_admin_tax_regimes.html`
**Status:** 🟡 aguardando aprovação P.O. (Gate UX) · **Veredito ux-spec-validator:** 🔴 BLOQUEAR até (a) UX_DICTIONARY + (b) escopo backend+frontend aprovado.

## 1. Contexto
A coluna `tax_regimes` existe (F1 #1517) e é consumida no runtime (F2/F3/F4). Falta o **write-side admin** (curadoria pelo Dr. José — D3) + o **display admin**. O `ux-spec-validator` confirmou que F5 é **0% implementado** e que **3 procedures backend não aceitam `tax_regimes`** → F5 é **backend CRUD + frontend** (UI-only não persistiria — REGRA-ORQ-27).

## 2. Pré-requisito de governança (Gate UX Passo 0)
A tela admin **não está** em `docs/governance/UX_DICTIONARY.md` (só há a tela do cliente). **Cadastrar entrada** antes/junto da issue: nome, path do componente, path desta spec, estado.

## 3. Escopo BACKEND (`server/routers/solarisAdmin.ts` — ⚠️ arquivo protegido pelo hook)
| Procedure | Linha | Mudança |
|---|---|---|
| `listQuestions` | `:227-229` (SELECT) | incluir `tax_regimes` no retorno (Tela 1) |
| `createQuestion` | input `:554-570` · INSERT `:596-605` | aceitar `tax_regimes?: string[] \| null` + persistir |
| `updateQuestion` | input `:500-511` · SET `:518-527` | aceitar `tax_regimes` + persistir (semântica null=universal) |

**Normalização canônica (helper):** `[] ` ou `["todos"]` ou ausente → **`null`** (universal). Só array de regimes válidos (`simples_nacional`/`lucro_presumido`/`lucro_real`) é persistido como array. (Garante backward-compat com `solaris-context-filter.ts:75`.)
**Nota:** editar `solarisAdmin.ts` dispara o hook `require-investigation` → registrar evidência (já investigado via ux-spec-validator) antes do Edit.

## 4. Escopo FRONTEND (`AdminSolarisQuestions.tsx`)
**Tela 1 — Listagem:**
- `<th data-testid="col-tax-regimes">Regimes</th>` após "Vigência" (`:496`).
- Célula: badges por regime (padrão `Badge variant="outline"` de `:548-555`); `null/[]` → badge "Todos".

**Tela 2 — Cadastro/Edição:**
- Multi-select `data-testid="input-tax-regimes"` com opções `data-testid="option-todos|option-simples_nacional|option-lucro_presumido|option-lucro_real"`.
- "Todos" = mutuamente exclusivo (limpa específicos) → envia `null`.
- Estender `createForm`/`resetCreateForm` (`:261-271`), `editForm`, `handleCreate` (`:301-311`), `handleSaveEdit` (`:246-256`) p/ carregar/enviar `tax_regimes`.

## 5. data-testid (contrato E2E)
`col-tax-regimes` · `input-tax-regimes` · `option-todos` · `option-simples_nacional` · `option-lucro_presumido` · `option-lucro_real`.

## 6. DoD
**Positivo:**
- [ ] `tsc 0`; coluna Regimes exibe badges + "Todos" p/ null.
- [ ] Criar/editar com regimes específicos → `SELECT tax_regimes FROM solaris_questions WHERE id=?` = array JSON.
- [ ] E2E: selecionar regimes → salvar → badge na listagem.

**Negativo (REGRA-ORQ-44):**
- [ ] Selecionar "Todos" → `tax_regimes IS NULL` (NÃO `[]`, NÃO `["todos"]`) — query SQL confirma. Preserva universal no filtro de runtime.

## 7. Não-implementar (anti scope-creep)
- `uploadCsv` (`solarisAdmin.ts:54`) — coluna `tax_regimes` no CSV é a **F6** (separada).
- Harmonizar `cnae_groups` (Input JSON) para multi-select — fora de escopo.

## 8. Classe / risco
Classe B (frontend + 3 procedures). Risco: médio (toca CRUD admin + arquivo protegido). Reversível (feature aditiva; coluna já existe).

## 9. Vinculadas
ADR-0038 · #1282 · REGRA-ORQ-09 (Gate UX) · REGRA-ORQ-27 (assemble≠consumption) · REGRA-ORQ-44 (DoD negativo) · Lição #137 · ux-spec-validator (relatório de gaps, 19/06).
