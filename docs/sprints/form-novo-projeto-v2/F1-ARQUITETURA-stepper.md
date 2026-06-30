# F1 — Arquitetura do Stepper (rascunho · não-implementado)

**FORM-NOVO-PROJETO-V2 · F1 (Wizard/Stepper local)** · Flag `VITE_ENABLE_FORM_WIZARD` (build-time, OFF)
**Status:** RASCUNHO para aprovação — pré-requisito: merge do #1580 (F0 testids). Não toca código ainda.
**Referências:** `SPEC-F3-wizard.md` (invariantes 1-7) · `MOCKUP_F3_wizard.html` (#1577, 63 data-testid)

---

## 0. Princípio (das invariantes da spec)
O F1 cria **a casca de navegação** (stepper) e **NÃO** mexe na lógica de campo, validação, payload ou nomes. O F2(refactor) é que pluga os painéis de campo nos passos. **Flag OFF → layout atual idêntico.**

## 1. Árvore de componentes

```
NovoProjeto (page, /projetos/novo — só CREATE)
 ├── flag OFF → <LayoutAtual/>            ← página única atual (INTOCADA)
 └── flag ON  → <FormWizard
                  value={perfilData} onChange={setPerfilData}      ← state ÚNICO (inv. 3)
                  name / description / setName / setDescription
                  onSubmit={handleSubmit}>                          ← submit existente (inv. 1/2)
        ├── <WizardProgress steps={STEP_DEFS} current={step}/>      data-testid="wizard-progress" / step-indicator-{i}
        ├── <WizardStepPanel def={STEP_DEFS[step]}>
        │     └── {F2 pluga aqui o grupo de campos do passo}        ← reusa PerfilEmpresaIntelligente / sub-blocos
        └── <WizardNav
               onVoltar / onAvancar / onSubmit
               canAdvance={stepValid(step)}/>                       btn-wizard-voltar / -avancar / btn-criar-projeto
```

- **`mode='edit'` (FormularioProjeto / ProjetoDetalhesV2) NÃO é tocado** — o wizard só existe no render de `NovoProjeto` (create). Inv. da §3 do SPEC.
- O **state vive em `NovoProjeto`** (`perfilData`, `name`, `description` já existem lá). O `FormWizard` é **controlado** (value/onChange) — não duplica estado.

## 2. Modelo de passos (`STEP_DEFS`) — constante estática (inv. 6)

```ts
// Layout-independente: os testids são os MESMOS do form atual (F0) → E2E passa nos 2 layouts.
const STEP_DEFS = [
  { id: 0, key: "tipo",          requiredLabels: [] },                       // taxIdType (default cnpj)
  { id: 1, key: "identificacao", requiredLabels: ["CNPJ válido","CPF válido"] }, // 1 dos 2 conforme isPF*
  { id: 2, key: "perfil",        requiredLabels: ["Tipo Jurídico","Porte da empresa","Regime Tributário","Tipo de Operação","Tipo de Cliente"] },
  { id: 3, key: "descricao",     requiredLabels: [] },                       // gate especial: descLength≥100
  { id: 4, key: "opcionais",     requiredLabels: [] },                       // todos opcionais
  { id: 5, key: "confirmacao",   requiredLabels: [] },
] as const;
```

\* **Não precisa de lógica condicional PF/PJ no STEP_DEFS** — quem resolve é o `calcProfileScore` (que já é PF-condicional). Ver §3.

## 3. Gate "Avançar" por passo — label-map sobre `calcProfileScore` (inv. 6, Dúvida 1)

```ts
const { missingRequired } = calcProfileScore(perfilData);   // PF-condicional (PJ 6 / PF 2) — fonte única
function stepValid(step: number): boolean {
  if (STEP_DEFS[step].key === "descricao") return description.trim().length >= 100; // gate especial
  return STEP_DEFS[step].requiredLabels.every((l) => !missingRequired.includes(l));
}
```

**Por que funciona p/ PF sem `if`:** para PF, `calcProfileScore` **não cobra** "Tipo Jurídico/Porte/Regime/Operação" → esses labels **nunca** entram em `missingRequired` → o gate do passo 2 os ignora; só "Tipo de Cliente" (obrigatório em ambos) bloqueia. **Zero regra de validação nova** — só partição de exibição. (Resposta Dúvida 1 do Consultor.)

## 4. Submit só no fim + cadeia atômica (inv. 1/2, R1/R2/R4)
- Passos 0-4 = **só state local** (zero mutação tRPC). `onAvancar` apenas incrementa `step`.
- **`onSubmit` (createProject→extractCnaes→modal→confirmCnaes) dispara SÓ no Passo 5** (`btn-criar-projeto`) — o `handleSubmit` **atual, inalterado** (payload idêntico — inv. 1).
- "Voltar" é seguro (pré-submit) → **não re-cria projeto** (R2). O modal de CNAEs continua sub-passo do submit (R8).

## 5. Cascata PF/PJ (inv. 3, R3, Dúvida 3)
O toggle PF/PJ e a cascata (#1299) operam no **`perfilData` único** → a limpeza dos 8 campos propaga a todos os passos automaticamente (não há cópia por passo). Ao voltar ao Passo 0 e trocar PJ→PF: cascata limpa → passos PJ-only somem (isPF) → `step` recomputa (clamp ao máximo válido). **Cenário 4 do PLANO-TESTES cobre isso (bloqueante).**

## 6. Persistência (inv. 4/7, Dúvida 4)
- Hoje salva só `{name, description}` em `'etapa1'`. O wizard salva `perfilData` em **stage-key novo `'etapa1-perfil'`** — **sem tocar** `'etapa1'`.
- `loadTempData` genérico → flag OFF lê só `'etapa1'` (ignora o novo); flag ON lê ambos. Backward-compat estrutural.

## 7. Flag gating
```ts
const wizardOn = (import.meta.env.VITE_ENABLE_FORM_WIZARD as string|undefined) === "true";
return wizardOn ? <FormWizard .../> : <LayoutAtual/>;
```
Flag OFF → render atual byte-equivalente (regressão zero — DoD F0).

## 8. Arquivos previstos (F1)
| Arquivo | Mudança |
|---|---|
| `client/src/components/FormWizard.tsx` (novo) | casca: progress + step panel slot + nav; controlado por value/onChange |
| `client/src/pages/NovoProjeto.tsx` | gate da flag + render condicional `<FormWizard>` vs layout atual; passa state/handlers |
| `client/src/components/FormWizard.test.tsx` (novo) | unit do `stepValid` (label-map) + navegação (sem RTL: testar a função `stepValid`/`STEP_DEFS` pura extraída) |

**O que F1 NÃO faz** (fica para F2-refactor): mover os campos de `PerfilEmpresaIntelligente` para painéis por passo. No F1, o step panel pode renderizar o componente inteiro num passo (placeholder) — a partição vem no F2.

## 9. DoD do F1 (proposto)
- tsc 0 · flag OFF = layout atual idêntico (E2E F0 verde) · `stepValid`/`STEP_DEFS` com unit · zero rename (`git diff` sem `set("campo")` novo nem chave de payload) · submit só no passo final · navegação voltar/avançar.

## 10. Pergunta de design ao P.O./Consultor (antes do PR F1)
- **`stepValid` puro:** extrair `STEP_DEFS` + `stepValid` para um módulo testável (`form-wizard-steps.ts`) — permite unit sem RTL (que não está instalado). OK?
- **Passo 0 (Tipo) separado vs fundido no Passo 1:** o mockup tem Passo 0 visual (cards grandes); o Manus sugeriu fundir tipo+identificação. Mantenho **Passo 0 separado** (mockup aprovado). Confirmar.
