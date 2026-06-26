## [UX-PASSO1] — Fundir Passo 1 (Tipo) + Passo 2 (Identificação) e limpar painéis do Passo 1

> Rascunho de issue SPEC-FIRST · Classe B · gerado por Claude Code a partir do impact-tree
> `docs/governance/relatorios/AS-IS-TO-BE-UX-PASSO1-MERGE-IDENTIFICACAO-20260626.md`
> Fonte UX: `UX-CHANGE-PASSO1-PF-CLEANUP.md` (P.O., 26/06/2026) · Decisão P.O.: **Opção 2**

---

## Bloco 1 — Contexto

Wizard de criação de projeto (`/projetos/novo`) hoje tem **6 passos**. O Passo 1 ("Tipo") mostra só o radio PJ/PF; o documento (CNPJ/CPF) está num Passo 2 separado ("Identificação"). Além disso, no Passo 1 "vazam" 4 painéis que pertencem a passos posteriores, causando ruído visual (o usuário ainda não tem como preencher os campos listados como faltantes).

**Mudança (decisão P.O. — Opção 2):**
1. **Fundir** o documento (CNPJ/CPF) no Passo 1 junto do radio → wizard passa de **6 para 5 passos**.
2. **Ocultar** no novo Passo 1 (step 0): "Status do Perfil", "Obrigatórios (N)", banner "Análise Inteligente de CNAEs", bloco vermelho "Preencha os dados obrigatórios…". Esses painéis reaparecem do **Passo 2 (Perfil)** em diante.

### Fluxo relacionado (REGRA-ORQ-13)
- **Step:** Etapa 1 de 5 — Criação do Projeto (wizard interno, sub-passos)
- **Upstream:** lista de Projetos (`/projetos`) → "Novo Projeto"
- **Downstream:** após Confirmação (novo step 4) → submit → questionário (fluxo inalterado)
- **Integrações obrigatórias:** nenhuma nova — só re-index de passos + visibilidade

### Efeitos cascata (REGRA-ORQ-14)
- **Efeito imediato:** ao selecionar PJ/PF no step 0, o campo CNPJ/CPF aparece na MESMA tela.
- **Efeito cascata:** "Avançar" do step 0 passa a exigir documento válido (antes exigido no step 1).
- **Formato correto:** `STEP_DEFS` com 5 entries; `requiredLabels` do documento migram p/ step 0.
- **Navegação pós-ação:** Avançar → Passo 2 (Perfil). Voltar do Perfil → Passo 1 (×1, não ×2).

## Bloco 2 — UX Spec

**Mockup aprovado:** `UX-CHANGE-PASSO1-PF-CLEANUP.md` (imagens `mockup-passo1-pj.png` / `mockup-passo1-pf.png`).

### Resumo funcional (inline)
Passo 1 (step 0) contém **apenas**: header "Identificação [Obrigatório]" · radio Tipo de Pessoa (default PJ) · campo CNPJ (PJ) **ou** CPF (PF) · botões Voltar / Avançar. **Nada** de sidebar/painéis. UI exibe **"Passo 1 de 5 — Tipo"**.

### Estados
- **PJ (default):** campo CNPJ visível; Avançar habilita com CNPJ válido (14 díg.).
- **PF:** campo CPF visível (substitui CNPJ); Avançar habilita com CPF válido (11 díg.).
- **4 painéis:** ocultos quando `currentStep === 0`; visíveis de `currentStep >= 1`.

> Macro-stepper "Etapa 1 de 5 — Criação do Projeto" (`NovoProjeto.tsx:456`) **inalterado** — é outro stepper.

## Bloco 3 — Skeleton (delta)

```diff
# form-wizard-steps.ts
- STEP_DEFS = [tipo(0), identificacao(1), perfil(2), descricao(3), opcionais(4), confirmacao(5)]
+ STEP_DEFS = [tipo(0)+doc, perfil(1), descricao(2), opcionais(3), confirmacao(4)]   // 5 entries
+ STEP_DEFS[0].requiredLabels = ["CNPJ válido","CPF válido"]  // union PF-condicional (comentar)
- STEP_CONTENT = {0..5}
+ STEP_CONTENT = {0..4}   // remove antigo step 1, re-index keys
+ LAST_STEP = 4
```

### Gate 0 UI (REGRA-ORQ-48) — ✅ PREENCHIDO
- [x] Rota alvo: `/projetos/novo`
- [x] Componente confirmado via App.tsx (`App.tsx:89` → `NovoProjeto`; import `:8`)
- [x] Rota "-legacy"/"-v2" descartada: **não existe** `-legacy` para NovoProjeto

## Bloco 4 — Schema do banco
**N/A** — mudança é 100% frontend (visibilidade + índices de passo). Nenhuma coluna, nenhuma migration, **zero-rename** (`taxIdType/cnpj/cpf` preservados).

## Bloco 5 — Contrato API
**N/A** — nenhuma procedure tRPC nova ou alterada. Submit final (`createProject`) inalterado.

## Bloco 6 — Estado atual do componente (via grep)
- `form-wizard-steps.ts:31-43` `STEP_DEFS` (6) · `:73-80` `STEP_CONTENT` (6 entries) · `:45` `LAST_STEP`
- `FormWizard.tsx:11,33-34,40,54,59,71,84` — único consumer de produção do módulo (lê dinâmico)
- `PerfilEmpresaIntelligente.tsx:799` `showStep`; documento `:947/:971` `showStep(1)`; radio `:912` `showStep(0)`; ScorePanel `:344`/`:1545` (sem step-gate); Obrigatórios `:667`
- `NovoProjeto.tsx:433` `useState(0)`; `:471,523` passa step; `:477` `===3`; `:565` `===5`; banner CNAE `:528`; bloco vermelho `:542`

## Bloco 7 — Critérios de aceite + Testes

### Critérios de aceite (binários)
- [ ] `STEP_DEFS.length === 5` e `STEP_DEFS[0]` cobre radio + documento (requiredLabels documento)
- [ ] `STEP_CONTENT` tem 5 entries (keys 0-4); `nextStep/prevStep` corretos para PJ e PF
- [ ] UI exibe **"Passo 1 de 5 — Tipo"** (não "de 6")
- [ ] **PJ step 0:** radio + CNPJ visíveis; 4 painéis ausentes; Avançar habilita com CNPJ válido
- [ ] **PF step 0:** radio + CPF visíveis; 4 painéis ausentes; Avançar habilita com CPF válido
- [ ] **Discriminante:** Passo 2 (Perfil) → "Status do Perfil" + "Obrigatórios" **reaparecem**
- [ ] **Regressão flag-OFF** (`VITE_ENABLE_FORM_WIZARD=false`): página única baseline inalterada
- [ ] Macro-stepper "Etapa 1 de 5" inalterado

### Plano de testes
- **Unit** (`form-wizard-steps.test.ts`): re-baseline `toHaveLength(5)`; `stepValid` documento em índice 0, perfil em 1, descrição em 2; `nextStep/prevStep` para 5 passos (PJ e PF).
- **E2E** (`form-novo-projeto-baseline.spec.ts`): caminhar 5 passos com documento no step 0.
- **E2E** (`form-wizard-cenario4.spec.ts`): documento no step 0; **Voltar ×1** (não ×2) do Perfil ao step 0; PF esconde TJ/Porte/Regime no Perfil.
- **E2E** (`z17-pipeline-completo.spec.ts`): **sem ação** — confirmado por Manus (26/06) que cria via `criarProjetoViaApi()`, não navega o wizard; imune à mudança 6→5.

## Bloco 8 — Armadilhas + Impacto

### 8a. Armadilhas
- 🔴 `STEP_CONTENT` (`:73-80`) NÃO re-indexado → `nextStep/prevStep` apontam índice errado → **navegação PF quebra silenciosa**. Cobrir com unit antes da UI.
- 🔴 `cenario4.spec.ts:85-86` faz "Voltar ×2" → após fusão é **×1**.
- 🟡 `requiredLabels:["CNPJ válido","CPF válido"]` é **union** — `calcProfileScore` é PF-condicional; só o relevante bloqueia. Comentar no código.
- ✅ `z17-pipeline-completo.spec.ts` — **verificado limpo** (Manus, 26/06): cria via API, não navega wizard; nenhum hardcode de 6. Sem ação.

### 8b. Impacto
- **Não impactados** (steppers ortogonais): `FlowStepper`, `DiagnosticoStepper`, `OnboardingTour`, `FormularioProjeto`, `ProjetoDetalhesV2` — não consomem `form-wizard-steps`/`wizardStep`.
- **Snapshots `.snap`:** os 3 existentes são server-side — não tocam o wizard.

## Bloco 9 — Referências de código

### Localização (re-index showStep · `PerfilEmpresaIntelligente.tsx`)
| Hoje | Novo |
|---|---|
| documento `showStep(1)` (`:947/:971`) | `showStep(0)` |
| header `showStep(0,1,2)` (`:905`) | `showStep(0,1)` |
| perfil `showStep(2)` | `showStep(1)` |
| operação `showStep(2,4)` | `showStep(1,3)` |
| opcionais `showStep(4)` | `showStep(3)` |
| ScorePanel render (`:1542-1557`) | gate: render só se `!formWizardOn \|\| currentStep == null \|\| currentStep >= 1` |

### `NovoProjeto.tsx`
| Hoje | Novo |
|---|---|
| Descrição `wizardStep === 3` (`:477`) | `=== 2` |
| Confirmação `wizardStep === 5` (`:565`) | `=== 4` |
| banner CNAE (`:528-536`) | guard `(!formWizardOn \|\| wizardStep !== 0)` |
| bloco vermelho (`:542-561`) | guard `(!formWizardOn \|\| wizardStep !== 0)` |

### data-testid a adicionar (Bloco 9)
Para asserts de ausência/presença no E2E (DoD discriminante):
- `data-testid="status-perfil"` — ScorePanel (`PerfilEmpresaIntelligente.tsx:345`)
- `data-testid="obrigatorios-faltantes"` — ScorePanel (`PerfilEmpresaIntelligente.tsx:668`)
- `data-testid="banner-cnae"` — banner CNAE (`NovoProjeto.tsx:529`)
- `data-testid="gate-perfil-vermelho"` — bloco vermelho (`NovoProjeto.tsx:545`)

---

## ADR — Decisão arquitetural
**N/A** — nenhum ADR em `docs/adr/` governa o count de passos do wizard (verificado via grep). Sem bump. Atualizar `SPEC-F3-wizard.md` (doc de sprint, não ADR) de 6→5.

## Contrato de integração
**N/A** — sem procedure. Frontend-only.

## Fluxo E2E completo
1. `/projetos` → "Novo Projeto" → `/projetos/novo` (wizard ON).
2. **Passo 1 (step 0) "Tipo":** PJ default → digita CNPJ válido → Avançar habilita. (Sem painéis visíveis.)
3. **Passo 2 (step 1) "Perfil":** painéis reaparecem; preenche TJ/Porte/Regime/Operação/Cliente.
4. **Passo 3 (step 2) "Descrição":** nome + descrição ≥100.
5. **Passo 4 (step 3) "Melhorar diagnóstico":** opcionais → Avançar.
6. **Passo 5 (step 4) "Confirmação":** revisa → submit → cria projeto.
7. **PF:** no step 0 troca p/ PF → CPF substitui CNPJ; demais passos PF-condicionais inalterados.

---

## Checklist spec completa (labels)
- [ ] `spec-bloco9` — Bloco 9 preenchido com dados do código
- [ ] `spec-adr` — ADR "N/A" documentado
- [ ] `spec-contrato` — "N/A" (frontend-only) documentado
- [ ] `spec-e2e` — Fluxo E2E passo a passo
- [ ] `spec-aprovada` — P.O. aprovou (última label)

**Labels adicionais sugeridas:** `frontend`, `form-wizard` (sem `critical-path`/`db:migration`/`rag:review` — não toca esses paths).
