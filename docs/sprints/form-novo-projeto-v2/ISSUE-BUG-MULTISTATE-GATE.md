## [BUG-MULTISTATE-GATE] multiState obrigatório no backend mas não gatekeepado no wizard (PJ) — P1

## Bloco 1 — Contexto

PJ que **não responde** "Opera em múltiplos estados?" (`multiState` começa `null`) consegue avançar o wizard mas o backend rejeita na criação com `400 "Operação multiestadual obrigatória para PJ"` (`operationProfile.multiState`).

**Root cause — divergência frontend-gate ↔ backend-validation** (mesma classe Lição #74/#137):

| Camada | `multiState` |
|---|---|
| Backend superRefine (`routers-fluxo-v3.ts:472`) | PJ + `multiState === undefined` → **REJEITA** (obrigatório) |
| `calcProfileScore` (`PerfilEmpresaIntelligente.tsx:189-214`) | **AUSENTE** — nem `required[]` nem `optional[]` |
| `STEP_DEFS[1].requiredLabels` (`form-wizard-steps.ts:38`) | **não inclui** multiState → "Avançar" não bloqueia |
| UI (`:1390`) | mostra `*` mas é visual-only |

Cadeia: wizard permite avançar com `multiState=null` → frontend envia `null` → Zod preprocess (`:406`) `null→undefined` → superRefine (`:472`) rejeita. Origem: `b2bee292` (#1304 F8, campanha BUG-AGRO-CPF-UX) — superRefine adicionado sem alinhar `calcProfileScore`. **Não é regressão de UX-PASSO1/#1601.** Sintoma "só com Import/Export=Sim" é coincidência (P.O. não respondeu o toggle neste teste) — dispara para **qualquer PJ** que pule multiState.

## Bloco 2 — Escopo (3 arquivos, Opção A — frontend alinha ao backend)

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `PerfilEmpresaIntelligente.tsx` `calcProfileScore` branch **PJ** (`:194-201`) | add `[p.multiState !== null, "Operação multiestadual"]` — **só PJ** (REGRA-ORQ-42: PF dispensa; superRefine retorna cedo p/ PF `:464`) |
| 2 | `form-wizard-steps.ts` `STEP_DEFS[1].requiredLabels` | add `"Operação multiestadual"` — **string idêntica** ao calcProfileScore (Lição #74: strings dessincronizadas = gate não casa) |
| 3 | Re-baseline units | `form-wizard-steps.test.ts` (stepValid step 1 + fixture multiState) · `calc-profile-score-baseline.test.tsx` (fixture multiState null→false; required PJ 6→7) |

## Bloco 3 — ❌ Não fazer
Opção B (relaxar backend) — contradiz **REGRA-ORQ-42** (multiState obrigatório p/ PJ é intencional). Barrada.

## Bloco 7 — DoD discriminante (REGRA-ORQ-47 / Lição #139)

- [ ] **Positivo PJ:** responde "Opera em múltiplos estados?" (Sim ou Não) → "Avançar" habilita → projeto criado sem 400
- [ ] **Negativo discriminante PJ:** pula multiState (null) → "Avançar" **bloqueado**; `missingRequired` inclui "Operação multiestadual"
- [ ] **Neutro PF:** multiState não preenchido → avança normal (não cobrado)
- [ ] `tsc --noEmit` 0 erros
- [ ] `form-wizard-steps.test.ts` + `calc-profile-score-baseline.test.tsx` re-baselinados e PASS

## Bloco 9 — Referências de código
- Gate backend: `routers-fluxo-v3.ts:472-478` (superRefine multiState)
- Gate frontend a alinhar: `PerfilEmpresaIntelligente.tsx:194-201` (`calcProfileScore` required PJ)
- Wizard gate: `form-wizard-steps.ts:38` (STEP_DEFS[1].requiredLabels) + `stepValid:54`
- UI label: `PerfilEmpresaIntelligente.tsx:1390` ("Opera em múltiplos estados?")
- Testes: `form-wizard-steps.test.ts` · `calc-profile-score-baseline.test.tsx`

## Contrato (input/output)
`createProject` (`routers-fluxo-v3.ts:363`) — contrato **inalterado**. Sem mudança de schema/assinatura. Apenas o gate frontend passa a exigir `multiState` p/ PJ antes do submit (paridade com o superRefine já existente). Nenhuma procedure nova.

## Fluxo E2E (passo a passo)
1. `/projetos/novo`, PJ, step 1 (Perfil): preencher TJ/Porte/Regime/Operação/Cliente **mas deixar "Opera em múltiplos estados?" sem resposta** → "Avançar" **bloqueado** (antes: permitia).
2. Responder o toggle (Sim ou Não) → "Avançar" habilita.
3. Concluir → projeto criado **sem 400**.
4. PF: o toggle não é cobrado → avança normal.

## ADR
N/A — sem mudança arquitetural (alinha gate frontend ao backend existente).

## Evidência
Diagnóstico Manus + auditoria CC (correção: "Múltiplos estabelecimentos" = `hasMultipleEstablishments`, campo distinto; multiState ausente de calcProfileScore). `git=aeb5208e / checkpoint=751a09ea`.
