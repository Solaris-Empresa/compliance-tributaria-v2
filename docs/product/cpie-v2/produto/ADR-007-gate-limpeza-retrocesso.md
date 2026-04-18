# ADR-007 — Gate de Limpeza de Dados no Retrocesso do Fluxo

> **ATUALIZAÇÃO 2026-04-06 — ADR-0009:**
> As etapas `diagnostico_corporativo` (etapa 5) e
> `diagnostico_operacional` (etapa 6) serão substituídas por
> `questionario_produtos` e `questionario_servicos` na Sprint Z.
> Os campos `corporateAnswers`/`operationalAnswers` serão
> substituídos pelos dados dos novos questionários.
> O gate de limpeza permanece válido — apenas os nomes
> de etapas e campos serão atualizados no final da Sprint Z.

**Número:** ADR-007  
**Título:** Gate de Limpeza de Dados no Retrocesso do Fluxo  
**Status:** `APROVADO — F-03 AUTORIZADA`  
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

**Decisão do P.O. (2026-03-23):** Sem audit log. Os dados de diagnóstico são regeneráveis a qualquer momento — não há necessidade de preservar snapshots históricos. A auditabilidade é garantida pelo histórico de commits no GitHub e pelos logs de atividade do servidor.

Os dados limpos são definidos como `null` na tabela — a limpeza é definitiva e imediata.

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

### 4.1 Sem novas tabelas

**Decisão do P.O. (2026-03-23):** Sem tabela `projectAuditLog` e sem coluna `lastRetrocedeAt`. A F-03 não altera o schema do banco — apenas adiciona lógica de limpeza no endpoint de salvamento. Isso elimina a necessidade de migration e simplifica o rollback.

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
[db.cleanDiagnosticData(projectId, colunas) → SET col = NULL]
    ↓
[db.updateProject(projectId, { currentStep: stepTo })]
    ↓
[retorna { success: true, cleanedColumns: [...] }]
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
Status:      APROVADO
Aprovado:    P.O. — Solaris Empresa
Data:        2026-03-23
Observações: Decisões do P.O. incorporadas:
             1. Limpeza total ao salvar em etapa anterior (sem limpeza parcial)
             2. Sem tabela de audit log — simplicidade operacional
             3. Sem backup antes da limpeza — dados de diagnóstico são regeneráveis
             4. Sem retenção de dados limpos — limpeza definitiva
             5. F-03 autorizada para início imediato
```

**F-03 AUTORIZADA. Implementação pode iniciar.**

---

*ADR-007 — Gate de Limpeza de Dados no Retrocesso do Fluxo*  
*Gerado por: Manus AI | Projeto: Plataforma COMPLIANCE da Reforma Tributária*  
*Sequência: ADR-001 → ADR-002 → ADR-003 → ADR-004 (rejeitado) → ADR-005 → ADR-006 → ADR-007*
