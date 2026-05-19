/**
 * scripts/seed-normative-service-rules.ts
 *
 * Seed normative_service_rules — 28 regras NBS (curadoria jurídica 19/05/2026).
 *
 * Padrão raw-SQL — espelha `server/lib/normative-inference.ts` (await getDb()
 * + db.$client.promise().execute(sql, params)). NÃO usa Drizzle ORM table
 * objects (essas tabelas existem apenas via migrations raw 0076/0096; não há
 * entrada em drizzle/schema.ts).
 *
 * Idempotência: SELECT prévio por (nbs_code, match_mode) — skip se já existe
 * (não há UNIQUE constraint em prod; onDuplicateKeyUpdate não funcionaria).
 *
 * Colunas reais (mig 0096): id, regime, legal_reference, nbs_code, match_mode,
 * active, source_version, created_at. NÃO existe campo `code` — removido.
 *
 * Uso: pnpm exec tsx scripts/seed-normative-service-rules.ts
 *      (requer DATABASE_URL; Manus executa em prod pós-merge).
 */

import { getDb } from "../server/db";

interface NbsRule {
  nbs_code: string;
  regime: string;
  legal_reference: string;
  match_mode: "exact" | "prefix";
}

// Conteúdo jurídico verbatim da spec — autorizado P.O. 19/05/2026.
const RULES: NbsRule[] = [
  // ── TI / Tecnologia da Informação (1.15xx) ──
  {
    nbs_code: "1.15",
    regime: "aliquota_padrao",
    legal_reference:
      "Regra geral LC 214/2025; local da operação: Art. 11, X; split payment: Arts. 31–35",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.1501",
    regime: "aliquota_padrao",
    legal_reference: "Regra geral LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.1502",
    regime: "aliquota_padrao",
    legal_reference: "Regra geral LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.1506",
    regime: "aliquota_padrao",
    legal_reference: "Regra geral LC 214/2025",
    match_mode: "prefix",
  },
  // ── Jurídico / Contábil (1.13xx) — redução 30% condicional ──
  {
    nbs_code: "1.13",
    regime: "aliquota_reduzida_30_condicional",
    legal_reference: "Art. 127 LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.1301",
    regime: "aliquota_reduzida_30_condicional",
    legal_reference: "Art. 127, II, LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.1302",
    regime: "aliquota_reduzida_30_condicional",
    legal_reference: "Art. 127, VII, LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.1303",
    regime: "aliquota_padrao",
    legal_reference:
      "Consultoria tributária não listada expressamente no Art. 127; validar por profissional habilitado",
    match_mode: "prefix",
  },
  // ── Arquitetura / Engenharia (1.14xx) ──
  {
    nbs_code: "1.1402",
    regime: "aliquota_reduzida_30_condicional",
    legal_reference: "Art. 127, III, LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.1403",
    regime: "aliquota_reduzida_30_condicional",
    legal_reference: "Art. 127, XI, LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.1401",
    regime: "aliquota_padrao",
    legal_reference: "Regra geral LC 214/2025",
    match_mode: "prefix",
  },
  // ── Educação (1.22xx) — redução 60% ──
  {
    nbs_code: "1.22",
    regime: "aliquota_reduzida_60",
    legal_reference: "Arts. 128, I, e 129 LC 214/2025; Anexo II",
    match_mode: "prefix",
  },
  // ── Saúde (1.23xx) — redução 60% ──
  {
    nbs_code: "1.23",
    regime: "aliquota_reduzida_60",
    legal_reference: "Arts. 128, II, e 130 LC 214/2025; Anexo III",
    match_mode: "prefix",
  },
  // ── Transporte de Passageiros (1.04xx) ──
  {
    nbs_code: "1.04",
    regime: "aliquota_padrao",
    legal_reference:
      "Regra geral; transporte público coletivo urbano/semiurbano/metropolitano pode ser isento: Art. 157 LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.0401",
    regime: "isento_condicional",
    legal_reference: "Art. 157 LC 214/2025",
    match_mode: "prefix",
  },
  // ── Transporte de Cargas (1.05xx) ──
  {
    nbs_code: "1.05",
    regime: "aliquota_padrao",
    legal_reference:
      "Regra geral; crédito presumido em transporte de carga autônomo: Art. 169 LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.0501",
    regime: "aliquota_padrao",
    legal_reference:
      "Regra geral; Art. 11, VII, local da operação; Art. 169 para crédito presumido em transportador autônomo",
    match_mode: "prefix",
  },
  // ── Apoio aos Transportes (1.06xx) ──
  {
    nbs_code: "1.06",
    regime: "aliquota_padrao",
    legal_reference:
      "Serviços de apoio aos transportes; regra geral LC 214/2025",
    match_mode: "prefix",
  },
  // ── Financeiro / Seguros (1.09xx) — regime específico ──
  {
    nbs_code: "1.09",
    regime: "regime_especifico",
    legal_reference: "Arts. 182–232 LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.0901",
    regime: "regime_especifico",
    legal_reference: "Arts. 182, I, 183, 189 LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.0903",
    regime: "regime_especifico",
    legal_reference: "Arts. 182, XI, 223 LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.0904",
    regime: "regime_especifico",
    legal_reference: "Arts. 182, XII, 223, §4º LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.0905",
    regime: "regime_especifico",
    legal_reference: "Arts. 182 e 183 LC 214/2025",
    match_mode: "prefix",
  },
  // ── Pesquisa e Desenvolvimento (1.12xx) ──
  {
    nbs_code: "1.12",
    regime: "aliquota_padrao",
    legal_reference:
      "Regra geral; exceção para ICT sem fins lucrativos: Art. 156 LC 214/2025",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.1201",
    regime: "aliquota_zero_condicional",
    legal_reference:
      "Art. 156 LC 214/2025 — ICT sem fins lucrativos, demais requisitos",
    match_mode: "prefix",
  },
  // ── Construção Civil (1.01xx) ──
  {
    nbs_code: "1.01",
    regime: "regime_especifico_ou_padrao",
    legal_reference:
      "Construção civil/imóveis: validar capítulo específico de bens imóveis; não tratar como serviço profissional",
    match_mode: "prefix",
  },
  // ── Intermediação / Comércio (1.02xx) ──
  {
    nbs_code: "1.02",
    regime: "aliquota_padrao",
    legal_reference:
      "Intermediação/comércio/despacho aduaneiro; regra geral salvo exceção específica",
    match_mode: "prefix",
  },
];

async function execute(
  sql: string,
  params: unknown[] = []
): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("[seed] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as unknown[];
}

async function main(): Promise<void> {
  console.log(`[seed] normative_service_rules — ${RULES.length} regras`);
  let inserted = 0;
  let skipped = 0;

  for (const rule of RULES) {
    const rows = (await execute(
      "SELECT COUNT(*) as cnt FROM normative_service_rules WHERE nbs_code = ? AND match_mode = ?",
      [rule.nbs_code, rule.match_mode]
    )) as Array<{ cnt: number | string }>;
    const cnt = Number(rows[0]?.cnt ?? 0);
    if (cnt > 0) {
      console.log(
        `  ⏭️  skip ${rule.nbs_code} (${rule.match_mode}) — já existe`
      );
      skipped++;
      continue;
    }
    await execute(
      "INSERT INTO normative_service_rules (nbs_code, regime, legal_reference, match_mode, active, source_version) VALUES (?, ?, ?, ?, 1, 'LC214_2025')",
      [rule.nbs_code, rule.regime, rule.legal_reference, rule.match_mode]
    );
    console.log(`  ✅ ${rule.nbs_code} → ${rule.regime}`);
    inserted++;
  }

  console.log(
    `\n[seed] concluído — ${inserted} inseridas · ${skipped} skipped`
  );
  const totalRows = (await execute(
    "SELECT COUNT(*) as total FROM normative_service_rules"
  )) as Array<{ total: number | string }>;
  console.log(
    `[seed] total atual em normative_service_rules: ${Number(totalRows[0]?.total ?? 0)}`
  );
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
