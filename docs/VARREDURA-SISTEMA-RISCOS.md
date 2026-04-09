# Varredura Técnica — Sistema de Riscos
**Gerado em:** 2026-04-09 | **HEAD:** 3e7fded | **Versão produto:** v4.8 Gate B ✅

---

## Bloco 1 — Mapa de Arquivos

### Arquivos de servidor (sem testes)
```
server/ai-helpers.ts
server/ai-schemas.ts
server/config/feature-flags.ts
server/consistencyEngine.ts
server/cpie.ts
server/db.ts
server/diagnostic-consolidator.ts
server/diagnostic-shadow/logger.ts
server/diagnostic-shadow/readers.ts
server/diagnostic-shadow/shadow.ts
server/diagnostic-shadow/types.ts
server/diagnostic-source.ts
server/flowStateMachine.ts
server/gapEngine.ts
server/jobs/monthlyReportJob.ts
server/lib/engine-gap-analyzer.ts
server/lib/iagen-gap-analyzer.ts
server/lib/risk-categorizer.ts
server/lib/solaris-gap-analyzer.ts
server/llm.mock.ts
server/retrocesso-cleanup.ts
server/riskEngine.ts
server/routers-actions-crud.ts
server/routers-compliance-v3.ts
server/routers-fluxo-v3.ts
server/routers-session-action-plan.ts
server/routers-session-consolidation.ts
server/routers-session-questionnaire.ts
server/routers.ts
server/routers/actionEngine.ts
server/routers/briefingEngine.ts
server/routers/consistencyRouter.ts
server/routers/cpieRouter.ts
server/routers/cpieV2Router.ts
server/routers/flowRouter.ts
server/routers/gapEngine.ts
server/routers/gapRouter.ts
server/routers/health.ts
server/routers/riskEngine.ts
server/routers/riskRouter.ts
server/routers/scoringEngine.ts
server/routers/shadowMode.ts
```

### Arquivos de frontend
```
client/src/App.tsx
client/src/components/CpieScoreBadge.tsx
client/src/components/PerfilEmpresaIntelligente.tsx
client/src/components/RetrocessoConfirmModal.tsx
client/src/components/VersionHistory.tsx
client/src/components/compliance-v3/dashboard/ComplianceKPICards.tsx
client/src/components/compliance-v3/dashboard/ExecutiveNarrative.tsx
client/src/components/compliance-v3/dashboard/RiskMatrix4x4.tsx
client/src/components/compliance-v3/shared/Badges.tsx
client/src/pages/AdminConsistencia.tsx
client/src/pages/Briefing.tsx
client/src/pages/BriefingV3.tsx
client/src/pages/ConsistencyGate.tsx
client/src/pages/Consolidacao.tsx
client/src/pages/GapDiagnostic.tsx
client/src/pages/MatrizRiscos.tsx
client/src/pages/MatrizRiscosGlobal.tsx
client/src/pages/MatrizRiscosSession.tsx
client/src/pages/MatrizesV3.tsx
client/src/pages/PlanoAcaoSession.tsx
client/src/pages/PlanoAcaoV3.tsx
client/src/pages/ProjetoDetalhesV2.tsx
client/src/pages/QuestionarioRamos.tsx
client/src/pages/RagCockpit.tsx
client/src/pages/RiskDashboard.tsx
client/src/pages/ShadowMonitor.tsx
client/src/pages/TaskBoard.tsx
client/src/pages/compliance-v3/ActionsV3.tsx
client/src/pages/compliance-v3/ComplianceDashboardV3.tsx
client/src/pages/compliance-v3/RisksV3.tsx
client/src/pages/compliance-v3/ScoreView.tsx
client/src/pages/demo/DemoAcoes.tsx
client/src/pages/demo/DemoDashboard.tsx
client/src/pages/demo/DemoGaps.tsx
client/src/pages/demo/DemoLanding.tsx
client/src/pages/demo/DemoRiscos.tsx
```

### Arquivos de teste que tocam em riscos
```
server/actionPlan.test.ts
server/audit-rf4-matrizes.test.ts
server/briefing.test.ts
server/bug001-regression.test.ts
server/consistencyEngine.test.ts
server/cpieV2Router.test.ts
server/dashboard.test.ts
server/diagnostic-shadow.test.ts
server/dt01-db-push.test.ts
server/flowStateMachine.test.ts
server/gapEngine.test.ts
server/gates/g17b-solaris-pipeline.test.ts
server/integration/audit-e2e-fluxo-v3.test.ts
server/integration/bug-manual-04-category-badge.test.ts
server/integration/bugs-pos-conclusao.test.ts
server/integration/connection-manifest.test.ts
server/integration/diagnostic-integration.test.ts
server/integration/diagnostic-source.test.ts
server/integration/e2e-flow.test.ts
server/integration/e2e-fluxo-completo.test.ts
server/integration/e2e-projects.test.ts
server/integration/fullFlow.e2e.test.ts
server/integration/onda1-t01-t05.test.ts
server/integration/onda1-t06-t10.test.ts
server/integration/onda2-t12-t13.test.ts
server/integration/onda2-t14-retrocesso.test.ts
server/integration/riskMatrix.generate.test.ts
server/integration/riskMatrix.generate.v2.test.ts
server/integration/riskMatrix.versions.test.ts
server/integration/routers-action-engine.test.ts
server/integration/routers-bateria-avancada.test.ts
server/integration/routers-briefing-engine.test.ts
server/integration/routers-fluxo-v3-etapas2-5.test.ts
server/integration/routers-risk-engine.test.ts
server/integration/routers-scoring-engine.test.ts
server/integration/sprint-v59-fluxo-v3-ai.test.ts
server/integration/sprint-v60-v63-e2e.test.ts
server/integration/sprint-v64-v65-e2e.test.ts
server/integration/suite-uat-12-itens.test.ts
server/invariants-606-607-608.test.ts
server/novo-fluxo-fase2.test.ts
server/novo-fluxo-fase3.test.ts
server/novo-fluxo-fase4.test.ts
server/pr375-div-z01-004-005.test.ts
server/projeto-detalhes-v2.test.ts
server/retrocesso-cleanup.test.ts
server/retrocesso-endpoint.test.ts
server/riskEngine.test.ts
server/riskMatrix.test.ts
server/routers/riskEngine.test.ts
server/schema-g11-136.test.ts
server/sprint-b-g8-g7.test.ts
server/sprint-c-g9-g10.test.ts
server/sprint-e-g11.test.ts
server/sprint-s-lotes-be.test.ts
server/sprint-v55-status-transitions.test.ts
server/sprint-v56-regression.test.ts
server/z02b-risk-categorizer-integration.test.ts
```

---

## Bloco 2 — Contrato do Engine (`server/riskEngine.ts`)

**Linhas:** 279 server/riskEngine.ts

### Tipos e interfaces exportados
```typescript
14:export type GapStatus = "compliant" | "nao_compliant" | "parcial" | "nao_aplicavel";
15:export type RiskLevel = "baixo" | "medio" | "alto" | "critico";
16:export type ImpactType = "financeiro" | "operacional" | "legal" | "reputacional";
17:export type NormativeType = "obrigacao" | "vedacao" | "direito" | "opcao";
18:export type SeverityBase = "critica" | "alta" | "media" | "baixa";
19:export type MitigationPriority = "imediata" | "curto_prazo" | "medio_prazo" | "monitoramento";
21:export interface GapInput {
32:export interface RiskItem {
48:export interface RiskSummary {
```

### Funções exportadas
```typescript
121:export function inferNormativeType(requirementName?: string, domain?: string): NormativeType {
132:export function calculateBaseScore(normativeType: NormativeType, criticality: SeverityBase): number {
142:export function calculateRiskScore(baseScore: number, gapStatus: GapStatus): number {
150:export function classifyRiskLevel(riskScore: number): RiskLevel {
160:export function determineMitigationPriority(
174:export function classifyRisk(gap: GapInput): RiskItem {
207:export function calculateRiskSummary(risks: RiskItem[]): RiskSummary {
272:export function runRiskAnalysis(gaps: GapInput[]): {
```

---

## Bloco 3 — Router tRPC (`server/routers/riskEngine.ts` + `routers-fluxo-v3.ts`)

**Linhas (routers/riskEngine.ts):** 660 server/routers/riskEngine.ts

### Procedures em `routers/riskEngine.ts`
```
15:import { router, protectedProcedure } from "../_core/trpc";
565:  deriveAndPersist: protectedProcedure
629:  list: protectedProcedure
```

### Procedures em `routers-fluxo-v3.ts` (generateRiskMatrices / approveMatrices)
```
1113:  generateRiskMatrices: protectedProcedure
1183:          { temperature: 0.2, context: `generateRiskMatrices:${area}` }
1187:        const validation = validateRagOutput(RisksResponseSchema, result, `generateRiskMatrices:${area}:safeParse`);
1242:  approveMatrices: protectedProcedure
```

---

## Bloco 4 — Frontend (`client/src/pages/MatrizesV3.tsx`)

**Linhas:** 849 client/src/pages/MatrizesV3.tsx

### Imports
```typescript
2:import { useState, useEffect } from "react";
3:import { useAutoSave, loadTempData, clearTempData } from "@/hooks/usePersistenceV3";
4:import { ResumeBanner } from "@/components/ResumeBanner";
5:import { useParams, useLocation } from "wouter";
6:import { trpc } from "@/lib/trpc";
7:import ComplianceLayout from "@/components/ComplianceLayout";
8:import { Button } from "@/components/ui/button";
9:import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
10:import { Textarea } from "@/components/ui/textarea";
11:import { Input } from "@/components/ui/input";
12:import { Badge } from "@/components/ui/badge";
13:import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
14:import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
15:import FlowStepper from "@/components/FlowStepper";
16:import RetrocessoConfirmModal from "@/components/RetrocessoConfirmModal";
```

### Chamadas tRPC
```typescript
244:  const { data: project, isLoading: loadingProject } = trpc.fluxoV3.getProjectStep1.useQuery(
249:  const utils = trpc.useUtils();
250:  const generateMatrices = trpc.fluxoV3.generateRiskMatrices.useMutation();
251:  const approveMatrices = trpc.fluxoV3.approveMatrices.useMutation();
```

---

## Bloco 5 — Schema do Banco

### Tabela `riskMatrix` (Drizzle schema.ts)
```typescript
export const riskMatrix = mysqlTable("riskMatrix", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 500 }).notNull(), // Título do risco (simplificado)
  description: text("description"), // Descrição detalhada (opcional)
  riskDescription: text("riskDescription"), // Mantido para compatibilidade com IA
  probability: mysqlEnum("probability", ["muito_baixa", "baixa", "media", "alta", "muito_alta"]), // Opcional agora
  impact: mysqlEnum("impact", ["muito_baixo", "baixo", "medio", "alto", "muito_alto"]), // Opcional agora
  treatmentStrategy: text("treatmentStrategy"),
  suggestedControls: text("suggestedControls"),
  expectedEvidence: text("expectedEvidence"),
  version: int("version").default(1).notNull(),
  generatedByAI: boolean("generatedByAI").default(false).notNull(), // Default false para riscos manuais
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
});

export type RiskMatrix = typeof riskMatrix.$inferSelect;
export type InsertRiskMatrix = typeof riskMatrix.$inferInsert;

/**
```

### Tabela `project_risks_v3` (migration 0038)
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

---

## Bloco 6 — Tipos e Interfaces (riskEngine.ts)

```typescript
14:export type GapStatus = "compliant" | "nao_compliant" | "parcial" | "nao_aplicavel";
15:export type RiskLevel = "baixo" | "medio" | "alto" | "critico";
16:export type ImpactType = "financeiro" | "operacional" | "legal" | "reputacional";
17:export type NormativeType = "obrigacao" | "vedacao" | "direito" | "opcao";
18:export type SeverityBase = "critica" | "alta" | "media" | "baixa";
19:export type MitigationPriority = "imediata" | "curto_prazo" | "medio_prazo" | "monitoramento";
21:export interface GapInput {
32:export interface RiskItem {
48:export interface RiskSummary {
```

---

## Bloco 7 — Cobertura de Testes

| Arquivo de teste | Testes (it/test/describe) |
|------------------|--------------------------|
| `server/riskEngine.test.ts` | 44 |
| `server/routers/riskEngine.test.ts` | 20 |
| `server/integration/riskMatrix.generate.test.ts` | 2 |

### Fitness Functions relacionadas a riscos
```
(nenhum resultado)
```

---

## Bloco 8 — Resumo para o Orquestrador

### Arquitetura atual (2 engines paralelos)

O sistema de riscos possui **2 engines paralelos** que precisam ser unificados na Sprint Z-07:

| Engine | Arquivo | Tabela | Acionamento |
|--------|---------|--------|-------------|
| **Engine v1** (score matemático) | `server/riskEngine.ts` | `riskMatrix` | `server/routers/riskEngine.ts` → `deriveAndPersist` |
| **Engine v2** (LLM + RAG) | `server/routers-fluxo-v3.ts` | `project_risks_v3` | `generateRiskMatrices` (procedure tRPC) |

### Pontos de atenção para Sprint Z-07

1. **Dois contratos de dados distintos:** `riskMatrix` (Drizzle schema.ts, 14 campos) vs `project_risks_v3` (migration 0038, 21 campos + 2 colunas extras em 0061/0062). Qualquer unificação exige migration cuidadosa.
2. **Frontend usa apenas Engine v2:** `MatrizesV3.tsx` consome `trpc.fluxoV3.generateRiskMatrices` e `trpc.fluxoV3.approveMatrices` — o Engine v1 (`routers/riskEngine.ts`) não tem consumidor ativo no frontend.
3. **Cobertura de testes:** 44 + 20 + N testes cobrindo os dois engines. Qualquer refactor deve manter todos passando.
4. **Gate EVIDENCE obrigatório:** `generateRiskMatrices` chama LLM com RAG — qualquer PR que toque esta procedure deve incluir evidência real capturada em `docs/evidencias/` (FF-EVIDENCE-01/02).
5. **Schema drift:** `project_risks_v3` foi criada via migration 0038 (commitada) mas recebeu colunas extras via `pnpm db:push` (ADR-0020). Verificar se `risk_category_l2` e `fonte_risco` estão no schema Drizzle ou apenas nas migrations.

### Dependências críticas

```
riskEngine.ts
  └── importado por: server/routers/riskEngine.ts
                     server/riskEngine.test.ts
                     server/routers/riskEngine.test.ts

generateRiskMatrices (routers-fluxo-v3.ts)
  └── usa: invokeLLM + validateRagOutput + RisksResponseSchema
  └── consumido por: client/src/pages/MatrizesV3.tsx
  └── aprovação: trpc.fluxoV3.approveMatrices → persiste em project_risks_v3
```

---

*Documento gerado automaticamente por `gen_risk_report.py` — NÃO editar manualmente.*
*Próxima atualização: início da Sprint Z-07.*
