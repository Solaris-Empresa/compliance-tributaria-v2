# Matriz Canônica de Inputs/Outputs por Etapa do Fluxo de Compliance

**Versão:** 1.0  
**Data:** 2026-03-23  
**Status:** Proposta — aguardando aprovação do Orquestrador (gate B1)  
**Issue:** [#64](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/64)  
**ADR:** [ADR-010](../../adr/ADR-010-content-architecture-98.md)

---

## Visão geral

Este documento formaliza o contrato de entrada e saída de cada uma das 10 etapas do fluxo de compliance da plataforma IA SOLARIS. O objetivo é eliminar ambiguidade sobre o que entra em cada etapa, como é processado e o que sai, garantindo rastreabilidade completa e eliminando a possibilidade de alucinação por falta de contexto formal.

O fluxo segue a arquitetura de 6 engines definida no ADR-010:

```
Perfil + CNAE → Requirement Engine → Question Engine → Respostas →
Gap Engine → Coverage Engine + Consistency Engine →
Risk Engine → Action Engine → Outputs
```

---

## Etapa 1 — Perfil da Empresa

**Propósito:** Capturar os dados estruturais da empresa que definem o escopo do diagnóstico.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `razaoSocial` | string | ✅ | Razão social completa |
| `cnpj` | string | ✅ | CNPJ com máscara |
| `porte` | enum | ✅ | MEI / ME / EPP / Médio / Grande |
| `regimeTributario` | enum | ✅ | Simples Nacional / Lucro Presumido / Lucro Real |
| `uf` | string | ✅ | UF sede (2 letras) |
| `municipio` | string | ✅ | Município sede |
| `faturamentoAnual` | enum | ✅ | Faixa de faturamento |
| `setorPrincipal` | enum | ✅ | Comércio / Serviços / Indústria / Misto |
| `operaMultiplosEstados` | boolean | ✅ | Opera em mais de uma UF? |
| `possuiFiliais` | boolean | ✅ | Possui filiais? |
| `dataConstituicao` | date | ✅ | Data de constituição |

**Saída:** `ProjectProfile` — objeto consolidado e validado com todos os campos acima.

**Regra crítica:** os dados do perfil **não devem ser repetidos** nas etapas seguintes. As engines devem consumir o `ProjectProfile` diretamente, sem solicitar os mesmos dados ao usuário novamente.

**Técnica:** Formulário estruturado com validação de schema (Zod) + taxonomia de porte/regime conforme legislação brasileira.

---

## Etapa 2 — Confirmação de CNAEs

**Propósito:** Identificar e confirmar os CNAEs da empresa para definir o escopo regulatório do diagnóstico.

**Input:**
- `ProjectProfile` (da Etapa 1)
- Descrição textual da atividade principal (campo aberto)

**Processo (Requirement Engine — fase CNAE):**
1. Busca semântica no corpus de CNAEs via embeddings
2. Sugestão dos 5 CNAEs mais relevantes com score de similaridade
3. Confirmação pelo usuário (aceitar, rejeitar, adicionar manualmente)
4. Validação: CNAE confirmado deve ter requisitos aplicáveis no corpus RAG

**Saída:**
```json
{
  "confirmedCnaes": [
    {
      "code": "4711-3/01",
      "description": "Comércio varejista de mercadorias em geral...",
      "confirmed": true,
      "hasApplicableRequirements": true,
      "requirementCount": 23
    }
  ],
  "skippedCnaes": [
    {
      "code": "9900-0/00",
      "reason": "no_applicable_requirements"
    }
  ]
}
```

**Regra crítica:** CNAE sem requisitos aplicáveis no corpus RAG → registrado como `skipped`, não gera questionário. O usuário é informado do motivo.

**Técnica:** Motor CNAE com embeddings + RAG filtrado + validação de aplicabilidade.

---

## Etapa 3 — Questionário Corporativo

**Propósito:** Avaliar a conformidade da empresa nos aspectos corporativos universais (aplicáveis a todas as empresas, independente de CNAE).

**Input:**
- `ProjectProfile` (Etapa 1)
- `confirmedCnaes` (Etapa 2)
- Requisitos da camada `corporativo` do Requirement Engine

**Processo (Requirement Engine + Question Engine):**
1. Requirement Engine filtra requisitos aplicáveis da camada `corporativo`
2. Question Engine gera perguntas com `requirement_id` e `source_reference` obrigatórios
3. Deduplicação semântica (threshold: 0.92)
4. LLM-as-judge: score mínimo 3.5/5.0 para incluir
5. Protocolo NO_QUESTION: pergunta sem base RAG é bloqueada

**Saída:**
```json
{
  "questions": [
    {
      "id": "Q-CORP-001",
      "requirement_id": "RF-001",
      "question_text": "...",
      "source_type": "regulatory",
      "source_reference": "LC 214/2024 Art. 10",
      "confidence": "high",
      "score": 4.2,
      "stage": "corporativo"
    }
  ],
  "answers": [
    {
      "question_id": "Q-CORP-001",
      "answer_value": "sim",
      "answer_text": "...",
      "evidence": "..."
    }
  ]
}
```

**Regra crítica:** nenhuma pergunta sem `requirement_id` e `source_reference`. Não repetir dados já coletados no perfil.

**Técnica:** Requirement Engine (RAG filtrado por camada) + Question Engine (few-shot + LLM-as-judge + deduplicação semântica).

---

## Etapa 4 — Questionário Operacional

**Propósito:** Avaliar a conformidade nos aspectos operacionais específicos da empresa (como ela opera, não apenas o que ela é).

**Input:**
- `ProjectProfile` (Etapa 1)
- `confirmedCnaes` (Etapa 2)
- `answers` do Questionário Corporativo (Etapa 3)
- Requisitos da camada `operacional` do Requirement Engine

**Processo:**
1. Requirement Engine filtra requisitos da camada `operacional`
2. Question Engine aplica filtros condicionais baseados nas respostas corporativas
3. Perguntas condicionais: se Etapa 3 revelou operação interestadual → gerar perguntas sobre ICMS-ST
4. Deduplicação cross-stage: eliminar perguntas já respondidas na Etapa 3

**Saída:** mesmo schema da Etapa 3, com `stage: "operacional"`.

**Regra crítica:** capturar a operação real da empresa, não apenas o que está no contrato social. Perguntas devem ser condicionais ao perfil operacional revelado na Etapa 3.

**Técnica:** Conditional Question Engine + RAG filtrado por operação + deduplicação cross-stage.

---

## Etapa 5 — Questionário por CNAE (loop N)

**Propósito:** Avaliar a conformidade nos requisitos setoriais específicos de cada CNAE confirmado.

**Input (por CNAE):**
- `ProjectProfile` (Etapa 1)
- CNAE atual do loop
- `answers` das Etapas 3 e 4 (para filtros condicionais e deduplicação)
- Requisitos da camada `cnae` filtrados pelo CNAE atual

**Processo (por CNAE):**
1. Requirement Engine filtra requisitos aplicáveis ao CNAE específico
2. Question Engine gera perguntas setoriais com `cnae_scope` obrigatório
3. Deduplicação cross-stage: eliminar perguntas já respondidas nas Etapas 3 e 4
4. Protocolo NO_QUESTION: CNAE sem requisitos → `skipped`

**Saída (por CNAE):** mesmo schema das Etapas 3 e 4, com `stage: "cnae"` e `cnae_code`.

**Regra crítica:** loop obrigatório para cada CNAE confirmado. Não misturar requisitos de CNAEs diferentes na mesma sessão de perguntas.

**Técnica:** RAG filtrado por CNAE + Multi-turn Chain-of-Thought + deduplicação cross-stage.

---

## Etapa 6 — Gap Engine (classificação formal)

**Propósito:** Transformar todas as respostas das Etapas 3, 4 e 5 em estados formais de conformidade.

**Input:**
- Todas as `answers` das Etapas 3, 4 e 5
- `requirements` do Requirement Engine (para vincular cada resposta ao requisito de origem)

**Processo:**
1. Para cada resposta, derivar o `gap_status` por regras determinísticas (não LLM)
2. LLM usado apenas para interpretar respostas ambíguas, com log
3. Calcular `confidence` de cada classificação

**Saída:**
```json
{
  "gaps": [
    {
      "id": "GAP-001",
      "question_id": "Q-CORP-001",
      "requirement_id": "RF-001",
      "gap_status": "nao_atende",
      "confidence": "high",
      "evidence": "resposta do usuário"
    }
  ]
}
```

**Estados formais:**

| Status | Significado | Ação gerada |
|--------|-------------|-------------|
| `atende` | Requisito cumprido | Nenhuma |
| `nao_atende` | GAP confirmado | Gerar risco |
| `parcial` | GAP moderado | Gerar risco com severidade reduzida |
| `evidencia_insuficiente` | GAP oculto | Gerar risco de evidência (alta severidade) |
| `nao_aplicavel` | Excluir do cálculo | Excluir do coverage |

**Regra crítica:** `evidencia_insuficiente` é tratado como risco oculto de alta severidade, não como ausência de gap.

---

## Etapa 7 — Coverage Engine (gate de completude)

**Propósito:** Verificar se 100% dos requisitos aplicáveis foram perguntados, respondidos e avaliados.

**Input:**
- `requirements` do Requirement Engine (lista de todos os requisitos aplicáveis)
- `gaps` do Gap Engine (lista de todos os gaps classificados)

**Processo:**
```
coverage = gaps_classificados / requirements_aplicáveis
```

**Saída:**
```json
{
  "coverage_total": 0.97,
  "coverage_by_stage": {
    "corporativo": 1.0,
    "operacional": 0.95,
    "cnae_4711-3/01": 0.98
  },
  "uncovered_requirements": ["RF-045", "RF-067"],
  "gate_passed": false
}
```

**Gate:** `coverage < 1.0` → bloqueia geração do briefing. O sistema retorna a lista de requisitos não cobertos para que o usuário possa responder as perguntas faltantes.

---

## Etapa 7b — Consistency Engine (validação cruzada)

**Propósito:** Detectar contradições entre as respostas de diferentes etapas antes de gerar o briefing.

**Input:**
- `ProjectProfile` (Etapa 1)
- Todas as `answers` das Etapas 3, 4 e 5

**Processo:**
1. Verificar consistência entre perfil e respostas corporativas
2. Verificar consistência entre respostas corporativas e operacionais
3. Verificar consistência entre respostas operacionais e por CNAE

**Saída:**
```json
{
  "consistent": false,
  "conflicts": [
    {
      "id": "CONFLICT-001",
      "stage_a": "perfil",
      "stage_b": "corporativo",
      "description": "Perfil declara Simples Nacional mas resposta corporativa indica operação incompatível",
      "severity": "high"
    }
  ]
}
```

**Gate:** conflito com `severity: "high"` → bloqueia geração do briefing. Conflitos de severidade média → alerta, não bloqueia.

---

## Etapa 8 — Risk Engine

**Propósito:** Transformar gaps em riscos estruturados com taxonomia hierárquica e scoring defensável.

**Input:**
- `gaps` do Gap Engine (apenas gaps com status `nao_atende`, `parcial` ou `evidencia_insuficiente`)
- `ProjectProfile` (para contexto de impacto financeiro)

**Processo:**
1. Para cada gap, gerar risco com taxonomia 3 níveis (domínio → categoria → tipo)
2. Scoring híbrido: `score_base = severidade × probabilidade`, ajuste IA ±1.0 com justificativa
3. Clustering semântico: agrupar riscos relacionados (threshold: 0.85)
4. Calcular impacto financeiro e legal estimado

**Saída:**
```json
{
  "risks": [
    {
      "id": "RISK-001",
      "gap_id": "GAP-001",
      "requirement_id": "RF-001",
      "taxonomy": {
        "domain": "tributário",
        "category": "apuração",
        "type": "erro_aliquota_cbs"
      },
      "risk_description": "...",
      "severity": "alta",
      "probability": "alta",
      "score": 9.0,
      "impact_financial": "Multa de até 150% do tributo devido",
      "impact_legal": "Autuação fiscal + juros SELIC"
    }
  ]
}
```

**Regra crítica:** risco sem `gap_id` não existe. Score sem `impact_financial` e `impact_legal` é incompleto.

---

## Etapa 9 — Action Engine

**Propósito:** Transformar riscos em ações executáveis com template, prazo e responsável definidos.

**Input:**
- `risks` do Risk Engine
- Biblioteca de templates de ação por domínio e tipo de risco

**Processo:**
1. Para cada risco, selecionar template de ação correspondente
2. Preencher template com dados do risco e do perfil da empresa
3. Calcular prioridade e prazo por regras determinísticas
4. Vincular ação ao risco, gap e requisito de origem

**Saída:**
```json
{
  "actions": [
    {
      "id": "ACTION-001",
      "risk_id": "RISK-001",
      "gap_id": "GAP-001",
      "requirement_id": "RF-001",
      "template_id": "ACT-TRIB-001",
      "action_description": "Revisar cálculo de CBS para operações de varejo...",
      "priority": "crítica",
      "deadline_days": 15,
      "responsible": "contador_tributario",
      "evidence_required": "DCTF retificadora ou nota de crédito"
    }
  ]
}
```

**Regra crítica:** ação sem `risk_id` não existe. Ação sem `evidence_required` é incompleta.

---

## Etapa 10 — Outputs (Briefing + Matriz + Plano)

**Propósito:** Gerar os documentos finais do diagnóstico com base em todos os dados estruturados das etapas anteriores.

**Input (obrigatório — todos os campos abaixo):**
- `ProjectProfile`
- `confirmedCnaes`
- `requirements` (lista completa)
- `questions` e `answers` (todas as etapas)
- `gaps` (classificados)
- `coverage_report` (gate: 100%)
- `consistency_report` (gate: sem conflitos críticos)
- `risks` (com taxonomia e scoring)
- `actions` (com templates e prazos)

**Saídas:**

### Briefing (8 seções obrigatórias)

| # | Seção | Conteúdo | Fonte |
|---|-------|----------|-------|
| 1 | Identificação da Empresa | Dados do perfil | `ProjectProfile` |
| 2 | Escopo do Diagnóstico | Período, legislação, metodologia | ADR-010 + data atual |
| 3 | Resumo Executivo | Síntese em 3-5 parágrafos | LLM + RAG grounding |
| 4 | Perfil Regulatório | Obrigações por CNAE e regime | `requirements` + RAG |
| 5 | Principais Gaps | Top 10 por severidade | `gaps` |
| 6 | Matriz de Riscos Resumida | Top 10 por score | `risks` |
| 7 | Plano de Ação Prioritário | Top 10 por prioridade | `actions` |
| 8 | Próximos Passos | Cronograma e responsáveis | `actions` + datas |

### Matriz de Riscos (estrutura defensável)

Agrupada por taxonomia (domínio → categoria), com score, impacto e gap de origem visíveis.

### Plano de Ação (executável)

Ordenado por prioridade, com prazo em dias, responsável e evidência requerida para cada ação.

**Regra crítica:** nenhum output pode ser gerado sem `coverage_report.gate_passed === true` e `consistency_report.consistent === true` (ou sem conflitos críticos).

---

## Resumo executivo da matriz

| Etapa | Engine | Input principal | Saída principal | Gate |
|-------|--------|-----------------|-----------------|------|
| 1 — Perfil | Formulário + Zod | Dados do usuário | `ProjectProfile` | Validação de schema |
| 2 — CNAEs | Requirement Engine | Perfil + descrição | `confirmedCnaes` | CNAE com requisitos |
| 3 — Corporativo | Question Engine | Perfil + requisitos | `questions` + `answers` | Score ≥ 3.5 |
| 4 — Operacional | Question Engine | Perfil + corporativo | `questions` + `answers` | Deduplicação cross-stage |
| 5 — Por CNAE | Question Engine | CNAE + anteriores | `questions` + `answers` | Loop N obrigatório |
| 6 — Gap | Gap Engine | Todas as respostas | `gaps` | Status formal obrigatório |
| 7 — Coverage | Coverage Engine | Requisitos + gaps | `coverage_report` | Coverage = 100% |
| 7b — Consistency | Consistency Engine | Perfil + respostas | `consistency_report` | Sem conflitos críticos |
| 8 — Risco | Risk Engine | Gaps | `risks` | Gap → risco obrigatório |
| 9 — Ação | Action Engine | Riscos | `actions` | Risco → ação obrigatório |
| 10 — Outputs | Template + LLM | Todos os dados | Briefing + Matriz + Plano | Coverage + Consistency gates |

---

## Referências

- [ADR-010 — Arquitetura canônica de conteúdo](../../adr/ADR-010-content-architecture-98.md)
- [Matriz de Rastreabilidade](MATRIZ-RASTREABILIDADE-REQ-PERGUNTA-GAP-RISCO-ACAO.md)
- [Tabela de Melhorias Técnicas HOW v1](TABELA-MELHORIAS-TECNICAS-HOW-v1.md)
- [Issue #64](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/64)
