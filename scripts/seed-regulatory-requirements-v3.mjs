/**
 * Seed Script — regulatory_requirements_v3
 * Solaris Compliance v3 — Sprint 6 (Go-Live Ready)
 *
 * Execução:
 *   cd /home/ubuntu/compliance-tributaria-v2
 *   node scripts/seed-regulatory-requirements-v3.mjs
 *
 * Estratégia:
 *   - Upsert por code (idempotente, pode rodar múltiplas vezes)
 *   - Mapeia campos do seed JSON para o schema v3
 *   - Deriva default_gap_type a partir do domain
 *   - Popula evaluation_criteria e evidence_required do JSON
 */

import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Mapa de domain → default_gap_type
// ---------------------------------------------------------------------------
const DOMAIN_GAP_TYPE = {
  governanca_transicao: "normativo",
  sistemas_erp_dados: "sistema",
  cadastro_fiscal: "cadastro",
  contratos_fornecedores: "contrato",
  obrigacoes_acessorias: "acessorio",
  gestao_creditos: "financeiro",
  split_payment: "financeiro",
  regime_transicao: "normativo",
  setores_especificos: "normativo",
  beneficios_fiscais: "normativo",
  contencioso_tributario: "normativo",
  gestao_mudancas: "processo",
};

// ---------------------------------------------------------------------------
// Mapa de domain → gap_level
// ---------------------------------------------------------------------------
const DOMAIN_GAP_LEVEL = {
  governanca_transicao: "estrategico",
  sistemas_erp_dados: "tecnico",
  cadastro_fiscal: "operacional",
  contratos_fornecedores: "tatico",
  obrigacoes_acessorias: "operacional",
  gestao_creditos: "tatico",
  split_payment: "tatico",
  regime_transicao: "estrategico",
  setores_especificos: "operacional",
  beneficios_fiscais: "tatico",
  contencioso_tributario: "estrategico",
  gestao_mudancas: "estrategico",
};

// ---------------------------------------------------------------------------
// Conectar ao banco
// ---------------------------------------------------------------------------
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não definida");
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);
console.log("✅ Conectado ao banco de dados");

// ---------------------------------------------------------------------------
// Carregar seed JSON
// ---------------------------------------------------------------------------
const seedPath = join(
  __dirname,
  "../../solaris-compliance-v3/seeds/regulatory-requirements-seed-v1.json",
);
const seedData = JSON.parse(readFileSync(seedPath, "utf8"));
const requirements = seedData.requirements || seedData;
console.log(`📦 ${requirements.length} requisitos carregados do seed`);

// ---------------------------------------------------------------------------
// Upsert por code
// ---------------------------------------------------------------------------
let inserted = 0;
let updated = 0;
let errors = 0;

for (const req of requirements) {
  try {
    const code = req.code;
    const domain = req.domain;
    const defaultGapType = DOMAIN_GAP_TYPE[domain] || "normativo";
    const gapLevel = DOMAIN_GAP_LEVEL[domain] || "operacional";

    // Verificar se já existe
    const [existing] = await conn.execute(
      "SELECT id FROM regulatory_requirements_v3 WHERE code = ?",
      [code],
    );

    const evaluationCriteria = JSON.stringify(
      req.validation_criteria || [],
    );
    const evidenceRequired = JSON.stringify(req.evidence_types || []);
    const tags = JSON.stringify(req.tags || []);
    const legalReference = Array.isArray(req.legal_basis)
      ? req.legal_basis.join(", ")
      : req.legal_basis || null;

    if (existing.length > 0) {
      await conn.execute(
        `UPDATE regulatory_requirements_v3 SET
          name = ?,
          description = ?,
          domain = ?,
          assessment_order = ?,
          base_criticality = ?,
          default_gap_type = ?,
          gap_level = ?,
          evaluation_criteria = ?,
          evidence_required = ?,
          tags = ?,
          legal_reference = ?,
          updated_at = NOW()
        WHERE code = ?`,
        [
          req.name,
          req.operational_desc || req.name,
          domain,
          req.assessment_order || 999,
          req.base_criticality || "media",
          defaultGapType,
          gapLevel,
          evaluationCriteria,
          evidenceRequired,
          tags,
          legalReference,
          code,
        ],
      );
      updated++;
    } else {
      await conn.execute(
        `INSERT INTO regulatory_requirements_v3 (
          code, name, description, domain, assessment_order,
          base_criticality, default_gap_type, gap_level,
          evaluation_criteria, evidence_required, tags,
          legal_reference, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          code,
          req.name,
          req.operational_desc || req.name,
          domain,
          req.assessment_order || 999,
          req.base_criticality || "media",
          defaultGapType,
          gapLevel,
          evaluationCriteria,
          evidenceRequired,
          tags,
          legalReference,
        ],
      );
      inserted++;
    }
  } catch (err) {
    console.error(`❌ Erro no requisito ${req.code}:`, err.message);
    errors++;
  }
}

await conn.end();

// ---------------------------------------------------------------------------
// Relatório final
// ---------------------------------------------------------------------------
console.log("\n📊 Resultado do Seed:");
console.log(`   ✅ Inseridos: ${inserted}`);
console.log(`   🔄 Atualizados: ${updated}`);
console.log(`   ❌ Erros: ${errors}`);
console.log(`   📦 Total processado: ${requirements.length}`);

if (errors === 0) {
  console.log("\n🎉 Seed concluído com sucesso!");
} else {
  console.log("\n⚠️  Seed concluído com erros. Verifique os logs acima.");
  process.exit(1);
}
