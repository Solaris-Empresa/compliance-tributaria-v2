# AS-IS / TO-BE — UX-PASSO1-MERGE-IDENTIFICACAO

**Data:** 2026-06-26 · **Emissor:** Claude Code · **Skill:** impact-tree (REGRA-ORQ-41)
**HEAD:** 16e5080a · **Classe:** B estrutural · **Flag:** `VITE_ENABLE_FORM_WIZARD` (ON em prod)
**Decisão P.O.:** Opção 2 — fundir step 0 (Tipo) + step 1 (Identificação) → wizard 6 → 5 passos; ocultar 4 painéis no novo step 0.

---

## 1. Auto-auditoria das técnicas usadas

| Técnica | Aplicada | Nota |
|---|---|---|
| ast-grep semântico (P1) | ⚠️ parcial | Alvo é modelo de passos (não campo persistido) → grep textual+import suficiente; ast-grep 0.42.1 disponível |
| knip / ts-prune dead-read (P2) | N/A | Mudança não envolve campo persistido; dead-read não se aplica. knip 6.14.2 disponível |
| Issues pré-existentes (P3) | ✅ | `gh issue list` 5 buscas → nenhuma cobre o escopo (Lição #83) |
| Grep incluindo testes (P4) | ✅ | `form-wizard-steps.test.ts` + 3 E2E specs mapeados |
| Grep .sql/.md/.json (P5) | ✅ | docs canônicos: SPEC-F3-wizard.md, MOCKUP_F3_wizard.html |
| PDF/email/templates (P6) | N/A | Mudança é de visibilidade/navegação; sem saída PDF/email |
| Snapshots .snap (P7) | ✅ | 3 `.snap` existentes são server-side (risk-engine/normalizers) — **não** tocam o wizard |
| LOC reais (P8) | ✅ | medidos via `wc -l` |
| ADRs + bump (P9) | ✅ | **zero match em `docs/adr/`** → nenhum ADR governa o count → **sem bump** |
| Writers/readers (P10) | ✅ | módulo encapsulado: 1 writer de `wizardStep`, 3 consumers do módulo |
| Inventário consumers/producers (P10) | ✅ | abaixo |

**Cobertura estimada: 🟢 95%** (P1/P2/P6 N/A por natureza da mudança).

## 2. Risco de regressão por gravidade

| Sev | Risco | Evidência |
|---|---|---|
| 🔴 | `STEP_CONTENT` (`form-wizard-steps.ts:73-80`) não re-indexado → `nextStep/prevStep` apontam índice errado → navegação PF quebra silenciosa | consumido por `stepHasContentFor` (`:83`) ← `nextStep/prevStep` (`:90/:100`) ← `FormWizard.tsx:71/84` |
| 🔴 | E2E `cenario4` faz "Voltar ×2" do Perfil ao step 0 (`form-wizard-cenario4.spec.ts:85-86`) — após fusão é **×1** → spec quebra se não re-baselinada | leitura direta |
| 🟡 | `form-wizard-steps.test.ts:27` `toHaveLength(6)` + asserts `stepValid(...,1/2/3,...)` re-indexam | leitura direta |
| 🟡 | E2E baseline (`form-novo-projeto-baseline.spec.ts:36-66`) caminha 6 passos com document no Passo 1 → re-baseline p/ 5 | leitura direta |
| 🟡 | UI passa a exibir "Passo X de 5" (`FormWizard.tsx:59`) — comunicar ao P.O. | `STEP_DEFS.length` dinâmico |
| 🟢 | Sidebar oculto no step 0 esconder algo útil | mockup P.O. confirma: nada do sidebar no Passo 1 |

## 3. Consumers E producers reais (inventários canônicos)

### Producers (quem ESCREVE/controla o passo)
| `arquivo:linha` | Papel |
|---|---|
| `NovoProjeto.tsx:433` | `const [wizardStep, setWizardStep] = useState(0)` — **único writer** do estado de passo |
| `FormWizard.tsx:71/84` | dispara `setWizardStep` via `prevStep/nextStep` |

### Consumers do módulo `form-wizard-steps` (quem LÊ o modelo)
| `arquivo:linha` | Consome | Impacto |
|---|---|---|
| `FormWizard.tsx:11,33,34,40,54,59,71,84` | STEP_DEFS, LAST_STEP, stepValid, nextStep, prevStep | 🟢 dinâmico (auto-ajusta a 5); verificar zero-hardcode |
| `form-wizard-steps.test.ts:3,27-89` | STEP_DEFS, stepValid, canSubmit, stepHasContentFor, nextStep, prevStep | 🔴 re-baseline (índices + length) |
| `PerfilEmpresaIntelligente.tsx:799` (`showStep`) + 16 calls | `currentStep` (prop de NovoProjeto) | 🔴 re-index showStep |
| `NovoProjeto.tsx:471,477,523,565` | passa `wizardStep`; guards `===3`/`===5` | 🔴 re-index + guards dos 4 painéis |

### NÃO impactados (verificado — falsos positivos do grep `currentStep`)
`FlowStepper.tsx`, `DiagnosticoStepper.tsx/.page`, `OnboardingTour.tsx`, `FormularioProjeto.tsx`, `ProjetoDetalhesV2.tsx`, `QuestionarioSolaris.tsx` (`canSubmit` local) — **steppers ortogonais**, não consomem `form-wizard-steps` nem `wizardStep`.

## 4. Árvore de impacto (ASCII)

```
form-wizard-steps.ts  (STEP_DEFS 6→5 · STEP_CONTENT 6→5 entries · LAST_STEP=4 · requiredLabels p/ step0)
├── FormWizard.tsx ............... 🟢 lê dinâmico → "Passo X de 5" + indicadores 1-5 automáticos
├── form-wizard-steps.test.ts .... 🔴 re-baseline (length 6→5, índices stepValid/nextStep/prevStep)
└── (via NovoProjeto → currentStep)
    └── PerfilEmpresaIntelligente.tsx
        ├── showStep(1)→(0)  campo CNPJ/CPF  (:947/:971)
        ├── showStep(0,1,2)→(0,1) header     (:905)
        ├── showStep(2)→(1) / (2,4)→(1,3) / (4)→(3)  perfil/operação/opcionais
        └── ScorePanel (:1542-1557) → gate p/ NÃO renderizar quando currentStep===0
NovoProjeto.tsx
├── wizardStep===3→2 (Descrição :477) · ===5→4 (Confirmação :565)
├── banner CNAE (:528-536) → guard (!formWizardOn || wizardStep!==0)
└── bloco vermelho (:542-561) → guard (!formWizardOn || wizardStep!==0)
E2E:
├── form-novo-projeto-baseline.spec.ts (:36-66)  🔴 re-baseline 6→5 passos
├── form-wizard-cenario4.spec.ts (:70-96)        🔴 document no step0 + Voltar ×2→×1
└── z17-pipeline-completo.spec.ts                ⚠️ verificar se caminha o wizard
```

## 5. Cirurgia possível?

**Escopo mínimo = 5 arquivos** (1 lib + 1 lib-test + 2 componentes + 1 página) + 2-3 E2E specs. Encapsulamento alto: o modelo de passos vive em 1 módulo com **1 consumer de produção** (`FormWizard.tsx`). Nenhum schema, nenhuma procedure tRPC, nenhum campo persistido, zero-rename. Não é cross-cutting de dados — é cross-cutting de **índices de UI** num subsistema fechado.

## 6. AS-IS (camadas, com citações)

- **Modelo:** `form-wizard-steps.ts:31-43` (6 passos) + `STEP_CONTENT:73-80` (6 entries) + `stepValid:54` / `nextStep:90` / `prevStep:100`.
- **Render do stepper:** `FormWizard.tsx:40` (indicadores), `:59` ("Passo {step+1} de {len}").
- **Campos por passo:** `PerfilEmpresaIntelligente.tsx:799` `showStep`; radio `:912` `showStep(0)`; documento `:947/:971` `showStep(1)`; perfil `:995+` `showStep(2)`; opcionais `showStep(4)`.
- **Painéis "vazando" no step 0:** ScorePanel `:344`/`:1545` (sem gate); Obrigatórios `:667`; banner CNAE `NovoProjeto.tsx:528`; bloco vermelho `:542`.
- **Estado:** `NovoProjeto.tsx:433` `useState(0)`.

## 7. TO-BE — fases

**Sem bump de ADR** (nenhum ADR governa o count de passos).

- **F0 — módulo puro (`form-wizard-steps.ts`):** `STEP_DEFS` → 5 entries (merge `tipo`+`identificacao`; `requiredLabels:["CNPJ válido","CPF válido"]` no novo `[0]` com comentário "union, PF-condicional"). `STEP_CONTENT` → 5 entries (remove antigo step 1, re-index keys 0-4). `LAST_STEP=4`. + unit tests (`form-wizard-steps.test.ts`) re-baselinados **antes** de tocar UI.
- **F1 — `PerfilEmpresaIntelligente.tsx`:** documento `showStep(1)→(0)`; header `(0,1,2)→(0,1)`; perfil `(2)→(1)`; `(2,4)→(1,3)`; opcionais `(4)→(3)`. Gate do `ScorePanel` (`:1542-1557`) → render só quando `!formWizardOn || currentStep == null || currentStep >= 1`.
- **F2 — `NovoProjeto.tsx`:** `wizardStep===3→2` (`:477`), `===5→4` (`:565`); guards `(!formWizardOn || wizardStep!==0)` no banner CNAE (`:528`) e bloco vermelho (`:542`). data-testid nos 4 painéis (Bloco 9).
- **F3 — E2E:** re-baseline `form-novo-projeto-baseline.spec.ts` (5 passos, document no step 0), `form-wizard-cenario4.spec.ts` (document step0 + Voltar ×1), verificar `z17-pipeline-completo.spec.ts`.
- **F4 — docs:** atualizar `SPEC-F3-wizard.md` (6→5) e `MOCKUP_F3_wizard.html` (ou nota de supersede).

### DoD discriminante (REGRA-ORQ-47 / Lição #139/#149)
1. **PJ:** step 0 → radio + CNPJ visíveis; 4 painéis ausentes; Avançar habilita com CNPJ válido.
2. **PF:** step 0 → radio + CPF visíveis; 4 painéis ausentes; Avançar habilita com CPF válido.
3. **Discriminante:** Passo 2 (Perfil) → "Status do Perfil" + "Obrigatórios" **reaparecem** (prova gate por-passo).
4. **Regressão flag-OFF:** página única baseline inalterada.

## 8. Auto-auditoria final (cobertura)

| Item | Status | Evidência |
|---|---|---|
| Afirmações com `arquivo:linha` | ✅ | todas |
| Testes no grep | ✅ | `.test.ts` + 3 E2E |
| .sql/.md/.json | ✅ | docs canônicos identificados |
| PDF/email | N/A | mudança de UI |
| Issues pré-existentes | ✅ | nenhuma (Lição #83) |
| ast-grep ≥3 padrões | ⚠️ | textual+import suficiente (alvo não é campo) |
| Dead-read knip/ts-prune | N/A | sem campo persistido |
| LOC antes de classificar | ✅ | medido |
| ADRs + bump | ✅ | **nenhum ADR → sem bump** |
| Writers/readers | ✅ | §3 |
| Inventário consumers/producers | ✅ | §3 |
| **Cobertura** | **🟢 95%** | P1/P2/P6 N/A por natureza |

## 9. Pendências para Manus
- Re-validar em **greenfield** após deploy (verificar build hash — Lição #141): criar projeto PJ e PF, confirmar Passo 1 limpo + painéis reaparecendo no Passo 2.
- ~~Confirmar que `z17-pipeline-completo.spec.ts` não tem assert hardcoded de 6 passos~~ — ✅ **RESOLVIDO** (Manus, 26/06): z17 cria via `criarProjetoViaApi()`, não navega o wizard; imune à mudança 6→5. Re-baseline restrito aos **3 specs** previstos (baseline + cenario4 + unit test).
