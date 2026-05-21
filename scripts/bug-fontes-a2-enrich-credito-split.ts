/**
 * scripts/bug-fontes-a2-enrich-credito-split.ts
 *
 * BUG-FONTES Frente A2 (Issue #1145, Opção A) — enriquecer normative_bundle /
 * source_basis das categorias existentes com a curadoria do consultor (21/05).
 *
 * Decisão P.O. 2026-05-21: Opção A (linhas existentes, sem subcategorias).
 * Subcategorias credito_presumido_* → backlog (#1146, Opção B / Tier 2-3).
 *
 * UPDATEs idempotentes (sem novas linhas, sem migration):
 *   - credito_presumido: bundle consolidado dos 3 subtipos (rural/TAC/resíduos)
 *   - split_payment: LC214 [31-35] + Decreto [28-37] + CGIBS [593-595]
 *
 * Seguro (Tier 1): artigo_base inalterado (31/168) → engine determinístico
 * (matcha por artigo_base, risk-engine-v4.ts:473) NÃO afetado. Ambos os codigos
 * já estão na union Categoria + SEVERITY_TABLE → nenhuma mudança de engine.
 *
 * Shape: normative_bundle = array plano string[] (bate com schema
 * normativeBundle.$type<string[]>). Caveat: perde atribuição por lei —
 * source_basis dá o conjunto de leis; a Frente B decide o mapeamento.
 *
 * Caveat de eficácia (Lição #65/#66): nenhum retrieval lê source_basis hoje —
 * A2 prepara a base; o consumo vem da Frente B (adiada até A2 em produção).
 *
 * Padrão raw-SQL — espelha server/lib/normative-inference.ts.
 * Uso: pnpm exec tsx scripts/bug-fontes-a2-enrich-credito-split.ts
 *      (requer DATABASE_URL; Manus executa em prod pós-merge).
 */
import { getDb } from "../server/db";

// Curadoria consultor 2026-05-21 — valores verbatim da spec (Issue #1145).
const CREDITO_PRESUMIDO_BUNDLE = [
  "168", "169", "170", "245", "246", "247", "248", "249",
  "250", "251", "252", "253", "254", "255", "256", "257", "258",
];
const SPLIT_PAYMENT_BUNDLE = [
  "31", "32", "33", "34", "35", // LC214
  "28", "29", "30", "36", "37", // Decreto 12.955
  "593", "594", "595", // CGIBS 6
];

async function main(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("[A2] DATABASE_URL ausente — abortando.");
  const client = (db.$client as any).promise();

  // 1) credito_presumido (artigo_base inalterado = 168)
  const [r1] = await client.execute(
    `UPDATE risk_categories
        SET artigo_base       = '168',
            normative_bundle  = ?,
            source_basis      = ?,
            normative_status  = 'confirmed',
            legal_confidence  = 'high',
            updated_at        = NOW()
      WHERE codigo = ?`,
    [JSON.stringify(CREDITO_PRESUMIDO_BUNDLE), JSON.stringify(["lc214", "decreto12955"]), "credito_presumido"]
  );
  console.log(`[A2] credito_presumido → ${r1.affectedRows} linha(s)`);

  // 2) split_payment (artigo_base inalterado = 31)
  const [r2] = await client.execute(
    `UPDATE risk_categories
        SET normative_bundle  = ?,
            source_basis      = ?,
            normative_status  = 'confirmed',
            legal_confidence  = 'high',
            updated_at        = NOW()
      WHERE codigo = ?`,
    [JSON.stringify(SPLIT_PAYMENT_BUNDLE), JSON.stringify(["lc214", "decreto12955", "resolucao_cgibs_6"]), "split_payment"]
  );
  console.log(`[A2] split_payment → ${r2.affectedRows} linha(s)`);

  // DoD
  const [rows] = await client.execute(
    `SELECT codigo, artigo_base, source_basis, normative_status, legal_confidence
       FROM risk_categories WHERE codigo IN ('credito_presumido','split_payment')`
  );
  console.log("[A2] DoD:", JSON.stringify(rows));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[A2] ERRO:", err);
    process.exit(1);
  });
