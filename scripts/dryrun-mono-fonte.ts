/**
 * DRY-RUN: Validação do diagnóstico mono-fonte
 * 
 * GARANTIA: Zero alteração no banco. Apenas SELECT + transformação em memória.
 * 
 * Passos:
 * 1. SELECT gaps órfãos (solaris/iagen) dos 3 projetos
 * 2. Simula Fix B em memória: preenche risk_category_code a partir de source_reference
 * 3. Converte para GapInput[] com sourceOrigin correto
 * 4. Passa por GapToRuleMapper.mapMany() 
 * 5. Converte mapped → GapRule[]
 * 6. Passa por consolidateRisks() (pure in-memory, zero persistência)
 * 7. Imprime resultado: total riscos, source_priority distintos, distribuição
 * 
 * Critério SUCCESS: ≥ 2 valores distintos em source_priority + pelo menos 1 com 'solaris' ou 'iagen'
 * Critério FAIL: mono-fonte ou todos unmapped → STOP
 */

import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';
import { GapToRuleMapper, type CategoryResolver } from '../server/lib/gap-to-rule-mapper';
import { consolidateRisks, type GapRule } from '../server/lib/risk-engine-v4';
import type { GapInput, CategoryACL } from '../server/schemas/gap-risk.schemas';

// ─── TOPIC → RISK_CATEGORY_CODE MAPPING (Fix B simulation) ───────────────────
// Based on analysis: source_reference in solaris/iagen gaps contains topic names.
// Some match risk_categories.codigo directly, others need mapping.
const TOPIC_TO_CATEGORY: Record<string, string> = {
  // Direct matches to risk_categories.codigo
  confissao_automatica: 'confissao_automatica',
  
  // Topics that map to confissao_automatica (all related to Art. 45 LC 214)
  nfe: 'confissao_automatica',           // NF-e validation → confissão por erro
  cgibs: 'confissao_automatica',          // CGIBS monitoring → confissão por inércia
  divida_ativa: 'confissao_automatica',   // Débitos constituídos → execução fiscal
  
  // Topics that map to obrigacao_acessoria
  apuracao_assistida: 'obrigacao_acessoria',  // Apuração assistida = obrigação acessória
  apuracao: 'obrigacao_acessoria',            // Apuração geral
  retificacao: 'obrigacao_acessoria',         // Retificação fiscal
  espontaneidade: 'obrigacao_acessoria',      // Espontaneidade na correção
  
  // Topics that map to regime_diferenciado
  erp: 'regime_diferenciado',             // ERP parametrização → regime operacional
  
  // Topics that map to enquadramento_geral
  governanca: 'enquadramento_geral',      // Governança fiscal
  risco_sistemico: 'enquadramento_geral', // Risco sistêmico
  
  // Topics that map to split_payment (contencioso/judicial)
  contraditorio: 'split_payment',         // Contraditório
  ampla_defesa: 'split_payment',          // Ampla defesa
  judicializacao: 'split_payment',        // Judicialização
  
  // Topics that map to inscricao_cadastral
  passivo_tributario: 'inscricao_cadastral', // Passivo tributário
};

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DRY-RUN: Validação do Diagnóstico Mono-Fonte              ║');
  console.log('║  GARANTIA: Zero INSERT/UPDATE/DELETE — apenas SELECT + RAM  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const db = await getDb();

  // ─── PASSO 1: SELECT read-only ─────────────────────────────────────────────
  console.log('═══ PASSO 1: SELECT read-only dos gaps órfãos ═══');
  const result = await db.execute(sql`
    SELECT id, project_id, source, source_reference, requirement_id, 
           risk_category_code, gap_classification, evidence_status, criticality,
           gap_description, domain
    FROM project_gaps_v3 
    WHERE source IN ('solaris', 'iagen') 
      AND project_id IN (3270001, 3480001, 3570002)
    ORDER BY project_id, source, id
  `);
  const rawGaps = result[0] as any[];
  console.log(`Total gaps órfãos: ${rawGaps.length}`);
  console.log('');

  // ─── PASSO 2: Simular Fix B em memória ────────────────────────────────────
  console.log('═══ PASSO 2: Simular Fix B (preencher risk_category_code) ═══');
  let mapped = 0;
  let unmappedTopics: string[] = [];
  
  for (const gap of rawGaps) {
    const topic = gap.source_reference;
    const categoryCode = TOPIC_TO_CATEGORY[topic];
    if (categoryCode) {
      gap.risk_category_code = categoryCode; // Fix B: preenche em memória
      mapped++;
    } else {
      unmappedTopics.push(topic);
    }
  }
  console.log(`Fix B simulado: ${mapped}/${rawGaps.length} gaps com risk_category_code preenchido`);
  if (unmappedTopics.length > 0) {
    console.log(`Tópicos sem mapeamento: ${[...new Set(unmappedTopics)].join(', ')}`);
  }
  console.log('');

  // ─── PASSO 3: Converter para GapInput[] ───────────────────────────────────
  console.log('═══ PASSO 3: Converter para GapInput[] com sourceOrigin correto ═══');
  const gapInputs: GapInput[] = rawGaps
    .filter(g => g.risk_category_code) // Only process gaps that Fix B mapped
    .map((g, idx) => ({
      id: `orphan-${g.source}-${g.id}`,
      canonicalId: `orphan-${g.source}-${g.id}`,
      gapStatus: 'nao_compliant' as const,
      gapSeverity: (g.criticality === 'critica' ? 'critica' : 'alta') as any,
      gapType: 'normativo',
      area: g.domain ?? 'compliance',
      descricao: g.gap_description,
      categoria: g.risk_category_code, // Fix B: agora preenchido!
      sourceOrigin: g.source as 'solaris' | 'iagen', // Fix A: fonte correta
      requirementId: g.requirement_id ?? '0',
      sourceReference: g.source_reference,
      domain: g.domain ?? 'compliance',
      layer: g.source === 'solaris' ? 'onda1' : 'onda2',
      questionId: null,
      answerValue: null,
      gapId: g.id,
      questionSource: g.source as any,
    }));
  console.log(`GapInputs criados: ${gapInputs.length}`);
  console.log(`sourceOrigin distribution:`);
  const originDist: Record<string, number> = {};
  for (const gi of gapInputs) {
    originDist[gi.sourceOrigin!] = (originDist[gi.sourceOrigin!] || 0) + 1;
  }
  console.table(originDist);
  console.log('');

  // ─── PASSO 4: GapToRuleMapper.mapMany() ───────────────────────────────────
  console.log('═══ PASSO 4: GapToRuleMapper.mapMany() ═══');
  
  // Build a CategoryResolver that reads from DB (read-only)
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
      // For this dry-run, article lookup not needed since we have explicit categories
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
    console.log('❌ FAIL: Todos os gaps ficaram unmapped. Diagnóstico incompleto.');
    process.exit(1);
  }

  // ─── PASSO 5: Converter mapped → GapRule[] ────────────────────────────────
  console.log('═══ PASSO 5: Converter mapped → GapRule[] ═══');
  const gapRules: GapRule[] = mapResult.mappedRules;
  console.log(`GapRules gerados: ${gapRules.length}`);
  
  // Check fonte distribution in GapRules
  const fonteDist: Record<string, number> = {};
  for (const gr of gapRules) {
    fonteDist[gr.fonte] = (fonteDist[gr.fonte] || 0) + 1;
  }
  console.log('Distribuição de fonte nos GapRules:');
  console.table(fonteDist);
  console.log('');

  // ─── PASSO 6: consolidateRisks() — per project ────────────────────────────
  console.log('═══ PASSO 6: consolidateRisks() in-memory (por projeto) ═══');
  
  // Tag each GapRule with its project_id using the rawGaps lookup
  const gapRulesByProject = new Map<number, GapRule[]>();
  for (let i = 0; i < gapRules.length; i++) {
    // gapRules[i] corresponds to a mapped gap from gapInputs
    // Find the original raw gap by matching the requirementId
    const gr = gapRules[i];
    const matchingInput = gapInputs.find(gi => {
      // The GapRule.requirementId comes from gap.requirementId ?? gap.canonicalId
      return gi.id === gr.requirementId || gi.canonicalId === gr.requirementId;
    });
    let pid = 3570002; // default
    if (matchingInput) {
      // Extract gap id from canonicalId: "orphan-solaris-2790300" → 2790300
      const parts = matchingInput.canonicalId.split('-');
      const gapId = parseInt(parts[parts.length - 1]);
      const rawGap = rawGaps.find((rg: any) => rg.id === gapId);
      if (rawGap) pid = rawGap.project_id;
    }
    const arr = gapRulesByProject.get(pid) ?? [];
    arr.push(gr);
    gapRulesByProject.set(pid, arr);
  }

  const projectIds = [3270001, 3480001, 3570002];
  const allRisks: any[] = [];
  
  for (const pid of projectIds) {
    const projectGaps = gapRulesByProject.get(pid) ?? [];
    if (projectGaps.length === 0) {
      console.log(`  Projeto ${pid}: 0 GapRules — skip`);
      continue;
    }
    console.log(`  Projeto ${pid}: ${projectGaps.length} GapRules`);
    const context: any = { tipoOperacao: 'servico' };
    const risks = await consolidateRisks(pid, projectGaps, context, 1);
    allRisks.push(...risks.map(r => ({ ...r, _project: pid })));
  }

  // ─── PASSO 7: RESULTADO FINAL ─────────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTADO DO DRY-RUN                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Total riscos gerados: ${allRisks.length}`);
  
  // source_priority distribution
  const sourcePriorityDist: Record<string, number> = {};
  for (const r of allRisks) {
    sourcePriorityDist[r.source_priority] = (sourcePriorityDist[r.source_priority] || 0) + 1;
  }
  console.log('');
  console.log('source_priority DISTINTOS:');
  console.table(sourcePriorityDist);
  
  const distinctSources = Object.keys(sourcePriorityDist);
  console.log(`\nNúmero de fontes distintas: ${distinctSources.length}`);
  console.log(`Fontes: ${distinctSources.join(', ')}`);
  
  // Check for solaris or iagen
  const hasSolarisOrIagen = distinctSources.some(s => s === 'solaris' || s === 'iagen');
  
  // Categoria distribution
  console.log('');
  console.log('Distribuição por categoria:');
  const catDist: Record<string, number> = {};
  for (const r of allRisks) {
    catDist[r.categoria] = (catDist[r.categoria] || 0) + 1;
  }
  console.table(catDist);

  // Severidade distribution
  console.log('');
  console.log('Distribuição por severidade:');
  const sevDist: Record<string, number> = {};
  for (const r of allRisks) {
    sevDist[r.severidade] = (sevDist[r.severidade] || 0) + 1;
  }
  console.table(sevDist);

  // Per-project breakdown
  console.log('');
  console.log('Breakdown por projeto:');
  for (const pid of projectIds) {
    const projectRisks = allRisks.filter(r => r._project === pid);
    const pSources = [...new Set(projectRisks.map(r => r.source_priority))];
    console.log(`  Projeto ${pid}: ${projectRisks.length} riscos, fontes: [${pSources.join(', ')}]`);
  }

  // ─── VEREDITO ──────────────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (distinctSources.length >= 2 && hasSolarisOrIagen) {
    console.log('✅ SUCCESS: ≥ 2 fontes distintas + pelo menos 1 solaris/iagen');
    console.log('   → Diagnóstico VALIDADO. Fix A + Fix B resolve o bug.');
    console.log('   → Autoriza Sprint M3.10.');
  } else if (distinctSources.length >= 2) {
    console.log('⚠️  PARTIAL: ≥ 2 fontes distintas, mas nenhuma é solaris/iagen');
    console.log('   → Diagnóstico parcialmente validado. Revisar inferFonte.');
  } else {
    console.log('❌ FAIL: Resultado mono-fonte ou sem riscos.');
    console.log('   → Diagnóstico NÃO validado. Reabrir investigação.');
  }
  console.log('═══════════════════════════════════════════════════════════════');

  process.exit(0);
}

main().catch(e => { 
  console.error('ERRO:', e); 
  process.exit(1); 
});
