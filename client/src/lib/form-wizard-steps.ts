// form-wizard-steps.ts — F1 (FORM-NOVO-PROJETO-V2 · SPEC-F3-wizard.md)
//
// Módulo PURO do stepper (D1 do despacho): STEP_DEFS + stepValid.
// Testável sem RTL. NÃO renomeia campos, NÃO valida nada novo — apenas particiona
// quais LABELS de obrigatório o "Avançar" de cada passo exige, e consulta a fonte
// única de verdade `calcProfileScore` (inv. 6 / Dúvida 1 do Consultor).

import { calcProfileScore, type PerfilEmpresaData } from "../components/PerfilEmpresaIntelligente";

export type WizardStepKey =
  | "tipo"
  | "identificacao"
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
 * D2: Passo 0 (Tipo PJ/PF) SEPARADO. Os labels batem com calcProfileScore
 * (PerfilEmpresaIntelligente.tsx). CNPJ/CPF ambos no passo 1: calcProfileScore só
 * coloca o relevante em missingRequired (PF-condicional) → o irrelevante nunca bloqueia.
 */
export const STEP_DEFS: readonly WizardStepDef[] = [
  { id: 0, key: "tipo", label: "Tipo", requiredLabels: [] },
  { id: 1, key: "identificacao", label: "Identificação", requiredLabels: ["CNPJ válido", "CPF válido"] },
  {
    id: 2,
    key: "perfil",
    label: "Perfil",
    requiredLabels: ["Tipo Jurídico", "Porte da empresa", "Regime Tributário", "Tipo de Operação", "Tipo de Cliente"],
  },
  { id: 3, key: "descricao", label: "Descrição", requiredLabels: [] },
  { id: 4, key: "opcionais", label: "Melhorar diagnóstico", requiredLabels: [] },
  { id: 5, key: "confirmacao", label: "Confirmação", requiredLabels: [] },
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
