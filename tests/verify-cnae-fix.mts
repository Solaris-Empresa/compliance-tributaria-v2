import { getOnda1Questions, getProjectById } from '../server/db.ts';

async function main() {
  // Test 1: getOnda1Questions WITHOUT cnae (should return all 15)
  const allQuestions = await getOnda1Questions();
  console.log('Test 1 - Sem CNAE: Total =', allQuestions.length);
  console.log('  Esperado: 15 (todas ativas)');
  console.log('  Status:', allQuestions.length === 15 ? '✅ PASS' : '❌ FAIL');
  
  // Test 2: getOnda1Questions WITH construtora CNAE 4120-4/00 (should return 12)
  const construtoraQuestions = await getOnda1Questions('4120-4/00');
  console.log('\nTest 2 - Construtora 4120-4/00: Total =', construtoraQuestions.length);
  console.log('  Esperado: 12 (sem SOL-050/051/052)');
  const codigos = construtoraQuestions.map(q => q.codigo);
  const hasSOL050 = codigos.includes('SOL-050');
  const hasSOL051 = codigos.includes('SOL-051');
  const hasSOL052 = codigos.includes('SOL-052');
  console.log('  SOL-050 presente:', hasSOL050 ? '❌ NÃO DEVERIA' : '✅ Ausente');
  console.log('  SOL-051 presente:', hasSOL051 ? '❌ NÃO DEVERIA' : '✅ Ausente');
  console.log('  SOL-052 presente:', hasSOL052 ? '❌ NÃO DEVERIA' : '✅ Ausente');
  console.log('  Status:', construtoraQuestions.length === 12 && !hasSOL050 && !hasSOL051 && !hasSOL052 ? '✅ PASS' : '❌ FAIL');
  
  // Test 3: getOnda1Questions WITH atacadista CNAE 4639-7/01 (should return 15)
  const atacadistaQuestions = await getOnda1Questions('4639-7/01');
  console.log('\nTest 3 - Atacadista 4639-7/01: Total =', atacadistaQuestions.length);
  console.log('  Esperado: 15 (com SOL-050/051/052)');
  const codigos3 = atacadistaQuestions.map(q => q.codigo);
  console.log('  SOL-050 presente:', codigos3.includes('SOL-050') ? '✅ Presente' : '❌ DEVERIA ESTAR');
  console.log('  SOL-051 presente:', codigos3.includes('SOL-051') ? '✅ Presente' : '❌ DEVERIA ESTAR');
  console.log('  SOL-052 presente:', codigos3.includes('SOL-052') ? '✅ Presente' : '❌ DEVERIA ESTAR');
  console.log('  Status:', atacadistaQuestions.length === 15 ? '✅ PASS' : '❌ FAIL');
  
  // Test 4: getOnda1Questions WITH advogado CNAE 6911-7/00 (should return 12)
  const advogadoQuestions = await getOnda1Questions('6911-7/00');
  console.log('\nTest 4 - Advogado 6911-7/00: Total =', advogadoQuestions.length);
  console.log('  Esperado: 12 (sem SOL-050/051/052)');
  console.log('  Status:', advogadoQuestions.length === 12 ? '✅ PASS' : '❌ FAIL');
  
  // Test 5: getOnda1Questions WITH mercearia CNAE 4712-1/00 (should return 12)
  const merceariaQuestions = await getOnda1Questions('4712-1/00');
  console.log('\nTest 5 - Mercearia 4712-1/00: Total =', merceariaQuestions.length);
  console.log('  Esperado: 12 (sem SOL-050/051/052)');
  console.log('  Status:', merceariaQuestions.length === 12 ? '✅ PASS' : '❌ FAIL');
  
  // Test 6: Verify project 2880001 would get 12 questions
  const proj = await getProjectById(2880001);
  if (proj) {
    const confirmedCnaes = (proj as any).confirmedCnaes;
    const primaryCnae = Array.isArray(confirmedCnaes) && confirmedCnaes.length > 0
      ? (typeof confirmedCnaes[0] === 'string' ? confirmedCnaes[0] : confirmedCnaes[0]?.code)
      : undefined;
    console.log('\nTest 6 - Projeto 2880001 (primaryCnae=' + primaryCnae + '):');
    if (primaryCnae) {
      const projQuestions = await getOnda1Questions(primaryCnae);
      console.log('  Total:', projQuestions.length);
      console.log('  Esperado: 12');
      console.log('  Status:', projQuestions.length === 12 ? '✅ PASS' : '❌ FAIL');
    }
  }
  
  process.exit(0);
}
main();
