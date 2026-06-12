/**
 * categoria-artigos.ts — Issue #1069
 *
 * Mapa estático de **categoria → artigo principal** da LC 214/2025.
 *
 * Uso: fallback defensivo no header de grupo do `RiskDashboardV4` quando
 * `grouped[cat][0]?.artigo` retorna falsy (campo `risks_v4.artigo` vazio).
 * **Não é a fonte primária** — a fonte da verdade é `risks_v4.artigo`
 * (preenchido pela engine via `risk_categories.artigo_base` após Issue #1044).
 *
 * Issue #1069 corrigiu 4 valores que estavam errados desde a spec original:
 *   - split_payment       Art. 29 → Art. 9
 *   - inscricao_cadastral Art. 21 → Art. 213
 *   - regime_diferenciado Art. 258 → Art. 29
 *   - obrigacao_acessoria Art. 88 → Art. 102
 *
 * LEGAL-2 (Issue #1373) corrigiu split_payment Art. 9 → Arts. 31-35:
 *   - Art. 9 LC 214 = imunidades (templos, livros, ouro) — classe errada
 *   - Arts. 31-35 = split payment (validação jurídica 20/05/2026)
 *   - Alinha com risk_categories.normative_bundle (migration 0099)
 *
 * LEGAL-3 (Issue #1388) reconciliou 4 fallbacks com o DB real:
 *   - imposto_seletivo    Art. 393 → Art. 409 (migration 0099)
 *   - aliquota_reduzida   Art. 120 → Art. 127 (migration 0099)
 *   - credito_presumido   Art. 185 → Art. 168 (migration 0099)
 *   - regime_diferenciado Art. 29  → Art. 126 (migration 0102 #1174, P.O. Opção C —
 *       0099 dizia Art. 229 "criptoativos INCORRETO", supersedida por 0102)
 *
 * LEGAL-4 (Issue #1390) reconciliou os 3 residuais restantes (todos da 0102 #1174):
 *   - transicao_iss_ibs   Arts. 6-12 → Art. 342 (abertura Título VIII — transição)
 *   - inscricao_cadastral Art. 213   → Art. 59  (cadastro identificação única)
 *   - obrigacao_acessoria Art. 102   → Art. 60  (documento fiscal eletrônico)
 *
 * Os valores corretos são derivados de:
 *   - DB `risk_categories.artigo_base` (fonte oficial)
 *   - Validação empírica P.O. em projeto #5580001 (2026-05-12)
 *   - Caso canônico anterior #5310001 (PR #1061 — fix parcial)
 *
 * Função pura — extraída para teste isolado.
 */

export const CATEGORIA_ARTIGOS: Readonly<Record<string, string>> = Object.freeze({
  imposto_seletivo: "Art. 409 LC 214/2025",
  confissao_automatica: "Art. 45 LC 214/2025",
  split_payment: "Arts. 31-35 LC 214/2025",
  inscricao_cadastral: "Art. 59 LC 214/2025",
  regime_diferenciado: "Art. 126 LC 214/2025",
  transicao_iss_ibs: "Art. 342 LC 214/2025",
  obrigacao_acessoria: "Art. 60 LC 214/2025",
  aliquota_zero: "Art. 125 LC 214/2025",
  aliquota_reduzida: "Art. 127 LC 214/2025",
  credito_presumido: "Art. 168 LC 214/2025",
});

/**
 * Issue #1069 — retorna o artigo correto para uma categoria.
 *
 * Estratégia de fallback (mais conservadora que `??` direto):
 *   1. Se `riskArtigo` é truthy E não é string vazia → usa (fonte da verdade)
 *   2. Senão usa `CATEGORIA_ARTIGOS[categoria]` (mapa correto)
 *   3. Senão fallback vazio (categoria desconhecida)
 *
 * Diferença vs `risk.artigo ?? CATEGORIA_ARTIGOS[cat]`:
 *   - Trata string vazia como falsy (importante — backend pode retornar "")
 *   - Trip-fallback explícito permite log futuro de "artigo ausente"
 */
export function resolveArtigoForHeader(
  riskArtigo: string | null | undefined,
  categoria: string,
): string {
  if (typeof riskArtigo === "string" && riskArtigo.trim() !== "") {
    return riskArtigo;
  }
  return CATEGORIA_ARTIGOS[categoria] ?? "";
}

/**
 * Issue #1069 — strip defensivo do prefixo "Art. " duplicado.
 *
 * Quando o backend retorna `bc[2]` (artigo do breadcrumb), o valor já
 * contém "Art. " (convenção desde Sprint Z-13.5). Templates que prependem
 * `"Art. "` produzem duplicação: `"Art. Art. 9 LC 214/2025"`.
 *
 * Esta função aceita o valor como vem do backend e garante que NÃO há
 * duplicação. Use no breadcrumb/chip em vez de `` `Art. ${valor}` ``.
 *
 * Caso esperado: valor já vem com "Art. " → retorna inalterado.
 * Caso edge: valor sem prefixo → retorna inalterado (não força prefixo —
 * espera que backend já entregue formato correto).
 */
export function ensureNoDoublePrefix(artigo: string | null | undefined): string {
  if (typeof artigo !== "string") return "";
  return artigo.trim();
}
