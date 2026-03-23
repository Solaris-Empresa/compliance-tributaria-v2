# ADR-008 — Estratégia de Migração F-04: Separação Física de Schema (briefingContent V1/V3)

**Status:** PROPOSTO — aguardando aprovação do Orquestrador  
**Data:** 2026-03-23  
**Autor:** Manus Agent  
**Relacionado:** Issue #56 (Sprint Final) | ADR-005 (aprovado) | ADR-007 (aprovado)  
**Pré-condição para:** Início da Issue #56

---

## Contexto

O ADR-005 (aprovado) definiu que as colunas de diagnóstico devem ser separadas fisicamente entre V1 e V3 para eliminar ambiguidade de leitura. O adaptador centralizado `getDiagnosticSource()` (F-01) já implementa a lógica de roteamento, mas as colunas no banco ainda compartilham o mesmo nome (`briefingContent`, `riskMatricesData`, `actionPlansData`).

A F-04 é a execução física dessa separação: renomear as colunas existentes e criar colunas novas, de forma que:

- `briefingContent` → `briefingContentV1` (dados de projetos V1)
- `briefingContentV3` (nova coluna, dados de projetos V3)
- `riskMatricesData` → `riskMatricesDataV1`
- `riskMatricesDataV3` (nova coluna)
- `actionPlansData` → `actionPlansDataV1`
- `actionPlansDataV3` (nova coluna)

O risco desta operação é **alto**: projetos V1 ativos têm dados em `briefingContent` que serão perdidos se a migration não copiar os dados antes de renomear.

---

## Decisão

### Estratégia de Migração em 4 Fases (Zero-Downtime)

A migração será executada em 4 fases sequenciais, cada uma com checkpoint de rollback antes de avançar.

#### Fase 1 — Adicionar colunas novas (sem remover as antigas)

```sql
ALTER TABLE projects ADD COLUMN briefingContentV1 TEXT;
ALTER TABLE projects ADD COLUMN briefingContentV3 TEXT;
ALTER TABLE projects ADD COLUMN riskMatricesDataV1 JSON;
ALTER TABLE projects ADD COLUMN riskMatricesDataV3 JSON;
ALTER TABLE projects ADD COLUMN actionPlansDataV1 JSON;
ALTER TABLE projects ADD COLUMN actionPlansDataV3 JSON;
```

**Critério de avanço:** TypeScript 0 erros | Testes passando | Servidor rodando.

#### Fase 2 — Copiar dados existentes para as colunas V1

```sql
-- Copiar dados de projetos V1 (flowVersion = 'v1' ou 'hybrid' ou NULL)
UPDATE projects
SET
  briefingContentV1 = briefingContent,
  riskMatricesDataV1 = riskMatricesData,
  actionPlansDataV1 = actionPlansData
WHERE flowVersion IN ('v1', 'hybrid') OR flowVersion IS NULL;

-- Copiar dados de projetos V3
UPDATE projects
SET
  briefingContentV3 = briefingContent,
  riskMatricesDataV3 = riskMatricesData,
  actionPlansDataV3 = actionPlansData
WHERE flowVersion = 'v3';
```

**Critério de avanço:** Contagem de linhas com dados nas novas colunas = contagem nas colunas antigas.

#### Fase 3 — Atualizar o código para usar as novas colunas

Atualizar `getDiagnosticSource()` e todos os endpoints para ler/escrever nas novas colunas (`briefingContentV1`, `briefingContentV3`, etc.) em vez das antigas.

**Critério de avanço:** TypeScript 0 erros | Todos os testes passando | Funcionalidade validada em dev.

#### Fase 4 — Remover colunas antigas (após validação em produção)

```sql
ALTER TABLE projects DROP COLUMN briefingContent;
ALTER TABLE projects DROP COLUMN riskMatricesData;
ALTER TABLE projects DROP COLUMN actionPlansData;
```

**Critério de avanço:** Monitoramento de 24h em produção sem erros relacionados às colunas removidas.

---

## Rollback

Cada fase tem um rollback definido:

| Fase | Rollback |
|---|---|
| Fase 1 | `ALTER TABLE projects DROP COLUMN briefingContentV1` (e demais novas colunas) |
| Fase 2 | Nenhum necessário — dados originais intactos nas colunas antigas |
| Fase 3 | Reverter o código via `webdev_rollback_checkpoint` para o checkpoint pré-F3 |
| Fase 4 | Restaurar backup do banco de dados (obrigatório antes de executar Fase 4) |

---

## Pré-condições Obrigatórias (conforme Orquestrador)

Antes de iniciar a Issue #56, as seguintes condições devem ser atendidas:

- [x] ADR-008 criado e submetido para aprovação
- [ ] ADR-008 aprovado pelo Orquestrador
- [ ] Checkpoint duplo criado (antes e depois de cada fase)
- [ ] Rollback drill executado em desenvolvimento com evidência documentada
- [ ] Issues #54 e #55 concluídas (pré-requisito de sequenciamento)

---

## Consequências

**Positivas:**
- Isolamento físico completo entre dados V1 e V3 — elimina risco de leitura cruzada
- `getDiagnosticSource()` pode ser simplificado (sem lógica de fallback entre colunas)
- Auditoria de dados mais clara (coluna com sufixo indica a versão do dado)

**Negativas:**
- Operação de alto risco em banco de dados com dados de produção
- Requer janela de manutenção para Fase 4 (DROP COLUMN)
- Aumenta o número de colunas na tabela `projects` temporariamente

---

## Alternativas Consideradas

**Alternativa A — Manter colunas compartilhadas (status quo):** Rejeitada. O adaptador `getDiagnosticSource()` já mitiga o risco de leitura cruzada, mas a ambiguidade de dados persiste no banco. Dificulta auditoria e futuras migrações.

**Alternativa B — Nova tabela `project_diagnostic_data`:** Rejeitada. Requer JOIN em todos os endpoints e aumenta a complexidade da query sem benefício proporcional. O ADR-005 já definiu que a separação deve ser por colunas na tabela `projects`.

---

## Referências

- ADR-005: Separação física de colunas V1/V3 (aprovado)
- ADR-007: Gate de limpeza no retrocesso (aprovado)
- Issue #56: F-04 Separação Física de Schema
- `server/diagnostic-source.ts`: adaptador centralizado de leitura
- `drizzle/schema.ts`: definição atual das colunas
