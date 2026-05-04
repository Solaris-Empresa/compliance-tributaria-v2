/**
 * solaris-query.ts — Sprint Z Z-01
 * Função querySolarisByCnaes isolada — extrai lógica inline de routers-fluxo-v3.ts
 * DEC-M3-05 v3 · ADR-0009
 */

import { getOnda1Questions } from "../db";
import type { SolarisQuestion } from "../../drizzle/schema";

/**
 * Busca perguntas SOLARIS ativas e filtra pelas que se aplicam aos CNAEs informados.
 *
 * Critério de filtro: se a pergunta não tem cnaeGroups definido (null/undefined/vazio),
 * ela se aplica a todos os CNAEs. Se tem cnaeGroups, verifica se algum dos CNAEs
 * informados está contido no valor (JSON array ou string com separador).
 *
 * M3.7 Item 11 (REGRA-ORQ-29): paridade arquitetural com queryRag (PR #937).
 * Aceita `leiFilter` opcional para limitar perguntas a uma whitelist de leis
 * (ex: Q.NBS usa `["lc214", "lc227"]`). Backward-compat: sem leiFilter retorna tudo.
 * Perguntas com `leiRef = null` (legado pré-M3.7) preservadas — só são filtradas
 * quando metadado estruturado for preenchido pela equipe SOLARIS (Issue #946).
 *
 * Retorna todas as perguntas ativas se cnaes estiver vazio (comportamento conservador).
 */
export async function querySolarisByCnaes(
  cnaes: string[],
  leiFilter?: string[]
): Promise<SolarisQuestion[]> {
  const all = await getOnda1Questions();

  // ─── Filtro por CNAE (lógica existente) ──────────────────────────────────
  let filtered = cnaes.length === 0
    ? all
    : all.filter(q => {
        // Sem cnaeGroups → aplica-se a todos
        if (!q.cnaeGroups) return true;

        // cnaeGroups pode ser JSON array string ou string separada por vírgula
        let groups: string[] = [];
        try {
          const parsed = typeof q.cnaeGroups === "string"
            ? JSON.parse(q.cnaeGroups)
            : q.cnaeGroups;
          groups = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
        } catch {
          groups = String(q.cnaeGroups).split(",").map(s => s.trim());
        }

        // Verifica se algum CNAE informado está nos grupos da pergunta
        return cnaes.some(cnae =>
          groups.some(g => cnae.startsWith(g) || g.startsWith(cnae))
        );
      });

  // ─── M3.7 Item 11 — Filtro por lei (paridade com queryRag PR #937) ───────
  // Backward-compat:
  //   - leiFilter undefined/empty → retorna tudo (comportamento legado)
  //   - q.leiRef null (perguntas legadas pré-M3.7) → preservadas
  //   - q.leiRef definido + não está em leiFilter → filtrada
  if (leiFilter && leiFilter.length > 0) {
    filtered = filtered.filter(q => !q.leiRef || leiFilter.includes(q.leiRef));
  }

  return filtered;
}
