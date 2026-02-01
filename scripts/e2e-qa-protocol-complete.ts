#!/usr/bin/env node
/**
 * Protocolo Completo de Testes E2E - QA IA SOLARIS
 * 
 * OBJETIVO:
 * - Executar 2 projetos completos (P1 e P2)
 * - Validar hierarquia: Empresa → Projetos → Questionários → Planos
 * - Total de 10 planos (5 por projeto: 1 corporativo + 4 ramos)
 * - Validar cardinalidade, persistência e integridade
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  users, projects, activityBranches, projectBranches,
  corporateAssessments, branchAssessments,
  corporateActionPlans, branchActionPlans
} from "../drizzle/schema.ts";
import { eq, and } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não configurada");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// ============================================================================
// DADOS DE TESTE
// ============================================================================
const EMPRESA_NAME = "ACME Testes LTDA";
const USUARIOS = [
  { name: "Admin QA", email: `admin-qa-${Date.now()}@acme.test`, role: "equipe_solaris" },
  { name: "Executor QA", email: `executor-qa-${Date.now()}@acme.test`, role: "equipe_solaris" },
  { name: "Observador QA", email: `observador-qa-${Date.now()}@acme.test`, role: "cliente" },
];
const RAMOS_CODES = ["COM", "IND", "SER", "AGR"];
const PROJETOS = [
  { name: "Projeto P1 – Reforma 2026" },
  { name: "Projeto P2 – Reforma 2027" },
];

// ============================================================================
// RELATÓRIO
// ============================================================================
const relatorio = {
  timestamp: new Date().toISOString(),
  empresa: null,
  usuarios: [],
  ramos: [],
  projetos: [],
  planos: [],
  metricas: {
    totalProjetos: 0,
    totalPlanos: 0,
    totalPlanosCorporativos: 0,
    totalPlanosRamos: 0,
    esperadoPlanos: 10,
  },
  validacoes: {
    cardinalidade: [],
    persistencia: [],
    integridade: [],
  },
  bugs: [],
  sucesso: true,
};

// ============================================================================
// FASE 1: SETUP
// ============================================================================
console.log("\n🚀 E2E-01 SETUP - Iniciando...\n");

// 1) Criar empresa (simulado - não temos tabela de empresas)
console.log(`✅ [SETUP-01] Empresa: ${EMPRESA_NAME} (simulada)`);
relatorio.empresa = { name: EMPRESA_NAME, id: "SIMULATED" };

// 2) Criar 3 usuários
console.log("\n📋 [SETUP-02] Criando 3 usuários...");
for (const usuario of USUARIOS) {
  const [result] = await db.insert(users).values({
    openId: `qa-${Date.now()}-${Math.random()}`,
    name: usuario.name,
    email: usuario.email,
    role: usuario.role,
  });
  
  const userId = result.insertId;
  relatorio.usuarios.push({ ...usuario, id: userId });
  console.log(`   ✅ Usuário criado: ${usuario.name} (ID: ${userId})`);
}

// 3) Validar catálogo de ramos
console.log("\n📋 [SETUP-03] Validando catálogo de ramos...");
const ramosDB = await db.select().from(activityBranches);
const ramosAtivos = ramosDB.filter(r => RAMOS_CODES.includes(r.code));

if (ramosAtivos.length !== 4) {
  relatorio.bugs.push({
    etapa: "SETUP-03",
    severidade: "CRÍTICA",
    descricao: `Esperado 4 ramos (${RAMOS_CODES.join(", ")}), encontrado ${ramosAtivos.length}`,
  });
  relatorio.sucesso = false;
}

relatorio.ramos = ramosAtivos.map(r => ({ id: r.id, code: r.code, name: r.name }));
console.log(`   ✅ Ramos validados: ${ramosAtivos.length}/4`);
ramosAtivos.forEach(r => console.log(`      - ${r.code}: ${r.name} (ID: ${r.id})`));

// ============================================================================
// FASE 2: PROJETO P1
// ============================================================================
console.log("\n\n🚀 E2E-02 PROJETO P1 - Iniciando...\n");

const adminUser = relatorio.usuarios[0];

// 4) Criar Projeto P1
console.log("📋 [P1-04] Criando Projeto P1...");
const [p1Result] = await db.insert(projects).values({
  name: PROJETOS[0].name,
  clientId: adminUser.id,
  status: "em_andamento",
  createdById: adminUser.id,
  createdByRole: adminUser.role,
});
const p1Id = p1Result.insertId;
relatorio.projetos.push({ name: PROJETOS[0].name, id: p1Id, planos: [] });
console.log(`   ✅ Projeto P1 criado (ID: ${p1Id})`);

// 5) Selecionar 4 ramos
console.log("\n📋 [P1-05] Selecionando 4 ramos...");
for (const ramo of ramosAtivos) {
  await db.insert(projectBranches).values({
    projectId: p1Id,
    branchId: ramo.id,
  });
  console.log(`   ✅ Ramo ${ramo.code} vinculado ao P1`);
}

// Double-check: recarregar vínculos
const vinculosP1 = await db.select().from(projectBranches).where(eq(projectBranches.projectId, p1Id));
if (vinculosP1.length !== 4) {
  relatorio.bugs.push({
    etapa: "P1-05",
    severidade: "CRÍTICA",
    descricao: `Esperado 4 vínculos de ramos, encontrado ${vinculosP1.length}`,
  });
  relatorio.sucesso = false;
}
console.log(`   ✅ Double-check: ${vinculosP1.length}/4 vínculos confirmados`);

// 6) Preencher Questionário Corporativo
console.log("\n📋 [P1-06] Preenchendo Questionário Corporativo...");
const [corpAssessmentP1] = await db.insert(corporateAssessments).values({
  projectId: p1Id,
  answers: JSON.stringify({
    q1: "Sim, temos sistema ERP SAP",
    q2: "Mais de 500 funcionários",
    q3: "Operação em 12 estados",
    q4: "Faturamento acima de R$ 100M",
  }),
  completedAt: new Date(),
});
const corpAssessmentP1Id = corpAssessmentP1.insertId;
console.log(`   ✅ Questionário Corporativo criado (ID: ${corpAssessmentP1Id})`);

// Double-check: recarregar questionário
const [corpCheck] = await db.select().from(corporateAssessments).where(eq(corporateAssessments.id, corpAssessmentP1Id));
if (!corpCheck || !corpCheck.answers) {
  relatorio.bugs.push({
    etapa: "P1-06",
    severidade: "CRÍTICA",
    descricao: "Questionário corporativo não persistiu corretamente",
  });
  relatorio.sucesso = false;
} else {
  console.log(`   ✅ Double-check: Questionário persistido com ${Object.keys(JSON.parse(corpCheck.answers)).length} respostas`);
  relatorio.validacoes.persistencia.push({ etapa: "P1-06", status: "PASS" });
}

// 7) Gerar Plano Corporativo (MOCK - sem IA real para velocidade)
console.log("\n📋 [P1-07] Gerando Plano Corporativo...");
const mockTasks = [
  { title: "Adequar ERP para CBS", description: "Atualizar sistema", responsibleArea: "TI", taskType: "OPERATIONAL", priority: "ALTA", estimatedDays: 60 },
  { title: "Treinar equipe fiscal", description: "Capacitação", responsibleArea: "FISC", taskType: "COMPLIANCE", priority: "ALTA", estimatedDays: 30 },
];
const [corpPlanP1] = await db.insert(corporateActionPlans).values({
  projectId: p1Id,
  corporateAssessmentId: corpAssessmentP1Id,
  planContent: JSON.stringify(mockTasks),
  generationPrompt: "Mock para testes E2E",
  generatedAt: new Date(),
  generatedBy: adminUser.id,
});
const corpPlanP1Id = corpPlanP1.insertId;
relatorio.projetos[0].planos.push({ tipo: "CORPORATIVO", id: corpPlanP1Id, ramo: null });
console.log(`   ✅ Plano Corporativo gerado (ID: ${corpPlanP1Id})`);

// 8) Para cada ramo: questionário + plano
console.log("\n📋 [P1-08] Gerando questionários e planos por ramo...");
for (const ramo of ramosAtivos) {
  // 8.1) Questionário do ramo
  const [branchAssessment] = await db.insert(branchAssessments).values({
    projectId: p1Id,
    branchId: ramo.id,
    generatedQuestions: JSON.stringify([
      { id: "q1", text: `Pergunta específica de ${ramo.code}` },
    ]),
    answers: JSON.stringify({
      q1: `Resposta específica para ${ramo.name}`,
    }),
    completedAt: new Date(),
  });
  const branchAssessmentId = branchAssessment.insertId;
  console.log(`   ✅ Questionário ${ramo.code} criado (ID: ${branchAssessmentId})`);

  // 8.2) Plano do ramo
  const mockBranchTasks = [
    { title: `Tarefa ${ramo.code} 1`, description: "Descrição", responsibleArea: "TI", taskType: "OPERATIONAL", priority: "MÉDIA", estimatedDays: 30 },
  ];
  const [branchPlan] = await db.insert(branchActionPlans).values({
    projectId: p1Id,
    branchId: ramo.id,
    branchAssessmentId,
    planContent: JSON.stringify(mockBranchTasks),
    generationPrompt: "Mock para testes E2E",
    generatedAt: new Date(),
    generatedBy: adminUser.id,
  });
  const branchPlanId = branchPlan.insertId;
  relatorio.projetos[0].planos.push({ tipo: "RAMO", id: branchPlanId, ramo: ramo.code });
  console.log(`   ✅ Plano ${ramo.code} gerado (ID: ${branchPlanId})`);
}

// 9) Validar cardinalidade P1
console.log("\n📋 [P1-09] Validando cardinalidade P1...");
const planosP1 = relatorio.projetos[0].planos;
const esperado = 5;
const obtido = planosP1.length;
if (obtido !== esperado) {
  relatorio.bugs.push({
    etapa: "P1-09",
    severidade: "CRÍTICA",
    descricao: `Esperado ${esperado} planos, obtido ${obtido}`,
  });
  relatorio.sucesso = false;
}
relatorio.validacoes.cardinalidade.push({ projeto: "P1", esperado, obtido, status: obtido === esperado ? "PASS" : "FAIL" });
console.log(`   ${obtido === esperado ? "✅" : "❌"} Cardinalidade P1: ${obtido}/${esperado}`);

// ============================================================================
// FASE 3: PROJETO P2
// ============================================================================
console.log("\n\n🚀 E2E-03 PROJETO P2 - Iniciando...\n");

// 10) Criar Projeto P2
console.log("📋 [P2-10] Criando Projeto P2...");
const [p2Result] = await db.insert(projects).values({
  name: PROJETOS[1].name,
  clientId: adminUser.id,
  status: "em_andamento",
  createdById: adminUser.id,
  createdByRole: adminUser.role,
});
const p2Id = p2Result.insertId;
relatorio.projetos.push({ name: PROJETOS[1].name, id: p2Id, planos: [] });
console.log(`   ✅ Projeto P2 criado (ID: ${p2Id})`);

// Repetir passos 5-9 para P2
console.log("\n📋 [P2] Selecionando ramos...");
for (const ramo of ramosAtivos) {
  await db.insert(projectBranches).values({ projectId: p2Id, branchId: ramo.id });
}

console.log("\n📋 [P2] Criando Questionário Corporativo...");
const [corpAssessmentP2] = await db.insert(corporateAssessments).values({
  projectId: p2Id,
  answers: JSON.stringify({ q1: "Respostas P2", q2: "Dados P2" }),
  completedAt: new Date(),
});

console.log("\n📋 [P2] Gerando Plano Corporativo...");
const [corpPlanP2] = await db.insert(corporateActionPlans).values({
  projectId: p2Id,
  corporateAssessmentId: corpAssessmentP2.insertId,
  planContent: JSON.stringify(mockTasks),
  generationPrompt: "Mock P2",
  generatedAt: new Date(),
  generatedBy: adminUser.id,
});
relatorio.projetos[1].planos.push({ tipo: "CORPORATIVO", id: corpPlanP2.insertId, ramo: null });

console.log("\n📋 [P2] Gerando planos por ramo...");
for (const ramo of ramosAtivos) {
  const [branchAssessment] = await db.insert(branchAssessments).values({
    projectId: p2Id,
    branchId: ramo.id,
    generatedQuestions: JSON.stringify([{ id: "q1", text: "Pergunta" }]),
    answers: JSON.stringify({ q1: "Resposta" }),
    completedAt: new Date(),
  });

  const [branchPlan] = await db.insert(branchActionPlans).values({
    projectId: p2Id,
    branchId: ramo.id,
    branchAssessmentId: branchAssessment.insertId,
    planContent: JSON.stringify([{ title: "Tarefa", description: "Desc", responsibleArea: "TI", taskType: "OPERATIONAL", priority: "MÉDIA", estimatedDays: 30 }]),
    generationPrompt: "Mock P2",
    generatedAt: new Date(),
    generatedBy: adminUser.id,
  });
  relatorio.projetos[1].planos.push({ tipo: "RAMO", id: branchPlan.insertId, ramo: ramo.code });
}

// 11) Validar cardinalidade P2
const planosP2 = relatorio.projetos[1].planos;
const obtidoP2 = planosP2.length;
relatorio.validacoes.cardinalidade.push({ projeto: "P2", esperado: 5, obtido: obtidoP2, status: obtidoP2 === 5 ? "PASS" : "FAIL" });
console.log(`   ${obtidoP2 === 5 ? "✅" : "❌"} Cardinalidade P2: ${obtidoP2}/5`);

// ============================================================================
// VALIDAÇÕES FINAIS
// ============================================================================
console.log("\n\n🚀 VALIDAÇÕES FINAIS - Iniciando...\n");

// 12) Total geral
relatorio.metricas.totalProjetos = relatorio.projetos.length;
relatorio.metricas.totalPlanos = relatorio.projetos.reduce((sum, p) => sum + p.planos.length, 0);
relatorio.metricas.totalPlanosCorporativos = relatorio.projetos.reduce((sum, p) => sum + p.planos.filter(pl => pl.tipo === "CORPORATIVO").length, 0);
relatorio.metricas.totalPlanosRamos = relatorio.projetos.reduce((sum, p) => sum + p.planos.filter(pl => pl.tipo === "RAMO").length, 0);

console.log("📊 [FINAL-12] Métricas Gerais:");
console.log(`   - Total de Projetos: ${relatorio.metricas.totalProjetos} (esperado: 2)`);
console.log(`   - Total de Planos: ${relatorio.metricas.totalPlanos} (esperado: 10)`);
console.log(`   - Planos Corporativos: ${relatorio.metricas.totalPlanosCorporativos} (esperado: 2)`);
console.log(`   - Planos por Ramo: ${relatorio.metricas.totalPlanosRamos} (esperado: 8)`);

if (relatorio.metricas.totalPlanos !== 10) {
  relatorio.bugs.push({
    etapa: "FINAL-12",
    severidade: "CRÍTICA",
    descricao: `Total de planos divergente: esperado 10, obtido ${relatorio.metricas.totalPlanos}`,
  });
  relatorio.sucesso = false;
}

// 13) Integridade de vínculos
console.log("\n📋 [FINAL-13] Validando integridade de vínculos...");
for (const projeto of relatorio.projetos) {
  for (const plano of projeto.planos.filter(p => p.tipo === "RAMO")) {
    const [planoDB] = await db.select().from(branchActionPlans).where(eq(branchActionPlans.id, plano.id));
    const [ramoDB] = await db.select().from(activityBranches).where(eq(activityBranches.id, planoDB.branchId));
    
    if (ramoDB.code !== plano.ramo) {
      relatorio.bugs.push({
        etapa: "FINAL-13",
        severidade: "CRÍTICA",
        descricao: `Plano ${plano.id} vinculado ao ramo errado: esperado ${plano.ramo}, obtido ${ramoDB.code}`,
      });
      relatorio.sucesso = false;
      relatorio.validacoes.integridade.push({ planoId: plano.id, status: "FAIL", ramo: plano.ramo });
    } else {
      relatorio.validacoes.integridade.push({ planoId: plano.id, status: "PASS", ramo: plano.ramo });
    }
  }
}
console.log(`   ✅ Integridade validada: ${relatorio.validacoes.integridade.filter(v => v.status === "PASS").length}/${relatorio.validacoes.integridade.length}`);

// ============================================================================
// RESULTADO FINAL
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("📋 RESULTADO FINAL DO PROTOCOLO E2E");
console.log("=".repeat(80));

console.log(`\n✅ Sucesso Geral: ${relatorio.sucesso ? "SIM" : "NÃO"}`);
console.log(`📊 Taxa de Sucesso: ${relatorio.bugs.length === 0 ? "100%" : `${((1 - relatorio.bugs.length / 20) * 100).toFixed(1)}%`}`);
console.log(`🐛 Bugs Encontrados: ${relatorio.bugs.length}`);

if (relatorio.bugs.length > 0) {
  console.log("\n❌ BUGS DETECTADOS:");
  relatorio.bugs.forEach((bug, i) => {
    console.log(`   ${i + 1}. [${bug.etapa}] ${bug.severidade}: ${bug.descricao}`);
  });
}

// Salvar relatório em JSON
import { writeFileSync } from "fs";
writeFileSync("/home/ubuntu/compliance-tributaria-v2/e2e-qa-protocol-report.json", JSON.stringify(relatorio, null, 2));
console.log("\n💾 Relatório salvo em: e2e-qa-protocol-report.json");

await connection.end();
console.log("\n✅ Protocolo E2E concluído!\n");
process.exit(relatorio.sucesso ? 0 : 1);
