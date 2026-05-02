import type { PerfilDimensional } from "./types";

/**
 * Sprint M3 NOVA-03 — Helper centralizado para consumir archetype
 * em prompts LLM, contextQuery RAG e logs estruturados.
 *
 * Backward-compat por construção: arch=null/undefined → string vazia →
 * comportamento atual preservado em todos os callers.
 *
 * Uso típico:
 *   const ctx = getArchetypeContext(project.archetype);
 *   const fullPrompt = `${basePrompt}\n${ctx}`;
 *
 * Vinculadas:
 * - Documento canônico: docs/produto/PERFIL-DA-ENTIDADE-FONTE-DA-VERDADE.md
 * - ADR-0031 (modelo dimensional)
 * - ADR-0032 (versionamento)
 * - Sprint M3 cirúrgico
 */
export function getArchetypeContext(
  archetype: PerfilDimensional | string | null | undefined,
): string {
  if (!archetype) return "";

  // Aceita JSON string OU objeto já parseado.
  // Se string inválida, devolve "" silenciosamente para não quebrar callers
  // (backward-compat absoluta).
  let arch: PerfilDimensional;
  if (typeof archetype === "string") {
    try {
      arch = JSON.parse(archetype) as PerfilDimensional;
    } catch {
      return "";
    }
  } else {
    arch = archetype;
  }

  if (!arch || typeof arch !== "object") return "";

  const parts: string[] = [];

  if (Array.isArray(arch.objeto) && arch.objeto.length > 0) {
    parts.push(`Objeto econômico: ${arch.objeto.join(", ")}`);
  }
  if (arch.papel_na_cadeia) {
    parts.push(`Papel na cadeia: ${arch.papel_na_cadeia}`);
  }
  if (Array.isArray(arch.tipo_de_relacao) && arch.tipo_de_relacao.length > 0) {
    parts.push(`Tipo de relação: ${arch.tipo_de_relacao.join(", ")}`);
  }
  if (Array.isArray(arch.territorio) && arch.territorio.length > 0) {
    parts.push(`Território: ${arch.territorio.join(", ")}`);
  }
  if (arch.regime) {
    parts.push(`Regime tributário: ${arch.regime}`);
  }
  if (
    Array.isArray(arch.subnatureza_setorial) &&
    arch.subnatureza_setorial.length > 0
  ) {
    parts.push(`Subnatureza setorial: ${arch.subnatureza_setorial.join(", ")}`);
  }
  if (Array.isArray(arch.orgao_regulador) && arch.orgao_regulador.length > 0) {
    parts.push(`Órgão regulador: ${arch.orgao_regulador.join(", ")}`);
  }

  return parts.join(" | ");
}
