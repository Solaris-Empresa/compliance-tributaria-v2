/**
 * REGRA-INGEST-01 — Validador obrigatório para scripts de ingestão
 * Todo script que fizer INSERT em ragDocuments DEVE chamar esta função
 * antes do INSERT. Falha em build-time, não em runtime.
 *
 * Histórico: anchor_id/autor ausentes em 12.577 chunks (19/05/2026)
 * Lição #79 — docs/governance/INGEST-CONTRACT.md
 */
export function validateChunkBeforeInsert(chunk: {
  lei: string;
  artigo: string;
  conteudo: string;
  anchor_id?: string;
  autor?: string;
}): void {
  const errors: string[] = [];

  if (!chunk.anchor_id || chunk.anchor_id.trim() === "")
    errors.push("anchor_id obrigatório (REGRA-INGEST-01)");

  if (!chunk.autor || chunk.autor.trim() === "")
    errors.push("autor obrigatório (REGRA-INGEST-01)");

  if (!chunk.conteudo || chunk.conteudo.length < 10)
    errors.push(
      `conteudo muito curto: ${chunk.conteudo?.length ?? 0} chars (mín: 10)`
    );

  if (chunk.conteudo && chunk.conteudo.length > 5000)
    errors.push(
      `conteudo oversized: ${chunk.conteudo.length} chars (máx: 5000 — REGRA-ORQ-40)`
    );

  if (errors.length > 0)
    throw new Error(
      `[INGEST-GATE] Chunk rejeitado [lei=${chunk.lei} artigo=${chunk.artigo}]: ${errors.join("; ")}`
    );
}

/**
 * Gera anchor_id determinístico padrão.
 * Usar quando o script não tiver lógica própria de anchor_id.
 */
export function generateAnchorId(
  lei: string,
  artigo: string,
  id: number
): string {
  const slug = artigo
    .replace(/\s+/g, "-")
    .replace(/\./g, "")
    .toLowerCase()
    .slice(0, 80);
  return `${lei}-${slug}-id${id}`;
}
