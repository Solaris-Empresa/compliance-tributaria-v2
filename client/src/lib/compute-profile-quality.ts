// compute-profile-quality.ts — Sprint Z-22 CPIE v3 (#725)
// Funcao pura: conta campos preenchidos do perfil da empresa.
// Zero DB, zero LLM. Alinhada com cpie.ts:calcDimensionScores (16 campos).

export interface ProfileQualityInput {
  cnpj?: string | null;
  companyType?: string | null;
  companySize?: string | null;
  taxRegime?: string | null;
  annualRevenueRange?: string | null;
  operationType?: string | null;
  clientType?: string[] | null;
  paymentMethods?: string[] | null;
  multiState?: boolean | null;
  hasMultipleEstablishments?: boolean | null;
  hasImportExport?: boolean | null;
  hasSpecialRegimes?: boolean | null;
  hasIntermediaries?: boolean | null;
  hasTaxTeam?: boolean | null;
  hasAudit?: boolean | null;
  hasTaxIssues?: boolean | null;
}

export interface ProfileQualityResult {
  percent: number;
  filled: number;
  total: number;
}

const STRING_FIELDS = [
  "companyType",
  "companySize",
  "taxRegime",
  "annualRevenueRange",
  "operationType",
] as const;

const ARRAY_FIELDS = ["clientType", "paymentMethods"] as const;

const BOOLEAN_FIELDS = [
  "multiState",
  "hasMultipleEstablishments",
  "hasImportExport",
  "hasSpecialRegimes",
  "hasIntermediaries",
  "hasTaxTeam",
  "hasAudit",
  "hasTaxIssues",
] as const;

const TOTAL_FIELDS =
  1 + STRING_FIELDS.length + ARRAY_FIELDS.length + BOOLEAN_FIELDS.length; // 16

export function computeProfileQuality(
  profile: ProfileQualityInput | null | undefined
): ProfileQualityResult {
  if (!profile) {
    return { percent: 0, filled: 0, total: TOTAL_FIELDS };
  }

  let filled = 0;

  const cnpjDigits = (profile.cnpj ?? "").replace(/\D/g, "");
  if (cnpjDigits.length === 14) filled++;

  for (const key of STRING_FIELDS) {
    const value = profile[key];
    if (typeof value === "string" && value.trim().length > 0) filled++;
  }

  for (const key of ARRAY_FIELDS) {
    const value = profile[key];
    if (Array.isArray(value) && value.length > 0) filled++;
  }

  for (const key of BOOLEAN_FIELDS) {
    const value = profile[key];
    if (value !== null && value !== undefined) filled++;
  }

  const percent = Math.round((filled / TOTAL_FIELDS) * 100);
  return { percent, filled, total: TOTAL_FIELDS };
}
