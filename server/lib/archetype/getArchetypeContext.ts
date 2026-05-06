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
/**
 * Bug B fix (Issue #992): writer `server/routers/perfil.ts:391-395` persiste
 * o snapshot com prefixo `dim_*` em 5 dimensões; reader histórico esperava
 * sem prefixo, retornando string vazia para 100% dos projetos com archetype
 * confirmado em produção (matriz dry-run 2026-05-06: 14/15 projetos com
 * before="").
 *
 * Estratégia aprovada P.O.: reader normalization (Opção A) — aceitar ambos
 * formatos via fallback `?? raw.dim_*`, mantendo writer backward-compatible
 * (sem migration de dados existentes).
 *
 * Cobre apenas as 5 dimensões com mismatch confirmado em runtime
 * (`objeto`, `papel_na_cadeia`, `tipo_de_relacao`, `territorio`, `regime`).
 * Os campos `subnatureza_setorial` e `orgao_regulador` já são persistidos
 * sem prefixo pelo writer (perfil.ts:397-398) e não precisam de fallback.
 *
 * Backward-compat absoluta: fixtures canônicas (formato sem prefixo) continuam
 * resolvendo via `r.objeto ?? undefined` → comportamento idêntico ao legado.
 */
function normalizeArchetype(arch: PerfilDimensional): PerfilDimensional {
  const r = arch as PerfilDimensional & Record<string, unknown>;
  return {
    ...arch,
    objeto: (r.objeto ?? r.dim_objeto) as PerfilDimensional["objeto"],
    papel_na_cadeia: (r.papel_na_cadeia ?? r.dim_papel_na_cadeia) as PerfilDimensional["papel_na_cadeia"],
    tipo_de_relacao: (r.tipo_de_relacao ?? r.dim_tipo_de_relacao) as PerfilDimensional["tipo_de_relacao"],
    territorio: (r.territorio ?? r.dim_territorio) as PerfilDimensional["territorio"],
    regime: (r.regime ?? r.dim_regime) as PerfilDimensional["regime"],
  };
}

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

  // Bug B fix: aceitar tanto formato canônico (fixtures sintéticas) quanto
  // formato persistido com prefixo dim_* (snapshot real do banco).
  arch = normalizeArchetype(arch);

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
