# QA Humano — TASK v2.3 Flow State + Persistence
**Responsável:** Uires Tapajós | **Data:** 2026-03-20 | **Versão:** v2.3

---

## 🎯 Objetivo da Validação

Confirmar que o fluxo de 11 etapas persiste corretamente no banco, que o usuário pode retomar exatamente do ponto salvo após fechar e reabrir o sistema, e que os gates obrigatórios bloqueiam avanços inválidos.

---

## 🌐 URL da Plataforma

**Acesso:** Use o link de preview do projeto (botão "View" no painel de gerenciamento).

---

## 📋 Roteiro de Validação (8 Passos)

### PASSO 1 — Criar Projeto
1. Faça login na plataforma
2. Clique em **"Novo Projeto"**
3. Preencha: Nome, Descrição (mín. 50 chars), selecione um cliente
4. Preencha o **Perfil da Empresa**: CNPJ, tipo, porte, regime tributário
5. Preencha o **Perfil Operacional**: tipo de operação, tipo de cliente, multi-estado
6. Clique em **"Criar Projeto"**

**Evidência esperada:** Projeto criado com `currentStep: 1`, `status: "rascunho"`, `currentStepName: "perfil_empresa"`

---

### PASSO 2 — Análise de Consistência (Gate Obrigatório)
1. No projeto criado, acesse **"Análise de Consistência"** (`/consistencia/:id`)
2. Clique em **"Analisar Consistência"**
3. Aguarde a análise (IA + regras determinísticas)
4. Observe os findings exibidos (critical/high/medium/low)

**Evidência esperada:** `currentStep: 2`, `status: "consistencia_pendente"`, `consistencyCheckStatus` preenchido

**Teste de Gate:** Tente acessar `/projetos/:id/cnaes` diretamente sem passar pela consistência → deve ser bloqueado ou redirecionar.

---

### PASSO 3 — Descoberta de CNAEs
1. Após a consistência, avance para **"Descoberta de CNAEs"**
2. A IA sugere CNAEs baseados na descrição do negócio
3. Refine se necessário usando o campo de feedback

**Evidência esperada:** `currentStep: 3`, `status: "cnaes_confirmados"` (após confirmação)

---

### PASSO 4 — Confirmação de CNAEs
1. Selecione os CNAEs corretos
2. Clique em **"Confirmar CNAEs"**

**Evidência esperada no banco:**
```sql
SELECT id, currentStep, currentStepName, status, confirmedCnaes
FROM projects WHERE id = :projectId;
-- Esperado: currentStep=4, currentStepName='confirmacao_cnaes', status='cnaes_confirmados'
```

---

### PASSO 5 — Fechar o Sistema (Teste de Retomada)
1. **Feche o navegador completamente** (ou abra uma aba anônima)
2. Acesse novamente a plataforma
3. Faça login
4. Acesse o projeto criado

**Evidência esperada:** O sistema deve mostrar o projeto na **etapa 4** (Confirmação de CNAEs), não na etapa 1. O botão "Continuar" deve levar para a próxima etapa.

---

### PASSO 6 — Responder os 3 Questionários
1. **Questionário Corporativo** (10 questões sobre estrutura da empresa)
2. **Questionário Operacional** (10 questões sobre operações)
3. **Questionário Especializado por CNAE** (5 questões por CNAE confirmado)

**Evidência esperada:** `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` preenchidos no banco

---

### PASSO 7 — Gerar Briefing, Riscos e Plano
1. Acesse **"Briefing"** → clique em "Gerar Briefing"
   - Verifique se o painel "Diagnóstico de Entrada — 3 Camadas" exibe dados das 3 camadas
2. Acesse **"Matriz de Riscos"** → clique em "Gerar Matriz"
3. Acesse **"Plano de Ação"** → clique em "Gerar Plano"

**Evidência esperada:** Todos os 3 gerados com dados das 3 camadas de diagnóstico visíveis

---

### PASSO 8 — Verificar Dashboard
1. Acesse o **Dashboard** do projeto
2. Verifique: score de compliance, top riscos, plano de ação

**Evidência esperada:** `currentStep: 11`, `status: "dashboard"`

---

## 🗄️ Queries de Evidência no Banco

Execute estas queries no painel **Database** do projeto:

### Query 1 — Estado atual do projeto
```sql
SELECT 
  id,
  name,
  currentStep,
  currentStepName,
  status,
  stepUpdatedAt,
  JSON_LENGTH(confirmedCnaes) as cnae_count,
  CASE WHEN corporateAnswers IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as has_corporate,
  CASE WHEN operationalAnswers IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as has_operational,
  CASE WHEN cnaeAnswers IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as has_cnae,
  CASE WHEN briefingContent IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as has_briefing,
  CASE WHEN riskMatricesData IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as has_risks,
  CASE WHEN actionPlansData IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as has_plan
FROM projects
ORDER BY createdAt DESC
LIMIT 5;
```

### Query 2 — Histórico de transições (stepHistory)
```sql
SELECT 
  id,
  name,
  currentStep,
  currentStepName,
  stepUpdatedAt,
  JSON_LENGTH(stepHistory) as transition_count
FROM projects
WHERE id = :projectId;
```

### Query 3 — Verificar consistência
```sql
SELECT 
  id,
  projectId,
  status,
  riskLevel,
  totalFindings,
  criticalCount,
  highCount,
  acceptedRisk,
  createdAt
FROM consistency_checks
WHERE projectId = :projectId
ORDER BY createdAt DESC
LIMIT 3;
```

---

## ✅ Critérios de Aprovação

| Critério | Verificação |
|---|---|
| `currentStep` persiste no banco | Query 1 mostra step correto |
| `currentStepName` atualizado | Query 1 mostra nome correto |
| `status` atualizado | Query 1 mostra status correto |
| Retomada funciona | Passo 5: sistema abre na etapa correta |
| Gate de consistência funciona | Passo 2: bloqueio sem consistência |
| Gate de CNAEs funciona | Passo 3: bloqueio sem CNAEs |
| 3 camadas visíveis no Briefing | Passo 7: painel "Diagnóstico de Entrada" |
| 109 testes vitest passando | Automático (CI) |

---

## 🚨 Critérios de Reprovação

- `currentStep` não muda após transição
- Sistema abre na etapa 1 após fechar/reabrir
- Gate não bloqueia avanço inválido
- Briefing não exibe dados das 3 camadas
- Qualquer teste vitest falhando

---

## 📊 Estado Atual dos Testes Automatizados

```
✓ server/flowStateMachine.test.ts   (34 testes) — 14ms
✓ server/consistencyEngine.test.ts  (20 testes) — 28ms
✓ server/riskEngine.test.ts         (37 testes) — 14ms
✓ server/gapEngine.test.ts          (18 testes) — 10ms

Total: 109 testes | 0 falhas | 0 regressões
```

---

## 🔗 Arquivos Relevantes

| Arquivo | Descrição |
|---|---|
| `server/flowStateMachine.ts` | Máquina de estados com 11 etapas e gates |
| `server/routers/flowRouter.ts` | Procedures tRPC: advanceStep, getResumePoint, getStepHistory |
| `drizzle/schema.ts` | Enum com 18 estados + campos currentStepName, stepUpdatedAt, stepHistory |
| `server/routers-fluxo-v3.ts` | confirmCnaes atualizado: status="cnaes_confirmados", currentStep=4 |
| `client/src/pages/DiagnosticoStepper.tsx` | Orquestrador do fluxo visual |
| `client/src/pages/ConsistencyGate.tsx` | Gate de consistência (FASE 2) |

---

*Documento gerado automaticamente pela TASK v2.3 — Flow State + Persistence*
