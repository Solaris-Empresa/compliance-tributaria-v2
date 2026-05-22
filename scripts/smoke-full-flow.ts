/**
 * SMOKE TEST COMPLETO — 13 cenários
 * Fluxo: createProject → extractCnaes → generateRisksAllSources → generateBriefing
 * Usa tRPC caller com contexto de owner para bypass de auth
 */
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

const CNPJ = '00394460005887';
const CLIENT_ID = 18450018; // clientId válido existente no banco

interface Scenario {
  id: string;
  name: string;
  desc: string;
  cnae: string;
  ncm: string;
  natureza: string;
  regime: string;
  operationType: string;
}

const SCENARIOS: Scenario[] = [
  { id: 'T01', name: 'Soja — produtor rural', desc: 'Empresa de cultivo e comercialização de soja em grão para exportação e mercado interno, com operações de armazenagem e logística própria', cnae: '0115-6/00', ncm: '1201.90.00', natureza: 'Produção própria + Comércio', regime: 'lucro_real', operationType: 'agronegocio' },
  { id: 'T02', name: 'Milho — cooperativa agrícola', desc: 'Cooperativa agrícola que compra milho em grão de produtores associados, armazena em silos próprios e revende para indústrias de ração e exportação', cnae: '4623-1/99', ncm: '1005.90.10', natureza: 'Comércio + Intermediação', regime: 'lucro_real', operationType: 'comercio' },
  { id: 'T03', name: 'Café — torrefação e venda', desc: 'Indústria de torrefação e moagem de café, com venda direta ao varejo e distribuição para supermercados em todo o território nacional', cnae: '1081-3/02', ncm: '0901.21.00', natureza: 'Produção própria + Comércio', regime: 'lucro_presumido', operationType: 'industria' },
  { id: 'T04', name: 'Transporte diesel perigoso', desc: 'Transportadora rodoviária interestadual especializada em cargas perigosas como diesel e gasolina, atendendo postos de combustíveis e distribuidoras', cnae: '4930-2/03', ncm: '2710.19.21', natureza: 'Transporte', regime: 'lucro_real', operationType: 'servicos' },
  { id: 'T05', name: 'Comércio varejista de diesel', desc: 'Posto revendedor de combustíveis que comercializa diesel S10, gasolina comum e aditivada diretamente ao consumidor final, com operação de loja de conveniência', cnae: '4731-8/00', ncm: '2710.19.21', natureza: 'Comércio', regime: 'lucro_presumido', operationType: 'comercio' },
  { id: 'T06', name: 'Distribuidora de combustíveis', desc: 'Distribuidora credenciada pela ANP que compra gasolina e diesel de refinarias e revende para rede de postos revendedores em múltiplos estados', cnae: '4681-8/01', ncm: '2710.12.59', natureza: 'Comércio + Intermediação', regime: 'lucro_real', operationType: 'comercio' },
  { id: 'T07', name: 'Trading exportadora de grãos', desc: 'Trading company que compra soja e milho de produtores rurais, armazena em terminais portuários e exporta grãos para mercados internacionais', cnae: '4622-2/00', ncm: '1201.90.00', natureza: 'Comércio + Intermediação', regime: 'lucro_real', operationType: 'comercio' },
  { id: 'T08', name: 'Distribuidora Nacional de Bebidas', desc: 'Distribuidora atacadista de bebidas alcoólicas e não alcoólicas, incluindo cervejas, refrigerantes e energéticos, atendendo bares, restaurantes e supermercados', cnae: '4635-4/02', ncm: '2203.00.00', natureza: 'Comércio + Intermediação', regime: 'lucro_real', operationType: 'comercio' },
  { id: 'T09', name: 'Pharma Brasil Indústria', desc: 'Indústria farmacêutica fabricante de medicamentos genéricos e similares, com venda para farmácias, hospitais e distribuidores em todo o Brasil', cnae: '2121-1/01', ncm: '3004.90.99', natureza: 'Produção própria + Comércio', regime: 'lucro_real', operationType: 'industria' },
  { id: 'T10', name: 'Instituto Saúde Diagnóstica', desc: 'Laboratório de análises clínicas e diagnóstico por imagem que atende pacientes particulares e convênios, com unidades em múltiplas cidades', cnae: '8640-2/02', ncm: '', natureza: 'Serviços', regime: 'lucro_presumido', operationType: 'servicos' },
  { id: 'T11', name: 'Transportadora Combustíveis Perigosos', desc: 'Transportadora especializada em transporte rodoviário de combustíveis perigosos entre refinarias e distribuidoras, com frota própria de caminhões-tanque', cnae: '4930-2/02', ncm: '2710.19.21', natureza: 'Transporte', regime: 'lucro_real', operationType: 'servicos' },
  { id: 'T12', name: 'Distribuidora Alimentos IS + alíquota zero', desc: 'Distribuidora de alimentos da cesta básica nacional e bebidas açucaradas, atendendo supermercados e mercearias com operação multiestadual', cnae: '4639-7/01', ncm: '2202.10.00', natureza: 'Comércio', regime: 'lucro_real', operationType: 'comercio' },
  { id: 'T13', name: 'Exportadora Café Premium', desc: 'Empresa que compra café especial de produtores certificados, processa e exporta grãos torrados premium para Europa e Ásia via porto de Santos', cnae: '4621-4/00', ncm: '0901.21.00', natureza: 'Comércio + Intermediação', regime: 'lucro_real', operationType: 'comercio' },
];

async function main() {
  const db = await getDb();
  
  // Import the tRPC caller (v11 pattern)
  const { appRouter } = await import('../server/routers');
  
  // Get owner user for context
  const [users] = await db.execute(sql`SELECT id, name, role FROM users WHERE id = 1`) as any;
  const owner = users[0];
  if (!owner) {
    console.error('FATAL: No user with id=1 found');
    process.exit(1);
  }
  console.log(`Using user: ${owner.name} (id=${owner.id}, role=${owner.role})`);
  
  const caller = appRouter.createCaller({ user: { id: owner.id, name: owner.name, role: owner.role || 'admin' } });
  
  const results: any[] = [];
  
  for (const s of SCENARIOS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${s.id}] ${s.name}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // Step 1: Create project with correct schema
      console.log(`  [1/4] Creating project...`);
      const project = await caller.fluxoV3.createProject({
        name: `SMOKE-${s.id}: ${s.name}`,
        description: s.desc,
        clientId: CLIENT_ID,
        companyProfile: {
          cnpj: CNPJ,
          companyType: s.operationType === 'agronegocio' ? 'ltda' : (s.natureza.includes('Intermediação') ? 'sa' : 'ltda'),
          companySize: 'media',
          taxRegime: s.regime as any,
        },
        operationProfile: {
          operationType: s.operationType as any,
          clientType: s.natureza.includes('Intermediação') ? ['b2b', 'b2c'] : ['b2b'],
          multiState: s.natureza.includes('interestadual') || s.desc.includes('múltipl') || s.desc.includes('multiestadual'),
          principaisProdutos: s.ncm ? [{ ncm_code: s.ncm, descricao: s.name.split(' — ')[1] || s.name }] : [],
        },
        taxComplexity: {
          hasImportExport: s.natureza.includes('export') || s.desc.includes('export'),
          usesTaxIncentives: false,
          hasSpecialRegimes: s.regime === 'simples_nacional',
        },
        financialProfile: {
          paymentMethods: ['cartao', 'pix', 'boleto'],
          hasIntermediaries: s.natureza.includes('Intermediação'),
        },
      });
      const projectId = project.projectId;
      console.log(`  → projectId=${projectId}`);
      
      // Step 2: Extract CNAEs (requires description)
      console.log(`  [2/4] Extracting CNAEs...`);
      try {
        await caller.fluxoV3.extractCnaes({ projectId, description: s.desc });
        console.log(`  → CNAEs extracted OK`);
      } catch (cnaeErr: any) {
        console.log(`  → CNAEs error (non-fatal): ${cnaeErr.message?.substring(0, 100)}`);
      }
      
      // Step 3: Generate risks (deterministic pipeline — populates risks_v4)
      console.log(`  [3/4] Generating risks...`);
      try {
        const risks = await caller.risksV4.generateRisksAllSources({ projectId });
        console.log(`  → risks generated OK`);
      } catch (riskErr: any) {
        console.log(`  → risks error (non-fatal): ${riskErr.message?.substring(0, 150)}`);
      }
      
      // Step 4: Generate briefing
      console.log(`  [4/4] Generating briefing...`);
      
      // Build allAnswers from scenario data
      const allAnswers = [{
        cnaeCode: s.cnae,
        cnaeDescription: s.name,
        level: 'detalhado',
        questions: [
          {
            question: `Descreva as operações tributárias principais da empresa`,
            answer: `${s.desc}. Natureza das operações: ${s.natureza}. Regime tributário: ${s.regime}. ${s.ncm ? 'NCM principal: ' + s.ncm + '.' : ''} Operações envolvem ${s.operationType}.`,
          },
          {
            question: `Quais são os principais produtos/serviços e como são comercializados?`,
            answer: `A empresa atua no segmento de ${s.name}, com ${s.natureza.toLowerCase()}. ${s.ncm ? 'Produto principal NCM ' + s.ncm + '.' : 'Serviços especializados.'} Regime: ${s.regime}.`,
          },
        ]
      }];
      
      const briefing = await caller.fluxoV3.generateBriefing({
        projectId,
        allAnswers,
      });
      console.log(`  → briefing generated OK`);
      
      // Step 5: Validate results
      const [bRow] = await db.execute(sql`
        SELECT briefingStructured FROM projects WHERE id = ${projectId}
      `) as any;
      
      let bs: any = null;
      if (bRow[0]?.briefingStructured) {
        let raw = bRow[0].briefingStructured;
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch {}
          if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch {}
          }
        }
        bs = raw;
      }
      
      const fullText = JSON.stringify(bs || '');
      const decretoMentions = (fullText.match(/Decreto\s*12[\.\s]*955/gi) || []).length;
      const artDecretoMatches = fullText.match(/Art\.\s*\d+[^"]*Decreto/gi) || [];
      const cgibsMentions = (fullText.match(/CGIBS|Resolução.*6\/2026/gi) || []).length;
      const lc214Mentions = (fullText.match(/LC\s*214|Lei\s*Complementar\s*n?º?\s*214/gi) || []).length;
      const isMentions = (fullText.match(/[Ii]mposto\s*[Ss]eletivo/g) || []).length;
      
      // Check risks_v4
      const [riskRows] = await db.execute(sql`
        SELECT categoria, status FROM risks_v4 WHERE project_id = ${projectId}
      `) as any;
      const riskCats = riskRows.map((r: any) => r.categoria).filter((c: string, i: number, a: string[]) => a.indexOf(c) === i);
      
      const result = {
        id: s.id,
        name: s.name,
        projectId,
        regime: s.regime,
        operationType: s.operationType,
        risksCount: riskRows.length,
        riskCategories: riskCats,
        decretoMentions,
        artDecretoExamples: artDecretoMatches.slice(0, 5),
        cgibsMentions,
        lc214Mentions,
        isMentions,
        pass_decreto: decretoMentions > 0,
        pass_lc214: lc214Mentions > 0,
        briefingLength: fullText.length,
      };
      
      results.push(result);
      console.log(`  ✅ DONE: decreto=${decretoMentions} cgibs=${cgibsMentions} lc214=${lc214Mentions} IS=${isMentions} risks=${riskRows.length} [${riskCats.join(',')}]`);
      
    } catch (err: any) {
      const errMsg = typeof err.message === 'string' ? err.message : JSON.stringify(err.message || err);
      console.error(`  ❌ FAILED: ${errMsg.substring(0, 300)}`);
      results.push({ id: s.id, name: s.name, error: errMsg.substring(0, 300) });
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  const passed = results.filter(r => r.pass_decreto);
  const failed = results.filter(r => !r.pass_decreto && !r.error);
  const errors = results.filter(r => r.error);
  
  console.log(`PASS (Decreto citado): ${passed.length}/13`);
  console.log(`FAIL (sem Decreto): ${failed.length}/13`);
  console.log(`ERROR: ${errors.length}/13`);
  
  for (const r of results) {
    if (r.error) {
      console.log(`  ❌ ${r.id} ${r.name}: ERROR — ${r.error.substring(0, 100)}`);
    } else {
      const status = r.pass_decreto ? '✅' : '⚠️';
      console.log(`  ${status} ${r.id} ${r.name}: decreto=${r.decretoMentions} cgibs=${r.cgibsMentions} lc214=${r.lc214Mentions} IS=${r.isMentions} risks=[${r.riskCategories?.join(',')}]`);
    }
  }
  
  // Write results to JSON for report
  const fs = await import('fs');
  fs.writeFileSync('/home/ubuntu/smoke-results-v3.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to /home/ubuntu/smoke-results-v3.json');
  
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
