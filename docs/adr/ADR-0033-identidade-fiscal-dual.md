# ADR-0033 — Identidade Fiscal Dual (CPF/CNPJ)

**Status:** ACCEPTED
**Data:** 2026-05-29
**Sprint:** BUG-AGRO-CPF F3 (`feat/bug-agro-cpf-f3-hash`)
**Par:** ADR-0032 (Versionamento do Snapshot do Perfil da Entidade) · ADR-0031 (Imutabilidade)
**Issue:** #1290
**PRs:** #1292 (F0 schema) · #1293 (F1 Zod) · #1294 (F2 UI) · F3 (esta)

---

## Contexto

A plataforma exigia CNPJ exclusivamente no cadastro de projetos. **Art. 164 LC 214/2025** reconhece o produtor rural Pessoa Física como sujeito tributário válido — identificado por **CPF**. Plataforma exclui 100% dos PF agro: 0 projetos com workaround CNPJ fake confirmado (Gate 2 F0).

A correção atravessa 6 camadas (F0-F5):
- F0 — schema + runbook (PR #1292)
- F1 — `validateCpf` + Zod refine dual (PR #1293)
- F2 — UI radio PJ/PF + input CPF condicional (PR #1294)
- **F3 — `perfilHash` null-safe + identidade fiscal dual (este ADR)**
- F4 — PDF + briefing
- F5 — testes + UX_DICTIONARY

Esta ADR documenta o contrato canônico de **identidade fiscal dual** introduzido em F3, garantindo retrocompat byte-a-byte com ADR-0032.

---

## Decisão

### D-1 — Nomenclatura canônica

| Campo | Tipo | Semântica |
|---|---|---|
| `taxIdType` | `'cnpj' \| 'cpf'` | Discriminador do tipo de identidade fiscal |
| `taxId` | `string` | Valor unificado (CPF ou CNPJ) — usado por `perfilHash` para distinção |
| `cpf` | `string` | CPF formatado (`"000.000.000-00"`) — presente quando `taxIdType='cpf'` |
| `cnpj` | `string` | CNPJ formatado (`"00.000.000/0000-00"`) — **deprecated** mantido para retrocompat |

**Justificativa da nomenclatura:**
- `taxIdType`/`taxId` (não `subjectType`/`documentNumber` como Manus propôs) — consistente com literatura técnica internacional; aprovado pelo P.O. em 29/05/2026 10:55.
- `cpf`/`cnpj` mantidos como campos espelho — facilita leitura por consumers downstream (briefing, PDF, exportação) sem refatorar tudo de uma vez.

### D-2 — Default retrocompat

`taxIdType` default = `'cnpj'` quando ausente no payload:
- Frontend legacy (sem `VITE_ENABLE_TAX_ID_DUAL=true`) continua enviando apenas `cnpj`
- Zod F1 aceita via `.default('cnpj')` no `companyProfile`
- `perfilHash` F3: `if (input.taxIdType !== undefined)` — registros sem taxIdType produzem **canonical idêntico ao pré-F3** → hash byte-a-byte preservado

### D-3 — Derivação automática (`perfilHash` F3)

Em `computePerfilHash`, quando `taxIdType` está explícito:

```typescript
const effectiveTaxId = (
  input.taxId ?? input.cpf ?? input.cnpj ?? UNKNOWN_TAX_ID
).trim();
```

Ordem de preferência:
1. `taxId` explícito (F2 UI grava após F2 mergeada)
2. `cpf` (PF — preferencial quando `taxIdType='cpf'`)
3. `cnpj` (PJ — fallback)
4. `UNKNOWN_TAX_ID` sentinel (todos ausentes — projeto sem identificador)

### D-4 — Sentinel `UNKNOWN_TAX_ID`

Constante exportada de `server/lib/archetype/perfilHash.ts`:

```typescript
export const UNKNOWN_TAX_ID = "UNKNOWN_TAX_ID" as const;
```

Usado quando `taxIdType` é explícito mas todos os documentos estão ausentes. Garante hash determinístico (não-null, não-vazio) para projetos em estado intermediário sem crashes downstream.

**Não é um identificador fiscal válido** — é apenas um sentinel para canonical estável.

### D-5 — Preservação do campo derivado `analise_1_cnpj_operacional`

**MANTIDO o nome** (não renomeado para `analise_1_taxId_operacional`).

Justificativa empírica (v4 §3.1 — validado em `buildPerfilEntidade.ts:346-369` + `routers/perfil.ts:186`):
- O campo significa **"escopo unitário de 1 entidade operacional vs consolidação multi-CNPJ de grupo econômico"**
- NÃO significa "tem CNPJ válido?" (interpretação errônea do Manus)
- Para PF, semântica natural: "análise de 1 sujeito operacional (CPF ou CNPJ)"
- 6 assertions em `seed-normalizers.behavior.test.ts.snap` continuam corretas

Tech debt P3: rename para `analise_1_entidade_operacional` quando feature de "consolidação multi-entidade" entrar (sprint futura).

### D-6 — `RULES_VERSION` e `RULES_HASH` preservados

`RULES_VERSION = "m1-v1.0.0"` **NÃO** é bumpado em F3.
`RULES_HASH = "4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272"` **NÃO** muda.

Justificativa: o `RULES_HASH` é hash do **manifesto declarativo de regras de derivação**, não do snapshot do perfil. F3 muda o **canonical do snapshot** (perfilHash) apenas de forma aditiva — o manifesto de regras é inalterado.

### D-7 — Bump ADR-0032

ADR-0032 (Versionamento do Snapshot) ganha **MINOR bump conceitual**:
- v1.0.0 → v1.0.0 (versão da regra mantida)
- Snapshot canonical aceita campos aditivos opcionais (taxIdType, taxId, cpf, cnpj)
- Retrocompat byte-a-byte garantida para snapshots pré-F3

Não há `archetypeVersion` bump real porque a regra de derivação é a mesma.

---

## Implementação F3

| Arquivo | Mudança |
|---|---|
| `server/lib/archetype/perfilHash.ts` | `PerfilSnapshotInput`: `cnpj?` opcional + `cpf?`, `taxIdType?`, `taxId?` aditivos. `computePerfilHash`: null-safety + canonical condicional |
| `server/lib/archetype/perfilHash.test.ts` (NOVO) | 5 contratos TR-01 a TR-05 |
| `server/routers/perfil.ts:233, :353` (2 callsites) | Leitura null-safe `cp = project.companyProfile ?? {}` + passagem `cpf`, `taxIdType`, `taxId` ao `computePerfilHash` |

### TR-01 — Discriminação PF vs PJ

`hash(taxIdType='cnpj', taxId='X')` ≠ `hash(taxIdType='cpf', taxId='X')` mesmo com string idêntica → garante que dois projetos distintos (PJ vs PF) tenham snapshots distintos.

### TR-02 — Determinismo

`hash(input)` chamado N vezes → sempre o mesmo SHA-256.

### TR-03 — null-safety (gate bloqueante)

`hash({cnpj: undefined, cpf: undefined, taxIdType: undefined, taxId: undefined, ...})` → não crasha + retorna hash válido. **Crítico:** 3202/3400 projetos têm `companyProfile=NULL` (Gate 3 F0). Sem TR-03 passando, 94% da base crasha.

### TR-04 — Sentinel quando taxIdType explícito mas docs ausentes

`hash({taxIdType: 'cpf', cnpj: undefined, cpf: undefined, taxId: undefined})` → usa `UNKNOWN_TAX_ID` sem crash.

### TR-05 — Retrocompat byte-a-byte (ADR-0032 §3 MINOR)

`hash(input legacy sem taxIdType)` produz canonical IDÊNTICO ao pré-F3 → hash byte-a-byte preservado. Snapshots persistidos em `projects.archetypePerfilHash` continuam validando.

---

## Consequências

### Positivas

- **Cobertura jurídica completa** para produtor rural PF (Art. 164 LC 214/2025)
- **Retrocompat absoluta** dos snapshots persistidos (ADR-0032 honrado)
- **null-safety** para 94% da base (3202/3400 projetos com `companyProfile=NULL`)
- **Tipo de identidade explícito** nos snapshots pós-F3 — auditável

### Negativas

- **Complexidade adicional** no canonical: condicional `if (taxIdType !== undefined)` — pode confundir leitor casual
- **Hash diferente** para projeto PJ pré-F3 (sem taxIdType) vs pós-F3 (com taxIdType='cnpj' explícito da UI F2) — mesma entidade lógica, hashes distintos por marcação F3
- **Sentinel `UNKNOWN_TAX_ID`** não é identificador válido — consumers downstream que esperam CPF/CNPJ válido precisam tolerar

### Mitigações

- Documentação inline + ADR + comentários `BUG-AGRO-CPF F3` em código tocado
- Tech debt P3: registros legacy podem ser migrados para taxIdType explícito numa sprint futura via `perfil.migrate()`
- Sentinel apenas em casos extremos (projeto criado sem identificador) — consumers devem tratar com filtro/fallback

---

## Alternativas consideradas

### A1 — Renomear `cnpj` para `taxId` no schema (rename estrutural)

**Rejeitada.** 17 testes + 5+ snapshots + 9 arquivos de produção referenciam `cnpj` por nome. Rename = MAJOR bump no ADR-0032 + migração forçada de todos os registros. Custo > benefício; v4 cirúrgica aprovada pelo P.O. preserva nomenclatura.

### A2 — Bump `RULES_VERSION` para `m1-v1.1.0`

**Rejeitada.** `RULES_VERSION` versiona o manifesto de regras de derivação (objeto, papel_na_cadeia, etc.). F3 não muda nenhuma regra — apenas adiciona campos opcionais ao input. Bump seria ruído sem semântica.

### A3 — Sempre incluir `taxIdType` no canonical (com default 'cnpj')

**Rejeitada.** Quebraria retrocompat byte-a-byte: snapshots pré-F3 (sem taxIdType) teriam hash diferente ao serem recomputados. Violaria ADR-0032 §3 MINOR.

### A4 — Renomear `analise_1_cnpj_operacional` para `analise_1_entidade_operacional`

**Rejeitada para F3.** Marcado como tech debt P3 para quando "consolidação multi-entidade" entrar. Justificativa empírica em v4 §3.1: o nome é abstrato o suficiente; mudança é cosmética e quebraria 6+ snapshots.

---

## Vinculadas

- ADR-0031 (Imutabilidade do snapshot)
- ADR-0032 (Versionamento — MINOR aditivo respeitado)
- REGRA-ORQ-35 (NUNCA ASSUMA — Read Before Write)
- REGRA-ORQ-41 (AS-IS/TO-BE com impact-tree)
- Lição #59 (assemble ≠ consumption — perfilHash.ts é ATIVO, não dead)
- Lição #65 (rastrear fluxo end-to-end — writers/readers map)
- Lição #93 (mecanismo verificado, não inferido — semântica `analise_1_cnpj_operacional`)
- Issue #1290 — BUG-AGRO-CPF
- v4 cirúrgica § 3.1 + § 7 + § 11 (validação empírica + plano de rollback + spec validateCpf)
- Caso canônico: `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md`

---

**Autor:** Claude Code · sessão presencial Uires Tapajós · 2026-05-29
**Aprovado em:** F3 implementação (este PR)
