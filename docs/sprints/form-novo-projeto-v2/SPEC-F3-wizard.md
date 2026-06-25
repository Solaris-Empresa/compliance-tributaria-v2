# SPEC F3 — Wizard de cadastro · Novo Projeto (FORM-NOVO-PROJETO-V2)

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

### Fases
- **F0** — extrair grupos de campos em sub-componentes (sem mudar comportamento; flag OFF = idêntico).
- **F1** — casca wizard (passos 0-5 + progress + voltar/avançar) sob flag ON.
- **F2** — progressive disclosure (Passo 4 colapsado) + microcopy + preview.
- **F3** — sugestões internas (Regime★Porte, Operação★CNAE-IA — pré-seleção editável).
- **F4** — E2E (3 cenários) + GATE-PO-FLUXO.

## 8. PLANO-TESTES E2E (ancorado nos 63 data-testid de #1577)

| # | Cenário | Passos (data-testid) | Asserção |
|---|---|---|---|
| 1 | **PJ completo** | `card-tipo-pj` → `input-cnpj`+`input-razao-social` → `card-porte-*`+`card-regime-*`+`card-operacao-*`+`card-cliente-*` → `textarea-descricao`(≥100) → `btn-expandir-opcionais`+opcionais → `btn-criar-projeto` | projeto criado; payload PJ completo; `taxIdType='cnpj'` |
| 2 | **PF completo** (#1299) | `card-tipo-pf` → `input-cpf`+`input-nome` → **Porte/Regime/Tipo Jurídico OCULTOS** → `card-operacao-*`+`card-cliente-*` → descrição → criar | projeto criado; `taxIdType='cpf'`; sem campos PJ no payload |
| 3 | **Pular opcionais** | PJ até Passo 3, Passo 4 colapsado (não expandir) → `btn-criar-projeto` | criado só com obrigatórios; opcionais `null` |

**DoD negativo (REGRA-ORQ-44/47):** flag OFF → layout atual idêntico (regressão zero); `mode='edit'` (NcmNbsEditCard) inalterado nas 2 páginas; grep confirma 3 campos F1 ausentes do wizard.

## 9. Rollback / abort criteria

| Nível | Gatilho | Ação |
|---|---|---|
| 1 — flag | qualquer bug no wizard | `VITE_ENABLE_FORM_WIZARD=false` + rebuild → layout atual |
| 2 — `mode='edit'` quebrado | NcmNbsEditCard regride | revert do PR (sem schema → trivial) |
| 3 — abort | wizard não cobre PF ou perde prefill | pausar; não mergear sem cenários 2+3 verdes |

Sem migration, sem mudança de schema/Zod/payload → rollback = flag OFF ou revert simples.

## 10. Pendências para a implementação
- Confirmar com P.O.: `taxCentralization` **mantido** (Passo 4) — assumido por esta spec.
- F4 (CNPJ-lookup Receita Federal) **fora** desta spec (feature nova).
- Mockup já tem os 63 data-testid; o E2E ancora neles.
