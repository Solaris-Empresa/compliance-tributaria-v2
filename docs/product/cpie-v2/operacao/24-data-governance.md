# CPIE v2 — Data Governance

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado

---

## 1. Princípios de Governança

O CPIE v2 adota quatro princípios fundamentais de governança de dados:

**Imutabilidade da trilha de auditoria:** registros de análise, override e aceite MEDIUM nunca são deletados ou alterados retroativamente. A trilha de auditoria é permanente.

**Rastreabilidade completa:** toda decisão do sistema (bloqueio, override, aceite) é registrada com timestamp, usuário, dados de entrada e resultado. É possível reconstruir o estado de qualquer análise em qualquer momento.

**Separação de responsabilidades:** dados de análise (motor) são separados de dados de negócio (projetos). A tabela `consistency_checks` não contém dados de negócio — apenas resultados de análise.

**Minimização de dados:** o motor não armazena o perfil completo da empresa — apenas os scores, conflitos e decisões. O perfil completo permanece na tabela `projects`.

---

## 2. Política de Retenção

| Dado | Tabela | Retenção | Justificativa |
|---|---|---|---|
| Análises CPIE v2 | `consistency_checks` | Indefinida | Trilha de auditoria permanente |
| Overrides de soft_block | `consistency_checks.accepted_risk_*` | Indefinida | Responsabilidade legal |
| Aceites MEDIUM | `consistency_checks.medium_acknowledged` | Indefinida | Rastreabilidade de decisões |
| Projetos | `projects` | Indefinida | Dados de negócio |
| Sessões de usuário | `sessions` | 30 dias | Segurança |

**Nota:** Não há exclusão automática de registros em `consistency_checks`. Em caso de necessidade legal de exclusão (LGPD), o processo deve ser manual e documentado.

---

## 3. Rastreabilidade de Análises

Cada análise persistida pode ser rastreada completamente através dos seguintes campos:

```sql
-- Reconstruir o histórico completo de um projeto
SELECT
  cc.id AS check_id,
  cc.created_at,
  cc.analysis_version,
  cc.overall_level,
  cc.can_proceed,
  cc.block_type,
  cc.accepted_risk,
  cc.accepted_risk_at,
  cc.accepted_risk_by,
  cc.accepted_risk_reason,
  cc.medium_acknowledged,
  u.name AS analyst_name
FROM consistency_checks cc
JOIN users u ON cc.user_id = u.id
WHERE cc.project_id = ?
ORDER BY cc.created_at ASC;
```

---

## 4. Versionamento de Análises

Cada registro em `consistency_checks` contém o campo `analysis_version` que identifica a versão do motor que produziu a análise. Isso permite:

1. Comparar resultados entre versões do motor
2. Identificar análises produzidas por versões com bugs conhecidos
3. Reprocessar análises antigas com uma nova versão do motor (quando necessário)

**Política de reprocessamento:** análises antigas não são reprocessadas automaticamente. Se necessário, o reprocessamento deve ser manual e documentado, criando um novo registro em `consistency_checks` (não substituindo o antigo).

---

## 5. Integridade de Dados

### 5.1 Validações no banco

```sql
-- Verificar integridade básica
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN can_proceed = 1 AND block_type IS NOT NULL THEN 1 ELSE 0 END) AS inconsistencias_can_proceed,
  SUM(CASE WHEN accepted_risk = 1 AND accepted_risk_at IS NULL THEN 1 ELSE 0 END) AS overrides_sem_timestamp,
  SUM(CASE WHEN medium_acknowledged = 1 AND can_proceed = 0 THEN 1 ELSE 0 END) AS medium_ack_sem_can_proceed
FROM consistency_checks
WHERE analysis_version = 'cpie-v2.0';
```

**Invariantes esperadas:**
- `inconsistencias_can_proceed = 0` — se `can_proceed=1`, não deve ter `block_type`
- `overrides_sem_timestamp = 0` — todo override deve ter timestamp
- `medium_ack_sem_can_proceed = 0` — aceite MEDIUM só é válido quando `can_proceed=true`

### 5.2 Verificação periódica

Executar mensalmente a query de integridade acima. Qualquer valor diferente de 0 indica inconsistência que deve ser investigada.

---

## 6. Conformidade LGPD

### 6.1 Dados pessoais no CPIE v2

A tabela `consistency_checks` contém:
- `user_id` — identificador do usuário (dado pessoal indireto)
- `accepted_risk_by` — ID do usuário que fez o override (dado pessoal indireto)
- `accepted_risk_reason` — pode conter o nome do usuário no log JSON

### 6.2 Direito ao esquecimento

Em caso de solicitação de exclusão de dados pessoais (LGPD Art. 18), o processo é:

1. Identificar todos os registros do usuário em `consistency_checks`
2. Avaliar se há obrigação legal de retenção (ex: auditoria fiscal)
3. Se não houver obrigação, anonimizar os campos pessoais:
   ```sql
   UPDATE consistency_checks
   SET
     user_id = 0,
     accepted_risk_by = 'ANONIMIZADO',
     accepted_risk_reason = REGEXP_REPLACE(accepted_risk_reason, '"userId":[0-9]+', '"userId":0')
   WHERE user_id = ?;
   ```
4. Documentar a anonimização com data e justificativa

### 6.3 Portabilidade de dados

Os dados de análise de um usuário podem ser exportados via:

```sql
SELECT
  cc.*,
  p.name AS project_name
FROM consistency_checks cc
JOIN projects p ON cc.project_id = p.id
WHERE cc.user_id = ?
ORDER BY cc.created_at ASC;
```

---

## 7. Auditoria de Overrides

Os overrides de soft_block são eventos de alto risco e devem ser auditados periodicamente.

### 7.1 Query de auditoria de overrides

```sql
-- Listar todos os overrides dos últimos 30 dias
SELECT
  cc.id,
  cc.project_id,
  cc.accepted_risk_at,
  cc.accepted_risk_by,
  cc.diagnostic_confidence,
  cc.overall_level,
  SUBSTRING(cc.accepted_risk_reason, 1, 200) AS justificativa_resumida
FROM consistency_checks cc
WHERE
  cc.accepted_risk = 1
  AND cc.accepted_risk_at > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY)) * 1000
ORDER BY cc.accepted_risk_at DESC;
```

### 7.2 Alertas de auditoria

O P.O. deve ser notificado quando:
- Mais de 10 overrides em 24 horas (possível abuso)
- Override com `diagnostic_confidence < 30` (perfil muito inconsistente sendo forçado)
- Mesmo usuário realizando mais de 5 overrides em 7 dias
