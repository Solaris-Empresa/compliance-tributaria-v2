# Matriz de Rastreabilidade: Requisito → Pergunta → Gap → Risco → Ação

**Versão:** 1.1  
**Data:** 2026-03-26  
**Status:** Aprovada — gate B1 liberado para B2. Atualizada com anchor_ids canônicos (DEC-002), exemplos reais do pilot-audit, tabela de domínios e invariants formais.  
**Versão anterior:** 1.0 (2026-03-23) — proposta inicial  
**Issue:** [#65](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/65)  
**ADR:** [ADR-010](../../adr/ADR-010-content-architecture-98.md)

---

## Visão geral

Este documento formaliza a cadeia de rastreabilidade completa da plataforma IA SOLARIS: cada requisito normativo aplicável deve ser rastreável até a ação corretiva, sem lacunas. A cadeia é inviolável — nenhum nó pode existir sem o nó anterior.

```
regulatory_requirements_v3.code  (ex: REQ-GOV-001)
  └── ragDocuments.anchor_id       (ex: lc214-art-125-par-1-1)
        └── Question.requirement_id + Question.anchor_id
              └── Gap.requirement_id + Gap.compliance_status
                    └── Risk.gap_id + Risk.fundamentacao.dispositivos[]
                          └── Action.risk_id + Action.fonte_acao.anchor_id
```

Cada nó da cadeia é rastreável ao nó anterior. A ausência de qualquer elo é um **bloqueador de implementação** verificado em CI pelos invariants INV-001 a INV-008.

---

## Schema canônico por nó

### Nó 1 — Requisito (Requirement)

```typescript
interface Requirement {
  id: string;                    // "RF-001"
  source: string;                // "LC 214/2024 Art. 10 §2º"
  source_law: string;            // "LC 214/2024"
  source_article: string;        // "Art. 10 §2º"
  description: string;           // Descrição do requisito
  applicable: boolean;           // true = aplicável ao perfil da empresa
  layer: "corporativo" | "operacional" | "cnae";
  cnae_scope: string[];          // CNAEs para os quais este requisito é aplicável
  porte_scope: string[];         // Portes para os quais é aplicável
  regime_scope: string[];        // Regimes tributários aplicáveis
  uf_scope: string[];            // UFs aplicáveis ([] = todas)
  mandatory: boolean;            // true = obrigatório, false = condicional
}
```

### Nó 2 — Pergunta (Question)

```typescript
interface Question {
  id: string;                    // "Q-CORP-001"
  requirement_id: string;        // "RF-001" — OBRIGATÓRIO
  question_text: string;         // Texto da pergunta
  source_type: "regulatory" | "jurisprudence" | "best_practice" | "ai";
  source_reference: string;      // "LC 214/2024 Art. 10 §2º" — OBRIGATÓRIO
  confidence: "high" | "medium" | "low";
  score: number;                 // 1.0 a 5.0 (LLM-as-judge)
  stage: "corporativo" | "operacional" | "cnae";
  cnae_code?: string;            // Preenchido apenas para stage "cnae"
  deduplication_hash: string;    // Hash semântico para deduplicação
  blocked_by_no_question: boolean; // true = bloqueada por falta de grounding RAG
  // Ajuste obrigatório do Orquestrador (gate B1 — 2026-03-24)
  quality_gate_status: "approved" | "pending_valid_question" | "no_valid_question_generated";
  quality_gate_attempts: number; // 1 ou 2; após 2 tentativas → no_valid_question_generated
}
```

**Regra:** `source_type === "ai"` → `confidence: "low"`, requer revisão humana.  
**Regra:** `blocked_by_no_question === true` → pergunta não incluída no questionário.  
**Regra (Orquestrador):** `score < 3.5` → pergunta descartada; requisito permanece `pending_valid_question`; sistema tenta reformular (até 2 tentativas); após 2 falhas → `no_valid_question_generated`.

### Nó 3 — Gap

```typescript
interface Gap {
  id: string;                    // "GAP-001"
  question_id: string;           // "Q-CORP-001" — OBRIGATÓRIO
  requirement_id: string;        // "RF-001" — OBRIGATÓRIO
  gap_status: "atende" | "nao_atende" | "parcial" | "evidencia_insuficiente" | "nao_aplicavel";
  confidence: "high" | "medium" | "low";
  evidence: string;              // Resposta do usuário que fundamenta a classificação
  classification_method: "deterministic" | "llm_assisted";
  llm_justification?: string;    // Preenchido quando classification_method = "llm_assisted"
  // Ajuste obrigatório do Orquestrador (gate B1 — 2026-03-24)
  evaluation_confidence: "high" | "medium" | "low";
  evaluation_confidence_reason?: string; // obrigatório quando "low"
}
```

**Regra:** `gap_status === "nao_aplicavel"` → excluído do cálculo de coverage.  
**Regra:** `gap_status === "evidencia_insuficiente"` → tratado como risco oculto de alta severidade.  
**Regra (Orquestrador):** `evaluation_confidence` derivado por regras determinísticas: `deterministic + evidence` → `high`; `llm_assisted + evidence` → `medium`; `evidencia_insuficiente` ou `evidence` vazio → `low` (sempre).

### Nó 4 — Risco (Risk)

```typescript
interface Risk {
  id: string;                    // "RISK-001"
  gap_id: string;                // "GAP-001" — OBRIGATÓRIO
  requirement_id: string;        // "RF-001" — OBRIGATÓRIO
  taxonomy: {
    domain: "tributário" | "trabalhista" | "previdenciário" | "societário" | "operacional";
    category: string;            // "apuração" | "recolhimento" | "obrigações_acessórias" | ...
    type: string;                // "erro_aliquota_cbs" | "atraso_recolhimento_ibs" | ...
  };
  risk_description: string;
  severity: "alta" | "média" | "baixa";
  probability: "alta" | "média" | "baixa";
  score_base: number;            // severity_num × probability_num (1-9)
  ia_adjustment: number;         // -1.0 a +1.0
  ia_adjustment_justification?: string;
  score_final: number;           // score_base + ia_adjustment (normalizado 1-10)
  impact_financial: string;      // "Multa de até 150% do tributo devido"
  impact_legal: string;          // "Autuação fiscal + juros SELIC"
  cluster_id?: string;           // ID do cluster semântico (quando agrupado)
  is_hidden_risk: boolean;       // true quando origem é evidencia_insuficiente
  // Recomendação do Orquestrador (Contextual Risk Layer — caminho para 98%)
  origin: "gap" | "contextual" | "gap+context";
  // "gap"         → obrigatório (deriva de gap_id)
  // "contextual"  → permitido (deriva de combinação de fatores do perfil)
  // "gap+context" → permitido (gap amplificado por contexto sistêmico)
  // sem origem    → proibido (bloqueador)
}
```

**Regra:** risco sem `gap_id` → **não existe** (bloqueador de implementação), exceto quando `origin === "contextual"`.  
**Regra:** `is_hidden_risk === true` → severidade padrão "alta", mesmo sem evidência direta.  
**Regra (Contextual Risk Layer):** `origin === "contextual"` → risco sistêmico derivado da combinação de fatores do perfil (multi-CNAE, multi-UF, ERP legado, operação interestadual). Não requer `gap_id`, mas requer `contextual_factors` documentados.

### Nó 5 — Ação (Action)

```typescript
interface Action {
  id: string;                    // "ACTION-001"
  risk_id: string;               // "RISK-001" — OBRIGATÓRIO
  gap_id: string;                // "GAP-001" — OBRIGATÓRIO
  requirement_id: string;        // "RF-001" — OBRIGATÓRIO
  template_id: string;           // "ACT-TRIB-001" — OBRIGATÓRIO
  action_description: string;    // Texto da ação (preenchido a partir do template)
  priority: "crítica" | "alta" | "média" | "baixa";
  deadline_days: number;         // Prazo em dias (calculado deterministicamente)
  deadline_date: Date;           // Data calculada a partir de deadline_days + data_geração
  responsible: string;           // "contador_tributario" | "advogado_tributarista" | ...
  evidence_required: string;     // "DCTF retificadora ou nota de crédito" — OBRIGATÓRIO
  status: "pendente" | "em_andamento" | "concluída" | "cancelada";
}
```

**Regra:** ação sem `risk_id` → **não existe** (bloqueador de implementação).  
**Regra:** ação sem `evidence_required` → incompleta (não pode ser marcada como concluída).

---

## Exemplos concretos com requisitos reais

### Exemplo 1 — LC 214/2024 Art. 10 (CBS sobre serviços)

**Requisito:**
```json
{
  "id": "RF-001",
  "source": "LC 214/2024 Art. 10 §2º",
  "source_law": "LC 214/2024",
  "source_article": "Art. 10 §2º",
  "description": "Empresas prestadoras de serviços sujeitas ao CBS devem apurar o tributo sobre a receita bruta de serviços, excluídas as deduções previstas em lei",
  "applicable": true,
  "layer": "corporativo",
  "cnae_scope": [],
  "porte_scope": ["ME", "EPP", "Médio", "Grande"],
  "regime_scope": ["Lucro Presumido", "Lucro Real"],
  "mandatory": true
}
```

**Pergunta:**
```json
{
  "id": "Q-CORP-001",
  "requirement_id": "RF-001",
  "question_text": "Sua empresa apura e recolhe CBS sobre a receita bruta de serviços, aplicando corretamente as deduções previstas na LC 214/2024?",
  "source_type": "regulatory",
  "source_reference": "LC 214/2024 Art. 10 §2º",
  "confidence": "high",
  "score": 4.5,
  "stage": "corporativo"
}
```

**Gap:**
```json
{
  "id": "GAP-001",
  "question_id": "Q-CORP-001",
  "requirement_id": "RF-001",
  "gap_status": "nao_atende",
  "confidence": "high",
  "evidence": "Empresa declarou que ainda não adaptou o sistema de apuração para a nova alíquota CBS",
  "classification_method": "deterministic"
}
```

**Risco:**
```json
{
  "id": "RISK-001",
  "gap_id": "GAP-001",
  "requirement_id": "RF-001",
  "taxonomy": {
    "domain": "tributário",
    "category": "apuração",
    "type": "erro_aliquota_cbs"
  },
  "risk_description": "Apuração incorreta de CBS sobre receita de serviços, com risco de autuação fiscal retroativa",
  "severity": "alta",
  "probability": "alta",
  "score_base": 9,
  "ia_adjustment": 0.5,
  "ia_adjustment_justification": "Empresa em período de transição com prazo legal próximo",
  "score_final": 9.5,
  "impact_financial": "Multa de 75% a 150% do tributo devido + juros SELIC",
  "impact_legal": "Auto de infração + representação fiscal para fins penais se valor > R$2,5M",
  "is_hidden_risk": false
}
```

**Ação:**
```json
{
  "id": "ACTION-001",
  "risk_id": "RISK-001",
  "gap_id": "GAP-001",
  "requirement_id": "RF-001",
  "template_id": "ACT-TRIB-001",
  "action_description": "Revisar e atualizar o sistema de apuração de CBS para operações de prestação de serviços, corrigindo a alíquota e as deduções conforme LC 214/2024 Art. 10 §2º. Emitir DCTF retificadora para os períodos afetados.",
  "priority": "crítica",
  "deadline_days": 15,
  "responsible": "contador_tributario",
  "evidence_required": "DCTF retificadora protocolada + comprovante de recolhimento do tributo complementar"
}
```

---

### Exemplo 2 — EC 132/2023 (Reforma Tributária — IBS)

**Requisito:**
```json
{
  "id": "RF-045",
  "source": "EC 132/2023 Art. 156-A",
  "source_law": "EC 132/2023",
  "source_article": "Art. 156-A",
  "description": "Empresas com operações interestaduais devem apurar o IBS com base na alíquota do estado de destino da operação",
  "applicable": true,
  "layer": "operacional",
  "cnae_scope": [],
  "porte_scope": ["ME", "EPP", "Médio", "Grande"],
  "regime_scope": ["Lucro Presumido", "Lucro Real"],
  "mandatory": true
}
```

**Pergunta:**
```json
{
  "id": "Q-OPER-045",
  "requirement_id": "RF-045",
  "question_text": "Para operações interestaduais, sua empresa já adaptou o sistema de faturamento para aplicar a alíquota do IBS do estado de destino, conforme exigido pela EC 132/2023?",
  "source_type": "regulatory",
  "source_reference": "EC 132/2023 Art. 156-A",
  "confidence": "high",
  "score": 4.3,
  "stage": "operacional"
}
```

**Gap:**
```json
{
  "id": "GAP-045",
  "question_id": "Q-OPER-045",
  "requirement_id": "RF-045",
  "gap_status": "evidencia_insuficiente",
  "confidence": "medium",
  "evidence": "Empresa declarou 'estamos verificando com o sistema', sem evidência objetiva de adaptação",
  "classification_method": "deterministic"
}
```

**Risco (oculto — evidência insuficiente):**
```json
{
  "id": "RISK-045",
  "gap_id": "GAP-045",
  "requirement_id": "RF-045",
  "taxonomy": {
    "domain": "tributário",
    "category": "apuração",
    "type": "ibs_interestadual_sem_evidencia"
  },
  "risk_description": "Risco oculto de apuração incorreta do IBS interestadual. A empresa não apresentou evidência de adaptação do sistema.",
  "severity": "alta",
  "probability": "alta",
  "score_base": 9,
  "ia_adjustment": 0,
  "score_final": 9.0,
  "impact_financial": "Diferença de alíquota IBS interestadual + multa de 75%",
  "impact_legal": "Autuação fiscal pelo estado de destino",
  "is_hidden_risk": true
}
```

**Ação:**
```json
{
  "id": "ACTION-045",
  "risk_id": "RISK-045",
  "gap_id": "GAP-045",
  "requirement_id": "RF-045",
  "template_id": "ACT-TRIB-IBS-001",
  "action_description": "Solicitar ao departamento de TI ou ao fornecedor do ERP documentação comprobatória de que o sistema de faturamento foi atualizado para aplicar a alíquota do IBS do estado de destino em operações interestaduais, conforme EC 132/2023 Art. 156-A.",
  "priority": "crítica",
  "deadline_days": 15,
  "responsible": "contador_tributario",
  "evidence_required": "Documentação técnica do ERP ou relatório de testes demonstrando a aplicação correta da alíquota IBS por estado de destino"
}
```

---

### Exemplo 3 — LC 224/2024 (Benefícios Fiscais — Setor de Varejo)

**Requisito:**
```json
{
  "id": "RF-067",
  "source": "LC 224/2024 Art. 8º",
  "source_law": "LC 224/2024",
  "source_article": "Art. 8º",
  "description": "Empresas do setor varejista (CNAE 47xx) podem solicitar crédito presumido de CBS sobre insumos adquiridos de produtores rurais, desde que comprovem a cadeia de aquisição",
  "applicable": true,
  "layer": "cnae",
  "cnae_scope": ["4711-3/01", "4711-3/02", "4712-1/00"],
  "porte_scope": ["EPP", "Médio", "Grande"],
  "regime_scope": ["Lucro Presumido", "Lucro Real"],
  "mandatory": false
}
```

**Pergunta:**
```json
{
  "id": "Q-CNAE-067",
  "requirement_id": "RF-067",
  "question_text": "Sua empresa adquire produtos de produtores rurais para revenda? Se sim, possui documentação comprobatória (notas fiscais de produtor rural) para solicitar o crédito presumido de CBS previsto na LC 224/2024?",
  "source_type": "regulatory",
  "source_reference": "LC 224/2024 Art. 8º",
  "confidence": "high",
  "score": 4.1,
  "stage": "cnae",
  "cnae_code": "4711-3/01"
}
```

**Gap:**
```json
{
  "id": "GAP-067",
  "question_id": "Q-CNAE-067",
  "requirement_id": "RF-067",
  "gap_status": "parcial",
  "confidence": "high",
  "evidence": "Empresa adquire de produtores rurais mas não possui toda a documentação organizada para solicitar o crédito",
  "classification_method": "deterministic"
}
```

**Risco:**
```json
{
  "id": "RISK-067",
  "gap_id": "GAP-067",
  "requirement_id": "RF-067",
  "taxonomy": {
    "domain": "tributário",
    "category": "benefícios_fiscais",
    "type": "credito_presumido_cbs_nao_aproveitado"
  },
  "risk_description": "Perda de crédito presumido de CBS sobre aquisições de produtores rurais por falta de documentação organizada",
  "severity": "média",
  "probability": "alta",
  "score_base": 6,
  "ia_adjustment": 0.5,
  "score_final": 6.5,
  "impact_financial": "Perda estimada de R$X em créditos tributários não aproveitados (calcular com base no volume de compras de produtores rurais)",
  "impact_legal": "Sem risco de autuação — risco de oportunidade perdida",
  "is_hidden_risk": false
}
```

**Ação:**
```json
{
  "id": "ACTION-067",
  "risk_id": "RISK-067",
  "gap_id": "GAP-067",
  "requirement_id": "RF-067",
  "template_id": "ACT-TRIB-CREDITO-001",
  "action_description": "Organizar e arquivar todas as notas fiscais de produtor rural dos últimos 5 anos. Calcular o montante de crédito presumido de CBS não aproveitado. Protocolar pedido de aproveitamento retroativo junto à Receita Federal, conforme LC 224/2024 Art. 8º.",
  "priority": "média",
  "deadline_days": 60,
  "responsible": "contador_tributario",
  "evidence_required": "Planilha de notas fiscais de produtor rural organizadas + protocolo do pedido de aproveitamento de crédito"
}
```

---

## Regras de validação da cadeia

As seguintes validações devem ser executadas pelo sistema antes de gerar os outputs:

| Validação | Regra | Bloqueador? |
|-----------|-------|-------------|
| Pergunta sem requirement_id | `question.requirement_id` obrigatório | ✅ Sim |
| Pergunta sem source_reference | `question.source_reference` obrigatório | ✅ Sim |
| Pergunta com score < 3.5 | Descartar; requisito → `pending_valid_question`; reformular até 2x | ✅ Sim |
| Pergunta após 2 tentativas sem score ≥ 3.5 | Requisito → `no_valid_question_generated`; bloquear gate | ✅ Sim |
| Gap sem question_id | `gap.question_id` obrigatório | ✅ Sim |
| Gap sem requirement_id | `gap.requirement_id` obrigatório | ✅ Sim |
| Gap sem evaluation_confidence | `gap.evaluation_confidence` obrigatório (ajuste Orquestrador) | ✅ Sim |
| Risco sem gap_id | `risk.gap_id` obrigatório | ✅ Sim |
| Risco sem impact_financial | `risk.impact_financial` obrigatório | ✅ Sim |
| Ação sem risk_id | `action.risk_id` obrigatório | ✅ Sim |
| Ação sem evidence_required | `action.evidence_required` obrigatório | ✅ Sim |
| Coverage < 100% (fórmula corrigida: 4 critérios) | Bloquear geração do briefing | ✅ Sim |
| `pending_valid_question_ids.length > 0` | Bloquear gate (sem pergunta válida = sem cobertura) | ✅ Sim |
| Conflito crítico de consistência | Bloquear geração do briefing | ✅ Sim |
| ia_adjustment fora de [-1.0, +1.0] | Rejeitar ajuste | ✅ Sim |

---

---

## Exemplos reais do pilot-audit (dados de produção)

Os exemplos a seguir são extraídos diretamente do `scripts/pilot-audit.mjs` — dados reais inseridos no banco de produção durante o piloto com 3 perfis de empresa (P1: Simples, P2: Complexo, P3: Inconsistente).

### REQ-GOV-001 — Como o mesmo requisito gera gaps diferentes por empresa

**Requisito:** `REQ-GOV-001` — Mapear incidência piloto de IBS/CBS em 2026  
**Domínio:** `governanca_transicao` | **anchor_id RAG:** `lc214-art-1-par-1-1` (faixa canônica: CAN-0161..CAN-0200)

| Empresa | compliance_status | risk_level | risk_score_normalized | action_priority |
|---|---|---|---|---|
| P1 — Simples (1 CNAE, 1 UF) | `nao_atendido` | `alto` | 64 | `imediata` |
| P2 — Complexo (4 CNAEs, 4 UFs) | `nao_atendido` | `critico` | 86 | `imediata` |
| P3 — Inconsistente | `parcialmente_atendido` | `critico` | 77 | `imediata` |

**Cadeia completa para P1:**
```
REQ-GOV-001
  └── anchor_id: lc214-art-1-par-1-1
        └── Q-GOV-001 (requirement_id=REQ-GOV-001, anchor_id=lc214-art-1-par-1-1)
              └── GAP-P1-001 (compliance_status=nao_atendido, evaluation_confidence=high)
                    └── RSK-P1-001 (gap_id=GAP-P1-001, risk_score_normalized=64, level=alto)
                          └── ACT-P1-001 (risk_id=RSK-P1-001, priority=imediata, deadline=30d)
                                fonte_acao: { lei: lc214, anchor_id: lc214-art-1-par-1-1 }
```

**Cadeia completa para P2 (Complexo — 4 CNAEs, 4 UFs, R$ 150M):**
```
REQ-GOV-001
  └── anchor_id: lc214-art-1-par-1-1
        └── Q-GOV-001 (mesmo requisito, mesmo anchor_id)
              └── GAP-P2-001 (compliance_status=nao_atendido, evaluation_confidence=high)
                    └── RSK-P2-001 (gap_id=GAP-P2-001, risk_score_normalized=86, level=critico)
                          └── ACT-P2-001 (risk_id=RSK-P2-001, priority=imediata, deadline=15d)
                                Nota: prazo menor (15d vs 30d) por risco crítico + porte Grande
```

### REQ-GOV-003 — Risco oculto detectado pela cadeia (P3)

**Requisito:** `REQ-GOV-003` — Criar plano formal de prontidão 2026  
**anchor_id RAG:** `lc214-art-3-par-1-1` | **gap_status:** `nao_atendido` | **is_hidden_risk:** `true`

```
REQ-GOV-003
  └── anchor_id: lc214-art-3-par-1-1
        └── Q-GOV-003 (requirement_id=REQ-GOV-003)
              └── GAP-P3-003 (compliance_status=nao_atendido, evaluation_confidence=high)
                    │  RISCO OCULTO: Empresa afirma ter plano (2024) mas EC 132 não está coberta
                    │  Gap Engine detectou: documento datado 15/08/2024, EC 132 publicada 20/12/2023
                    └── RSK-P3-001 (is_hidden_risk=true, risk_score_normalized=77, level=critico)
                          └── ACT-P3-001 (priority=imediata, deadline=15d)
                                Ação: URGENTE — Atualizar plano incorporando EC 132 e LC 214
```

**Por que é risco oculto?** A empresa P3 respondeu afirmativamente à pergunta sobre o plano de prontidão, mas o Gap Engine identificou contradição: o plano existente (2024) não cobre a EC 132/2023 (publicada em dezembro de 2023). Sem a cadeia de rastreabilidade, esse risco seria invisível — a empresa acreditaria estar em conformidade.

---

## Tabela de rastreabilidade por domínio

Os 12 domínios do produto, com seus canonical_ids, faixas RAG e requisitos correspondentes:

| Domínio | Reqs | Faixa Canonical ID | Faixa RAG (anchor_id) | Tipo |
|---|---|---|---|---|
| `documentos_obrigacoes` | ~60 | CAN-0001..CAN-0060 | `lc214-art-*` (obrigações documentais) | obrigacao |
| `apuracao_extincao` | ~50 | CAN-0061..CAN-0110 | `lc214-art-*` (apuração IBS/CBS) | obrigacao |
| `creditos_ressarcimento` | ~50 | CAN-0111..CAN-0160 | `lc214-art-*` (créditos e ressarcimento) | direito |
| `governanca_transicao` | 12 | CAN-0161..CAN-0200 | `lc214-art-1..art-50` / `ec132-art-*` | obrigacao |
| `classificacao_incidencia` | ~40 | CAN-0201..CAN-0240 | `lc214-art-*` (classificação) | obrigacao |
| `regimes_diferenciados` | ~40 | CAN-0241..CAN-0280 | `lc214-art-*` (regimes especiais) | obrigacao |
| `sistemas_erp_dados` | ~40 | CAN-0281..CAN-0320 | `lc214-art-*` (ERP e dados fiscais) | obrigacao |
| `incentivos_beneficios_transparencia` | ~40 | CAN-0321..CAN-0360 | `lc224-art-*` (incentivos) | direito |
| `split_payment` | ~40 | CAN-0361..CAN-0400 | `lc214-art-*` (split payment) | obrigacao |
| `conformidade_fiscalizacao_contencioso` | ~40 | CAN-0401..CAN-0440 | `lc214-art-*` (fiscalização) | obrigacao |
| `contratos_comercial_precificacao` | ~30 | CAN-0441..CAN-0470 | `lc214-art-*` (contratos) | obrigacao |
| `cadastro_identificacao` | ~29 | CAN-0471..CAN-0499 | `lc214-art-*` (cadastro fiscal) | obrigacao |
| **Total** | **499** | CAN-0001..CAN-0499 | 2.078+ chunks no corpus | — |

**Fonte:** `scripts/create-d7-mapping.mjs` (12 domínios, 499 canonical_ids)

---

## Invariants formais (verificados em CI)

Os invariants abaixo são verificados automaticamente em cada deploy pela suíte de testes. Uma violação de qualquer invariant é um **bloqueador de merge**.

| Invariant | Regra | Verificação |
|---|---|---|
| **INV-001** | `pergunta.requirement_id` → existe em `regulatory_requirements_v3` | Teste de FK em CI |
| **INV-002** | `pergunta.anchor_id` → existe em `ragDocuments` | Teste de FK em CI |
| **INV-003** | `gap.requirement_id` → existe em `regulatory_requirements_v3` | Teste de FK em CI |
| **INV-004** | `risk.gap_id` → existe em `project_gaps_v3` | Teste de FK em CI |
| **INV-005** | `action.risk_id` → existe em `project_risks_v3` | Teste de FK em CI |
| **INV-006** | briefing gerado → `coverage_pct = 100%` | Gate explícito no Briefing Engine |
| **INV-007** | Protocolo NO_QUESTION → pergunta sem `anchor_id` nunca persiste | Teste unitário Question Engine |
| **INV-008** | CNAE skipped → sem questionário gerado | Teste unitário Requirement Engine |

**Nota sobre INV-002:** O campo `anchor_id` na tabela `ragDocuments` segue o formato canônico definido em `scripts/corpus-utils.mjs` (`buildAnchorId`). O formato é `{lei}-{artigo_normalizado}-{chunkIndex}`, ex: `lc214-art-125-par-1-1`, `ec132-art-149a-par-1-1`. Qualquer alteração neste formato exige migração versionada (DEC-002).

---

## Referências

- [ADR-010 — Arquitetura canônica de conteúdo](../../adr/ADR-010-content-architecture-98.md)
- [Matriz Canônica de Inputs/Outputs](MATRIZ-CANONICA-INPUTS-OUTPUTS.md)
- [Tabela de Melhorias Técnicas HOW v1](TABELA-MELHORIAS-TECNICAS-HOW-v1.md)
- [Issue #65](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/65)
- [corpus-utils.mjs — buildAnchorId canônico](../../../../scripts/corpus-utils.mjs)
- [pilot-audit.mjs — dados reais do piloto](../../../../scripts/pilot-audit.mjs)
- [create-d7-mapping.mjs — 12 domínios, 499 canonical_ids](../../../../scripts/create-d7-mapping.mjs)
- [LC 214/2025 — Contribuição sobre Bens e Serviços (CBS)](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm)
- [EC 132/2023 — Reforma Tributária](https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm)
- [LC 224/2024 — IBS e benefícios fiscais](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm)
