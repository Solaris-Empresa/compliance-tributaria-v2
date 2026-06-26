// form-wizard-steps.ts — F1 (FORM-NOVO-PROJETO-V2 · SPEC-F3-wizard.md)
//
// Módulo PURO do stepper (D1 do despacho): STEP_DEFS + stepValid.
// Testável sem RTL. NÃO renomeia campos, NÃO valida nada novo — apenas particiona
// quais LABELS de obrigatório o "Avançar" de cada passo exige, e consulta a fonte
// única de verdade `calcProfileScore` (inv. 6 / Dúvida 1 do Consultor).

import { calcProfileScore, type PerfilEmpresaData } from "../components/PerfilEmpresaIntelligente";

export type WizardStepKey =
  | "tipo"
  | "perfil"
  | "descricao"
  | "opcionais"
  | "confirmacao";

export interface WizardStepDef {
  id: number;
  key: WizardStepKey;
  label: string;
  /** Labels de obrigatório (de calcProfileScore) que este passo cobra. Vazio = sem gate. */
  requiredLabels: readonly string[];
}

/**
 * UX-PASSO1 (#1598): Passo 0 "Tipo" FUNDE radio PJ/PF + campo CNPJ/CPF na mesma tela
 * (antes: radio no step 0, documento no step 1 "Identificação"). Wizard passa de 6 → 5 passos.
 * O `requiredLabels` de step 0 = ["CNPJ válido","CPF válido"] é UNION dos dois cenários, NÃO
 * "ambos obrigatórios": calcProfileScore é PF-condicional e só coloca o label relevante em
 * missingRequired (CNPJ p/ PJ, CPF p/ PF) → o irrelevante nunca bloqueia o "Avançar".
 */
export const STEP_DEFS: readonly WizardStepDef[] = [
  { id: 0, key: "tipo", label: "Tipo", requiredLabels: ["CNPJ válido", "CPF válido"] },
  {
    id: 1,
    key: "perfil",
    label: "Perfil",
    requiredLabels: ["Tipo Jurídico", "Porte da empresa", "Regime Tributário", "Tipo de Operação", "Tipo de Cliente"],
  },
  { id: 2, key: "descricao", label: "Descrição", requiredLabels: [] },
  { id: 3, key: "opcionais", label: "Melhorar diagnóstico", requiredLabels: [] },
  { id: 4, key: "confirmacao", label: "Confirmação", requiredLabels: [] },
] as const;

export const LAST_STEP = STEP_DEFS.length - 1;
export const DESCRIPTION_MIN = 100;

/**
 * "Avançar" do passo está habilitado?
 * - passo "descricao": gate especial (≥100 chars) — não é coberto por calcProfileScore.
 * - demais: nenhum dos requiredLabels do passo está em missingRequired.
 * Fonte única de verdade = `calcProfileScore` (PF-condicional) — sem regra nova.
 */
export function stepValid(perfil: PerfilEmpresaData, step: number, descriptionLength: number): boolean {
  const def = STEP_DEFS[step];
  if (!def) return false;
  if (def.key === "descricao") return descriptionLength >= DESCRIPTION_MIN;
  const { missingRequired } = calcProfileScore(perfil);
  return def.requiredLabels.every((label) => !missingRequired.includes(label));
}

/** Pode submeter (último passo) = todos os passos anteriores válidos. */
export function canSubmit(perfil: PerfilEmpresaData, descriptionLength: number): boolean {
  return STEP_DEFS.slice(0, LAST_STEP).every((d) => stepValid(perfil, d.id, descriptionLength));
}

// ── F3 (D10 · Opção A): dualidade PJ/PF — navegação que pula passos sem conteúdo ──────
//
// Conteúdo visível de cada passo por tipo de pessoa. HOJE todos os passos têm conteúdo
// para PJ e PF (PF: passo 2 = Cliente/multiState; passo 4 = Complexidade/Financeiro) →
// `nextStep`/`prevStep` NÃO pulam nada. É rede de segurança à prova de futuro: se um passo
// virar só-PJ (pf:false), a navegação o pula automaticamente para PF, sem nova intervenção.
const STEP_CONTENT: Record<number, { pj: boolean; pf: boolean }> = {
  0: { pj: true, pf: true }, // Tipo (radio PJ/PF + CNPJ/CPF na mesma tela — UX-PASSO1 #1598)
  1: { pj: true, pf: true }, // PJ: TJ/Porte/Regime/Operação/Cliente · PF: Cliente/multiState
  2: { pj: true, pf: true }, // Nome + Descrição
  3: { pj: true, pf: true }, // PJ: tudo · PF: Complexidade/Financeiro
  4: { pj: true, pf: true }, // Confirmação
};

/** O passo tem ao menos 1 campo visível para o tipo de pessoa (isPF)? */
export function stepHasContentFor(step: number, isPF: boolean): boolean {
  const c = STEP_CONTENT[step];
  if (!c) return false;
  return isPF ? c.pf : c.pj;
}

/** Próximo passo COM conteúdo para isPF (pula vazios). `hasContent` injetável para teste. */
export function nextStep(
  from: number,
  isPF: boolean,
  hasContent: (step: number, isPF: boolean) => boolean = stepHasContentFor,
): number {
  for (let s = from + 1; s <= LAST_STEP; s++) if (hasContent(s, isPF)) return s;
  return LAST_STEP;
}

/** Passo anterior COM conteúdo para isPF (pula vazios). `hasContent` injetável para teste. */
export function prevStep(
  from: number,
  isPF: boolean,
  hasContent: (step: number, isPF: boolean) => boolean = stepHasContentFor,
): number {
  for (let s = from - 1; s >= 0; s--) if (hasContent(s, isPF)) return s;
  return 0;
}
