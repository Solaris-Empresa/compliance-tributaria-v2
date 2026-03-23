# ADR-007 — Gate de Limpeza de Dados no Retrocesso do Fluxo

**Número:** ADR-007  
**Título:** Gate de Limpeza de Dados no Retrocesso do Fluxo  
**Status:** `AGUARDANDO APROVAÇÃO DO P.O.`  
**Data:** 2026-03-22  
**Autor:** Manus AI  
**Referências:** ADR-005 (Isolamento Físico), ADR-006 (Validação Prática), F-02 (Migração Concluída)  
**Fase de implementação:** F-03 (bloqueada até aprovação deste ADR)

---

## 1. Contexto

A Fase F-02 foi concluída com sucesso: todos os 93 pontos de leitura direta de diagnóstico foram migrados para o adaptador centralizado `getDiagnosticSource()`. O isolamento físico das fontes de verdade (ADR-005) está em produção e validado com 182 testes passando.

Durante a validação prática do ADR-005 (ADR-006, Bloco 4), foi identificado um **risco residual**: a `flowStateMachine` **permite retroceder** no fluxo por design (para revisão de etapas anteriores), mas não possui nenhum mecanismo que limpe os dados das etapas posteriores ao ponto de retrocesso. Isso pode criar **estado inconsistente** entre o que o usuário vê na tela e o que está armazenado no banco.

**Exemplo concreto do risco:**

> Um projeto V3 está na etapa 9 (riscos) com `briefingContentV3` e `riskMatricesDataV3` preenchidos. O usuário retrocede para a etapa 5 (diagnóstico corporativo) para corrigir uma resposta. Após a correção, o `briefingContentV3` e o `riskMatricesDataV3` ainda existem no banco — gerados com os dados antigos. O usuário avança novamente para a etapa 8 (briefing) e vê o briefing antigo, sem saber que foi gerado com dados desatualizados.

Este ADR define formalmente o comportamento correto de retrocesso e o gate de limpeza de dados que será implementado na F-03.

---

## 2. Problema

O `validateTransition` atual permite retroceder sem restrições:

```typescript
// flowStateMachine.ts — comportamento atual
// Permitir retroceder (para revisão) ou avançar apenas 1 etapa
if (targetStepNumber > currentStepNumber + 1) {
  return { allowed: false, reason: "Não é possível pular etapas." };
}
// Retroceder: sem verificação, sem limpeza
```

Isso significa que retroceder de etapa 9 para etapa 5 é permitido, mas os dados das etapas 8 e 9 (`briefingContentV3`, `riskMatricesDataV3`) permanecem no banco sem qualquer sinalização de que estão desatualizados.

---

## 3. Decisões Obrigatórias (6 questões)

### 3.1 — Quando a limpeza ocorre

A limpeza ocorre **no momento em que o usuário confirma o retrocesso** e **salva dados em uma etapa anterior**. Não ocorre apenas pela navegação (o usuário pode retroceder para visualizar sem alterar). A limpeza é disparada quando:

- O usuário **salva** respostas em uma etapa anterior ao ponto atual (`currentStep`)
- O endpoint de salvamento detecta que `targetStep < currentStep`

A limpeza **não ocorre** em:
- Navegação passiva (apenas visualizar uma etapa anterior sem salvar)
- Retrocesso para etapas que não produzem dados de diagnóstico (etapas 1–4)

### 3.2 — Quais dados são limpos

A limpeza é **em cascata a partir do ponto de retrocesso**. Os dados limpos dependem da etapa em que o salvamento ocorreu:

| Etapa de salvamento | Dados limpos (colunas V3) | Dados limpos (colunas V1) |
|---|---|---|
| 5 — diagnóstico_corporativo | `questionnaireAnswersV3`, `briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3` | `corporateAnswers`, `operationalAnswers`, `cnaeAnswers`, `briefingContent`, `riskMatricesData`, `actionPlansData` |
| 6 — diagnóstico_operacional | `questionnaireAnswersV3` (respostas operacionais), `briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3` | `operationalAnswers`, `cnaeAnswers`, `briefingContent`, `riskMatricesData`, `actionPlansData` |
| 7 — diagnóstico_cnae | `questionnaireAnswersV3` (respostas CNAE), `briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3` | `cnaeAnswers`, `briefingContent`, `riskMatricesData`, `actionPlansData` |
| 8 — briefing | `briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3` | `briefingContent`, `riskMatricesData`, `actionPlansData` |
| 9 — riscos | `riskMatricesDataV3`, `actionPlansDataV3` | `riskMatricesData`, `actionPlansData` |
| 10 — plano | `actionPlansDataV3` | `actionPlansData` |

**Regra geral:** limpar todos os dados gerados nas etapas **posteriores** à etapa de salvamento.

### 3.3 — Como preservar auditabilidade

A limpeza **não apaga dados permanentemente**. O mecanismo de auditabilidade é:

1. **Tabela `projectAuditLog`** (nova, criada na F-03): antes de limpar qualquer coluna, o sistema registra um snapshot dos dados que serão limpos, com `projectId`, `userId`, `timestamp`, `stepFrom`, `stepTo`, `dataSnapshot` (JSON comprimido).

2. **Coluna `lastRetrocedeAt`** (nova, na tabela `projects`): timestamp da última vez que o projeto retrocedeu, para rastreabilidade rápida.

3. **Os dados limpos são `null`**, não deletados da tabela — o histórico de versões do banco (via backups e WAL) preserva o estado anterior.

> **Decisão de compliance:** Para produto de compliance tributário, o log de auditoria é obrigatório. Qualquer limpeza de dados deve ser rastreável com identificação do usuário, timestamp e conteúdo anterior.

### 3.4 — Como evitar perda indevida ao usuário

Dois mecanismos de proteção:

**Mecanismo 1 — Confirmação explícita no frontend:**
Antes de salvar em uma etapa anterior, o frontend exibe um modal de confirmação:

> "Você está editando uma etapa anterior. Os dados gerados nas etapas seguintes (briefing, riscos, plano) serão removidos e precisarão ser regenerados. Deseja continuar?"

O salvamento só prossegue após confirmação explícita (`confirmRetrocede: true` no payload).

**Mecanismo 2 — Proteção de etapas não-diagnóstico:**
Retroceder para as etapas 1–4 (perfil, consistência, CNAEs) **não limpa dados de diagnóstico** automaticamente — apenas exibe o aviso. A limpeza só ocorre se o usuário efetivamente alterar e salvar dados nessas etapas que invalidem o diagnóstico (ex: mudar o CNAE principal).

### 3.5 — Diferenças entre V1, V3 e híbrido

| Cenário | Comportamento de limpeza |
|---|---|
| **V1 puro** (`flowVersion: "v1"`) | Limpa apenas colunas V1 (`corporateAnswers`, `briefingContent`, `riskMatricesData`, `actionPlansData`) |
| **V3 puro** (`flowVersion: "v3"`) | Limpa apenas colunas V3 (`questionnaireAnswersV3`, `briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3`) |
| **Híbrido** (`flowVersion: "hybrid"`) | Limpa **ambas** as colunas V1 e V3 — o estado híbrido é o mais conservador por definição |
| **Sem flowVersion** (`flowVersion: "none"`) | Não há dados de diagnóstico para limpar — retrocesso é livre |

O `flowVersion` é determinado pelo `getDiagnosticSource()` no momento do retrocesso, garantindo que a lógica de limpeza use a mesma fonte de verdade que toda a aplicação.

### 3.6 — Estratégia de rollback da F-03

A F-03 envolve mudanças de schema (nova tabela `projectAuditLog`, nova coluna `lastRetrocedeAt`) e mudanças de comportamento (gate de limpeza). A estratégia de rollback é:

**Rollback de schema:**
```sql
-- Desfazer F-03 (executar em ordem)
ALTER TABLE projects DROP COLUMN lastRetrocedeAt;
DROP TABLE IF EXISTS projectAuditLog;
```

**Rollback de código:**
```bash
git revert <commit-hash-F03> --no-commit
git commit -m "rollback: reverter F-03 gate de limpeza"
```

**Rollback via checkpoint Manus:**
O checkpoint `1cbe8f76` (F-02D concluída) é o ponto de restauração seguro antes da F-03. Qualquer falha na F-03 deve usar este checkpoint como base de rollback.

**Critério de rollback automático:**
- Qualquer falha nos testes após a migration de schema → rollback imediato
- Qualquer perda de dados em produção detectada → rollback imediato + notificação ao owner
- Qualquer regressão nos 182 testes existentes → rollback imediato

---

## 4. Modelo de Dados da F-03

### 4.1 Nova tabela: `projectAuditLog`

```typescript
// drizzle/schema.ts — adição F-03
export const projectAuditLog = mysqlTable("project_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  userId: int("user_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(), // "retrocesso_com_limpeza"
  stepFrom: int("step_from").notNull(),
  stepTo: int("step_to").notNull(),
  dataSnapshot: json("data_snapshot"), // snapshot dos dados limpos (comprimido)
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
```

### 4.2 Nova coluna: `lastRetrocedeAt`

```typescript
// drizzle/schema.ts — adição F-03 na tabela projects
lastRetrocedeAt: bigint("last_retrocede_at", { mode: "number" }),
```

---

## 5. Fluxo de Execução da F-03

```
[Frontend: usuário salva em etapa anterior]
    ↓
[Endpoint recebe payload com confirmRetrocede: true]
    ↓
[getDiagnosticSource(projectId) → determina flowVersion]
    ↓
[determineCleanupScope(stepTo, flowVersion) → lista de colunas a limpar]
    ↓
[db.createAuditLog(snapshot dos dados antes da limpeza)]
    ↓
[db.cleanDiagnosticData(projectId, colunas) → SET col = NULL]
    ↓
[db.updateProject(projectId, { currentStep: stepTo, lastRetrocedeAt: now() })]
    ↓
[retorna { success: true, cleanedColumns: [...], auditLogId: N }]
```

---

## 6. Riscos Residuais

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Usuário confirma limpeza por engano | Média | Alto | Modal de confirmação com lista explícita dos dados que serão perdidos |
| Projeto híbrido com dados V1 e V3 divergentes | Baixa | Médio | Limpeza conservadora: limpa ambos |
| Falha no audit log antes da limpeza | Baixa | Alto | Transação atômica: audit log + limpeza em uma única transação DB |
| Performance: snapshot JSON grande | Baixa | Baixo | Comprimir com `JSON.stringify` + truncar campos de texto longo (>10KB) |

---

## 7. Critérios de Aceite da F-03

Para que a F-03 seja aprovada, todos os critérios abaixo devem ser atendidos:

- [ ] Migration de schema executada sem erros (`pnpm db:push`)
- [ ] Tabela `projectAuditLog` criada e acessível
- [ ] Coluna `lastRetrocedeAt` adicionada à tabela `projects`
- [ ] Endpoint de salvamento com `confirmRetrocede: true` limpa as colunas corretas
- [ ] Audit log registrado antes de qualquer limpeza
- [ ] Modal de confirmação exibido no frontend antes do salvamento
- [ ] Testes unitários: `server/retrocesso-cleanup.test.ts` (mínimo 40 testes)
- [ ] Testes de integração: V1 puro, V3 puro, híbrido, sem flowVersion
- [ ] 182+ testes existentes passando (sem regressão)
- [ ] TypeScript: 0 erros
- [ ] Checkpoint Git ao final

---

## 8. Aprovação

```
Status:    AGUARDANDO APROVAÇÃO DO P.O.
Aprovado:  ________________________________
Data:      ________________________________
Observações: ______________________________
```

**Sem aprovação deste ADR, a F-03 não pode ser iniciada.**

---

*ADR-007 — Gate de Limpeza de Dados no Retrocesso do Fluxo*  
*Gerado por: Manus AI | Projeto: Plataforma COMPLIANCE da Reforma Tributária*  
*Sequência: ADR-001 → ADR-002 → ADR-003 → ADR-004 (rejeitado) → ADR-005 → ADR-006 → ADR-007*
