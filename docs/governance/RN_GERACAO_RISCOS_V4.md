# Regras de Negócio — Geração de Riscos v4
## IA SOLARIS · risks_v4 · Sprint Z-07 a Z-13

---

## Princípio fundamental

```
O sistema de riscos é DETERMINÍSTICO.
Severidade, categoria, artigo e urgência vêm de tabelas fixas — NUNCA do LLM.
O LLM só redige a descrição textual do risco (campo descricao).
Nenhuma classificação é feita por LLM.
```

---

## Pipeline de geração — 3 passos

```
PASSO 1 — mapGapsToRules
  Lê project_gaps_v3 WHERE project_id = ?
  Para cada gap: tenta mapear para uma GapRule via ACL
  Resultado: mapped | ambiguous | unmapped

PASSO 2 — generateRisksFromGaps
  Para cada gap com status = 'mapped':
    Chama computeRiskMatrix() / buildRiskItems()
    Gera RiskItem determinístico
    (LLM chamado só para redigir campo descricao)
  Persiste em risks_v4

PASSO 3 — listRisks
  Frontend exibe risks_v4 WHERE project_id = ? AND status = 'active'
```

---

## Fontes de dados (3 Ondas)

```
Onda 1 — SOLARIS:
  Tabela: solaris_answers JOIN solaris_questions
  Chave:  solaris_questions.risk_category_code
  Fonte:  'solaris' (SOURCE_RANK = 4)

Onda 2 — IA GEN:
  Tabela: iagen_answers
  Chave:  iagen_answers.risk_category_code
  Fonte:  'iagen' (SOURCE_RANK = 5)

Onda 3 — RAG (principal):
  Tabela: regulatory_requirements_v3 (138 requisitos)
  Chave:  req.code (REQ-APU-001 etc.)
  Fonte:  ncm | cnae | nbs (SOURCE_RANK 1-3)
```

---

## SOURCE_RANK — prioridade de fontes (inviolável)

```typescript
const SOURCE_RANK: Record<string, number> = {
  qcnae:   1,  // CNAE — maior confiança
  ncm:     2,
  nbs:     3,
  solaris: 4,
  iagen:   5,  // IA Gen — menor confiança
}
```

Regras de uso:
- A `evidence[]` de cada risco é ordenada por SOURCE_RANK crescente
- `sourcePriority` do risco = fonte com menor SOURCE_RANK na evidence
- Nó 1 do breadcrumb = SOURCE_RANK mais baixo disponível

---

## Mapeamento determinístico — SEVERITY

```typescript
const SEVERITY: Record<string, string> = {
  imposto_seletivo:     'alta',
  confissao_automatica: 'alta',
  split_payment:        'alta',
  inscricao_cadastral:  'media',
  regime_diferenciado:  'media',
  transicao_iss_ibs:    'media',
  obrigacao_acessoria:  'media',
  aliquota_zero:        'oportunidade',
  aliquota_reduzida:    'oportunidade',
  credito_presumido:    'oportunidade',
  tributacao_servicos:  'alta',
}
```

---

## Mapeamento determinístico — URGENCIA

```typescript
const URGENCIA: Record<string, string> = {
  imposto_seletivo:     'imediata',
  confissao_automatica: 'imediata',
  split_payment:        'imediata',
  inscricao_cadastral:  'imediata',
  regime_diferenciado:  'curto_prazo',
  obrigacao_acessoria:  'curto_prazo',
  aliquota_zero:        'curto_prazo',
  aliquota_reduzida:    'curto_prazo',
  credito_presumido:    'curto_prazo',
  transicao_iss_ibs:    'medio_prazo',
}
```

---

## Mapeamento determinístico — TYPE

```typescript
const TYPE: Record<string, string> = {
  aliquota_zero:    'opportunity',
  aliquota_reduzida:'opportunity',
  credito_presumido:'opportunity',
  // default para todas as demais: 'risk'
}
```

**Invariante:** `type = 'opportunity'` → sem plano de ação gerado.

---

## Estrutura do RiskItem gerado

```typescript
interface RiskItem {
  id:             string      // 'RISK-{ruleId}-{seq}'
  ruleId:         string      // ex: 'GAP-IS-001'
  type:           'risk' | 'opportunity'
  categoria:      string      // ex: 'imposto_seletivo'
  areaViews:      string[]    // ex: ['fiscal', 'juridico']
  titulo:         string      // de GapRule.titulo
  descricao:      string      // ← único campo gerado por LLM
  artigo:         string      // de GapRule.artigo — NUNCA inventado
  artigosRel:     string[]    // artigos relacionados
  severidade:     string      // de SEVERITY[categoria]
  urgencia:       string      // de URGENCIA[categoria]
  evidence:       Evidence[]  // ordenada por SOURCE_RANK
  breadcrumb:     Breadcrumb[]// 4 nós fixos
  sourcePriority: string      // fonte de menor SOURCE_RANK
  confidence:     number      // 0.0 a 1.0
}
```

---

## Breadcrumb — 4 nós fixos e obrigatórios

```typescript
breadcrumb: [
  { label: '[SOURCE]',    value: buildLabel(primary), type: 'source'   },
  { label: 'categoria',   value: categoria,           type: 'category' },
  { label: 'base legal',  value: artigo,              type: 'article'  },
  { label: 'gap',         value: ruleId,              type: 'rule'     },
]
```

Regra: sempre 4 nós, sempre nessa ordem, nunca NULL.

---

## ACL — Anti-Corruption Layer (gap-to-rule-mapper)

```
Para cada gap em project_gaps_v3:

  SE risk_category_code existe em risk_categories
    E há exatamente 1 GapRule que cobre essa categoria:
    → status = 'mapped'   → gera risco

  SE há 2+ GapRules candidatas:
    → status = 'ambiguous' → vai para reviewQueue (não gera risco automaticamente)

  SE nenhuma GapRule encontrada:
    → status = 'unmapped'  → não gera risco
```

---

## Regras de negócio — geração

```
RN-RISK-01: artigo NUNCA pode ser NULL — vem de GapRule.artigo
RN-RISK-02: severidade NUNCA vem do LLM — sempre de SEVERITY[categoria]
RN-RISK-03: categoria NUNCA vem do LLM — vem de risk_category_code
RN-RISK-04: 1 gap mapeado → 1 risco (nunca N riscos por gap)
RN-RISK-05: type = 'opportunity' → buildActionPlans retorna []
RN-RISK-06: ruleId nunca NULL — rastreável ao gap-engine
RN-RISK-07: approved_at = NULL ao ser criado (pending)
RN-RISK-08: status = 'active' ao ser criado
RN-RISK-09: evidence ordenada por SOURCE_RANK crescente
RN-RISK-10: confidence = gap.confidence (0.0–1.0)
```

---

## Persistência em risks_v4

```sql
INSERT INTO risks_v4 (
  id, project_id, rule_id, type,
  categoria, area_views, titulo, descricao,
  artigo, artigos_rel, severidade, urgencia,
  evidence, breadcrumb, source_priority, confidence,
  status, approved_by, approved_at,
  created_by, created_at, updated_at
) VALUES (...)

-- approved_by = NULL (pending ao criar)
-- approved_at = NULL (pending ao criar)
-- status = 'active'
```

---

## Aprovação do risco

```
Quem aprova: advogado (Dr. Rodrigues ou equivalente)
Quando: após análise manual no RiskDashboardV4

Procedure: trpc.risksV4.approveRisk({ riskId })
  SET approved_at = NOW()
      approved_by = ctx.user.id
  INSERT audit_log: action = 'approved', entity = 'risk'

Efeito: card muda de âmbar (pending) para verde (approved)
        botão "Aprovar risco" some do card
        planos de ação ficam visíveis
```

---

## Exclusão do risco (soft delete)

```
Procedure: trpc.risksV4.deleteRisk({ riskId, reason })
  SET status = 'deleted', deleted_reason = reason
  Cascata: action_plans WHERE risk_id = riskId → status = 'deleted'
  Cascata: tasks WHERE action_plan_id IN [...] → status = 'deleted'
  INSERT audit_log: action = 'deleted', before_state + reason

Regra: reason.length >= 10 (obrigatório)
Restore: disponível por 90 dias via restoreRisk
```

---

*IA SOLARIS · Regras de Negócio · Geração de Riscos v4*
*Determinístico: severidade/categoria/artigo vêm do engine, nunca do LLM*
