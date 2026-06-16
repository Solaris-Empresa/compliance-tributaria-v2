/**
 * scripts/update-1006-10-sem-beneficio-1439.ts — Despacho v18 (decisão P.O. irrevogável 16/06/2026)
 *
 * Registra NCM 1006.10 (arroz em casca / paddy) como **`sem_beneficio`** — decisão formal do P.O.
 * (Opção B, conservadora): a omissão de 1006.10 no Anexo I da LC 214 (que lista 1006.20/30/40.00)
 * é tratada como intencional do legislador; sem dispositivo explícito de inclusão, não se concede
 * benefício. Registro EXPLÍCITO (não silêncio) para auditoria futura.
 *
 * Estado anterior (seed T2_1439 / PR #1448): a linha JÁ EXISTE — id=120001, ncm_code='1006.10',
 * match_mode='prefix', regime='aliquota_reduzida_60_alimentos_pendente', active=0. → portanto é
 * UPDATE, não INSERT (Gate 0 confirmou).
 *
 * Gate 0 (REGRA-ORQ-database / Lição #114):
 *   - A coluna `source_basis` do despacho NÃO existe no schema (0076). O schema usa
 *     `legal_reference` (varchar 255) + `source_version` — a justificativa da decisão vai em
 *     legal_reference.
 *   - match_mode permanece 'prefix' (linha existente); active permanece 0 — o resolver ignora
 *     (WHERE active=1, ncm-nbs-resolver:137), logo 1006.10 não recebe regime de benefício.
 *     `sem_beneficio` não é categoria em risk_categories → mesmo se ativo, riskCategoryCode=null
 *     (sem benefício). active=0 + regime sem_beneficio = registro de auditoria explícito.
 *   - getDb() pool (Lição #89).
 *
 * Idempotência: UPDATE só se regime ≠ 'sem_beneficio'. Reversível: regime anterior documentado
 * (aliquota_reduzida_60_alimentos_pendente). Reabertura só com dispositivo explícito + nova spec
 * aprovada (decisão P.O.).
 *
 * Uso: pnpm exec tsx scripts/update-1006-10-sem-beneficio-1439.ts  (Manus, pós-merge).
 */
import { getDb } from "../server/db";

const NCM = "1006.10";
const MATCH_MODE = "prefix";
const TARGET_REGIME = "sem_beneficio";
const LEGAL_REF =
  "Decisão P.O. 16/06/2026 — Opção B conservadora: 1006.10 (paddy) sem benefício. Anexo I LC 214 lista 1006.20/30/40.00 e omite 1006.10; Consultor: veredito INSUFICIENTE (extração direta PDF). Sem dispositivo explícito; reabertura só com dispositivo + nova spec";

async function execute(sql: string, params: unknown[] = []): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("[update-1006.10] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as unknown[];
}

async function main(): Promise<void> {
  console.log("[update-1006.10] 1006.10 → sem_beneficio (decisão P.O. v18, Opção B)");

  const current = (await execute(
    "SELECT id, regime, active FROM normative_product_rules WHERE ncm_code = ? AND match_mode = ?",
    [NCM, MATCH_MODE],
  )) as Array<{ id: number; regime: string; active: number }>;

  if (current.length === 0) {
    console.warn(`  ⚠️  ${NCM} (${MATCH_MODE}) — NÃO ENCONTRADO (seed T2_1439 não aplicado?). Nada a fazer.`);
    return;
  }
  if (current[0]!.regime === TARGET_REGIME) {
    console.log(`  ⏭️  ${NCM} já está em '${TARGET_REGIME}' — no-op.`);
    return;
  }

  await execute(
    "UPDATE normative_product_rules SET regime = ?, legal_reference = ?, active = 0 WHERE ncm_code = ? AND match_mode = ?",
    [TARGET_REGIME, LEGAL_REF, NCM, MATCH_MODE],
  );
  console.log(`  ✅ ${NCM} (${MATCH_MODE}): '${current[0]!.regime}' → '${TARGET_REGIME}' (active=0)`);

  const after = (await execute(
    "SELECT ncm_code, regime, active, legal_reference FROM normative_product_rules WHERE ncm_code = ? AND match_mode = ?",
    [NCM, MATCH_MODE],
  )) as Array<{ ncm_code: string; regime: string; active: number; legal_reference: string }>;
  console.table(after);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[update-1006.10] ERRO:", err);
    process.exit(1);
  });
