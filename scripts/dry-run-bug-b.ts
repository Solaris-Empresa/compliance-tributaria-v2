/**
 * scripts/dry-run-bug-b.ts — FASE 1 da Issue #992 (Bug B)
 *
 * Dry-run READ-ONLY que mede o impacto da estratégia "reader normalization"
 * (Opção A) antes de tocar qualquer arquivo de produção.
 *
 * Modo de operação:
 *   - Com DATABASE_URL definido: lê os N projetos reais com `archetype IS NOT NULL`
 *     e produz matriz N×2 (before/after).
 *   - Sem DATABASE_URL: roda apenas com a fixture estática do diagnóstico Manus
 *     2026-05-06 (snapshot do projeto #4110001) — prova de lógica isolada do banco.
 *
 * O que o script NÃO faz (escopo aprovado P.O.):
 *   - NÃO escreve no banco
 *   - NÃO toca arquivos de produção (`getArchetypeContext.ts`, `perfil.ts`)
 *   - NÃO executa migration
 *   - NÃO roda fix em código — apenas simula em memória via helper local
 *
 * Uso:
 *   pnpm exec tsx scripts/dry-run-bug-b.ts                        # fixture only
 *   DATABASE_URL="..." pnpm exec tsx scripts/dry-run-bug-b.ts     # DB + fixture
 *
 * Saída:
 *   JSON estruturado por linha + resumo final consolidado.
 *
 * Vinculadas:
 *   - Issue #992 (Bug B — Archetype runtime normalization)
 *   - Decisão P.O. 2026-05-06 (estratégia reader normalization, Opção A)
 *   - REGRA-ORQ-34 Protocolo 2 (dry-run pré-implementação)
 *   - Lição #59 (assemble vs consumption)
 *   - Diagnóstico Manus 2026-05-06 (fixture #4110001)
 */

import mysql from "mysql2/promise";
import { getArchetypeContext } from "../server/lib/archetype/getArchetypeContext";

// ─── Helper local de normalização (dry-run only — NÃO altera produção) ────────
//
// Implementa a estratégia "reader normalization" da Issue #992 sem tocar
// `getArchetypeContext.ts`. Apenas simula o output esperado pós-fix.
function normalizeArchetypeForDryRun(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    ...r,
    objeto:           r.objeto           ?? r.dim_objeto,
    papel_na_cadeia:  r.papel_na_cadeia  ?? r.dim_papel_na_cadeia,
    tipo_de_relacao:  r.tipo_de_relacao  ?? r.dim_tipo_de_relacao,
    territorio:       r.territorio       ?? r.dim_territorio,
    regime:           r.regime           ?? r.dim_regime,
    // subnatureza_setorial e orgao_regulador já são persistidos sem prefixo —
    // não precisam de fallback (verificado em perfil.ts:397-398)
  };
}

// ─── Fixture do projeto #4110001 (diagnóstico Manus 2026-05-06) ───────────────
//
// Snapshot real do projeto Soja agro confirmado por query SQL no banco de
// produção. Usado para validação isolada de lógica quando DATABASE_URL ausente.
const FIXTURE_4110001 = {
  project_id: 4110001,
  project_name: "Soja — produtor rural (fixture diagnóstico Manus)",
  archetype: {
    project_id: 4110001,
    cnpj: "00.394.460/0058-87",
    project_name: "Soja",
    company_size: "Grande",
    annual_revenue_range: "Acima de R$ 78 mi",
    tax_regime: "lucro_real",
    confirmedCnaes: ["0115-6/00", "4622-2/00"],
    ncms_canonicos: ["1201.90.00"],
    nbss_canonicos: [],
    dim_objeto: ["agricola"],
    dim_papel_na_cadeia: "fabricante",
    dim_tipo_de_relacao: ["producao"],
    dim_territorio: ["nacional"],
    dim_regime: "lucro_real",
    natureza_operacao_principal: ["Produção própria"],
    subnatureza_setorial: [],
    orgao_regulador: [],
    regime_especifico: [],
    derived_legacy_operation_type: "agronegocio",
    status_arquetipo: "perfil_confirmado",
  },
};

// ─── Tipo da linha da matriz por projeto ──────────────────────────────────────

interface MatrixRow {
  project_id: number | string;
  project_name: string;
  before: {
    length: number;
    empty: boolean;
    preview: string;
  };
  after: {
    length: number;
    empty: boolean;
    preview: string;
  };
  improvement: boolean;
  // Quais campos do reader saíram de undefined → defined
  fields_unlocked: string[];
}

function computeRow(projectId: number | string, projectName: string, archetype: unknown): MatrixRow {
  type ArchInput = Parameters<typeof getArchetypeContext>[0];
  const before = getArchetypeContext(archetype as unknown as ArchInput);
  const normalized = normalizeArchetypeForDryRun(archetype);
  const after = getArchetypeContext(normalized as unknown as ArchInput);

  // Detectar quais labels apareceram pós-normalize
  const labels = [
    "Objeto econômico",
    "Papel na cadeia",
    "Tipo de relação",
    "Território",
    "Regime tributário",
    "Subnatureza setorial",
    "Órgão regulador",
  ];
  const fieldsUnlocked = labels.filter((l) => !before.includes(l) && after.includes(l));

  return {
    project_id: projectId,
    project_name: projectName,
    before: {
      length: before.length,
      empty: before === "",
      preview: before.slice(0, 100),
    },
    after: {
      length: after.length,
      empty: after === "",
      preview: after.slice(0, 200),
    },
    improvement: after.length > before.length,
    fields_unlocked: fieldsUnlocked,
  };
}

// ─── Execução ─────────────────────────────────────────────────────────────────

async function fetchFromDatabase(): Promise<MatrixRow[]> {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const rows: MatrixRow[] = [];
  try {
    const [dbRows] = await conn.execute<mysql.RowDataPacket[]>(
      "SELECT id, name, archetype FROM projects WHERE archetype IS NOT NULL ORDER BY id ASC",
    );
    for (const row of dbRows) {
      // mysql2 auto-parseia colunas JSON (Lição #72) — guard contra ambos formatos
      const archetype =
        typeof row.archetype === "string" ? JSON.parse(row.archetype) : row.archetype;
      rows.push(computeRow(row.id, row.name ?? "(sem nome)", archetype));
    }
  } finally {
    await conn.end();
  }
  return rows;
}

function fetchFromFixture(): MatrixRow[] {
  return [computeRow(FIXTURE_4110001.project_id, FIXTURE_4110001.project_name, FIXTURE_4110001.archetype)];
}

async function main() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const mode = hasDb ? "database" : "fixture-only";

  console.log(
    JSON.stringify({
      event: "dry_run_start",
      mode,
      ts: new Date().toISOString(),
      issue: "#992",
      strategy: "reader normalization (Opção A)",
    }),
  );

  let matrix: MatrixRow[];
  try {
    matrix = hasDb ? await fetchFromDatabase() : fetchFromFixture();
  } catch (err) {
    console.error("Falha ao obter dados:", err);
    process.exit(1);
  }

  // ─── Matriz por projeto ───────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("MATRIZ DRY-RUN — projeto × before/after");
  console.log("═══════════════════════════════════════════════════════════════\n");

  for (const m of matrix) {
    console.log(`Project #${m.project_id} (${m.project_name})`);
    console.log(`  BEFORE: empty=${m.before.empty} length=${m.before.length}`);
    if (!m.before.empty) console.log(`          preview="${m.before.preview}"`);
    console.log(`  AFTER:  empty=${m.after.empty} length=${m.after.length}`);
    if (!m.after.empty) console.log(`          preview="${m.after.preview}"`);
    console.log(`  IMPROVEMENT: ${m.improvement ? "✅" : "❌"} (delta=${m.after.length - m.before.length} chars)`);
    console.log(`  FIELDS UNLOCKED: ${m.fields_unlocked.length > 0 ? m.fields_unlocked.join(", ") : "(nenhum)"}`);
    console.log("");
  }

  // ─── Resumo consolidado ───────────────────────────────────────────────────
  const total = matrix.length;
  const beforeEmpty = matrix.filter((m) => m.before.empty).length;
  const afterEmpty = matrix.filter((m) => m.after.empty).length;
  const improved = matrix.filter((m) => m.improvement).length;

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("RESUMO CONSOLIDADO");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const summary = {
    event: "dry_run_summary",
    mode,
    total_projects: total,
    before_empty_count: beforeEmpty,
    before_empty_pct: total > 0 ? Math.round((beforeEmpty / total) * 100) : 0,
    after_empty_count: afterEmpty,
    after_empty_pct: total > 0 ? Math.round((afterEmpty / total) * 100) : 0,
    improved_count: improved,
    improved_pct: total > 0 ? Math.round((improved / total) * 100) : 0,
    bug_b_confirmed: beforeEmpty === total && total > 0,
    fix_works_for_all: afterEmpty === 0 && total > 0,
    interpretation:
      beforeEmpty === total
        ? "Bug B confirmado em 100% dos projetos: getArchetypeContext retorna '' atualmente."
        : "Bug B parcial — alguns projetos já têm formato canônico (caso raro).",
    next_step:
      afterEmpty === 0 && improved === total
        ? "Estratégia reader normalization (Opção A) funciona para 100% dos casos. Apto para FASE 2."
        : "Estratégia precisa refinamento — alguns projetos não recuperam após normalize. Investigar.",
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log("\n");

  // Exit code 0 sempre (dry-run é informativo, não falha)
}

main().catch((err) => {
  console.error("dry-run-bug-b falhou:", err);
  process.exit(1);
});
