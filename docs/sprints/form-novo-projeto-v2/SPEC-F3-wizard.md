# SPEC F3 — Wizard de cadastro · Novo Projeto (FORM-NOVO-PROJETO-V2)

> ⚠️ **SUPERSEDE PARCIAL — UX-PASSO1 (#1598, 26/06/2026):** este spec documenta o wizard
> de **6 passos** como construído no F3 (Tipo · Identificação · Perfil · Descrição · Opcionais ·
> Confirmação). A partir de UX-PASSO1, o **Passo 0 "Tipo" funde radio PJ/PF + campo CNPJ/CPF** na
> mesma tela → o passo "Identificação" deixa de existir → wizard passa a **5 passos** (Tipo ·
> Perfil · Descrição · Opcionais · Confirmação) e a UI exibe "Passo X de 5". Adicionalmente, os 4
> painéis (Status do Perfil, Obrigatórios, banner CNAE, bloco vermelho) ficam **ocultos no Passo 0**
> e reaparecem do Passo 1 (Perfil). Onde este doc disser "6 passos" / "Passo 5 = submit" / "passos
> 0-5", leia "5 passos" / "Passo 4 = submit" / "passos 0-4". Fonte: `UX-CHANGE-PASSO1-PF-CLEANUP.md`
> + impact-tree `AS-IS-TO-BE-UX-PASSO1-MERGE-IDENTIFICACAO-20260626.md`.

**Classe:** C (REGRA-ORQ-24/41) · **Data:** 24/06/2026 · **HEAD base:** `4593ed7e` (pós-F1 #1575)
**Mockup aprovado:** `docs/sprints/form-novo-projeto-v2/MOCKUP_F3_wizard.html` (#1577, 63 data-testid)
**Flag:** `VITE_ENABLE_FORM_WIZARD` (build-time, default **OFF**) · **Componente-alvo:** `client/src/components/PerfilEmpresaIntelligente.tsx` + `client/src/pages/NovoProjeto.tsx`

---

## ⛔ Restrição INVIOLÁVEL — nomes de campos imutáveis (P.O., 24/06/2026)

**Os nomes dos campos NÃO podem ser alterados.** Existe um sistema complexo de **consistência e validação** acoplado aos nomes atuais (Zod, `consistencyEngine` DET-*, `db-requirements` tags, prefill ISSUE-001, `briefing-confidence-signals`, archetype). Renomear qualquer campo quebra esse sistema silenciosamente (classe das Lições #140/#150 — dual-name).

**Consequência para o F3:** o wizard é **exclusivamente uma mudança de LAYOUT** (ordem/agrupamento visual em passos). É **PROIBIDO**:
- ❌ renomear qualquer chave de `companyProfile` / `operationProfile` / `taxComplexity` / `financialProfile` / `governanceProfile` (ex.: `companyType`, `taxRegime`, `taxCentralization`, `operationType`, `clientType`, `multiState`, `hasImportExport`, `paymentMethods`, `hasTaxTeam`, `hasAudit`, `hasTaxIssues`, `isEconomicGroup`, `principaisProdutos`, `principaisServicos`...);
- ❌ alterar o shape do payload de `handleSubmit`;
- ❌ alterar o schema Zod (`routers-fluxo-v3.ts`) ou o `superRefine` PJ/PF;
- ❌ alterar `taxIdType` / a lógica `isPF` / a cascata #1299.

**Permitido:** reordenar/agrupar a RENDERIZAÇÃO; trocar labels visíveis (texto da UI) e microcopy; reusar os mesmos `value.<campo>` / `set("<campo>", ...)` existentes. **DoD:** `git diff` do PR F3 não altera nenhuma string `"<campo>"` em `set(...)` nem nenhuma chave do payload — só JSX/layout.

---

## 1. Auto-auditoria das técnicas (impact-tree — 11 passos)

| Passo | Técnica | Status | Evidência |
|---|---|---|---|
| 1 | ast-grep semântico | ✅ | `set($K,$V)` → **28 callsites** `set("campo",...)` no componente (a preservar) |
| 2 | Dead-read (ts-prune) | ✅ | `PerfilEmpresaData`/`PERFIL_VAZIO` **não** são dead export |
| 3 | Issues pré-existentes (`gh`) | ✅ | nenhuma issue de "wizard cadastro" prévia (#761 OPEN é cleanup não-relacionado) |
| 4 | Grep em testes | ✅ | 3 testes: `calc-profile-score.test.tsx` · `bloco-e-frontend.test.ts` · `perfil-router.test.ts` |
| 5 | Grep .sql/.md/.json | ✅ | sem .sql; ADRs em .md (Passo 9); mockup #1577 |
| 6 | PDF/email | ✅ | `generateDiagnosticoPDF.ts` lê os campos (**9 refs**) — consumer dos VALORES |
| 7 | Snapshots `.snap` | ✅ | **nenhum** snapshot do form (sem risco de quebra em massa) |
| 8 | LOC reais (`wc -l`) | ✅ | PerfilEmpresa **1527** · NovoProjeto **720** → **Classe C** |
| 9 | ADRs + bump | ✅ | ADR-0031/0032/0033 relevantes — **sem bump** (layout-only); ADR-FORM-WIZARD-01 novo/aditivo |
| 10 | Writers/readers | ✅ | mapa abaixo (§3) — 3 consumers do componente + **~99 readers dos nomes de campo** |
| 11 | Cobertura | ✅ | esta tabela + §3 (inventários) → ~95% |

**Cobertura estimada:** 🟢 ~95%.

### 🔒 Mapa do sistema de consistência/validação ligado aos NOMES de campo (reforça a restrição inviolável)

Empírico (grep de refs aos nomes de campo por subsistema) — **renomear qualquer campo quebra silenciosamente:**

| Subsistema | Refs aos nomes | Arquivo |
|---|---|---|
| **consistencyEngine** (DET rules) | **27** | `server/consistencyEngine.ts` |
| **archetype** / perfilHash (ADR-0032) | **34** | `server/routers/perfil.ts` (buildSeedFromProject) |
| **prefill ISSUE-001** | **21** | `shared/questionario-prefill.ts` |
| **db-requirements** (tags) | **8** | `server/db-requirements.ts` |
| **PDF diagnóstico** | **9** | `client/src/lib/generateDiagnosticoPDF.ts` |
| **writers** no componente | **28** `set("campo",...)` | `PerfilEmpresaIntelligente.tsx` |

→ **~99 readers + 28 writers** dependem dos nomes atuais. O wizard F3 **NÃO toca nenhum** (layout-only). Confirma a restrição do P.O.

## 2. Risco de regressão por gravidade

| Gravidade | Risco | Mitigação |
|---|---|---|
| 🔴 crítico | Refatorar o componente em wizard quebraria o **`mode='edit'`** das 2 páginas de edição | Wizard gated a `mode` create + flag; `mode='edit'` **inalterado** |
| 🔴 crítico | Reintroduzir um dos 3 campos removidos no F1 | impact-tree §7 + grep no DoD |
| 🟡 visível | Quebrar a dualidade PJ/PF (`isPF` #1299) ao reorganizar | Reusar `isPF` + cascata existentes; cenário E2E PF |
| 🟡 visível | Perder o prefill `taxCentralization` (ISSUE-001) | Manter campo no Passo 4 (DoD) |
| 🟢 cosmético | Microcopy/ícones | mockup aprovado |

## 3. Consumers E producers reais (Passo 10)

### Consumers do componente `PerfilEmpresaIntelligente` (3)
| Página | Rota | Modo | Uso |
|---|---|---|---|
| `NovoProjeto.tsx` | `/projetos/novo` (App.tsx:89) | **create (full)** | formulário completo → **alvo do wizard** |
| `FormularioProjeto.tsx` | `/projetos/:id/formulario` (:140) | **`mode='edit'`** | só `NcmNbsEditCard` (edição NCM/NBS) — **NÃO wizard** |
| `ProjetoDetalhesV2.tsx` | `/projetos/:id` (:90) | **`mode='edit'`** | só `NcmNbsEditCard` ("Salvar NCM/NBS") — **NÃO wizard** |

### Props (contrato a preservar)
`PerfilEmpresaIntelligenteProps { value: PerfilEmpresaData; onChange: (data) => void; mode?: ... }` (:730-732). O wizard **não altera** a assinatura — adiciona um modo de layout.

### Producers (escrita do payload)
`NovoProjeto.tsx handleSubmit` → companyProfile/operationProfile/taxComplexity/financialProfile/governanceProfile + `taxIdType` (dualidade PJ/PF). Zod em `routers-fluxo-v3.ts` (inalterado).

## 4. Árvore de impacto

```
VITE_ENABLE_FORM_WIZARD (build-time, OFF)
  └── NovoProjeto.tsx (/projetos/novo)
        └── PerfilEmpresaIntelligente (create)
              ├── flag ON  → layout WIZARD (6 passos)   ← NOVO
              └── flag OFF → layout atual (página única) ← regressão zero
        (reusa: SelectCard · SimNaoToggle · isPF/cascata #1299 · Zod · prefill ISSUE-001)
  └── FormularioProjeto / ProjetoDetalhesV2 (mode='edit')
        └── NcmNbsEditCard → INALTERADO (não toca wizard)
```

## 5. Cirurgia possível?

**Sim — escopo contido.** O wizard é um **layout alternativo** do mesmo componente, gated por flag + modo create. Não toca: Zod, payload, `mode='edit'`, schema, prefill. Extrair os grupos de campos (já existentes) em sub-blocos reordenáveis por passo; o wizard é a casca de navegação.

## 6. AS-IS (camadas)

1. **UI:** `PerfilEmpresaIntelligente.tsx` (1527 LOC) — página única, 7 seções, `SelectCard`/`SimNaoToggle`, indicador de completude (:220).
2. **Dualidade:** `isPF` (:184/:834) oculta Tipo Jurídico/Porte/Regime (#1299); cascata limpa 6 campos PJ ao virar PF (:830).
3. **Modo:** `mode='edit'` → renderiza só `NcmNbsEditCard` (2 páginas).
4. **Validação:** Zod `routers-fluxo-v3.ts` + superRefine early-return PF (:~334).
5. **Prefill:** `buildCorporatePrefill` (`shared/questionario-prefill.ts:191-194`) → `qc02_centralizacao` (taxCentralization).

## 6.1 Inventário de validações ligadas aos NOMES de campo (do Mapa de Riscos Manus — **verificado por mim**, REGRA-ORQ-27)

> Fonte: `manus-MAPA-RISCOS-F3-WIZARD.md` (25/06/2026). Cada claim re-verificado por grep (line-drift mínimo). **Este inventário é a razão concreta da restrição de nomes:** renomear qualquer campo quebra silenciosamente uma destas validações.

### Gate de submit (frontend) — `NovoProjeto.tsx`
`name.trim()` (:278) · `profileValid` (:282, = `calcProfileScore(perfilData).missingRequired.length===0` :274-275) · `descLength≥100` (:478) · `isLoading` (:429).

### calcProfileScore — condicional PJ/PF (`PerfilEmpresaIntelligente.tsx`)
- **PJ (6 obrig.):** `validateCnpj(cnpj)` · `companyType` · `companySize` · `taxRegime` · `operationType` · `clientType.length>0`
- **PF (2 obrig.):** `validateCpf(cpf)` · `clientType.length>0`

### Zod superRefine — dupla camada (`routers-fluxo-v3.ts`)
- Camada 1 `companyProfileSchema` (~:310-356): taxId length · `companyType`/`companySize`/`taxRegime` (PJ-only).
- Camada 2 `createProject.input` (~:463-479): `operationType`/`multiState` (PJ-only).

### Consistency engine — 8 regras cross-field (`consistencyEngine.ts`)
DET-001 `taxRegime`×`annualRevenueRange` · DET-002 `companySize`×`annualRevenueRange` · DET-003 `companySize(mei)`×`multiState` · DET-004 `companySize(mei)`×`hasInternationalOps` · DET-005 `taxRegime(simples)`×`hasInternationalOps` · DET-006 `companySize`×`hasTaxTeam` · DET-007 `hasTaxIssues`×`hasAudit` · DET-008 `usesMarketplace`×`taxRegime`×revenue.

### NCM/NBS (`shared/ncm-nbs-validation.ts` + inline) · CNPJ/CPF onBlur (feedback visual).

→ **Conclusão:** ~6 camadas de validação consomem os nomes literais. **O wizard NÃO renomeia nada** — só reordena a renderização.

## 6.2 Cadeia de mutações + persistência (verificado)

**Cadeia crítica (atômica):** `createProject.mutate` (:351) → `extractCnaes.mutate` (:179, onSuccess) → modal CNAEs → `confirmCnaes.mutate` (:359) → navega (3 rotas, feature-flag).

**🔴 Gap de persistência (R5 — confirmado):** `useAutoSave(DRAFT_PROJECT_ID,'etapa1',{name,description},500)` (:271) salva **só name+description** — **NÃO** salva `perfilData` (26 campos). No form atual (página única) isso é tolerável; **no wizard multi-passo é perda de dados** ao recarregar. → **requisito novo do F3.**

## 6.3 Mapa de riscos F3 (R1–R12, do Manus — incorporado)

| # | Sev | Risco | Mitigação (no TO-BE) |
|---|---|---|---|
| R1 | 🔴 | Payload fragmentado (passo envia parcial) → Zod 400 | **Submit só no passo final**; payload idêntico ao atual (1 objeto) |
| R2 | 🔴 | Retrocesso pós-`createProject` → projeto duplicado | `createProject` **só no último passo**; passos 0-4 = state local |
| R3 | 🔴 | Toggle PF/PJ em passo ≠ campos afetados (cleanup 8 campos :839) | Toggle PJ/PF + cascata #1299 **propagam** para todos os passos (state único) |
| R4 | 🔴 | Cadeia de mutações quebrada (`extractCnaes` precisa do projectId) | Manter `createProject→extractCnaes→confirmCnaes` atômica (passo final + modal) |
| R5 | 🟠 | Persistência só name+desc → perde 26 campos no reload | Wizard salva `perfilData` completo (multi-stage) |
| R6 | 🟠 | Consistency precisa do objeto completo | Rodar consistency **só no passo de revisão** (antes do submit) |
| R7 | 🟠 | calcProfileScore condicional (PJ 6 / PF 2) | Validação por passo **replica** a lógica condicional existente (reusa `calcProfileScore`) |
| R8 | 🟠 | Modal CNAEs acoplado ao onSuccess | Modal = sub-passo do último step (não separar) |
| R9 | 🟡 | Componente monolítico (1527 LOC) | Reusar como bloco único OU extrair sub-blocos (sem mudar lógica) |
| R10 | 🟡 | Validação CNPJ/CPF onBlur acoplada | Documento + feedback no **mesmo passo** |
| R11 | 🟡 | data-testid ausente hoje | 63 data-testid no mockup #1577 (obrigatório) |
| R12 | 🟡 | Feature flags no `confirmCnaes.onSuccess` | Preservar **intacto** o handler de navegação |

**Cobertura de testes (gap — Manus §8):** backend forte (Zod, state machine, consistency); **frontend ZERO** (calcProfileScore, toggle PF/PJ, useAutoSave sem teste). → o PLANO-TESTES (§8) cobre via E2E + sugere unit de `calcProfileScore`.

## 6.4 Dicionário de UX (UX_DICTIONARY) — data-testid ↔ campo ↔ validação ↔ passo

> Gate UX (REGRA-ORQ-09). Âncoras do mockup #1577. **Coluna "campo (código)" = nome IMUTÁVEL** consumido pelas validações de §6.1.

| Passo | data-testid | Campo (código — imutável) | Validação |
|---|---|---|---|
| 0 | `card-tipo-pj` / `card-tipo-pf` | `companyProfile.taxIdType` | discriminador PJ/PF (ADR-0033) |
| 1 | `input-cnpj` / `input-cpf` | `companyProfile.cnpj` / `.cpf` | `validateCnpj`/`validateCpf` (onBlur) |
| 1 | `input-razao-social` / `input-nome` | (razão/nome) | — |
| 2 | `card-tipojuridico-*` | `companyProfile.companyType` | PJ-only (Zod C1 + calcProfileScore) |
| 2 | `card-porte-*` | `companyProfile.companySize` | PJ-only · DET-002/003/004/006 |
| 2 | `card-regime-*` | `companyProfile.taxRegime` | PJ-only · DET-001/005/008 |
| 2 | `card-operacao-*` | `operationProfile.operationType` | PJ-only (Zod C2) |
| 2 | `card-cliente-*` | `operationProfile.clientType[]` | `length>0` (PJ+PF) |
| 3 | `textarea-descricao` / `counter-descricao` | `description` | `≥100 chars` |
| 4 | `toggle-multiestado` | `operationProfile.multiState` | PJ-only (Zod C2) · DET-003 |
| 4 | `toggle-importexport` | `taxComplexity.hasImportExport` | (cuidado dual-name `hasInternationalOps` — fora do F3) |
| 4 | `toggle-marketplace` | (deriv. `paymentMethods`/`usesMarketplace`) | DET-008 |
| 4 | `toggle-multiplosestab` | `taxComplexity.hasMultipleEstablishments` | — |
| 4 | `card-faturamento-*` | `companyProfile.annualRevenueRange` | DET-001/002/008 |
| 4 | `toggle-equipe` | `governanceProfile.hasTaxTeam` | DET-006 |
| 4 | `toggle-auditoria` | `governanceProfile.hasAudit` | DET-007 |
| 4 | `toggle-passivo` | `governanceProfile.hasTaxIssues` | DET-007 |
| 4 | `toggle-grupoeconomico` | `companyProfile.isEconomicGroup` | archetype V-05 |
| 4 | `card-centralizacao-*` | `companyProfile.taxCentralization` | prefill ISSUE-001 (qc02) |
| 5 | `btn-criar-projeto` | (submit) | monta payload completo → cadeia §6.2 |
| nav | `btn-wizard-voltar`/`-avancar` | — | "Avançar" gated pelos obrigatórios do passo (R7) |

## 7. TO-BE — fases + ADR

### ADR-FORM-WIZARD-01 (novo — 2 pontos obrigatórios do Consultor)

**(1) Ortogonalidade (cravado):** *O wizard do cadastro NÃO reintroduz as paradas que o auto-pilot removeu. São superfícies distintas: o auto-pilot (Mud.1-4 + MUD-PERFIL-SILENCIOSO) atua na navegação entre questionários (fluxo de diagnóstico); o wizard atua no formulário de cadastro inicial, anterior a todo o fluxo. Adicionar passos no cadastro ≠ reintroduzir paradas no diagnóstico.*

**(2) Base pós-F1 (impact-tree confirmado):**
| Verificação | Resultado |
|---|---|
| HEAD base do wizard | `4593ed7e` |
| `hasSpecialRegimes` no wizard | ❌ não aparece (removido #1575) |
| `notificationFrequency` no wizard | ❌ não aparece |
| `notificationEmail` no wizard | ❌ não aparece |
| `taxCentralization` no Passo 4 | ✅ presente (prefill ISSUE-001) |

**Decisão de componente:** **REFATORAR** (não reescrever) — extrair os grupos de campos em sub-blocos + adicionar uma casca wizard gated por `VITE_ENABLE_FORM_WIZARD` + modo create. **`mode='edit'` inalterado.** A lógica PJ/PF (#1299), Zod e prefill (ISSUE-001) — todas testadas em produção — são **reusadas**, não reescritas.

**Bump ADR:** novo ADR (não altera ISSUE-001 nem ADR-0031/0032).

### Invariantes inderrogáveis do TO-BE (das §6.1-6.3)
1. **Payload idêntico (R1):** o objeto enviado ao `createProject` é montado **só no passo final**, com a MESMA estrutura/nomes do atual. DoD: `git diff` não altera nenhuma chave de payload nem string `set("campo")`.
2. **Submit único no fim (R2/R4):** `createProject→extractCnaes→confirmCnaes` roda **apenas no Passo 5**. Passos 0-4 = state local (zero mutação tRPC) → sem projeto duplicado, cadeia atômica.
3. **State único + cascata PF/PJ (R3):** um único `perfilData` compartilhado entre passos; o toggle PF/PJ dispara a cascata (#1299) que limpa os 8 campos — propaga a todos os passos.
4. **Persistência multi-stage (R5):** o wizard salva `perfilData` completo (não só name+description) no localStorage por passo + resume.
5. **Validação por passo replica calcProfileScore (R7):** "Avançar" reusa `calcProfileScore` (PJ 6 / PF 2) — não reimplementa.
6. **Label-map por passo (Dúvida 1):** o gate de "Avançar" é uma constante estática `STEP_LABELS[passo] ⊆ labels de calcProfileScore`, aplicada sobre `missingRequired`. Nenhum check booleano novo — só partição de exibição. Fonte de verdade = `calcProfileScore` + Zod.
7. **Isolamento de stage-key na persistência (Dúvida 4):** `perfilData` salvo em stage-key novo (`'etapa1-perfil'`), sem tocar `'etapa1'` (name+desc). Garante backward-compat com draft antigo e rollback flag-OFF.

### Fases
- **F0** — extrair grupos de campos em sub-componentes (sem mudar comportamento; flag OFF = idêntico; **zero rename**). **DoD bloqueante (Dúvida 5):** teste de NÃO-REGRESSÃO próprio — suite verde + 1 E2E do form atual (flag OFF) **idêntico antes×depois do F0**. Não construir a casca (F1) sobre sub-blocos não-validados.
- **F1** — casca wizard (passos 0-5 + progress + voltar/avançar) sob flag ON; **submit só no Passo 5** (inv. 2); state único (inv. 3); validação por passo = label-map sobre `calcProfileScore.missingRequired` (inv. 6).
- **F2** — progressive disclosure (Passo 4 colapsado) + microcopy + preview + **persistência multi-stage** (inv. 4, stage-key novo).
- **F3** — sugestões internas (Regime★Porte, Operação★CNAE-IA — pré-seleção editável).
- **F4** — E2E **4 cenários** (incl. troca PJ→PF) + **unit OBRIGATÓRIO no DoD (Dúvida 6):** `calcProfileScore` (PJ 6/PF 2 + confidence -20/-15) + cascata toggle PF/PJ (8 campos) + label-map por passo. + GATE-PO-FLUXO.

## 8. PLANO-TESTES E2E (ancorado nos 63 data-testid de #1577)

| # | Cenário | Passos (data-testid) | Asserção |
|---|---|---|---|
| 1 | **PJ completo** | `card-tipo-pj` → `input-cnpj`+`input-razao-social` → `card-porte-*`+`card-regime-*`+`card-operacao-*`+`card-cliente-*` → `textarea-descricao`(≥100) → `btn-expandir-opcionais`+opcionais → `btn-criar-projeto` | projeto criado; payload PJ completo; `taxIdType='cnpj'` |
| 2 | **PF completo** (#1299) | `card-tipo-pf` → `input-cpf`+`input-nome` → **Porte/Regime/Tipo Jurídico OCULTOS** → `card-operacao-*`+`card-cliente-*` → descrição → criar | projeto criado; `taxIdType='cpf'`; sem campos PJ no payload |
| 3 | **Pular opcionais** | PJ até Passo 3, Passo 4 colapsado (não expandir) → `btn-criar-projeto` | criado só com obrigatórios; opcionais `null` |
| 4 | **Troca PJ→volta→PF no meio** (Dúvida 3 do Consultor) | `card-tipo-pj` → preenche Passos 1-4 completos → `btn-wizard-voltar`×N → `card-tipo-pf` → re-avança | cascata #1299 limpa os 8 campos PJ; passos PJ-only (TJ/Porte/Regime) SOMEM; progresso recomputa; `taxIdType='cpf'`; payload sem campos PJ; **NÃO re-cria projeto** (submit só no Passo 5) |

**DoD negativo (REGRA-ORQ-44/47):** flag OFF → layout atual idêntico (regressão zero); `mode='edit'` (NcmNbsEditCard) inalterado nas 2 páginas; grep confirma 3 campos F1 ausentes do wizard; **cenário 4 verde é BLOQUEANTE** (é o caso que quebra — Dúvida 3).

## 9. Rollback / abort criteria

| Nível | Gatilho | Ação |
|---|---|---|
| 1 — flag | qualquer bug no wizard | `VITE_ENABLE_FORM_WIZARD=false` + rebuild → layout atual |
| 2 — `mode='edit'` quebrado | NcmNbsEditCard regride | revert do PR (sem schema → trivial) |
| 3 — abort | wizard não cobre PF ou perde prefill | pausar; não mergear sem cenários 2+3 verdes |

Sem migration, sem mudança de schema/Zod/payload → rollback = flag OFF ou revert simples.

## 10. Pendências para a implementação
- ✅ `taxCentralization` **MANTER** (Passo 4, prefill ISSUE-001) — confirmado pelo P.O. (despacho 24/06).
- F4 (CNPJ-lookup Receita Federal) **fora** desta spec (feature nova).
- Mockup já tem os 63 data-testid; o E2E ancora neles.
- Dúvida 7 (toggle import/export inerte) — **decisão de produto P.O.** (§11).

## 11. Respostas às dúvidas do Consultor (review #1578) — verificadas no código

### 🔴 Dúvida 1 — "validação por passo" vs `calcProfileScore` global → **há subset, mas NÃO é lógica nova**
`calcProfileScore` (`PerfilEmpresaIntelligente.tsx:179-226`) retorna `missingRequired` = **lista de LABELS** dos obrigatórios não-preenchidos (condicional: PJ 6 / PF 2). A validação por passo é um **mapa estático label→passo** (presentation map) aplicado sobre essa saída: `Avançar(passo) = passo.labels.every(l => !missingRequired.includes(l))`. **A verdade de validação continua só em `calcProfileScore` (fonte única) + Zod** — o mapa é uma partição de exibição, não uma regra booleana nova. **Zero risco de divergência com Zod** (nenhum check booleano é reimplementado). DoD: `git diff` mostra só uma constante `STEP_LABELS` — nenhuma nova validação.

### 🔴 Dúvida 2 — DET cross-field entre passos → **premissa do Consultor incorreta (verificado)**
O Consultor assume "hoje o usuário vê a inconsistência DET ANTES de submeter (inline)". **Falso:** grep em `NovoProjeto.tsx` = **0 chamadas** a consistency/DET. As 8 regras DET rodam **pós-create**, via `consistencyRouter.runConsistencyAnalysis` (`:102`), no fluxo de diagnóstico — **não no form**. O ÚNICO sinal inline no form é a heurística **soft de `confidence`** (2 regras em `calcProfileScore:219-220`: simples+faturamento-alto −20; MEI+não-simples −15) — um % mostrado onde o score aparece. → **O wizard NÃO muda quando o usuário vê o DET** (continua pós-create). Sem mudança de comportamento. A heurística soft é preservada (vem do `calcProfileScore`, exibida no Passo de revisão). **Voltar é pré-submit (Passos 0-4 = state local) → seguro, NÃO re-cria projeto** (inv. 2).

### 🔴 Dúvida 3 — cenário PJ→volta→PF → **adicionado como Cenário 4 BLOQUEANTE** (§8). Concordo: é o caso que quebra.

### 🟠 Dúvida 4 — draft antigo + rollback → **backward-compat estrutural (verificado)**
`loadTempData<T>` (`usePersistenceV3.ts:51`) é genérico: `JSON.parse(raw) as {data:T}` — só parseia e faz cast. Logo:
- **draft antigo** (`{name,description}`) no wizard novo → name/desc presentes, `perfilData` campos `undefined` → começa no Passo 0 com name+desc, resto vazio. ✅
- **draft novo + flag OFF (rollback)** → o form de página única tipa como `<{name?,description?}>` → lê só name/desc, **ignora** as chaves extras de perfilData (cast não acessa). ✅ sem crash.
- **Invariante 7 (novo):** o wizard salva `perfilData` em **stage-key NOVO** (ex.: `'etapa1-perfil'`), **sem tocar** o `'etapa1'` (name+desc) que o form atual lê → flag OFF nunca encontra formato inesperado. Backward-compat garantido por isolamento de chave.

### 🟠 Dúvida 5 — F0 não-regressão → **incorporado ao DoD do F0** (teste antes×depois, flag OFF idêntico). Bloqueante.

### 🟠 Dúvida 6 — unit obrigatórios → **F4 DoD agora exige** unit de `calcProfileScore` + cascata toggle PF/PJ + label-map (não "sugestão").

### 🟡 Dúvida 7 — toggle import/export inerte (dual-name) → **decisão de produto do P.O.**
`toggle-importexport` escreve `hasImportExport`, que os engines não leem (leem `hasInternationalOps`, nunca escrito — bug dual-name, fix é F2 separado). O F3 só reorganiza; não cria nem conserta o bug. **Opções para o P.O.:**
- (a) **manter visível** (status quo) — F3 é layout-only, não muda visibilidade de campo; o fix vem no F2 dual-name. *(recomendo — não acoplar decisão de produto a um PR de layout)*
- (b) ocultar o toggle até o F2 consertar o dual-name.
Não misturar com o F3 — apenas registrar a decisão.
