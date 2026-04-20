import { eq, desc, and, sql, ne, lt, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  users, InsertUser,
  projects, InsertProject,
  projectParticipants, InsertProjectParticipant,
  assessmentPhase1, InsertAssessmentPhase1,
  assessmentPhase2, InsertAssessmentPhase2,
  assessmentTemplates, InsertAssessmentTemplate,
  briefings, InsertBriefing,
  briefingVersions, InsertBriefingVersion,
  riskMatrix, InsertRiskMatrix,
  riskMatrixPromptHistory, InsertRiskMatrixPromptHistory,
  riskMatrixVersions, InsertRiskMatrixVersion,
  actionPlans, InsertActionPlan,
  actionPlanVersions, InsertActionPlanVersion,
  actionPlanPromptHistory, InsertActionPlanPromptHistory,
  actionPlanTemplates, InsertActionPlanTemplate,
  actions,
  InsertAction,
  phases, InsertPhase,
  notifications, InsertNotification,
  clientMembers, InsertClientMember,
  taskHistory, InsertTaskHistory, TaskHistory,
  solarisQuestions, InsertSolarisQuestion, SolarisQuestion,
  solarisAnswers, InsertSolarisAnswer, SolarisAnswer,
  iagenAnswers, InsertIagenAnswer, IagenAnswer,
  projectStatusLog, InsertProjectStatusLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// PREFILL CONTRACT — normalização canônica (Fase 2 da Sub-Sprint Estrutural)
// DA-2: A API nunca entrega string JSON ao frontend. O parsing é feito aqui.
// ============================================================================

/**
 * Parseia com segurança um campo JSON que pode chegar como:
 * - objeto JavaScript (já parseado pelo Drizzle) → retorna como está
 * - string JSON serializada (MySQL2 sem typeCast) → parseia
 * - null/undefined → retorna fallback
 */
export function safeParseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; }
    catch { return fallback; }
  }
  return fallback;
}

/**
 * Normaliza o objeto projeto retornado pelo banco.
 * Garante que todos os campos JSON chegam ao frontend como objetos tipados.
 * Deve ser aplicado em TODOS os pontos de retorno de projeto ao frontend.
 */
export function normalizeProject<T extends Record<string, any>>(raw: T): T {
  if (!raw) return raw;
  return {
    ...raw,
    companyProfile:     safeParseJson(raw.companyProfile, null),
    operationProfile:   safeParseJson(raw.operationProfile, null),
    financialProfile:   safeParseJson(raw.financialProfile, null),
    governanceProfile:  safeParseJson(raw.governanceProfile, null),
    taxComplexity:      safeParseJson(raw.taxComplexity, null),
    confirmedCnaes:     safeParseJson(raw.confirmedCnaes, []),
    corporateAnswers:   safeParseJson(raw.corporateAnswers, null),
    operationalAnswers: safeParseJson(raw.operationalAnswers, null),
    cnaeAnswers:        safeParseJson(raw.cnaeAnswers, null),
    stepHistory:        safeParseJson(raw.stepHistory, []),
    diagnosticStatus:   safeParseJson(raw.diagnosticStatus, null),
    profileIntelligenceData: safeParseJson(raw.profileIntelligenceData, null),
    briefingStructured: safeParseJson(raw.briefingStructured, null),
    scoringData:        safeParseJson(raw.scoringData, null),
    decisaoData:        safeParseJson(raw.decisaoData, null),
    riskMatricesData:   safeParseJson(raw.riskMatricesData, null),
    actionPlansData:    safeParseJson(raw.actionPlansData, null),
    questionnaireAnswers: safeParseJson(raw.questionnaireAnswers, null),
  } as T;
}

// ============================================================================
// USERS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const fields = ["name", "email", "loginMethod", "companyName", "cnpj", "cpf", "segment", "phone", "observations"] as const;
    
    fields.forEach(field => {
      const value = user[field];
      if (value !== undefined) {
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      }
    });

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'equipe_solaris';
      updateSet.role = 'equipe_solaris';
    }

    // lastSignedIn apenas no update, no insert usa defaultNow() do schema
    updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUsersByRole(role: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).where(eq(users.role, role as any)).orderBy(desc(users.createdAt));
}

export async function createUser(userData: Omit<InsertUser, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values(userData) as any;
  return result[0].insertId;
}

// ============================================================================
// PROJECTS
// ============================================================================

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log('[createProject] Input data (JSON):', JSON.stringify(data, null, 2));
  const result = await db.insert(projects).values(data) as any;
  console.log('[createProject] Insert result:', result);
  const insertId = Array.isArray(result) ? result[0]?.insertId : (result as any).insertId;
  console.log('[createProject] insertId:', insertId);
  const projectId = Number(insertId);
  console.log('[createProject] Final projectId:', projectId);
   return projectId;
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  // DA-2: normalização canônica — garante que todos os campos JSON chegam como objetos
  return result[0] ? normalizeProject(result[0]) : undefined;
}

// ─── K-4-E: Auditoria jurídica de transições de status ───────────────────────
/**
 * Insere um registro de auditoria na tabela project_status_log.
 * NUNCA lança exceção — log é auditoria, não é transação crítica.
 * Se falhar, registra no console.error e retorna silenciosamente.
 *
 * @param projectId - ID do projeto
 * @param fromStatus - Status anterior (null na criação do projeto)
 * @param toStatus - Novo status
 * @param changedBy - ID do usuário (string) ou constante "system" — nunca undefined
 * @param reason - Motivo opcional da transição
 */
export async function insertStatusLog(
  projectId: number,
  fromStatus: string | null,
  toStatus: string,
  changedBy: string,
  reason?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[insertStatusLog] Database not available — log não registrado');
      return;
    }
    await db.insert(projectStatusLog).values({
      projectId,
      fromStatus: fromStatus ?? null,
      toStatus,
      changedBy,
      reason: reason ?? null,
    });
  } catch (err) {
    // Log é auditoria — nunca propaga erro para não bloquear a operação principal
    console.error('[insertStatusLog] Falha ao registrar auditoria:', err);
  }
}

export async function getProjectsByUser(userId: number, userRole: string) {
  const db = await getDb();
  if (!db) return [];
  let rows;
  if (userRole === "equipe_solaris" || userRole === "advogado_senior") {
    rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  } else {
    const participantProjects = await db
      .select({ projectId: projectParticipants.projectId })
      .from(projectParticipants)
      .where(eq(projectParticipants.userId, userId));
    const projectIds = participantProjects.map(p => p.projectId);
    if (projectIds.length === 0) {
      rows = await db.select().from(projects).where(eq(projects.clientId, userId)).orderBy(desc(projects.createdAt));
    } else {
      rows = await db
        .select()
        .from(projects)
        .where(
          sql`${projects.clientId} = ${userId} OR ${projects.id} IN (${projectIds.join(',')})`
        )
        .orderBy(desc(projects.createdAt));
    }
  }
  // DA-2: normalização canônica em todas as listagens
  return rows.map(normalizeProject);
}

/**
 * fix(#760): listagem paginada com busca + filtro por status.
 *
 * Motivação: /projetos carregava 4307+ projetos via SELECT *, risco de timeout/500.
 * Esta versão respeita limite, aplica filtros servidor-side e retorna meta (total, hasMore).
 *
 * Regras TiDB (CLAUDE.md):
 *   - LIMIT/OFFSET: Drizzle .limit()/.offset() interpola seguro (não usa binding)
 *   - search: case-insensitive (TiDB utf8mb4_unicode_ci já é case-insensitive por default)
 */
export async function getProjectsByUserPaginated(
  userId: number,
  userRole: string,
  opts: {
    limit: number;
    offset: number;
    search?: string;
    statusFilter?: string;
  }
): Promise<{ projects: any[]; total: number; hasMore: boolean }> {
  const db = await getDb();
  if (!db) return { projects: [], total: 0, hasMore: false };

  const limit = Math.max(1, Math.min(100, opts.limit));
  const offset = Math.max(0, opts.offset);

  // Filtros adicionais (aplicados em cima do filtro de acesso)
  const extraFilters: any[] = [];
  if (opts.search && opts.search.trim().length > 0) {
    extraFilters.push(like(projects.name, `%${opts.search.trim()}%`));
  }
  if (opts.statusFilter && opts.statusFilter !== "todos") {
    extraFilters.push(eq(projects.status, opts.statusFilter as any));
  }

  // ── Construção da cláusula WHERE respeitando o papel do usuário ──
  let baseCondition: any;

  if (userRole === "equipe_solaris" || userRole === "advogado_senior") {
    // Equipe vê tudo — sem filtro de acesso
    baseCondition = undefined;
  } else {
    // Cliente vê apenas seus projetos (owner ou participante)
    const participantProjects = await db
      .select({ projectId: projectParticipants.projectId })
      .from(projectParticipants)
      .where(eq(projectParticipants.userId, userId));
    const projectIds = participantProjects.map(p => p.projectId);

    if (projectIds.length === 0) {
      baseCondition = eq(projects.clientId, userId);
    } else {
      baseCondition = sql`${projects.clientId} = ${userId} OR ${projects.id} IN (${sql.raw(projectIds.join(','))})`;
    }
  }

  const whereClause = extraFilters.length > 0
    ? (baseCondition ? and(baseCondition, ...extraFilters) : and(...extraFilters))
    : baseCondition;

  // COUNT(*) total — uma query
  const totalQuery = whereClause
    ? db.select({ count: sql<number>`COUNT(*)` }).from(projects).where(whereClause)
    : db.select({ count: sql<number>`COUNT(*)` }).from(projects);
  const [totalResult] = await totalQuery;
  const total = Number((totalResult as any)?.count ?? 0);

  // Página atual
  const pageQuery = whereClause
    ? db.select().from(projects).where(whereClause)
    : db.select().from(projects);
  const rows = await pageQuery
    .orderBy(desc(projects.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    projects: rows.map(normalizeProject),
    total,
    hasMore: offset + rows.length < total,
  };
}

export async function updateProject(projectId: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects).set(data).where(eq(projects.id, projectId));
}

export async function isUserInProject(userId: number, projectId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const project = await getProjectById(projectId);
  if (project && project.clientId === userId) return true;

  const result = await db
    .select()
    .from(projectParticipants)
    .where(and(
      eq(projectParticipants.projectId, projectId),
      eq(projectParticipants.userId, userId)
    ))
    .limit(1);

  return result.length > 0;
}

// ============================================================================
// ASSESSMENT PHASE 1
// ============================================================================

export async function saveAssessmentPhase1(data: InsertAssessmentPhase1) {
  console.log('\n========== [saveAssessmentPhase1] INICIANDO SALVAMENTO ==========')
  console.log('[saveAssessmentPhase1] Dados recebidos (RAW):', JSON.stringify(data, null, 2));
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // CRITICAL FIX V2: Construir objeto APENAS com campos permitidos
  // Drizzle ORM ignora destructuring e usa schema original, então precisamos
  // construir um novo objeto explicitamente SEM os campos completed*
  const cleanData: any = {
    projectId: data.projectId,
    taxRegime: data.taxRegime,
    companySize: data.companySize,
    annualRevenue: data.annualRevenue,
    businessSector: data.businessSector,
    mainActivity: data.mainActivity,
    employeeCount: data.employeeCount,
    hasAccountingDept: data.hasAccountingDept,
    currentERPSystem: data.currentERPSystem,
    mainChallenges: data.mainChallenges,
    complianceGoals: data.complianceGoals,
  };
  
  // Remover campos undefined
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });
  
  console.log('[saveAssessmentPhase1] Dados LIMPOS (sem completed* e undefined):', JSON.stringify(cleanData, null, 2));
  console.log('[saveAssessmentPhase1] Número de campos antes:', Object.keys(data).length);
  console.log('[saveAssessmentPhase1] Número de campos depois:', Object.keys(cleanData).length);

  const existing = await db
    .select()
    .from(assessmentPhase1)
    .where(eq(assessmentPhase1.projectId, data.projectId))
    .limit(1);

  console.log('[saveAssessmentPhase1] Registro existente:', existing.length > 0 ? 'SIM' : 'NÃO');

  if (existing.length > 0) {
    console.log('[saveAssessmentPhase1] Atualizando registro existente...');
    await db.update(assessmentPhase1).set(cleanData).where(eq(assessmentPhase1.projectId, data.projectId));
    console.log('[saveAssessmentPhase1] Atualização concluída');
  } else {
    console.log('[saveAssessmentPhase1] Inserindo novo registro...');
    
    // CRITICAL FIX V3: Forçar tipo 'any' para evitar que Drizzle inclua campos do schema
    // @ts-ignore - Ignorar erro de tipo para permitir INSERT apenas com campos selecionados
    await db.insert(assessmentPhase1).values(cleanData as any);
    console.log('[saveAssessmentPhase1] Inserção concluída');
  }
}

export async function getAssessmentPhase1(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(assessmentPhase1).where(eq(assessmentPhase1.projectId, projectId)).limit(1);
  return result[0];
}

// ============================================================================
// ASSESSMENT PHASE 2
// ============================================================================

export async function saveAssessmentPhase2(data: InsertAssessmentPhase2) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Garantir que generatedQuestions nunca seja null/undefined
  const safeData = {
    ...data,
    generatedQuestions: data.generatedQuestions || "[]"
  };

  const existing = await db
    .select()
    .from(assessmentPhase2)
    .where(eq(assessmentPhase2.projectId, data.projectId))
    .limit(1);

  if (existing.length > 0) {
    await db.update(assessmentPhase2).set(safeData).where(eq(assessmentPhase2.projectId, data.projectId));
  } else {
    await db.insert(assessmentPhase2).values(safeData);
  }
}

export async function getAssessmentPhase2(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(assessmentPhase2).where(eq(assessmentPhase2.projectId, projectId)).limit(1);
  return result[0];
}

export async function findCompatibleTemplate(taxRegime: string, businessType: string | null, companySize: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(assessmentTemplates)
    .where(eq(assessmentTemplates.taxRegime, taxRegime as any))
    .limit(10);

  const filtered = result.filter(t => {
    if (t.businessType && t.businessType !== businessType) return false;
    if (t.companySize && t.companySize !== companySize) return false;
    return true;
  });

  return filtered[0];
}

// ============================================================================
// BRIEFING
// ============================================================================

export async function saveBriefing(data: InsertBriefing) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(briefings).where(eq(briefings.projectId, data.projectId)).limit(1);

  if (existing.length > 0) {
    // Arquivar versão anterior antes de atualizar
    const oldBriefing = existing[0];
    await db.insert(briefingVersions).values({
      projectId: oldBriefing.projectId,
      briefingId: oldBriefing.id,
      summaryText: oldBriefing.summaryText,
      gapsAnalysis: oldBriefing.gapsAnalysis,
      riskLevel: oldBriefing.riskLevel,
      priorityAreas: oldBriefing.priorityAreas,
      version: oldBriefing.version,
      generatedAt: oldBriefing.generatedAt,
      generatedBy: oldBriefing.generatedBy,
    });

    // Incrementar versão e atualizar
    await db.update(briefings).set({
      ...data,
      version: oldBriefing.version + 1,
    }).where(eq(briefings.projectId, data.projectId));
  } else {
    await db.insert(briefings).values(data);
  }
}

export async function getBriefingVersions(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(briefingVersions)
    .where(eq(briefingVersions.projectId, projectId))
    .orderBy(desc(briefingVersions.version));
  return result;
}

export async function getBriefingVersion(projectId: number, version: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(briefingVersions)
    .where(and(
      eq(briefingVersions.projectId, projectId),
      eq(briefingVersions.version, version)
    ))
    .limit(1);
  return result[0];
}

export async function getBriefing(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(briefings).where(eq(briefings.projectId, projectId)).limit(1);
  return result[0];
}

// ============================================================================
// RISK MATRIX
// ============================================================================

export async function saveRiskMatrix(risks: InsertRiskMatrix[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (risks.length === 0) return;

  await db.insert(riskMatrix).values(risks);
}

export async function getRiskMatrix(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(riskMatrix).where(eq(riskMatrix.projectId, projectId));
}

export async function saveRiskPromptHistory(data: InsertRiskMatrixPromptHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(riskMatrixPromptHistory).values(data);
}

// Funções simplificadas para Matriz de Riscos
export async function createRisk(data: { projectId: number; title: string; description: string; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(riskMatrix).values({
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    createdBy: data.createdBy,
    generatedByAI: false,
  });

  return Number(result.insertId);
}

export async function getRiskById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [risk] = await db.select().from(riskMatrix).where(eq(riskMatrix.id, id));
  return risk || null;
}

export async function deleteRisk(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(riskMatrix).where(eq(riskMatrix.id, id));
}

export async function deleteRisksByProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(riskMatrix).where(eq(riskMatrix.projectId, projectId));
}

// ============================================================================
// RISK MATRIX VERSIONS
// ============================================================================

export async function saveRiskMatrixVersion(data: {
  projectId: number;
  versionNumber: number;
  snapshotData: string; // JSON string
  riskCount: number;
  createdBy: number;
  createdByName: string;
  triggerType: "auto_generation" | "manual_regeneration" | "prompt_edit";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(riskMatrixVersions).values(data);
}

export async function getRiskMatrixVersions(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(riskMatrixVersions)
    .where(eq(riskMatrixVersions.projectId, projectId))
    .orderBy(desc(riskMatrixVersions.versionNumber));
}

export async function getLatestVersionNumber(projectId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [latest] = await db
    .select({ versionNumber: riskMatrixVersions.versionNumber })
    .from(riskMatrixVersions)
    .where(eq(riskMatrixVersions.projectId, projectId))
    .orderBy(desc(riskMatrixVersions.versionNumber))
    .limit(1);

  return latest?.versionNumber || 0;
}

export async function getRiskMatrixVersion(projectId: number, versionNumber: number) {
  const db = await getDb();
  if (!db) return null;

  const [version] = await db
    .select()
    .from(riskMatrixVersions)
    .where(
      and(
        eq(riskMatrixVersions.projectId, projectId),
        eq(riskMatrixVersions.versionNumber, versionNumber)
      )
    );

  return version || null;
}

export async function getAllRisks(userId: number, userRole: string) {
  const db = await getDb();
  if (!db) return [];

  // Equipe SOLARIS e Advogado Sênior vêem todos os riscos
  if (userRole === "equipe_solaris" || userRole === "advogado_senior") {
    return await db
      .select({
        id: riskMatrix.id,
        projectId: riskMatrix.projectId,
        projectName: projects.name,
        title: riskMatrix.title,
        description: riskMatrix.description,
        generatedByAI: riskMatrix.generatedByAI,
        createdAt: riskMatrix.createdAt,
      })
      .from(riskMatrix)
      .leftJoin(projects, eq(riskMatrix.projectId, projects.id))
      .orderBy(desc(riskMatrix.createdAt));
  }

  // Clientes veem apenas riscos dos projetos que participam
  return await db
    .select({
      id: riskMatrix.id,
      projectId: riskMatrix.projectId,
      projectName: projects.name,
      title: riskMatrix.title,
      description: riskMatrix.description,
      generatedByAI: riskMatrix.generatedByAI,
      createdAt: riskMatrix.createdAt,
    })
    .from(riskMatrix)
    .leftJoin(projects, eq(riskMatrix.projectId, projects.id))
    .leftJoin(projectParticipants, eq(projects.id, projectParticipants.projectId))
    .where(eq(projectParticipants.userId, userId))
    .orderBy(desc(riskMatrix.createdAt));
}

// ============================================================================
// ACTION PLAN
// ============================================================================

export async function saveActionPlan(data: InsertActionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se já existe um plano para este projeto
  const existing = await db.select().from(actionPlans)
    .where(eq(actionPlans.projectId, data.projectId))
    .orderBy(desc(actionPlans.version))
    .limit(1);

  if (existing.length > 0) {
    // Arquivar versão anterior antes de criar nova
    const oldPlan = existing[0];
    await db.insert(actionPlanVersions).values({
      projectId: oldPlan.projectId,
      actionPlanId: oldPlan.id,
      planData: oldPlan.planData,
      version: oldPlan.version,
      templateId: oldPlan.templateId,
      generatedAt: oldPlan.generatedAt,
      generatedBy: oldPlan.generatedBy,
      generatedByAI: oldPlan.generatedByAI,
      status: oldPlan.status,
      approvedAt: oldPlan.approvedAt,
      approvedBy: oldPlan.approvedBy,
      rejectionReason: oldPlan.rejectionReason,
    });

    // Criar nova versão com número incrementado
    const result = await db.insert(actionPlans).values({
      ...data,
      version: oldPlan.version + 1,
    }) as any;
    return Number(result.insertId);
  } else {
    // Primeira versão
    const result = await db.insert(actionPlans).values(data) as any;
    return Number(result.insertId);
  }
}

export async function getActionPlanVersions(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(actionPlanVersions)
    .where(eq(actionPlanVersions.projectId, projectId))
    .orderBy(desc(actionPlanVersions.version));
  return result;
}

export async function getActionPlanVersion(projectId: number, version: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(actionPlanVersions)
    .where(and(
      eq(actionPlanVersions.projectId, projectId),
      eq(actionPlanVersions.version, version)
    ))
    .limit(1);
  return result[0];
}

export async function getActionPlan(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(actionPlans)
    .where(eq(actionPlans.projectId, projectId))
    .orderBy(desc(actionPlans.version))
    .limit(1);

  return result[0];
}

export async function updateActionPlanStatus(planId: number, status: string, approvedBy?: number, rejectionReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  
  if (status === "aprovado") {
    updateData.approvedAt = new Date();
    updateData.approvedBy = approvedBy;
  } else if (status === "reprovado") {
    updateData.rejectionReason = rejectionReason;
  }

  await db.update(actionPlans).set(updateData).where(eq(actionPlans.id, planId));
}

export async function saveActionPlanPromptHistory(data: InsertActionPlanPromptHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(actionPlanPromptHistory).values(data);
}

// ============================================================================
// TASKS
// ============================================================================

export async function createTask(data: InsertAction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(actions).values(data);
  return Number(result[0].insertId);
}

export async function getTasksByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(actions)
    .where(eq(actions.projectId, projectId))
    .orderBy(actions.createdAt);

  return result;
}

export async function updateTaskStatus(taskId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  
  if (status === "concluido") {
    updateData.completedAt = new Date();
  }

  await db.update(actions).set(updateData).where(eq(actions.id, taskId));
}

export async function updateTask(taskId: number, data: Partial<InsertAction>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(actions).set(data).where(eq(actions.id, taskId));
}

export async function deleteTask(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(actions).where(eq(actions.id, taskId));
}

// ============================================================================
// PHASES
// ============================================================================

export async function createPhase(data: InsertPhase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(phases).values(data) as any;
  return Number(result.insertId);
}

export async function getPhasesByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(phases)
    .where(eq(phases.projectId, projectId))
    .orderBy(phases.createdAt);

  return result;
}

// ============================================================================
// ACTION PLAN TEMPLATES
// ============================================================================

export async function createActionPlanTemplate(data: InsertActionPlanTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(actionPlanTemplates).values(data) as any;
  return Number(result.insertId);
}

export async function getAllActionPlanTemplates() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(actionPlanTemplates)
    .orderBy(desc(actionPlanTemplates.usageCount), desc(actionPlanTemplates.createdAt));

  return result;
}

export async function getActionPlanTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(actionPlanTemplates)
    .where(eq(actionPlanTemplates.id, id))
    .limit(1);

  return result[0];
}

export async function deleteActionPlanTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(actionPlanTemplates).where(eq(actionPlanTemplates.id, id));
}

export async function incrementTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const template = await getActionPlanTemplateById(id);
  if (!template) return;

  await db
    .update(actionPlanTemplates)
    .set({ usageCount: (template.usageCount || 0) + 1 })
    .where(eq(actionPlanTemplates.id, id));
}

export async function updateActionPlanTemplate(id: number, data: Partial<InsertActionPlanTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(actionPlanTemplates)
    .set(data)
    .where(eq(actionPlanTemplates.id, id));
}

export async function searchActionPlanTemplates(filters: {
  taxRegime?: string;
  businessType?: string;
  companySize?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(actionPlanTemplates);

  const conditions = [];
  if (filters.taxRegime) {
    conditions.push(eq(actionPlanTemplates.taxRegime, filters.taxRegime as any));
  }
  if (filters.businessType) {
    conditions.push(eq(actionPlanTemplates.businessType, filters.businessType));
  }
  if (filters.companySize) {
    conditions.push(eq(actionPlanTemplates.companySize, filters.companySize as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query.orderBy(desc(actionPlanTemplates.usageCount));
  return result;
}


// ============================================================================
// DASHBOARD
// ============================================================================

export async function getDashboardKPIs(projectId: number) {
  const db = await getDb();
  if (!db) return null;

  // Total de tarefas
  const allTasks = await db
    .select()
    .from(actions)
    .where(eq(actions.projectId, projectId));

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === "COMPLETED").length;
  const overdueTasks = allTasks.filter(t => 
    t.deadline && new Date(t.deadline) < new Date() && t.status !== "COMPLETED"
  ).length;

  // Taxa de conclusão
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Riscos
  const allRisks = await db
    .select()
    .from(riskMatrix)
    .where(eq(riskMatrix.projectId, projectId));

  const totalRisks = allRisks.length;
  // mitigationStatus field doesn't exist in schema yet
  const mitigatedRisks = 0; // allRisks.filter(r => r.mitigationStatus === "mitigado").length;

  return {
    totalTasks,
    completedTasks,
    overdueTasks,
    completionRate: Math.round(completionRate * 10) / 10,
    totalRisks,
    mitigatedRisks,
  };
}

export async function getTaskDistribution(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const allTasks = await db
    .select()
    .from(actions)
    .where(eq(actions.projectId, projectId));

  const distribution = {
    SUGGESTED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    OVERDUE: 0,
  };

  allTasks.forEach(task => {
    distribution[task.status]++;
  });

  return Object.entries(distribution).map(([status, count]) => ({
    status,
    count,
  }));
}

export async function getRiskDistribution(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const allRisks = await db
    .select()
    .from(riskMatrix)
    .where(eq(riskMatrix.projectId, projectId));

  const distribution: Record<string, number> = {};

  allRisks.forEach(risk => {
    // cosoComponent field doesn't exist in schema yet
    const component = "outros"; // risk.cosoComponent || "outros";
    distribution[component] = (distribution[component] || 0) + 1;
  });

  return Object.entries(distribution).map(([component, count]) => ({
    component,
    count,
  }));
}

export async function getOverdueTasks(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  
  const overdue = await db
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.projectId, projectId),
        ne(actions.status, "COMPLETED")
      )
    );

  return overdue.filter(task => task.deadline && new Date(task.deadline) < now);
}


// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function getNotificationsByUser(userId: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(notifications.recipientId, userId)];
  if (projectId) {
    conditions.push(eq(notifications.projectId, projectId));
  }

  const result = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.sentAt));
  
  return result;
}

export async function createNotification(data: {
  projectId: number;
  recipientId: number;
  type: string;
  title: string;
  message: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values({
    projectId: data.projectId,
    recipientId: data.recipientId,
    type: data.type as any,
    subject: data.title,
    message: data.message,
  });

  return Number(result[0].insertId);
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));
  return true;
}

// ─── Client Members (RF-1.03 / RF-5.17) ────────────────────────────────────
export async function getClientMembers(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(clientMembers).where(eq(clientMembers.clientId, clientId)).orderBy(desc(clientMembers.invitedAt));
}

export async function addClientMember(data: Omit<InsertClientMember, 'id' | 'invitedAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clientMembers).values(data);
  return Number(result[0].insertId);
}

export async function updateClientMember(id: number, data: Partial<Pick<InsertClientMember, 'name' | 'email' | 'memberRole' | 'active'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clientMembers).set(data).where(eq(clientMembers.id, id));
  return true;
}

export async function removeClientMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clientMembers).where(eq(clientMembers.id, id));
  return true;
}

// ─── Task History (RF-HIST) ──────────────────────────────────────────────────
export async function insertTaskHistory(data: Omit<InsertTaskHistory, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(taskHistory).values(data);
  return Number(result[0].insertId);
}

export async function getTaskHistory(taskId: string, projectId: number): Promise<TaskHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(taskHistory)
    .where(and(eq(taskHistory.taskId, taskId), eq(taskHistory.projectId, projectId)))
    .orderBy(desc(taskHistory.createdAt));
}

export async function getProjectTaskHistory(projectId: number, limit = 50): Promise<TaskHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(taskHistory)
    .where(eq(taskHistory.projectId, projectId))
    .orderBy(desc(taskHistory.createdAt))
    .limit(limit);
}

// ============================================================================
// SOLARIS QUESTIONS — Sprint K / K-1 (Onda 1 — curadoria manual)
// ============================================================================

/**
 * Insere uma pergunta de curadoria SOLARIS no banco.
 * Retorna o id gerado.
 */
export async function createSolarisQuestion(
  data: Omit<InsertSolarisQuestion, "id">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = (await db.insert(solarisQuestions).values(data)) as any;
  return Number(result[0].insertId);
}

/**
 * Retorna todas as perguntas ativas de curadoria SOLARIS.
 * Opcionalmente filtra por cnaePrefix (ex: "11" ou "1113-5").
 *
 * Regra de filtro:
 *   - cnaeGroups = null → pergunta universal (retorna sempre)
 *   - cnaeGroups contém cnaePrefix → retorna
 *   - cnaeGroups não contém cnaePrefix → não retorna
 */
export async function getSolarisQuestions(cnaePrefix?: string): Promise<SolarisQuestion[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(solarisQuestions)
    .where(eq(solarisQuestions.ativo, 1))
    .orderBy(solarisQuestions.id);

  if (!cnaePrefix) return rows;

  return rows.filter((q) => {
    if (q.cnaeGroups === null || q.cnaeGroups === undefined) return true; // universal
    const groups = safeParseJson<string[]>(q.cnaeGroups, []);
    return groups.some((g) => cnaePrefix.startsWith(g) || g.startsWith(cnaePrefix));
  });
}

/**
 * Retorna uma pergunta pelo id.
 */
export async function getSolarisQuestionById(id: number): Promise<SolarisQuestion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(solarisQuestions)
    .where(eq(solarisQuestions.id, id))
    .limit(1);
  return result[0];
}

/**
 * Atualiza campos de uma pergunta existente.
 * Apenas campos fornecidos são alterados (partial update).
 */
export async function updateSolarisQuestion(
  id: number,
  data: Partial<Pick<InsertSolarisQuestion, "texto" | "categoria" | "cnaeGroups" | "obrigatorio" | "ativo" | "observacao" | "atualizadoEm">>
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(solarisQuestions).set(data).where(eq(solarisQuestions.id, id));
  return true;
}

/**
 * Soft-delete: marca a pergunta como inativa (ativo = 0).
 */
export async function deactivateSolarisQuestion(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(solarisQuestions)
    .set({ ativo: 0, atualizadoEm: Date.now() })
    .where(eq(solarisQuestions.id, id));
  return true;
}

/**
 * Insere múltiplas perguntas em lote (CSV upload).
 * Retorna o número de registros inseridos.
 */
export async function bulkCreateSolarisQuestions(
  rows: Omit<InsertSolarisQuestion, "id">[]
): Promise<number> {
  if (rows.length === 0) return 0;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(solarisQuestions).values(rows);
  return rows.length;
}

// ============================================================================
// SOLARIS ANSWERS — K-4-B (Onda 1)
// ============================================================================

/**
 * Busca perguntas SOLARIS ativas, opcionalmente filtradas por prefixo de CNAE.
 * Retorna as 12 perguntas SOL-001..SOL-012 (ou subconjunto por CNAE).
 */
export async function getOnda1Questions(cnaeCode?: string): Promise<SolarisQuestion[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(solarisQuestions)
    .where(eq(solarisQuestions.ativo, 1))
    .orderBy(solarisQuestions.id);

  return rows;
}

/**
 * Salva as respostas da Onda 1 (SOLARIS) para um projeto.
 * Usa INSERT ... ON DUPLICATE KEY UPDATE para idempotência.
 */
export async function saveOnda1Answers(
  projectId: number,
  answers: Array<{ questionId: number; codigo: string; resposta: string }>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = Date.now();

  // Salvar em lote — upsert por (projectId, questionId)
  for (const a of answers) {
    const row: InsertSolarisAnswer = {
      projectId,
      questionId: a.questionId,
      codigo: a.codigo,
      resposta: a.resposta,
      fonte: 'solaris',
      createdAt: now,
      updatedAt: now,
    };
    await db
      .insert(solarisAnswers)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          resposta: a.resposta,
          updatedAt: now,
        },
      });
  }
}

/**
 * Busca as respostas da Onda 1 já salvas para um projeto.
 */
export async function getOnda1Answers(projectId: number): Promise<SolarisAnswer[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(solarisAnswers)
    .where(eq(solarisAnswers.projectId, projectId))
    .orderBy(solarisAnswers.questionId);
}

/**
 * Conta quantas respostas da Onda 1 existem para um projeto.
 */
export async function countOnda1Answers(projectId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(solarisAnswers)
    .where(eq(solarisAnswers.projectId, projectId));

  return Number(result[0]?.count ?? 0);
}

// ─── Sprint K — K-4-C: Funções de iagen_answers (Onda 2) ─────────────────────

/**
 * Salva as respostas da Onda 2 (IA Generativa) para um projeto.
 * Cada item = uma resposta a uma pergunta gerada dinamicamente pela IA.
 */
export async function saveOnda2Answers(
  projectId: number,
  answers: Array<{
    questionText: string;
    resposta: string;
    confidenceScore: number;
    risk_category_code?: string | null;
    used_profile_fields?: string[];
    prompt_version?: string;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = Date.now();
  const rows: InsertIagenAnswer[] = answers.map((a) => ({
    projectId,
    questionText: a.questionText,
    resposta: a.resposta,
    confidenceScore: String(a.confidenceScore),
    fonte: "ia_gen",
    createdAt: now,
    updatedAt: now,
    riskCategoryCode: a.risk_category_code ?? null,
    categoryAssignmentMode: a.risk_category_code ? ("llm_assigned" as const) : null,
    usedProfileFields: a.used_profile_fields ?? null,
    promptVersion: a.prompt_version ?? null,
  }));
  if (rows.length > 0) {
    await db.insert(iagenAnswers).values(rows);
  }
}

/**
 * Busca as respostas da Onda 2 já salvas para um projeto.
 */
export async function getOnda2Answers(projectId: number): Promise<IagenAnswer[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(iagenAnswers)
    .where(eq(iagenAnswers.projectId, projectId));
}

/**
 * Conta quantas respostas da Onda 2 existem para um projeto.
 */
export async function countOnda2Answers(projectId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(iagenAnswers)
    .where(eq(iagenAnswers.projectId, projectId));
  return Number(result[0]?.count ?? 0);
}
