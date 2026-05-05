/**
 * DRY-RUN v2: Validação do diagnóstico mono-fonte (cenário COMBINADO)
 * 
 * GARANTIA: Zero alteração no banco. Apenas SELECT + transformação em memória.
 * 
 * Diferença vs v1: simula o cenário REAL pós-fix, onde o pipeline recebe
 * TODOS os gaps (v1 + solaris + iagen) juntos. Isso é o que Fix A faz.
 * 
 * Projeto alvo: 3570002 (o que o P.O. reportou)
 */

import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';
import { GapToRuleMapper, type CategoryResolver } from '../server/lib/gap-to-rule-mapper';
import { consolidateRisks, type GapRule } from '../server/lib/risk-engine-v4';
import type { GapInput, CategoryACL } from '../server/schemas/gap-risk.schemas';

const PROJECT_ID = 3570002;

// Fix B mapping: topic → risk_category_code
const TOPIC_TO_CATEGORY: Record<string, string> = {
  confissao_automatica: 'confissao_automatica',
  nfe: 'confissao_automatica',
  cgibs: 'confissao_automatica',
  divida_ativa: 'confissao_automatica',
  apuracao_assistida: 'obrigacao_acessoria',
  apuracao: 'obrigacao_acessoria',
  retificacao: 'obrigacao_acessoria',
  espontaneidade: 'obrigacao_acessoria',
  erp: 'regime_diferenciado',
  governanca: 'enquadramento_geral',
  risco_sistemico: 'enquadramento_geral',
  contraditorio: 'split_payment',
  ampla_defesa: 'split_payment',
  judicializacao: 'split_payment',
  passivo_tributario: 'inscricao_cadastral',
};

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DRY-RUN v2: Cenário COMBINADO (v1 + solaris + iagen)      ║');
  console.log('║  Projeto: 3570002 | GARANTIA: Zero persistência            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const db = await getDb();

  // ─── PASSO 1: SELECT ALL gaps for project 3570002 ──────────────────────────
  console.log('═══ PASSO 1: SELECT read-only — TODOS os gaps do projeto 3570002 ═══');
  
  const allGapsResult = await db.execute(sql`
    SELECT id, project_id, source, source_reference, requirement_id, 
           risk_category_code, gap_classification, evidence_status, criticality,
           gap_description, domain
    FROM project_gaps_v3 
    WHERE project_id = ${PROJECT_ID}
    ORDER BY source, id
  `);
  const allRawGaps = allGapsResult[0] as any[];
  
  const bySource: Record<string, number> = {};
  for (const g of allRawGaps) {
    bySource[g.source] = (bySource[g.source] || 0) + 1;
  }
  console.log(`Total gaps projeto ${PROJECT_ID}: ${allRawGaps.length}`);
  console.log('Por fonte:');
  console.table(bySource);
  console.log('');

  // ─── PASSO 2: Simular Fix B nos gaps órfãos ───────────────────────────────
  console.log('═══ PASSO 2: Simular Fix B (preencher risk_category_code em solaris/iagen) ═══');
  
  let fixBApplied = 0;
  let fixBFailed = 0;
  for (const gap of allRawGaps) {
    if (gap.source === 'solaris' || gap.source === 'iagen') {
      const cat = TOPIC_TO_CATEGORY[gap.source_reference];
      if (cat) {
        gap.risk_category_code = cat;
        fixBApplied++;
      } else {
        fixBFailed++;
      }
    }
  }
  console.log(`Fix B aplicado: ${fixBApplied} gaps`);
  console.log(`Fix B falhou: ${fixBFailed} gaps (sem mapeamento de tópico)`);
  console.log('');

  // ─── PASSO 3: Converter TODOS para GapInput[] ─────────────────────────────
  console.log('═══ PASSO 3: Converter TODOS os gaps para GapInput[] ═══');
  
  const gapInputs: GapInput[] = [];
  let skippedNoCategory = 0;

  for (const g of allRawGaps) {
    // Skip gaps without risk_category_code (Fix B failed or v1 gaps without it)
    if (!g.risk_category_code) {
      skippedNoCategory++;
      continue;
    }

    // Determine sourceOrigin based on source
    let sourceOrigin: 'solaris' | 'iagen' | 'regulatorio';
    if (g.source === 'solaris') sourceOrigin = 'solaris';
    else if (g.source === 'iagen') sourceOrigin = 'iagen';
    else sourceOrigin = 'regulatorio'; // v1 gaps

    gapInputs.push({
      id: `gap-${g.source}-${g.id}`,
      canonicalId: `gap-${g.source}-${g.id}`,
      gapStatus: 'nao_compliant' as const,
      gapSeverity: (g.criticality === 'critica' ? 'critica' : 'alta') as any,
      gapType: 'normativo',
      area: g.domain || 'compliance',
      descricao: g.gap_description,
      categoria: g.risk_category_code,
      sourceOrigin: sourceOrigin,
      requirementId: g.requirement_id || '0',
      sourceReference: g.source_reference,
      domain: g.domain || 'compliance',
      layer: g.source === 'solaris' ? 'onda1' : g.source === 'iagen' ? 'onda2' : undefined,
      questionId: null,
      answerValue: null,
      gapId: g.id,
      questionSource: g.source === 'v1' ? 'v1' : g.source as any,
    });
  }

  console.log(`GapInputs criados: ${gapInputs.length} (skipped ${skippedNoCategory} sem categoria)`);
  const originDist: Record<string, number> = {};
  for (const gi of gapInputs) {
    originDist[gi.sourceOrigin || 'undefined'] = (originDist[gi.sourceOrigin || 'undefined'] || 0) + 1;
  }
  console.log('sourceOrigin distribution:');
  console.table(originDist);
  console.log('');

  // ─── PASSO 4: GapToRuleMapper.mapMany() ───────────────────────────────────
  console.log('═══ PASSO 4: GapToRuleMapper.mapMany() ═══');
  
  const categoriesResult = await db.execute(sql`
    SELECT codigo, nome, status, severidade, urgencia, artigo_base, tipo,
           allowed_domains, allowed_gap_types
    FROM risk_categories WHERE status = 'ativo'
  `);
  const categories = categoriesResult[0] as any[];
  
  const resolver: CategoryResolver = {
    async findByCodigo(codigo: string): Promise<CategoryACL | undefined> {
      const cat = categories.find((c: any) => c.codigo === codigo);
      if (!cat) return undefined;
      return {
        codigo: cat.codigo,
        nome: cat.nome,
        status: cat.status,
        allowed_domains: cat.allowed_domains ? JSON.parse(cat.allowed_domains) : null,
        allowed_gap_types: cat.allowed_gap_types ? JSON.parse(cat.allowed_gap_types) : null,
      };
    },
    async findByArticle(normalizedArticle: string): Promise<CategoryACL[]> {
      return [];
    },
  };

  const mapper = new GapToRuleMapper(resolver, { allowLayerInference: true });
  const mapResult = await mapper.mapMany(gapInputs);
  
  console.log(`Mapped: ${mapResult.stats.mapped}`);
  console.log(`Ambiguous: ${mapResult.stats.ambiguous}`);
  console.log(`Unmapped: ${mapResult.stats.unmapped}`);
  console.log('');

  if (mapResult.stats.mapped === 0) {
    console.log('FAIL: Todos os gaps ficaram unmapped.');
    process.exit(1);
  }

  // ─── PASSO 5: Analisar GapRules ───────────────────────────────────────────
  console.log('═══ PASSO 5: Analisar GapRules (fonte distribution) ═══');
  const gapRules: GapRule[] = mapResult.mappedRules;
  console.log(`GapRules gerados: ${gapRules.length}`);
  
  const fonteDist: Record<string, number> = {};
  for (const gr of gapRules) {
    fonteDist[gr.fonte] = (fonteDist[gr.fonte] || 0) + 1;
  }
  console.log('Distribuição de fonte nos GapRules:');
  console.table(fonteDist);
  
  // Show per-category breakdown with fontes
  console.log('\nPor categoria + fonte:');
  const catFonte = new Map<string, Set<string>>();
  for (const gr of gapRules) {
    const key = gr.categoria;
    if (!catFonte.has(key)) catFonte.set(key, new Set());
    catFonte.get(key)!.add(gr.fonte);
  }
  for (const [cat, fontes] of catFonte) {
    console.log(`  ${cat}: fontes=[${[...fontes].join(', ')}]`);
  }
  console.log('');

  // ─── PASSO 6: consolidateRisks() ──────────────────────────────────────────
  console.log('═══ PASSO 6: consolidateRisks() in-memory ═══');
  const context: any = { tipoOperacao: 'servico' };
  const risks = await consolidateRisks(PROJECT_ID, gapRules, context, 1);

  // ─── PASSO 7: RESULTADO FINAL ─────────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              RESULTADO DO DRY-RUN v2 (COMBINADO)            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Total riscos gerados: ${risks.length}`);
  
  // source_priority distribution
  const sourcePriorityDist: Record<string, number> = {};
  for (const r of risks) {
    sourcePriorityDist[r.source_priority] = (sourcePriorityDist[r.source_priority] || 0) + 1;
  }
  console.log('');
  console.log('source_priority DISTINTOS:');
  console.table(sourcePriorityDist);
  
  const distinctSources = Object.keys(sourcePriorityDist);
  console.log(`\nNumero de fontes distintas: ${distinctSources.length}`);
  console.log(`Fontes: ${distinctSources.join(', ')}`);
  
  const hasSolarisOrIagen = distinctSources.some(s => s === 'solaris' || s === 'iagen');
  
  // Detail per risk
  console.log('\nDetalhe por risco:');
  console.log('┌────────────────────────┬───────────────┬────────────┬────────────┐');
  console.log('│ Categoria              │ source_priority│ Severidade │ Tipo       │');
  console.log('├────────────────────────┼───────────────┼────────────┼────────────┤');
  for (const r of risks) {
    const cat = (r.categoria as string).padEnd(22);
    const src = (r.source_priority as string).padEnd(13);
    const sev = (r.severidade as string).padEnd(10);
    const tipo = (r.type as string).padEnd(10);
    console.log(`│ ${cat} │ ${src} │ ${sev} │ ${tipo} │`);
  }
  console.log('└────────────────────────┴───────────────┴────────────┴────────────┘');

  // ─── VEREDITO ──────────────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (distinctSources.length >= 2 && hasSolarisOrIagen) {
    console.log('SUCCESS: >= 2 fontes distintas + pelo menos 1 solaris/iagen');
    console.log('   -> Diagnostico VALIDADO. Fix A + Fix B resolve o bug.');
    console.log('   -> Autoriza Sprint M3.10.');
  } else if (distinctSources.length >= 2) {
    console.log('PARTIAL: >= 2 fontes distintas, mas nenhuma eh solaris/iagen');
    console.log('   -> Diagnostico parcialmente validado. Revisar inferFonte.');
  } else if (hasSolarisOrIagen) {
    console.log('PARTIAL: Tem solaris/iagen mas mono-fonte (solaris domina tudo)');
    console.log('   -> Fix A+B funciona mas getBestSourcePriority prioriza solaris.');
    console.log('   -> Isso eh CORRETO por design: solaris (rank 4) > regulatorio (rank 6).');
    console.log('   -> Quando ambos contribuem para mesma categoria, solaris vence.');
    console.log('   -> Para ter multi-fonte na UI, categorias precisam ter gaps de fontes DIFERENTES.');
  } else {
    console.log('FAIL: Resultado mono-fonte regulatorio ou sem riscos.');
    console.log('   -> Diagnostico NAO validado. Reabrir investigacao.');
  }
  console.log('═══════════════════════════════════════════════════════════════');

  process.exit(0);
}

main().catch(e => { 
  console.error('ERRO:', e); 
  process.exit(1); 
});
