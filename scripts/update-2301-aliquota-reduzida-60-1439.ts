/**
 * scripts/update-2301-aliquota-reduzida-60-1439.ts — Despacho v16 (ETAPA 1)
 *
 * Atualiza o regime do NCM 2301 (farinhas/pós/pellets de carnes e peixes — origem animal)
 * de `tratamento_agropecuario_especifico_pendente` (conservador, seed cap23) para o
 * definitivo **`aliquota_reduzida_60`**, após CONFIRMAÇÃO JURÍDICA (Consultor/Dr. José, v16).
 *
 * Fundamento (extração determinística LC 214/2025, Anexo IX, Art. 138):
 *   23.01 está listado EXPLICITAMENTE na mesma linha normativa de 2302/2303/2304/2306:
 *   "23.01 23.02 23.03 2304.00 2305.00.00 23.06 2308.00.00" — Anexo IX (insumos agropecuários
 *   — farelos/tortas/resíduos; destinados à fabricação de ração animal, exceto domésticos).
 *
 * Histórico: o PR #1108 (update-cap23-regimes-definitivos.ts) manteve 2301 conservador por
 * cautela (varredura do corpus RAG não localizou 2301 — premissa factualmente incorreta:
 * o PDF do Anexo IX lista 23.01 explícito). v16 corrige com base na fonte literal + decisão
 * jurídica formal. REGRA-ORQ-29 satisfeita (base normativa explícita + curadoria humana).
 *
 * Gate 0 (REGRA-ORQ-database): ncm_code real = "2301" (prefix), NÃO "23.01%"; tabela sem
 * coluna status (0076) — regime é o discriminador; conexão getDb() pool (Lição #89).
 *
 * Idempotência: SELECT-prévio do regime atual; UPDATE só se diferente do alvo (re-exec = no-op).
 * Reversível: UPDATE ... SET regime='tratamento_agropecuario_especifico_pendente' WHERE ncm_code='2301'.
 *
 * Uso: pnpm exec tsx scripts/update-2301-aliquota-reduzida-60-1439.ts  (Manus, pós-merge).
 */
import { getDb } from "../server/db";

const NCM = "2301";
const MATCH_MODE = "prefix";
const TARGET_REGIME = "aliquota_reduzida_60";
const LEGAL_REF =
  "Art. 138 LC 214/2025 + Anexo IX (insumos agropecuários — farelos/tortas/resíduos; ração animal exceto domésticos; mesma linha de 2302/2303/2304/2306) c/c Art. 213 Decreto 12.955/2026 — redução 60% IBS+CBS; 23.01 confirmado pelo jurídico (Despacho v16)";

async function execute(sql: string, params: unknown[] = []): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("[update-2301] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as unknown[];
}

async function main(): Promise<void> {
  console.log("[update-2301] NCM 2301 → aliquota_reduzida_60 (confirmado jurídico v16)");

  const current = (await execute(
    "SELECT id, regime FROM normative_product_rules WHERE ncm_code = ? AND match_mode = ?",
    [NCM, MATCH_MODE],
  )) as Array<{ id: number; regime: string }>;

  if (current.length === 0) {
    console.warn(`  ⚠️  ${NCM} (${MATCH_MODE}) — NÃO ENCONTRADO (seed cap23 não aplicado?). Nada a fazer.`);
    return;
  }
  if (current[0]!.regime === TARGET_REGIME) {
    console.log(`  ⏭️  ${NCM} já está em '${TARGET_REGIME}' — no-op.`);
    return;
  }

  await execute(
    "UPDATE normative_product_rules SET regime = ?, legal_reference = ? WHERE ncm_code = ? AND match_mode = ?",
    [TARGET_REGIME, LEGAL_REF, NCM, MATCH_MODE],
  );
  console.log(`  ✅ ${NCM} (${MATCH_MODE}): '${current[0]!.regime}' → '${TARGET_REGIME}'`);

  const after = (await execute(
    "SELECT ncm_code, regime, active FROM normative_product_rules WHERE ncm_code = ? AND match_mode = ?",
    [NCM, MATCH_MODE],
  )) as Array<{ ncm_code: string; regime: string; active: number }>;
  console.table(after);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[update-2301] ERRO:", err);
    process.exit(1);
  });
