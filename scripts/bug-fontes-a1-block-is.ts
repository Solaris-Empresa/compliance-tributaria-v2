/**
 * scripts/bug-fontes-a1-block-is.ts
 *
 * BUG-FONTES Frente A1 (Issue #1144) — bloquear o mapeamento normativo de
 * `imposto_seletivo` (Arts. 409-434 LC 214) até curadoria jurídica.
 *
 * Decisão P.O. 2026-05-21: o mapeamento de IS não está validado → blockear.
 *
 * O que faz (UPDATE idempotente):
 *   normative_bundle = NULL · normative_status = 'blocked' · legal_confidence = 'low'
 *
 * Por que é seguro: `imposto_seletivo` permanece em SEVERITY_TABLE
 * (risk-engine-v4.ts:91 → severity 'alta'); a classificação NÃO depende de
 * normative_bundle (coluna de metadado sem reader no retrieval). artigo_base
 * intacto. Reversível por re-UPDATE.
 *
 * Padrão raw-SQL — espelha server/lib/normative-inference.ts
 * (await getDb() + (db.$client as any).promise().execute(sql, params)).
 *
 * Uso: pnpm exec tsx scripts/bug-fontes-a1-block-is.ts
 *      (requer DATABASE_URL; Manus executa em prod pós-merge).
 *
 * DoD: SELECT normative_bundle, normative_status, legal_confidence
 *      FROM risk_categories WHERE codigo='imposto_seletivo'
 *      → NULL, 'blocked', 'low'
 */
import { getDb } from "../server/db";

async function main(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("[A1] DATABASE_URL ausente — abortando.");

  const [res] = await (db.$client as any).promise().execute(
    `UPDATE risk_categories
        SET normative_bundle = NULL,
            normative_status = 'blocked',
            legal_confidence = 'low',
            updated_at = NOW()
      WHERE codigo = ?`,
    ["imposto_seletivo"]
  );
  console.log(`[A1] UPDATE imposto_seletivo → ${res.affectedRows} linha(s) afetada(s)`);

  const [rows] = await (db.$client as any).promise().execute(
    `SELECT codigo, normative_bundle, normative_status, legal_confidence
       FROM risk_categories WHERE codigo = ?`,
    ["imposto_seletivo"]
  );
  console.log("[A1] DoD:", JSON.stringify(rows[0] ?? null));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[A1] ERRO:", err);
    process.exit(1);
  });
