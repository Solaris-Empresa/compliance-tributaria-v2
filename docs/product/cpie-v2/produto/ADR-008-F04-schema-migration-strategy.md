# ADR-008 — Estratégia de Migração F-04: Separação Física de Schema (briefingContent V1/V3)

**Status:** PROPOSTO — aguardando aprovação do Orquestrador  
**Data:** 2026-03-23  
**Revisão:** v1.1 — SQL Fase 2 corrigido (2026-03-23)  
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

> **Nota técnica crítica (v1.1):** O campo `flowVersion` **não existe como coluna no banco de dados**. Ele é derivado em runtime pelo `determineFlowVersion()` com base nas colunas `questionnaireAnswers`, `corporateAnswers` e `operationalAnswers`. Todo SQL desta migração utiliza exclusivamente essas colunas reais como critério de classificação.

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

---

#### Fase 2 — Copiar dados existentes para as colunas corretas por versão

> **Critério de classificação:** A versão do fluxo é determinada pelas colunas reais do banco:
> - **V3:** `questionnaireAnswers IS NOT NULL` (snapshot do questionário adaptativo existe)
> - **V1:** `(corporateAnswers IS NOT NULL OR operationalAnswers IS NOT NULL) AND questionnaireAnswers IS NULL`
> - **Híbrido:** `questionnaireAnswers IS NOT NULL AND (corporateAnswers IS NOT NULL OR operationalAnswers IS NOT NULL)`
> - **None:** nenhuma das condições acima (sem dados de diagnóstico)

```sql
-- PASSO 2A: Projetos V3 (têm questionnaireAnswers, sem dados V1)
UPDATE projects
SET
  briefingContentV3  = briefingContent,
  riskMatricesDataV3 = riskMatricesData,
  actionPlansDataV3  = actionPlansData
WHERE questionnaireAnswers IS NOT NULL
  AND corporateAnswers IS NULL
  AND operationalAnswers IS NULL;

-- PASSO 2B: Projetos V1 (têm corporateAnswers/operationalAnswers, sem questionnaireAnswers)
UPDATE projects
SET
  briefingContentV1  = briefingContent,
  riskMatricesDataV1 = riskMatricesData,
  actionPlansDataV1  = actionPlansData
WHERE questionnaireAnswers IS NULL
  AND (corporateAnswers IS NOT NULL OR operationalAnswers IS NOT NULL);

-- PASSO 2C: Projetos híbridos (têm ambos — copiar para ambas as colunas)
-- Tratamento: manter ambas as cópias; decisão de normalização é pré-condição da Fase 3
UPDATE projects
SET
  briefingContentV1  = briefingContent,
  briefingContentV3  = briefingContent,
  riskMatricesDataV1 = riskMatricesData,
  riskMatricesDataV3 = riskMatricesData,
  actionPlansDataV1  = actionPlansData,
  actionPlansDataV3  = actionPlansData
WHERE questionnaireAnswers IS NOT NULL
  AND (corporateAnswers IS NOT NULL OR operationalAnswers IS NOT NULL);

-- PASSO 2D: Projetos sem dados (flowVersion='none') — nenhuma ação necessária
-- (briefingContent, riskMatricesData, actionPlansData já são NULL)
```

**Critério de avanço:** Contagem de linhas com dados nas novas colunas = contagem nas colunas antigas. Verificação obrigatória:

```sql
-- Verificação de integridade pós-cópia
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN briefingContent IS NOT NULL AND briefingContentV1 IS NULL AND briefingContentV3 IS NULL THEN 1 ELSE 0 END) AS nao_copiados
FROM projects;
-- Resultado esperado: nao_copiados = 0
```

**Pré-condição adicional para avançar da Fase 2 para a Fase 3:** Auditoria de projetos híbridos concluída e estratégia de tratamento aprovada pelo P.O. (ver seção "Projetos Híbridos" abaixo).

---

#### Fase 3 — Atualizar o código para usar as novas colunas

Atualizar `getDiagnosticSource()` e todos os endpoints para ler/escrever nas novas colunas (`briefingContentV1`, `briefingContentV3`, etc.) em vez das antigas.

**Critério de avanço:** TypeScript 0 erros | Todos os testes passando | Funcionalidade validada em dev.

---

#### Fase 4 — Remover colunas antigas (após validação em produção)

```sql
ALTER TABLE projects DROP COLUMN briefingContent;
ALTER TABLE projects DROP COLUMN riskMatricesData;
ALTER TABLE projects DROP COLUMN actionPlansData;
```

**Critério de avanço:** Monitoramento de 24h em produção sem erros relacionados às colunas removidas. Backup do banco obrigatório antes desta fase.

---

## Projetos Híbridos — Tratamento Obrigatório

Projetos com `flowVersion === "hybrid"` (têm dados V1 e V3 simultaneamente) representam um estado inválido documentado no ADR-005. Antes de avançar da Fase 2 para a Fase 3, é obrigatório:

1. Executar a query de auditoria (ver seção "Auditoria de Projetos Híbridos")
2. Quantificar e documentar os projetos híbridos encontrados
3. Decidir com o P.O. a estratégia de tratamento:
   - **Manter:** aceitar ambiguidade — dados copiados para ambas as colunas (padrão do Passo 2C)
   - **Normalizar:** definir manualmente qual versão é a "correta" para cada projeto híbrido
   - **Bloquear:** impedir que projetos híbridos avancem no fluxo até serem normalizados

---

## Rollback

Cada fase tem um rollback definido:

| Fase | Rollback |
|---|---|
| Fase 1 | `ALTER TABLE projects DROP COLUMN briefingContentV1` (e demais novas colunas) |
| Fase 2 | Nenhum necessário — dados originais intactos nas colunas antigas |
| Fase 3 | Reverter o código via `webdev_rollback_checkpoint` para o checkpoint pré-Fase 3 |
| Fase 4 | Restaurar backup do banco de dados (obrigatório antes de executar Fase 4) |

---

## Pré-condições Obrigatórias (conforme Orquestrador)

Antes de iniciar a Issue #56, as seguintes condições devem ser atendidas:

- [x] ADR-008 criado e submetido para aprovação
- [x] SQL da Fase 2 corrigido (v1.1 — sem referência a `flowVersion` como coluna)
- [x] Auditoria de projetos híbridos executada e documentada
- [ ] ADR-008 aprovado pelo Orquestrador
- [ ] Checkpoint duplo criado (antes e depois de cada fase)
- [ ] Rollback drill executado em desenvolvimento com evidência documentada
- [x] Issues #54 e #55 concluídas (pré-requisito de sequenciamento)
- [x] Issue de inconsistência de UX (botões "Voltar") criada e formalizada

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
- `server/diagnostic-source.ts`: adaptador centralizado de leitura — função `determineFlowVersion()`
- `drizzle/schema.ts`: definição atual das colunas
