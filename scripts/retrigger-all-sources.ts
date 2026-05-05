/**
 * Retrigger M3.10 — Executa generateRisksAllSources logic diretamente
 * 
 * Replica a lógica exata da procedure generateRisksAllSources (risks-v4.ts L872-950)
 * mas sem precisar de auth HTTP.
 * 
 * ATENÇÃO: Este script ALTERA dados no banco (DELETE + INSERT em risks_v4).
 * 
 * Uso: npx tsx scripts/retrigger-all-sources.ts
 */
import { getAllGapsForProject, deleteRisksByProject, insertRiskV4WithAudit } from '../server/lib/db-queries-risks-v4';
import { GapToRuleMapper } from '../server/lib/gap-to-rule-mapper';
import { generateRisksV4Pipeline } from '../server/lib/generate-risks-pipeline';
import { getActiveCategories, getCategoryByCodigo } from '../server/lib/risk-category.repository.drizzle';
import type { CategoryACL, CategoryResolver, GapRule } from '../server/lib/gap-to-rule-mapper';

const PROJECT_ID = 3570002;
const ACTOR_ID = 1; // system user

async function main() {
  console.log(`=== Retrigger M3.10 — Projeto ${PROJECT_ID} ===\n`);

  // 1. Carregar TODOS os gaps
  console.log('1. Carregando gaps...');
  const gaps = await getAllGapsForProject(PROJECT_ID);
  console.log(`   Total: ${gaps.length} gaps`);

  const gapsBySource: Record<string, number> = {};
  for (const g of gaps) {
    const s = g.sourceOrigin ?? 'unknown';
    gapsBySource[s] = (gapsBySource[s] ?? 0) + 1;
  }
  console.log('   Por fonte:', gapsBySource);

  // Check how many have categoria
  let withCat = 0, withoutCat = 0;
  for (const g of gaps) {
    if (g.categoria) withCat++; else withoutCat++;
  }
  console.log(`   Com categoria: ${withCat}, Sem categoria: ${withoutCat}\n`);

  if (gaps.length === 0) {
    console.log('Nenhum gap encontrado. Abortando.');
    process.exit(0);
  }

  // 2. Resolver categorias (mesma lógica da procedure)
  console.log('2. Configurando CategoryResolver...');
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

  // 3. Mapear gaps para rules
  console.log('3. Executando GapToRuleMapper.mapMany()...');
  const mapper = new GapToRuleMapper(resolver, { allowLayerInference: false });
  const mapResult = await mapper.mapMany(gaps);
  console.log(`   Mapped: ${mapResult.stats.mapped}, Unmapped: ${mapResult.stats.unmapped}`);
  console.log(`   Review: ${mapResult.reviewQueue.length}`);
  console.log(`   Total rules: ${mapResult.mappedRules.length}\n`);

  if (mapResult.mappedRules.length === 0) {
    console.log('Nenhuma rule mapeada. Abortando.');
    process.exit(0);
  }

  // 4. DELETE snapshot anterior
  console.log('4. Deletando riscos anteriores...');
  await deleteRisksByProject(PROJECT_ID);
  console.log('   DELETE concluído.');

  // 5. Pipeline de consolidação (mesma chamada da procedure)
  console.log('5. Executando generateRisksV4Pipeline()...');
  const { risks, summary } = await generateRisksV4Pipeline(
    PROJECT_ID,
    mapResult.mappedRules as GapRule[],
    ACTOR_ID,
  );
  console.log(`   Riscos gerados: ${risks.length}`);

  // Mostrar distribuição de source_priority
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

  // 6. Persistir riscos com auditoria
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

  console.log('\n═══════════════════════════════════════════');
  console.log(`RETRIGGER CONCLUÍDO — ${riskIds.length} riscos, ${distinctSources} fontes distintas`);
  console.log('═══════════════════════════════════════════');

  if (summary) {
    console.log('\nSummary:', JSON.stringify(summary, null, 2));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
