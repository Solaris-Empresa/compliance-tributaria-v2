/**
 * scripts/update-cap23-regimes-definitivos.ts
 *
 * Atualiza `normative_product_rules` para os NCMs Cap. 23 (agropecuário) do
 * PR #1108 — substitui o regime conservador
 * `tratamento_agropecuario_especifico_pendente` pelo definitivo
 * **`aliquota_reduzida_60`** quando confirmado por base legal verificada
 * no corpus já ingerido.
 *
 * BASE LEGAL EMPÍRICA (verificada em `server/rag-corpus-decreto12955.ts:5637`
 * e `server/rag-corpus-lcs-novas.ts:12229–12415` — texto integral do Anexo IX):
 *
 *   Art. 213 Decreto 12.955/2026 c/c Art. 138 LC 214/2025 + Anexo IX:
 *   "Ficam reduzidas em 60% (sessenta por cento) as alíquotas do IBS e da CBS
 *    incidentes sobre o fornecimento dos insumos agropecuários e aquícolas
 *    relacionados no Anexo IX da LC 214/2025."
 *
 * TABELA NCM × ANEXO IX (varredura empírica em lcs-novas.ts:12229–12415):
 *
 *   | NCM        | Em Anexo IX?       | Item | Ação                           |
 *   |------------|--------------------|------|--------------------------------|
 *   | 2304.00.10 | ✅ "2304.00"        | 6    | UPDATE → aliquota_reduzida_60  |
 *   | 2306.10.00 | ✅ "23.06"          | 6    | UPDATE → aliquota_reduzida_60  |
 *   | 2302       | ✅ "23.02"          | 6    | UPDATE → aliquota_reduzida_60  |
 *   | 2303       | ✅ "23.03"          | 6    | UPDATE → aliquota_reduzida_60  |
 *   | 2309       | ✅ "2309.90"        | 18   | UPDATE → aliquota_reduzida_60* |
 *   | 2301       | ❌ NÃO está         | —    | NÃO TOCAR — inconclusivo       |
 *
 *   * 2309: apenas 2309.90 explicitamente listado. Mantenho o prefix `2309`
 *     do PR #1108 (presume aplicação a subposições afins por extensão);
 *     nota declarada em legal_reference.
 *
 * 2301 NÃO está em Anexo IX (per anti-alucinação REGRA-ORQ-29 + spec
 * explícita "Se chunk não for conclusivo → declarar inconclusivo") —
 * mantém `tratamento_agropecuario_especifico_pendente` do PR #1108.
 *
 * PADRÃO: raw-SQL via `getDb()` + `$client.promise().execute()` (espelha
 *         `normative-inference.ts`, seeds #1108, surgery #1109).
 * IDEMPOTÊNCIA: SELECT-prévio do regime atual; UPDATE somente se diferente
 *               do alvo (re-execução pós-update = no-op).
 *
 * Uso: pnpm exec tsx scripts/update-cap23-regimes-definitivos.ts
 *      (requer DATABASE_URL; Manus executa em prod pós-merge + review P.O.).
 */

import { getDb } from "../server/db";

interface RegimeUpdate {
  ncm_code: string;
  match_mode: "exact" | "prefix";
  new_regime: string;
  new_legal_reference: string;
}

const ANEXO_IX_ITEM_6 =
  "Art. 138 LC 214/2025 + Anexo IX item 6 (insumos agropecuários — tortas/bagaços/resíduos vegetais) c/c Art. 213 Decreto 12.955/2026 — redução 60% IBS+CBS";

const ANEXO_IX_ITEM_18 =
  "Art. 138 LC 214/2025 + Anexo IX item 18 (2309.90 — preparações p/ alimentação animal) c/c Art. 213 Decreto 12.955/2026 — redução 60% IBS+CBS; nota: somente 2309.90 explicitamente listado, prefix `2309` assume aplicação a subposições afins";

const UPDATES: RegimeUpdate[] = [
  // Exact match — NCMs específicos confirmados em Anexo IX item 6
  {
    ncm_code: "2304.00.10",
    match_mode: "exact",
    new_regime: "aliquota_reduzida_60",
    new_legal_reference: ANEXO_IX_ITEM_6,
  },
  {
    ncm_code: "2306.10.00",
    match_mode: "exact",
    new_regime: "aliquota_reduzida_60",
    new_legal_reference: ANEXO_IX_ITEM_6,
  },
  // Prefix — capítulos/posições do Anexo IX item 6 (23.02, 23.03)
  {
    ncm_code: "2302",
    match_mode: "prefix",
    new_regime: "aliquota_reduzida_60",
    new_legal_reference: ANEXO_IX_ITEM_6,
  },
  {
    ncm_code: "2303",
    match_mode: "prefix",
    new_regime: "aliquota_reduzida_60",
    new_legal_reference: ANEXO_IX_ITEM_6,
  },
  // Prefix — Anexo IX item 18 (2309.90 listado; prefix 2309 estendido)
  {
    ncm_code: "2309",
    match_mode: "prefix",
    new_regime: "aliquota_reduzida_60",
    new_legal_reference: ANEXO_IX_ITEM_18,
  },
  // NÃO tocar 2301 — inconclusivo (não em Anexo IX); permanece conservador.
];

async function execute(
  sql: string,
  params: unknown[] = []
): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("[update-cap23] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as unknown[];
}

async function main(): Promise<void> {
  console.log(
    "[update-cap23] Cap. 23 regimes definitivos — atualização anti-fallback"
  );
  console.log(
    `[update-cap23] alvos: ${UPDATES.length} NCMs (2301 mantido conservador)`
  );
  let updated = 0;
  let alreadyDef = 0;
  let notFound = 0;

  for (const u of UPDATES) {
    const current = (await execute(
      "SELECT id, regime FROM normative_product_rules WHERE ncm_code = ? AND match_mode = ?",
      [u.ncm_code, u.match_mode]
    )) as Array<{ id: number; regime: string }>;

    if (current.length === 0) {
      console.log(
        `  ⚠️  ${u.ncm_code} (${u.match_mode}) — NÃO ENCONTRADO no DB (PR #1108 não aplicado?)`
      );
      notFound++;
      continue;
    }
    if (current[0]!.regime === u.new_regime) {
      console.log(
        `  ⏭️  ${u.ncm_code} (${u.match_mode}) — já é ${u.new_regime} (idempotente)`
      );
      alreadyDef++;
      continue;
    }
    await execute(
      "UPDATE normative_product_rules SET regime = ?, legal_reference = ? WHERE ncm_code = ? AND match_mode = ?",
      [u.new_regime, u.new_legal_reference, u.ncm_code, u.match_mode]
    );
    console.log(
      `  ✅ ${u.ncm_code} (${u.match_mode}) — ${current[0]!.regime} → ${u.new_regime}`
    );
    updated++;
  }

  console.log(
    `\n[update-cap23] concluído — ${updated} atualizadas · ${alreadyDef} já definitivas · ${notFound} não encontradas`
  );

  // Diagnóstico pós: estado final de Cap. 23 em normative_product_rules
  const finalState = (await execute(
    "SELECT ncm_code, match_mode, regime, LEFT(legal_reference, 80) AS ref FROM normative_product_rules WHERE ncm_code LIKE '23%' ORDER BY ncm_code"
  )) as Array<{
    ncm_code: string;
    match_mode: string;
    regime: string;
    ref: string;
  }>;
  console.log("\n[update-cap23] === Estado final Cap. 23 ===");
  for (const r of finalState) {
    console.log(`  ${r.ncm_code} (${r.match_mode}) | ${r.regime}`);
  }
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
