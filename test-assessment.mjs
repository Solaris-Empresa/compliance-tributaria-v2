import { db as dbConnection } from './server/_core/db.js';
import { assessmentPhase1 } from './drizzle/schema.ts';

async function testAssessmentSave() {
  console.log('=== TESTE DE SALVAMENTO ASSESSMENT FASE 1 ===\n');
  
  const testData = {
    projectId: 999999, // ID de teste
    taxRegime: 'simples_nacional',
    companySize: 'pequena',
    annualRevenue: '150000',
    businessSector: 'servicos',
    mainActivity: 'escola',
    employeeCount: 2,
    hasAccountingDept: 'terceirizado',
    currentERPSystem: 'totvs',
    mainChallenges: 'iss',
    complianceGoals: 'compliance com lc 214',
    completedAt: undefined,
    completedBy: undefined,
    completedByRole: undefined,
  };
  
  console.log('Dados de teste:', JSON.stringify(testData, null, 2));
  
  // Remover campos undefined
  const cleanData = Object.fromEntries(
    Object.entries(testData).filter(([_, v]) => v !== undefined)
  );
  
  console.log('\nDados limpos (sem undefined):', JSON.stringify(cleanData, null, 2));
  console.log('\nNúmero de campos:', Object.keys(cleanData).length);
  
  try {
    const db = await dbConnection();
    if (!db) throw new Error('Database not available');
    
    console.log('\n=== EXECUTANDO INSERT ===');
    await db.insert(assessmentPhase1).values(cleanData);
    console.log('✅ INSERT bem-sucedido!');
    
    // Limpar dados de teste
    await db.delete(assessmentPhase1).where(eq(assessmentPhase1.projectId, 999999));
    console.log('✅ Dados de teste removidos');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAssessmentSave().then(() => process.exit(0)).catch(err => {
  console.error('ERRO FATAL:', err);
  process.exit(1);
});
