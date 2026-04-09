# Varredura de Consumers — Engine de Riscos
**Gerado em:** 2026-04-09 | **HEAD:** 3e7fded | **Prompt:** PROMPT_MANUS_CONSUMERS.md

---

## BLOCO 1 — Arquivo do Engine de Riscos

### Arquivos que contêm generateRiskMatrices / RiskMatrix / buildRisk
```
server/bug001-regression.test.ts
server/db.ts
server/diagnostic-consolidator.ts
server/diagnostic-shadow.test.ts
server/diagnostic-shadow/logger.ts
server/diagnostic-shadow/readers.ts
server/diagnostic-shadow/shadow.ts
server/diagnostic-shadow/types.ts
server/diagnostic-source.ts
server/dt01-db-push.test.ts
server/flowStateMachine.test.ts
server/flowStateMachine.ts
server/integration/audit-e2e-fluxo-v3.test.ts
server/integration/bugs-pos-conclusao.test.ts
server/integration/connection-manifest.test.ts
server/integration/diagnostic-integration.test.ts
server/integration/diagnostic-source.test.ts
server/integration/e2e-fluxo-completo.test.ts
server/integration/e2e-projects.test.ts
server/integration/fullFlow.e2e.test.ts
server/integration/onda1-t01-t05.test.ts
server/integration/onda1-t06-t10.test.ts
server/integration/onda2-t14-retrocesso.test.ts
server/integration/riskMatrix.generate.test.ts
server/integration/riskMatrix.generate.v2.test.ts
server/integration/riskMatrix.versions.test.ts
server/integration/routers-fluxo-v3-etapas2-5.test.ts
server/integration/sprint-v59-fluxo-v3-ai.test.ts
server/integration/sprint-v60-v63-e2e.test.ts
server/integration/sprint-v64-v65-e2e.test.ts
server/projeto-detalhes-v2.test.ts
server/retrocesso-cleanup.test.ts
server/retrocesso-cleanup.ts
server/retrocesso-endpoint.test.ts
server/riskMatrix.test.ts
server/routers-compliance-v3.ts
server/routers-fluxo-v3.ts
server/routers.ts
server/routers/flowRouter.ts
server/routers/shadowMode.ts
server/smoke-test-f02b.ts
server/sprint-b-g8-g7.test.ts
server/sprint-c-g9-g10.test.ts
server/sprint-v55-status-transitions.test.ts
server/sprint-v56-regression.test.ts
```

### Arquivo principal identificado
```
server/db.ts
Linhas: 1390 server/db.ts
```

### Exports do engine
```typescript
34:export async function getDb() {
57:export function safeParseJson<T>(value: unknown, fallback: T): T {
72:export function normalizeProject<T extends Record<string, any>>(raw: T): T {
101:export async function upsertUser(user: InsertUser): Promise<void> {
143:export async function getUserByOpenId(openId: string) {
151:export async function getUserById(id: number) {
159:export async function getAllUsers() {
166:export async function getUsersByRole(role: string) {
173:export async function createUser(userData: Omit<InsertUser, 'id'>) {
185:export async function createProject(data: InsertProject) {
199:export async function getProjectById(id: number) {
219:export async function insertStatusLog(
245:export async function getProjectsByUser(userId: number, userRole: string) {
273:export async function updateProject(projectId: number, data: Partial<InsertProject>) {
280:export async function isUserInProject(userId: number, projectId: number): Promise<boolean> {
303:export async function saveAssessmentPhase1(data: InsertAssessmentPhase1) {
360:export async function getAssessmentPhase1(projectId: number) {
372:export async function saveAssessmentPhase2(data: InsertAssessmentPhase2) {
395:export async function getAssessmentPhase2(projectId: number) {
403:export async function findCompatibleTemplate(taxRegime: string, businessType: string | null, companySize: string) {
```

---

## BLOCO 2 — Consumers (quem importa o engine)

**Total de consumers:** 115

```
server/_core/deadline-checker.ts:1:import { getDb } from "../db";
server/_core/oauth.ts:3:import * as db from "../db";
server/_core/sdk.ts:8:import * as db from "../db";
server/action-plans-complete.ts:6:import { getDb } from "./db";
server/action-plans-complete.ts:95:import * as dbAssessments from "./db-assessments";
server/action-plans.test.ts:3:import * as db from "./db";
server/assessment-phase1-save.test.ts:2:import { getDb } from "./db";
server/audit-rf1-refineCnaes.test.ts:15:import * as db from "./db";
server/audit-rf507-project-members.test.ts:11:import * as db from "./db";
server/bug001-regression.test.ts:17:import { normalizeProject } from "./db";
server/client-members.test.ts:15:import * as db from "./db";
server/cnae-embeddings.ts:21:import { getDb } from "./db";
server/cnae-health.ts:17:import { getDb } from "./db";
server/cnae-pipeline-validator.ts:19:import { getDb } from "./db";
server/db-assessments.ts:2:import { getDb } from "./db";
server/db-branches.ts:2:import { getDb } from "./db";
server/db-participants.ts:8:import { getDb } from "./db";
server/db-requirements.ts:15:import { getDb } from "./db";
server/diagnostic-shadow/logger.ts:21:import { getDb } from "../db";
server/diagnostic-source.ts:35:import * as db from "./db";
server/diagnostic-source.ts:36:import { getDb } from "./db";
server/dt01-db-push.test.ts:10:import { checkDbPushGuard } from './utils/db-push-guard'
server/embeddings-scheduler.ts:25:import { getDb } from "./db";
server/integration/actions-crud-integration.test.ts:8:import { getDb } from "../db";
server/integration/analytics.test.ts:4:import { getDb } from "../db";
server/integration/assessment-phase1-fix.test.ts:3:import { getDb } from "../db";
server/integration/audit-e2e-fluxo-v3.test.ts:18:import * as db from "../db";
server/integration/audit.test.ts:4:import { getDb } from "../db";
server/integration/branch-assessment-generate.test.ts:3:import * as db from "../db";
server/integration/branch-plans-complete-flow.test.ts:3:import * as db from "../db";
server/integration/branch-plans-flow.test.ts:3:import * as db from "../db";
server/integration/branches-complete.test.ts:3:import { getDb } from "../db";
server/integration/bugs-pos-conclusao.test.ts:38:import * as db from "../db";
server/integration/e2e-fluxo-completo.test.ts:50:import * as db from "../db";
server/integration/e2e-projects.test.ts:17:import { getDb } from "../db";
server/integration/e2e.test.ts:19:import * as db from "../db";
server/integration/fase2-e2e-validation.test.ts:24:import { normalizeProject, safeParseJson } from "../db";
server/integration/fullFlow.e2e.test.ts:3:import { getDb } from '../db';
server/integration/k2-onda1-injector.test.ts:30:import { getSolarisQuestions } from "../db";
server/integration/k4e-status-log.test.ts:13:import { getDb } from "../db";
server/integration/k4e-status-log.test.ts:14:import * as db from "../db";
server/integration/permissions.test.ts:4:import { getDb } from "../db";
server/integration/planos-por-ramo-renderizacao.test.ts:14:import { getDb } from '../db.js';
server/integration/qa-phase1-save.test.ts:3:import { getDb } from "../db";
server/integration/questionarios-ramo-page.test.ts:4:import { getDb } from "../db";
server/integration/riskMatrix.generate.test.ts:3:import * as db from '../db';
server/integration/riskMatrix.generate.v2.test.ts:3:import { db } from '../db';
server/integration/riskMatrix.versions.test.ts:2:import * as db from '../db';
server/integration/routers-fluxo-v3-etapas2-5.test.ts:34:import * as db from "../db";
server/integration/routers-fluxo-v3.test.ts:20:import * as db from "../db";
server/integration/sprint-v59-fluxo-v3-ai.test.ts:37:import { getDb } from "../db";
server/integration/sprint-v60-v63-e2e.test.ts:25:import { getDb } from "../db";
server/integration/sprint-v64-v65-e2e.test.ts:60:import * as dbModule from "../db";
server/integration/sprint-v66-e2e.test.ts:26:import { getDb } from "../db";
server/integration/sprint-v69-e2e.test.ts:25:import * as dbModule from "../db";
server/integration/test-e2e-v212.test.ts:14:import * as db from "../db";
server/integration/versionHistory.test.ts:4:import * as db from "../db";
server/jobs/monthlyReportJob.ts:16:import { getDb } from "../db";
server/k1-solaris-questions.test.ts:32:} from "./db";
server/lib/solaris-query.ts:7:import { getOnda1Questions } from "../db";
server/m2-componente-d-update-operation-profile.test.ts:39:import * as db from './db';
server/novo-fluxo-fase1.test.ts:7:import * as db from "./db";
server/novo-fluxo-fase2.test.ts:23:import * as db from "./db";
server/novo-fluxo-fase3.test.ts:30:import * as db from "./db";
server/novo-fluxo-fase4.test.ts:14:import * as db from "./db";
server/permissions.ts:9:import * as db from "./db";
server/permissions.ts:10:import { getProjectParticipant } from "./db-participants";
server/prefill-contract-v2.test.ts:25:import { normalizeProject, safeParseJson } from "./db";
server/prefill-contract.test.ts:41:import { safeParseJson, normalizeProject } from "./db";
server/prefill-contract.test.ts:42:import * as db from "./db";
server/projects.updateStatus.test.ts:4:import * as db from "./db";
server/rag-retriever.ts:17:import { getDb } from "./db";
server/retrocesso-cleanup.ts:11:import { getDb } from "./db";
server/retrocesso-endpoint.test.ts:23:import * as db from "./db";
server/routers-action-plans.ts:3:import * as db from "./db";
server/routers-actions-crud.ts:9:import { getDb } from "./db";
server/routers-admin-embeddings.ts:16:import { getDb } from "./db";
server/routers-analytics.ts:3:import { getDb } from "./db";
server/routers-approvals.ts:5:import * as db from "./db";
server/routers-assessments.ts:3:import * as dbAssessments from "./db-assessments";
server/routers-assessments.ts:4:import * as dbBranches from "./db-branches";
server/routers-audit-logs.ts:8:import { getDb } from "./db";
server/routers-audit.ts:4:import { getDb } from "./db";
server/routers-branches.ts:3:import * as dbBranches from "./db-branches";
server/routers-comments.ts:4:import { getDb } from "./db";
server/routers-compliance-v3.ts:10:import { getDb } from "./db";
server/routers-fluxo-v3.ts:13:import * as db from "./db";
server/routers-notifications.ts:4:import { getDb } from "./db";
server/routers-onboarding.ts:17:import * as db from "./db";
server/routers-permissions.ts:4:import { getDb } from "./db";
server/routers-questions-crud.ts:13:import { getDb } from "./db";
server/routers-reports.ts:3:import { getDb } from "./db";
server/routers-session-action-plan.ts:15:import * as db from "./db";
server/routers-session-consolidation.ts:14:import * as db from "./db";
server/routers-session-questionnaire.ts:17:import * as db from "./db";
server/routers-sessions.ts:7:import * as db from "./db";
server/routers-tasks.ts:4:import { getDb } from "./db";
server/routers.ts:9:import * as db from "./db";
server/routers/consistencyRouter.ts:11:import { getDb } from "../db";
server/routers/cpieRouter.ts:13:import * as db from "../db";
server/routers/cpieRouter.ts:14:import { getDb } from "../db";
server/routers/cpieV2Router.ts:20:import { getDb } from "../db";
server/routers/diagnostic.ts:13:import * as db from "../db";
server/routers/flowRouter.ts:8:import { getDb } from "../db";
server/routers/gapRouter.ts:9:import { getDb } from "../db";
server/routers/health.ts:23:import { getDb } from "../db";
server/routers/onda1Injector.ts:17:import { getSolarisQuestions } from "../db";
server/routers/requirementEngine.ts:23:} from "../db-requirements";
server/routers/requirementEngine.ts:24:import { isUserInProject } from "../db";
server/routers/riskRouter.ts:11:import { getDb } from "../db";
server/routers/shadowMode.ts:13:import { getDb } from "../db";
server/routers/shadowMode.ts:18:import * as db from "../db";
server/seed-test-project-with-branches.ts:12:import { getDb } from './db.js';
server/smoke-test-f02b.ts:7:import { getProjectById } from "./db";
server/sprint-b-g8-g7.test.ts:128:import * as dbMock from "./db";
```

---

## BLOCO 3 — Interface TypeScript

### Interfaces e types no engine
```typescript

```

### Tipos de retorno das funções principais
```typescript
12:  riskMatrix, InsertRiskMatrix,
13:  riskMatrixPromptHistory, InsertRiskMatrixPromptHistory,
14:  riskMatrixVersions, InsertRiskMatrixVersion,
57:export function safeParseJson<T>(value: unknown, fallback: T): T {
72:export function normalizeProject<T extends Record<string, any>>(raw: T): T {
101:export async function upsertUser(user: InsertUser): Promise<void> {
225:): Promise<void> {
280:export async function isUserInProject(userId: number, projectId: number): Promise<boolean> {
492:export async function saveRiskMatrix(risks: InsertRiskMatrix[]) {
501:export async function getRiskMatrix(projectId: number) {
508:export async function saveRiskPromptHistory(data: InsertRiskMatrixPromptHistory) {
557:export async function saveRiskMatrixVersion(data: {
572:export async function getRiskMatrixVersions(projectId: number) {
583:export async function getLatestVersionNumber(projectId: number): Promise<number> {
597:export async function getRiskMatrixVersion(projectId: number, versionNumber: number) {
1133:export async function getTaskHistory(taskId: string, projectId: number): Promise<TaskHistory[]> {
1143:export async function getProjectTaskHistory(projectId: number, limit = 50): Promise<TaskHistory[]> {
1164:): Promise<number> {
1180:export async function getSolarisQuestions(cnaePrefix?: string): Promise<SolarisQuestion[]> {
1202:export async function getSolarisQuestionById(id: number): Promise<SolarisQuestion | undefined> {
```

---

## BLOCO 4 — Tabelas de Risco no Banco

### Referências a risk/Risk no schema.ts
```typescript
51:    "riscos",
54:    "matriz_riscos",
104:  riskMatricesData: json("riskMatricesData"),            // Matrizes de riscos: { [cnaeCode]: Risk[] } — coluna legada
109:  riskMatricesDataV1: json("riskMatricesDataV1"),        // F-04: Matrizes V1
110:  riskMatricesDataV3: json("riskMatricesDataV3"),        // F-04: Matrizes V3
115:  faturamentoAnual: int("faturamentoAnual"),             // V61: Faturamento anual para tradução financeira do risco
117:  decisaoData: json("decisaoData"),                      // { acao_principal, prazo_dias, risco_se_nao_fazer, momento_wow }
156:  // v6.0 Consistency Gate — status e aceitação de risco
160:  consistencyAcceptedRiskBy: int("consistencyAcceptedRiskBy"),  // userId que aceitou o risco
161:  consistencyAcceptedRiskAt: timestamp("consistencyAcceptedRiskAt"),  // Timestamp da aceitação
162:  consistencyAcceptedRiskReason: varchar("consistencyAcceptedRiskReason", { length: 500 }), // Justificativa (mín. 20 chars)
213:    "riscos_gerados",
294:  riskLevel: mysqlEnum("riskLevel", ["baixo", "medio", "alto", "critico"]).notNull(),
313:  riskLevel: mysqlEnum("riskLevel", ["baixo", "medio", "alto", "critico"]).notNull(),
327:export const riskMatrix = mysqlTable("riskMatrix", {
330:  title: varchar("title", { length: 500 }).notNull(), // Título do risco (simplificado)
332:  riskDescription: text("riskDescription"), // Mantido para compatibilidade com IA
339:  generatedByAI: boolean("generatedByAI").default(false).notNull(), // Default false para riscos manuais
344:export type RiskMatrix = typeof riskMatrix.$inferSelect;
345:export type InsertRiskMatrix = typeof riskMatrix.$inferInsert;
350:export const riskMatrixPromptHistory = mysqlTable("riskMatrixPromptHistory", {
360:export type RiskMatrixPromptHistory = typeof riskMatrixPromptHistory.$inferSelect;
361:export type InsertRiskMatrixPromptHistory = typeof riskMatrixPromptHistory.$inferInsert;
367:export const riskMatrixVersions = mysqlTable("riskMatrixVersions", {
371:  snapshotData: text("snapshotData").notNull(), // JSON string com array de riscos completo
372:  riskCount: int("riskCount").notNull(), // Número de riscos nesta versão
379:export type RiskMatrixVersion = typeof riskMatrixVersions.$inferSelect;
380:export type InsertRiskMatrixVersion = typeof riskMatrixVersions.$inferInsert;
551:  riskId: int("riskId"),
599:    "avaliacao_riscos",
```

### project_risks_v3 no schema.ts (Drizzle)
```
⚠️ NÃO encontrada no schema.ts — existe apenas em migrations SQL
```

### Campos da tabela project_risks_v3 (migration 0038)
```sql
CREATE TABLE `project_risks_v3` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`risk_code` varchar(32) NOT NULL,
	`requirement_code` varchar(32) NOT NULL,
	`requirement_name` varchar(255) NOT NULL,
	`domain` varchar(100) NOT NULL,
	`gap_type` enum('normativo','processo','sistema','cadastro','contrato','financeiro','acessorio') NOT NULL,
	`probability` int NOT NULL,
	`impact` int NOT NULL,
	`risk_score` int NOT NULL,
	`risk_score_normalized` int NOT NULL,
	`risk_level` enum('baixo','medio','alto','critico') NOT NULL,
	`risk_dimension` enum('regulatorio','operacional','financeiro','reputacional') NOT NULL,
	`financial_impact_percent` decimal(5,4) NOT NULL,
	`financial_impact_description` text NOT NULL,
	`mitigation_strategy` text NOT NULL,
	`analysis_version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_risks_v3_id` PRIMARY KEY(`id`)
);
```

### Colunas adicionadas em migrations posteriores (0061, 0062)
```sql
drizzle/0061_fancy_smiling_tiger.sql:ALTER TABLE `project_risks_v3` ADD `risk_category_l2` varchar(100);
drizzle/0062_g11_fonte_risco.sql:-- Migration 0062 — G11: campo fonte_risco em project_risks_v3
drizzle/0062_g11_fonte_risco.sql:ALTER TABLE project_risks_v3
drizzle/0062_g11_fonte_risco.sql:UPDATE project_risks_v3 r
```

### Contagem de dados em produção
```
Table 'a6u3gslmgwur2p4b85hiyy.rag_chunks' doesn't exist
```

---

## BLOCO 5 — Respostas ao Orquestrador

```
RESPOSTA 1 — ARQUIVO DO ENGINE:
  Caminho completo : server/db.ts
  Linhas totais    : 1390 server/db.ts

RESPOSTA 2 — CONSUMERS (CRÍTICO):
  Quantos arquivos importam o engine diretamente? 115
  Lista:
    1. server/_core/deadline-checker.ts:1:import { getDb } from "../db";
    2. server/_core/oauth.ts:3:import * as db from "../db";
    3. server/_core/sdk.ts:8:import * as db from "../db";
    4. server/action-plans-complete.ts:6:import { getDb } from "./db";
    5. server/action-plans-complete.ts:95:import * as dbAssessments from "./db-assessments";
    6. server/action-plans.test.ts:3:import * as db from "./db";
    7. server/assessment-phase1-save.test.ts:2:import { getDb } from "./db";
    8. server/audit-rf1-refineCnaes.test.ts:15:import * as db from "./db";
    9. server/audit-rf507-project-members.test.ts:11:import * as db from "./db";
    10. server/bug001-regression.test.ts:17:import { normalizeProject } from "./db";

RESPOSTA 3 — INTERFACE:
  ⚠️ Engine NÃO tem interface → precisamos criar contrato primeiro
  Tipo de retorno atual:
    101:export async function upsertUser(user: InsertUser): Promise<void> {
    225:): Promise<void> {
    280:export async function isUserInProject(userId: number, projectId: number): Promise<boolean> {
    583:export async function getLatestVersionNumber(projectId: number): Promise<number> {
    1133:export async function getTaskHistory(taskId: string, projectId: number): Promise<TaskHistory[]> {

RESPOSTA 4 — BANCO:
  Tabela de riscos atual : project_risks_v3 (21 campos + 2 extras)
  Campos principais      : id, client_id, project_id, risk_code, requirement_code,
                           requirement_name, domain, gap_type, probability, impact,
                           risk_score, risk_score_normalized, risk_level, risk_dimension,
                           financial_impact_percent, financial_impact_description,
                           mitigation_strategy, analysis_version, created_at, updated_at,
                           risk_category_l2 (0061), fonte_risco (0062)
  Table 'a6u3gslmgwur2p4b85hiyy.rag_chunks' doesn't exist
  Total de chunks RAG (NÃO pode apagar): ver rag_chunks acima
```

---

*Documento gerado automaticamente — NÃO editar manualmente.*
*Prompt de origem: `PROMPT_MANUS_CONSUMERS.md`*
