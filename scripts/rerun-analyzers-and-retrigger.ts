/**
 * Re-executa analyzers (solaris + iagen) para projeto 3570002
 * e depois executa generateRisksAllSources.
 * 
 * Fluxo:
 * 1. analyzeSolarisAnswers(3570002) — DELETE source='solaris' + INSERT com risk_category_code preenchido (Fix B)
 * 2. analyzeIagenAnswers(3570002) — DELETE source='iagen' + INSERT com risk_category_code preenchido (Fix B)
 * 3. getAllGapsForProject → mapper → pipeline → INSERT riscos
 * 
 * Uso: npx tsx scripts/rerun-analyzers-and-retrigger.ts
 */
import { analyzeSolarisAnswers } from '../server/lib/solaris-gap-analyzer';
import { analyzeIagenAnswers } from '../server/lib/iagen-gap-analyzer';
import { getAllGapsForProject, deleteRisksByProject, insertRiskV4WithAudit } from '../server/lib/db-queries-risks-v4';
import { GapToRuleMapper } from '../server/lib/gap-to-rule-mapper';
import { generateRisksV4Pipeline } from '../server/lib/generate-risks-pipeline';
import { getActiveCategories, getCategoryByCodigo } from '../server/lib/risk-category.repository.drizzle';
import type { CategoryACL, CategoryResolver, GapRule } from '../server/lib/gap-to-rule-mapper';

const PROJECT_ID = 3570002;
const ACTOR_ID = 1;

async function main() {
  console.log(`=== Re-run Analyzers + Retrigger — Projeto ${PROJECT_ID} ===\n`);

  // ─── PASSO 1: Re-executar analyzeSolarisAnswers ───────────────────────────
  console.log('1. Re-executando analyzeSolarisAnswers...');
  try {
    const solarisResult = await analyzeSolarisAnswers(PROJECT_ID);
    console.log(`   Resultado: ${solarisResult.inserted} gaps inseridos (com risk_category_code)\n`);
  } catch (err: any) {
    console.error('   ERRO solaris:', err.message);
    console.log('   Continuando...\n');
  }

  // ─── PASSO 2: Re-executar analyzeIagenAnswers ─────────────────────────────
  console.log('2. Re-executando analyzeIagenAnswers...');
  try {
    const iagenResult = await analyzeIagenAnswers(PROJECT_ID);
    console.log(`   Resultado: ${iagenResult.inserted} gaps inseridos (com risk_category_code)\n`);
  } catch (err: any) {
    console.error('   ERRO iagen:', err.message);
    console.log('   Continuando...\n');
  }

  // ─── PASSO 3: Verificar gaps após re-análise ──────────────────────────────
  console.log('3. Verificando gaps após re-análise...');
  const gaps = await getAllGapsForProject(PROJECT_ID);
  console.log(`   Total: ${gaps.length} gaps`);

  const gapsBySource: Record<string, number> = {};
  for (const g of gaps) {
    const s = g.sourceOrigin ?? 'unknown';
    gapsBySource[s] = (gapsBySource[s] ?? 0) + 1;
  }
  console.log('   Por fonte:', gapsBySource);

  let withCat = 0, withoutCat = 0;
  for (const g of gaps) {
    if (g.categoria) withCat++; else withoutCat++;
  }
  console.log(`   Com categoria: ${withCat}, Sem categoria: ${withoutCat}\n`);

  if (gaps.length === 0) {
    console.log('Nenhum gap encontrado. Abortando.');
    process.exit(1);
  }

  // ─── PASSO 4: Mapper ──────────────────────────────────────────────────────
  console.log('4. Executando GapToRuleMapper.mapMany()...');
  const resolver: CategoryResolver = {
    async findByCodigo(codigo: string): Promise<CategoryACL | undefined> {
      const cat = await getCategoryByCodigo(codigo);
      if (!cat || cat.status !== 'ativo') return undefined;
      return {
        codigo: cat.codigo,
        nome: cat.nome,
        severidade: cat.severidade as CategoryACL['severidade'],
        urgencia: cat.urgencia as CategoryACL['urgencia'],
        tipo: cat.tipo as CategoryACL['tipo'],
        status: cat.status as CategoryACL['status'],
        allowedDomains: cat.allowedDomains ?? null,
        allowedGapTypes: cat.allowedGapTypes ?? null,
        ruleCode: cat.ruleCode ?? null,
      };
    },
    async findByArticle(normalizedArticle: string): Promise<CategoryACL[]> {
      const all = await getActiveCategories();
      return all.filter((c) =>
        c.allowedGapTypes?.some((t) =>
          t.toLowerCase().includes(normalizedArticle.toLowerCase()),
        ) ?? false,
      );
    },
  };
  const mapper = new GapToRuleMapper(resolver, { allowLayerInference: false });
  const mapResult = await mapper.mapMany(gaps);
  console.log(`   Mapped: ${mapResult.stats.mapped}, Unmapped: ${mapResult.stats.unmapped}`);
  console.log(`   Total rules: ${mapResult.mappedRules.length}\n`);

  // ─── PASSO 5: DELETE + Pipeline ───────────────────────────────────────────
  console.log('5. Deletando riscos anteriores + executando pipeline...');
  await deleteRisksByProject(PROJECT_ID);
  const { risks, summary } = await generateRisksV4Pipeline(
    PROJECT_ID,
    mapResult.mappedRules as GapRule[],
    ACTOR_ID,
  );
  console.log(`   Riscos gerados: ${risks.length}`);

  // Distribuição
  const sourceDist: Record<string, number> = {};
  for (const r of risks) {
    const sp = r.source_priority ?? 'unknown';
    sourceDist[sp] = (sourceDist[sp] ?? 0) + 1;
  }
  console.log('   Distribuição source_priority:', sourceDist);

  const distinctSources = Object.keys(sourceDist).length;
  console.log(`\n   *** DISTINCT source_priority: ${distinctSources} ***`);
  if (distinctSources >= 2) {
    console.log('   ✅ MULTI-FONTE CONFIRMADO\n');
  } else {
    console.log('   ❌ AINDA MONO-FONTE\n');
  }

  // ─── PASSO 6: Persistir ───────────────────────────────────────────────────
  console.log('6. Persistindo riscos...');
  const actor = {
    user_id: ACTOR_ID,
    user_name: 'system-m3.10-retrigger',
    user_role: 'admin' as const,
  };
  const riskIds: string[] = [];
  for (const risk of risks) {
    const id = await insertRiskV4WithAudit(risk, actor);
    riskIds.push(id);
  }
  console.log(`   INSERT: ${riskIds.length} riscos persistidos.`);

  // ─── RESULTADO ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  if (distinctSources >= 2) {
    console.log(`✅ DoD ATENDIDO — ${riskIds.length} riscos, ${distinctSources} fontes distintas`);
  } else {
    console.log(`❌ DoD NÃO ATENDIDO — ${riskIds.length} riscos, ${distinctSources} fonte(s)`);
  }
  console.log('═══════════════════════════════════════════');

  if (summary) {
    console.log('\nSummary:', JSON.stringify(summary, null, 2));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('ERRO FATAL:', err);
  process.exit(1);
});
