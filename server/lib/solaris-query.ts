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
 * Retorna todas as perguntas ativas se cnaes estiver vazio (comportamento conservador).
 */
export async function querySolarisByCnaes(
  cnaes: string[]
): Promise<SolarisQuestion[]> {
  const all = await getOnda1Questions();

  if (cnaes.length === 0) return all;

  return all.filter(q => {
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
}
