# CPIE v2 — Disaster Recovery

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado

---

## 1. Objetivos de Recuperação

| Métrica | Valor alvo | Descrição |
|---|---|---|
| **RTO** (Recovery Time Objective) | ≤ 4 horas | Tempo máximo para restaurar o serviço |
| **RPO** (Recovery Point Objective) | ≤ 6 horas | Perda máxima de dados aceitável |

---

## 2. Cenários de Desastre

### Cenário D1 — Indisponibilidade da IA

**Sintoma:** `analyzePreview` retorna erro ou timeout na chamada à IA.  
**Impacto:** Análises CPIE v2 retornam `AI-ERR` (hard_block). Usuários não conseguem criar projetos.  
**Severidade:** Alta — afeta criação de novos projetos.

**Procedimento:**
1. O sistema já trata automaticamente: falha da IA → `AI-ERR` → `hard_block` (fail-safe)
2. Verificar status da API Manus Built-in no painel da plataforma
3. Se indisponibilidade > 30 minutos, comunicar usuários via banner de manutenção
4. Não há ação de código necessária — o comportamento fail-safe é automático

**Tempo estimado de recuperação:** Dependente da plataforma Manus (SLA externo).

---

### Cenário D2 — Corrupção da tabela `consistency_checks`

**Sintoma:** Erros de banco ao salvar análises ou ao recuperar histórico.  
**Impacto:** Análises não são persistidas; histórico de auditoria inacessível.  
**Severidade:** Alta — afeta rastreabilidade e auditoria.

**Procedimento:**
1. Identificar o último backup íntegro (ver doc 17)
2. Acionar suporte da plataforma Manus para restore point-in-time
3. Após restore, verificar integridade com query de validação:
   ```sql
   SELECT COUNT(*), MIN(created_at), MAX(created_at)
   FROM consistency_checks
   WHERE analysis_version = 'cpie-v2.0';
   ```
4. Executar o script de regressão (ver doc 23) para validar que o motor funciona corretamente

**Tempo estimado de recuperação:** 2–4 horas (dependente do restore do banco).

---

### Cenário D3 — Deploy com regressão no motor CPIE v2

**Sintoma:** Cenários de teste começam a falhar após um deploy; comportamento do motor muda inesperadamente.  
**Impacto:** Análises incorretas — falsos positivos ou falsos negativos.  
**Severidade:** Crítica — afeta a confiabilidade do sistema.

**Procedimento:**
1. Identificar o checkpoint do último deploy estável
2. Executar rollback via UI da plataforma Manus (botão "Rollback" no checkpoint anterior)
3. Verificar que os testes passam no checkpoint restaurado:
   ```bash
   pnpm test server/cpie-v2.test.ts
   ```
4. Investigar a causa da regressão antes de novo deploy (ver doc 21)

**Tempo estimado de recuperação:** 30–60 minutos (rollback de código).

---

### Cenário D4 — Perda total do ambiente de produção

**Sintoma:** Plataforma Manus indisponível; projeto inacessível.  
**Impacto:** Total — sistema completamente fora do ar.  
**Severidade:** Crítica.

**Procedimento:**
1. Acionar suporte da plataforma Manus via https://help.manus.im
2. Aguardar restauração pela plataforma (SLA externo)
3. Após restauração, verificar integridade do banco e do código
4. Executar smoke tests básicos (ver doc 23, seção "Smoke Tests")

---

## 3. Runbook de Rollback de Código

Para reverter o código a um checkpoint anterior:

1. Acessar o painel de gerenciamento do projeto na plataforma Manus
2. Navegar até "Checkpoints" ou "Dashboard"
3. Identificar o checkpoint estável mais recente (antes da regressão)
4. Clicar em "Rollback" no checkpoint desejado
5. Aguardar a restauração (tipicamente < 5 minutos)
6. Verificar que o servidor está rodando:
   ```bash
   curl -s https://{dominio}/api/trpc/cpieV2.analyzePreview \
     -X POST -H "Content-Type: application/json" \
     -d '{"json":{"description":"teste","companySize":"mei","taxRegime":"mei","annualRevenueRange":"0-81000","operationType":"servicos","clientType":["b2c"],"hasImportExport":false,"multiState":false}}'
   ```
7. Verificar que a resposta contém `canProceed` e `analysisVersion: "cpie-v2.0"`

---

## 4. Comunicação de Incidentes

| Severidade | Tempo para comunicar | Canal |
|---|---|---|
| Crítica (D3, D4) | ≤ 15 minutos | Notificação direta ao P.O. |
| Alta (D1, D2) | ≤ 1 hora | Notificação ao P.O. |
| Média | ≤ 4 horas | Relatório de incidente |
