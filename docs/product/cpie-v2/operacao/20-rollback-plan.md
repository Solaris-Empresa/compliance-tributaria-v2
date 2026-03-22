# CPIE v2 — Plano de Rollback

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado

---

## 1. Quando Acionar o Rollback

O rollback deve ser acionado imediatamente quando qualquer uma das seguintes condições for detectada:

| Condição | Severidade | Ação |
|---|---|---|
| Cenários críticos da Matriz falhando em produção | Crítica | Rollback imediato |
| Taxa de `hard_block` acima de 80% das análises | Alta | Investigar → rollback se confirmado |
| Taxa de `soft_block` acima de 60% das análises | Alta | Investigar → rollback se confirmado |
| Erros de banco ao persistir análises | Alta | Rollback + restore de banco |
| Motor retornando `canProceed=true` para perfis claramente inválidos | Crítica | Rollback imediato |
| Falha total na chamada à IA sem fallback funcionando | Alta | Investigar → rollback se > 30 min |

---

## 2. Procedimento de Rollback de Código

### Passo 1 — Identificar o checkpoint estável

Acessar o painel de gerenciamento da plataforma Manus e identificar o último checkpoint antes da mudança problemática. O checkpoint deve ter sido criado com uma mensagem descritiva que permita identificação clara.

### Passo 2 — Executar o rollback

Clicar em "Rollback" no checkpoint identificado. O processo é automático e leva tipicamente menos de 5 minutos.

### Passo 3 — Verificar a restauração

Executar o smoke test básico:

```bash
# Verificar que o servidor está respondendo
curl -s https://{dominio}/api/trpc/cpieV2.analyzePreview \
  -X POST -H "Content-Type: application/json" \
  -d '{"json":{"description":"Empresa de consultoria de TI prestando serviços para clientes corporativos, faturamento de R$ 500 mil por mês","companySize":"pequena","taxRegime":"simples_nacional","annualRevenueRange":"360000-4800000","operationType":"servicos","clientType":["b2b"],"hasImportExport":false,"multiState":false}}'
```

**Resposta esperada:** `canProceed: true`, `analysisVersion: "cpie-v2.0"` (ou a versão do checkpoint restaurado).

### Passo 4 — Executar testes de regressão

```bash
pnpm test server/cpie-v2.test.ts server/cpieV2Router.test.ts
```

Todos os 35 cenários da Matriz devem passar.

### Passo 5 — Comunicar o P.O.

Notificar o P.O. com:
- Qual checkpoint foi restaurado
- Qual era o problema
- Estimativa para a correção definitiva

---

## 3. Rollback de Banco de Dados

O rollback de banco de dados é necessário apenas no Cenário D2 (corrupção da tabela). Ver doc 18 para o procedimento completo.

**Importante:** O rollback de código **não** reverte o banco de dados. Registros criados após o checkpoint problemático permanecem no banco. Isso é intencional para preservar a trilha de auditoria.

---

## 4. Decisão de Rollback vs. Hotfix

| Situação | Decisão recomendada |
|---|---|
| Bug crítico afetando > 50% dos usuários | Rollback imediato |
| Bug crítico afetando < 10% dos usuários | Hotfix (se < 2h para corrigir) |
| Regressão de performance (lentidão) | Hotfix (rollback apenas se > 10s de latência) |
| Falso positivo isolado | Hotfix |
| Falso negativo (aprovação indevida) | Rollback imediato |

---

## 5. Checklist Pós-Rollback

Após o rollback, verificar:

- [ ] Servidor respondendo corretamente
- [ ] Testes de regressão passando (35/35 cenários)
- [ ] Taxa de `hard_block` dentro do esperado (< 30% das análises)
- [ ] Logs sem erros críticos
- [ ] P.O. notificado
- [ ] Incidente registrado (data, causa, checkpoint restaurado, impacto)
