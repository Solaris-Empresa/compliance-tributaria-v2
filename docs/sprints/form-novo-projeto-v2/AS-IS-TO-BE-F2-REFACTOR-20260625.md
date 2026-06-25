# AS-IS / TO-BE — F2-refactor (partição PerfilEmpresaIntelligente → painéis do wizard)

> Skill `impact-tree` aplicada · HEAD `81ebe3c4` · 25/06/2026 · base #1587 (form-wizard-steps.ts + FormWizard.tsx)
> **Invariante absoluta:** ZERO rename de campo (~99 readers, 5 subsistemas). Partição = **layout-only**.
> Flag `VITE_ENABLE_FORM_WIZARD` **permanece OFF** toda a F2.

## 1. Auto-auditoria das técnicas usadas

| Passo impact-tree | Status | Evidência |
|---|---|---|
| 1. ast-grep / grep estrutural do render | ✅ | landmarks `<section>`/`SelectCard`/`set(` mapeados (`PerfilEmpresaIntelligente.tsx:886-1512`) |
| 2. dead-read | ✅ (sessão prévia) | campos DEAD já removidos (#1575); taxCentralization é consumer ISSUE-001 |
| 3. issues pré-existentes | ✅ | épico FORM-NOVO-PROJETO-V2 (#1578 spec, #1583 arq) — sem duplicata |
| 4. grep testes | ✅ | `calc-profile-score.test.tsx`, `form-novo-projeto-baseline.spec.ts:34-50` |
| 5. grep .md/.sql/.json | ✅ | ADRs 0031/0032/0033/0038 |
| 6. PDF/email | n/a | partição de layout não toca geração de saída |
| 7. snapshots | ✅ | **nenhum `.snap`** referencia o componente |
| 8. LOC reais | ✅ | `PerfilEmpresaIntelligente.tsx`=**1533**, `NovoProjeto.tsx`=**721** |
| 9. ADRs + bump | ✅ | nenhum bump — layout-only não toca contrato (ver §7) |
| 10. writers/readers | ✅ | todos os campos via `set("campo", ...)` no mesmo componente — partição preserva |
| 11. auto-auditoria final | ✅ | §8 |

## 2. Risco de regressão por gravidade

| Gravidade | Risco | Mitigação |
|---|---|---|
| 🔴 **Crítico** | E2E baseline `form-novo-projeto-baseline.spec.ts:34-50` preenche todos os campos numa **página única**. Se o wizard renderizar 1 passo por vez, os locators (radio-pj, input-cnpj, card-tipojuridico-ltda…) ficam fora da tela → baseline quebra. | **Flag-gate:** `VITE_ENABLE_FORM_WIZARD` OFF → render single-page atual (baseline intacta). ON → wizard. data-testids **preservados** (mesmos nós, só condicionados por passo). |
| 🔴 **Crítico** | Cascata PJ→PF (`useEffect :833-850`) limpa 6 campos. Se o `useEffect` for parar dentro de um painel que só monta no passo dele, **não dispara** quando o usuário está noutro passo. | **Approach A (§5):** PerfilEmpresa **permanece montado** — só condiciona o `<section>` visível por passo. Cascata/estado/calcProfileScore ficam onde estão. |
| 🟡 **Visível** | Cenário 4 (PJ→PF) **não tem teste E2E** hoje (gap confirmado). | F2 **cria** o teste (DoD bloqueante). |
| 🟢 **Cosmético** | ScorePanel (sidebar) — onde aparece no wizard. | Passo 5 (Confirmação) reusa o ScorePanel. |

## 3. Consumers E producers (inventário canônico)

**Producers (quem ESCREVE os campos) — todos via `set()` no MESMO componente:**
- `PerfilEmpresaIntelligente.tsx` — `set("companyType"|"companySize"|"taxRegime"|"annualRevenueRange"|"operationType"|"clientType"|"multiState"|"principaisProdutos"|"principaisServicos"|"hasMultipleEstablishments"|"hasImportExport"|"paymentMethods"|"hasIntermediaries"|"isEconomicGroup"|"taxCentralization"|"hasTaxTeam"|"hasAudit"|"hasTaxIssues", ...)` (linhas 995-1491).
- `taxIdType` via radio (:895-927) + cascata `:833-850`.
- `name`/`description` em `NovoProjeto.tsx:472/:482`.
→ **A partição NÃO altera nenhum `set()` nem nome de campo.** É reposicionamento de JSX.

**Consumers (quem LÊ o perfil) — fora de escopo da partição (não muda o payload):**
- `NovoProjeto.tsx:277-345` `handleSubmit` → `companyProfile`/`operationProfile`.
- `calcProfileScore` (`:177`) — fonte única de validação (passo via `form-wizard-steps.stepValid`).
- ~99 readers downstream (consistencyEngine, archetype/perfilHash, prefill ISSUE-001, db-requirements, PDF) — **intocados** (R1 payload idêntico).

## 4. Árvore de impacto

```
F2-refactor (layout-only, flag-gated)
├── PerfilEmpresaIntelligente.tsx (1533 LOC) — recebe prop currentStep?; condiciona <section> por passo (flag ON)
│    ├── cascata useEffect :833-850 ........... PERMANECE (componente sempre montado) 🔴→mitigado
│    ├── calcProfileScore :177 ................. PERMANECE (fonte única)
│    └── set("campo") × 18 ..................... INTOCADOS (zero rename)
├── NovoProjeto.tsx (721 LOC) — wira FormWizard; step index; name/description=passo 3; submit no passo 5
│    ├── <PerfilEmpresaIntelligente> :502 ...... passa currentStep (flag ON)
│    ├── Card nome/descrição :463-499 .......... vira conteúdo do passo 3
│    └── btn-criar-projeto :550 ................ escondido no wizard (FormWizard provê submit)
├── FormWizard.tsx (#1587) ................... já pronto (casca progress+nav)
└── form-wizard-steps.ts (#1587) ............. já pronto (STEP_DEFS + stepValid)
```

## 5. Cirurgia possível? — **Approach A (recomendado)**

| | Approach A — PerfilEmpresa **sempre montado** + `currentStep` gate | Approach B — extrair cada section em componente-painel |
|---|---|---|
| Invasividade | **Baixa** — embrulha cada `<section>` em `{!wizardOn || currentStep===N && (...)}` | Alta — move JSX p/ N arquivos + hoist de estado/cascata |
| Cascata PJ→PF | **Preservada trivialmente** (componente não desmonta) | Exige hoist do useEffect (risco) |
| Zero-rename | **Trivial** (só muda o wrapper condicional) | Trivial mas + superfície de erro |
| data-testids | Preservados | Preservados |
| Risco | 🟢 | 🟡 |

**Recomendação: Approach A.** O wizard é uma **camada de visibilidade** sobre o componente existente — não uma reescrita. PerfilEmpresa ganha um prop opcional `currentStep?: number`; quando `wizardOn`, renderiza só o `<section>` do passo; quando OFF, renderiza tudo (comportamento atual = baseline intacta).

## 6. AS-IS — mapa de partição (sections → STEP_DEFS)

| Passo (STEP_DEFS) | Campos | Localização AS-IS | ~LOC |
|---|---|---|---|
| **0 — Tipo** | `taxIdType` (radio PJ/PF) | PerfilEmpresa `:895-927` | ~33 |
| **1 — Identificação** | `cnpj` / `cpf` | PerfilEmpresa `:929-976` | ~48 |
| **2 — Perfil** | `companyType`(TJ), `companySize`(Porte), `taxRegime`, `annualRevenueRange`, `operationType`, `clientType`, `multiState` | `:977-1034`, `:1036-1088`, `:1099-1148`, `:1368-1376` | ~170 |
| **3 — Descrição** | `name`, `description` (≥100) | **NovoProjeto** `:463-499` | ~37 |
| **4 — Melhorar diagnóstico** | produtos(NCM), serviços(NBS), Complexidade, Financeiro, Estrutura Societária, Governança | PerfilEmpresa `:1150-1494` | ~319 |
| **5 — Confirmação** | review + ScorePanel + submit | novo + `:1516` (ScorePanel) | ~50 novo |

**Observação:** `clientType` (`:1125`, obrigatório PJ+PF) está hoje dentro da section "Operações" mas pertence ao **Passo 2** (perfil) por STEP_DEFS — a partição o move visualmente para o Passo 2 (sem renomear).

## 7. TO-BE — fases + bump ADR

**Bump ADR: NENHUM.** Layout-only não toca `taxIdType`/`cnpj`/`cpf` (ADR-0033), `archetypePerfilHash` (ADR-0032), imutabilidade snapshot (ADR-0031) nem o gate de regime (ADR-0038). O payload de `handleSubmit` é idêntico (R1).

| Fase | Entrega | DoD |
|---|---|---|
| **F2.1** | PerfilEmpresa recebe `currentStep?: number` + embrulha cada `<section>` no gate `wizardOn ? currentStep===N : true`. Flag OFF = render atual. | tsc 0; baseline `form-novo-projeto-baseline.spec.ts` (flag OFF) PASS |
| **F2.2** | NovoProjeto wira `<FormWizard>` (flag ON): step index, passa `currentStep` ao PerfilEmpresa, descrição=passo 3, esconde `btn-criar-projeto` (FormWizard provê submit no passo 5) | wizard navega; submit só no passo 5 (inv. 2) |
| **F2.3** | Passo 5 Confirmação: ScorePanel + resumo read-only | render do passo 5 |
| **F2.4 (DoD bloqueante)** | **Teste E2E Cenário 4** (PJ→preenche perfil→volta passo 0→troca PF→confirma limpeza dos 6 campos + Passo 2 esconde TJ/Porte/Regime) + units de `currentStep` gate | Cenário 4 PASS (flag ON) |

**Persistência (R5/inv.7):** novo stage-key `etapa1-perfil` no autosave — sem impacto no payload final.

## 8. Auto-auditoria final (cobertura)

| Item | Status | Evidência |
|---|---|---|
| Toda afirmação com arquivo:linha | ✅ | §3-§6 |
| Testes no grep | ✅ | `form-novo-projeto-baseline.spec.ts`, `calc-profile-score.test.tsx` |
| .sql/.md/.json | ✅ | ADRs 0031/0032/0033/0038 |
| PDF/email | ✅ n/a | partição não toca saída |
| Issues pré-existentes | ✅ | épico FORM-NOVO-PROJETO-V2 |
| snapshots | ✅ | nenhum `.snap` |
| LOC antes de classificar | ✅ | 1533 + 721 |
| ADRs + bump | ✅ | nenhum bump (layout-only) |
| writers/readers | ✅ | 18 `set()` no mesmo componente, intocados |
| Classe | ✅ | **C** (1533 LOC + fiação cross-componente) |
| **Cobertura estimada** | **🟢 ~92%** | pendência: ScorePanel exato no passo 5 (decisão UX) |

## 9. Pendências / decisões para o P.O.

1. **Approval do Approach A** (PerfilEmpresa sempre montado + `currentStep` gate) vs B (extrair painéis). Recomendo **A**.
2. **Passo 5 (Confirmação):** resumo read-only dos campos + ScorePanel, OU só o ScorePanel? (decisão UX — não bloqueia o plano).
3. **Passo 4 "Melhorar diagnóstico":** é grande (~319 LOC: produtos+serviços+4 sub-seções). Manter como 1 passo OU dividir? Recomendo **manter 1 passo** (são todos opcionais; STEP_DEFS já o define como passo único `opcionais`).

**Classe C · zero-rename · DoD Cenário 4 bloqueante · flag OFF toda a F2.** Pronto para aprovação.
