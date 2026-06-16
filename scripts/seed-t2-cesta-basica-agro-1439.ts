/**
 * scripts/seed-t2-cesta-basica-agro-1439.ts — T2-MIGRATION corrigida (Despacho v11)
 *
 * Refina os regimes de NCM em `normative_product_rules` com base em extração
 * 100% determinística da LC 214/2025 (pdftotext, rastreabilidade por linha).
 *
 * DELTA REAL (o que o PR #1108 / seeds anteriores NÃO cobriram — Lição #83):
 *
 *   | NCM        | match  | regime                              | active | base legal (LC 214/2025)            |
 *   |------------|--------|-------------------------------------|--------|-------------------------------------|
 *   | 1006.20    | prefix | aliquota_zero                       |   1    | Art. 125 c/c Anexo I (cesta básica) |
 *   | 1006.30    | prefix | aliquota_zero                       |   1    | Art. 125 c/c Anexo I (cesta básica) |
 *   | 1006.40.00 | exact  | aliquota_zero                       |   1    | Art. 125 c/c Anexo I (cesta básica) |
 *   | 1006.10    | prefix | aliquota_reduzida_60_alimentos_pendente | 0  | Art. 135 c/c Anexo VII genérico cap.10 — pendente |
 *   | 2305.00.00 | exact  | aliquota_reduzida_60                |   1    | Art. 138 c/c Anexo IX item 20       |
 *   | 2308.00.00 | exact  | aliquota_reduzida_60                |   1    | Art. 138 c/c Anexo IX item 20       |
 *
 * Gate 0 interno (REGRA-ORQ-database, verificado antes de escrever):
 *   - Nome canônico cesta básica = `aliquota_zero` (engine reconhece; NÃO existe `cesta_basica` —
 *     risk-engine-v4.ts:55/64/157/353). Usar `cesta_basica` cairia em unmapped (Lição #88).
 *   - `active=0` → resolver IGNORA a regra (ncm-nbs-resolver.ts:137 `WHERE active = 1`) → correto
 *     para 1006.10 pendente (não aplica o benefício até o Dr. José confirmar; flip active=1 quando ok).
 *   - Tabela NÃO tem coluna `status` (0076) — estado pendente = sufixo `_pendente` + active=0.
 *   - Conexão via getDb() (pool), não createConnection (Lição #89).
 *
 * NÃO TOCA (decisões Gate 0 do Despacho v11):
 *   - 23.01 → ambiguidade jurídica real (Anexo IX item 20 descreve "produtos vegetais", mas
 *     NCM 23.01 = farinhas de carne/peixe, produto animal; farinhas animais descritas no item 21
 *     com NCM 03.09/cap.15, não 23.01). PR #1108 excluiu de propósito. Aguarda Dr. José. REGRA-ORQ-29.
 *   - 2302/2303/2304.00.10/2306.10.00/2309 → já definitivos via PR #1108. Lição #83.
 *
 * Idempotência: SELECT prévio por (ncm_code, match_mode) — skip se já existe.
 * Reversível: DELETE FROM normative_product_rules WHERE ncm_code IN
 *   ('1006.20','1006.30','1006.40.00','1006.10','2305.00.00','2308.00.00') AND source_version='T2_1439'.
 *
 * Uso: pnpm exec tsx scripts/seed-t2-cesta-basica-agro-1439.ts  (Manus executa em prod pós-merge).
 */
import { getDb } from "../server/db";

interface NcmRule {
  ncm_code: string;
  match_mode: "exact" | "prefix";
  regime: string;
  active: 0 | 1;
  legal_reference: string;
}

const CESTA_BASICA =
  "Art. 125 LC 214/2025 c/c Anexo I (Cesta Básica Nacional — arroz beneficiado) — alíquota zero IBS+CBS";
const ANEXO_VII_GENERICO =
  "Art. 135 LC 214/2025 c/c Anexo VII (cláusula genérica 'Cereais do capítulo 10, ressalvados Anexo I') — SEM NCM explícito; pendente Dr. José (REGRA-ORQ-29/Lição #66)";
const ANEXO_IX_ITEM_20 =
  "Art. 138 LC 214/2025 c/c Anexo IX item 20 (insumos agropecuários — ração animal exceto pets; registro MAPA quando exigido) — redução 60% IBS+CBS";

const RULES_T2: NcmRule[] = [
  // Cesta básica (alíquota zero) — refina o grupo 1006 cesta_basica_pendente com os subitens
  // taxativos do Anexo I (Art. 125): arroz beneficiado. NCM 1006.10 (paddy) NÃO está no Anexo I.
  { ncm_code: "1006.20", match_mode: "prefix", regime: "aliquota_zero", active: 1, legal_reference: CESTA_BASICA },
  { ncm_code: "1006.30", match_mode: "prefix", regime: "aliquota_zero", active: 1, legal_reference: CESTA_BASICA },
  { ncm_code: "1006.40.00", match_mode: "exact", regime: "aliquota_zero", active: 1, legal_reference: CESTA_BASICA },
  // 1006.10 (arroz em casca/paddy) — pendente: cláusula genérica cap.10 do Anexo VII, sem NCM
  // explícito. active=0 → resolver ignora (não aplica benefício) até Dr. José confirmar.
  { ncm_code: "1006.10", match_mode: "prefix", regime: "aliquota_reduzida_60_alimentos_pendente", active: 0, legal_reference: ANEXO_VII_GENERICO },
  // Insumos agropecuários (redução 60%) — Anexo IX item 20, genuinamente novos (PR #1108 não cobriu)
  { ncm_code: "2305.00.00", match_mode: "exact", regime: "aliquota_reduzida_60", active: 1, legal_reference: ANEXO_IX_ITEM_20 },
  { ncm_code: "2308.00.00", match_mode: "exact", regime: "aliquota_reduzida_60", active: 1, legal_reference: ANEXO_IX_ITEM_20 },
];

// Helper de execução — padrão idêntico a seed-normative-product-rules-cap23.ts:84
// (driver mysql2 via getDb().$client; destructure [rows]).
async function execute(sql: string, params: unknown[] = []): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("[seed-t2] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as unknown[];
}

async function main(): Promise<void> {
  console.log(
    `[seed-t2] normative_product_rules — ${RULES_T2.length} regras (cesta básica + agro Anexo IX)`,
  );
  let inserted = 0;
  let skipped = 0;

  for (const rule of RULES_T2) {
    const rows = (await execute(
      "SELECT regime, active FROM normative_product_rules WHERE ncm_code = ? AND match_mode = ?",
      [rule.ncm_code, rule.match_mode],
    )) as Array<{ regime: string; active: number }>;

    if (rows.length > 0) {
      const cur = rows[0]!;
      if (cur.regime !== rule.regime || Number(cur.active) !== rule.active) {
        console.warn(
          `  ⚠️  ${rule.ncm_code} (${rule.match_mode}) JÁ EXISTE com regime='${cur.regime}' active=${cur.active} — esperado regime='${rule.regime}' active=${rule.active}. NÃO sobrescrito (revisar manualmente).`,
        );
      } else {
        console.log(`  ⏭️  skip ${rule.ncm_code} (${rule.match_mode}) — já existe idêntico`);
      }
      skipped++;
      continue;
    }

    await execute(
      "INSERT INTO normative_product_rules (ncm_code, regime, legal_reference, match_mode, active, source_version) VALUES (?, ?, ?, ?, ?, 'T2_1439')",
      [rule.ncm_code, rule.regime, rule.legal_reference, rule.match_mode, rule.active],
    );
    console.log(`  ✅ ${rule.ncm_code} (${rule.match_mode}) → ${rule.regime} active=${rule.active}`);
    inserted++;
  }

  console.log(`\n[seed-t2] concluído — ${inserted} inseridas · ${skipped} skipped`);

  const total = (await execute(
    "SELECT ncm_code, regime, active FROM normative_product_rules WHERE source_version = 'T2_1439' ORDER BY ncm_code",
  )) as Array<{ ncm_code: string; regime: string; active: number }>;
  console.table(total);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-t2] ERRO:", err);
    process.exit(1);
  });
