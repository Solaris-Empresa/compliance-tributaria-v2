/**
 * normalize-respostas.ts — BUG-RESP-VAZIA (#1552)
 *
 * Normaliza a `resposta` das respostas de questionário (Q.Produtos/NCM e
 * Q.Serviços/NBS) antes da persistência: `resposta === ""` → `null`.
 *
 * Motivo: o frontend pode enviar `""` quando o usuário pula / não preenche.
 * Gravar `""` confunde "pulou/não respondeu" com "respondido vazio". Usamos
 * `null` (não `undefined`: `undefined` sumiria do JSON.stringify) — `null` é
 * explícito e a fórmula de confiança já trata `null` como não-respondida.
 *
 * Aplicado em completeProductQuestionnaire + completeServiceQuestionnaire
 * (paridade — Lição #137). Lições #84/#85/#86 (persistência de skip/vazio).
 */

export type RespostaValue = string | boolean | number;

export function normalizeRespostas<R extends { resposta: RespostaValue }>(
  respostas: readonly R[],
): Array<Omit<R, "resposta"> & { resposta: RespostaValue | null }> {
  return respostas.map((r) => ({
    ...r,
    // Apenas string vazia vira null. boolean false e number 0 são respostas válidas.
    resposta: r.resposta === "" ? null : r.resposta,
  }));
}
