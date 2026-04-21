/**
 * briefing-sanitizer.ts — issue #808
 *
 * Bloqueia alucinação de NCM/NBS pelo LLM no briefing.
 *
 * Contexto:
 *   O prompt de generateBriefing cita lista autoritativa de NCMs da cesta básica
 *   (Art. 9 LC 214/2025). O LLM, ao ver "arroz" na descrição, associa NCM 1006
 *   aos PRODUTOS DA EMPRESA — mas o usuário pode não ter cadastrado esse NCM.
 *   Citar código específico sem confirmação é alucinação + risco tributário.
 *
 * Abordagem:
 *   1. Varrer o markdown com regex NCM \d{4} / NBS \d{3,}
 *   2. Se o código está em meta.ncms/meta.nbs (confirmado pelo usuário) → OK
 *   3. Se não está → envolver em disclaimer "(sugerido pela lei — confirmar
 *      classificação fiscal)" na primeira ocorrência. Subsequentes ficam com
 *      marcador curto "(sugerido)".
 *   4. Retornar lista de códigos bloqueados para audit_log.
 *
 * Feature flag:
 *   BRIEFING_SANITIZER_ENABLED=false → no-op (rollback instantâneo).
 *
 * Determinístico. Mesmo input → mesmo output.
 */

export interface SanitizerMeta {
  ncms?: string[];
  nbs?: string[];
}

export interface BlockedCode {
  type: "ncm" | "nbs";
  code: string;
  occurrences: number;
}

export interface SanitizeResult {
  sanitized: string;
  blockedCodes: BlockedCode[];
  enabled: boolean;
}

const NCM_REGEX = /\bNCM\s*(\d{4}(?:\.\d{2,4})?)/gi;
const NBS_REGEX = /\bNBS\s*(\d{3,8}(?:\.\d{2,4})?)/gi;

const DISCLAIMER_FULL_NCM = "(sugerido pela lei — confirmar classificação fiscal do produto específico com contador)";
const DISCLAIMER_SHORT_NCM = "(sugerido)";
const DISCLAIMER_FULL_NBS = "(sugerido — confirmar classificação do serviço específico)";
const DISCLAIMER_SHORT_NBS = "(sugerido)";

function isEnabled(): boolean {
  return (process.env.BRIEFING_SANITIZER_ENABLED ?? "true").toLowerCase() !== "false";
}

/**
 * Normaliza NCM para 4 dígitos (sem ponto).
 * "1006.10" → "1006" · "1006" → "1006" · "01006" → "0100"
 */
function normalizeNcm(code: string): string {
  return code.replace(/\D/g, "").slice(0, 4);
}

/**
 * Normaliza NBS removendo apenas pontos.
 */
function normalizeNbs(code: string): string {
  return code.replace(/\D/g, "");
}

/**
 * Sanitiza o markdown do briefing contra alucinações de NCM/NBS.
 */
export function sanitizeBriefingMarkdown(
  markdown: string,
  meta: SanitizerMeta
): SanitizeResult {
  if (!isEnabled()) {
    return { sanitized: markdown, blockedCodes: [], enabled: false };
  }

  const allowedNcms = new Set((meta.ncms ?? []).map(normalizeNcm).filter(Boolean));
  const allowedNbs = new Set((meta.nbs ?? []).map(normalizeNbs).filter(Boolean));

  const blocked = new Map<string, BlockedCode>();
  const seenNcm = new Set<string>();
  const seenNbs = new Set<string>();

  let sanitized = markdown.replace(NCM_REGEX, (match, rawCode: string) => {
    const normalized = normalizeNcm(rawCode);
    if (!normalized || allowedNcms.has(normalized)) return match;

    const key = `ncm:${normalized}`;
    const prev = blocked.get(key);
    blocked.set(key, {
      type: "ncm",
      code: normalized,
      occurrences: (prev?.occurrences ?? 0) + 1,
    });

    const disclaimer = seenNcm.has(normalized) ? DISCLAIMER_SHORT_NCM : DISCLAIMER_FULL_NCM;
    seenNcm.add(normalized);
    return `${match} ${disclaimer}`;
  });

  sanitized = sanitized.replace(NBS_REGEX, (match, rawCode: string) => {
    const normalized = normalizeNbs(rawCode);
    if (!normalized || allowedNbs.has(normalized)) return match;

    const key = `nbs:${normalized}`;
    const prev = blocked.get(key);
    blocked.set(key, {
      type: "nbs",
      code: normalized,
      occurrences: (prev?.occurrences ?? 0) + 1,
    });

    const disclaimer = seenNbs.has(normalized) ? DISCLAIMER_SHORT_NBS : DISCLAIMER_FULL_NBS;
    seenNbs.add(normalized);
    return `${match} ${disclaimer}`;
  });

  return {
    sanitized,
    blockedCodes: Array.from(blocked.values()),
    enabled: true,
  };
}
