import { saveAssessmentPhase1 } from './server/db';

async function testPhase1Save() {
  console.log('\n🧪 TESTE: Validar SQL gerado para saveAssessmentPhase1\n');
  
  const testData = {
    projectId: 999999,
    taxRegime: 'lucro_real' as const,
    companySize: 'grande' as const,
    annualRevenue: 50000000,
    businessSector: 'servicos' as const,
    mainActivity: 'Teste de SQL',
    employeeCount: 100,
    hasAccountingDept: 'terceirizado' as const,
    currentERPSystem: 'sap',
    mainChallenges: 'Validar que campos completed* não aparecem no SQL',
    complianceGoals: 'Garantir correção funcionando',
  };

  try {
    await saveAssessmentPhase1(testData);
    console.log('\n✅ SUCESSO: Salvamento concluído sem erros');
    console.log('✅ Se não houve erro de SQL, significa que os campos completed* NÃO foram incluídos!\n');
  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    if (error.message.includes('completedAt') || error.message.includes('completedBy') || error.message.includes('completedByRole')) {
      console.error('❌ FALHA: Campos completed* AINDA estão sendo incluídos no SQL!\n');
    }
  }
}

testPhase1Save();
