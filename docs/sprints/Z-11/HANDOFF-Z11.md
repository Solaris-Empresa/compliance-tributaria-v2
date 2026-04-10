# HANDOFF — Sprint Z-11 (versão definitiva)
## Fundação Arquitetural: Pipeline 3 Ondas + Questionário IA GEN Inteligente
## docs/sprints/Z-11/HANDOFF-Z11.md
## 2026-04-10 · Aprovado P.O.: Uires Tapajós

## Premissa inviolável
Meta: 98% confiabilidade jurídica
Z-11: rastreabilidade nível 1 (categoria → artigo_base → risco determinístico)
Z-12: rastreabilidade nível 2 (Opção D — risk_category_code em regulatory_requirements_v3)
Determinismo: severidade vem do banco, nunca do LLM

## Decisões aprovadas
DEC-Z11-ARCH-01: Opção B — dois loops distintos
  analyzeGapsFromQuestionnaires() NOVO para Ondas 1+2
  analyzeGaps() existente INTACTO para Onda 3

DEC-Z11-ARCH-02: Map<string, AnswerData[]> agregação pessimista
  qualquer nao_atendido → categoria nao_atendida
  confidence = média dos confidence_scores

DEC-Z11-ARCH-03: KEYWORD_TO_TOPIC mantido como fallback legado

DEC-Z11-ARCH-04: Rastreabilidade nível 1 para Z-11
  artigo_base de risk_categories suficiente para Ondas 1+2

DEC-Z11-01: Migration 0068 — solaris_questions
DEC-Z11-02: Migration 0069 — iagen_answers

## 8 Entregas

ENTREGA 1 — Fix frontend save projeto (Manus)
  Frontend não envia taxComplexity + financialProfile + governanceProfile
  Localizar arquivo via: grep -rn "saveAssessment" client/src/ --include="*.tsx"
  Gate: SELECT taxComplexity FROM projects WHERE id=[novo] → não null

ENTREGA 2 — Migration 0068 solaris_questions (Manus)
  ALTER TABLE solaris_questions
    ADD COLUMN risk_category_code VARCHAR(64) NULL,
    ADD COLUMN classification_scope ENUM('risk_engine','diagnostic_only') NOT NULL DEFAULT 'risk_engine',
    ADD COLUMN mapping_review_status ENUM('curated_internal','pending_legal','approved_legal') NOT NULL DEFAULT 'curated_internal',
    ADD CONSTRAINT fk_solaris_q_risk_category FOREIGN KEY (risk_category_code) REFERENCES risk_categories(codigo) ON UPDATE CASCADE ON DELETE SET NULL;
  CREATE INDEX idx_solaris_q_category ON solaris_questions(risk_category_code);
  Gate TiDB-FK-01: verificar registros inválidos antes da FK

ENTREGA 3 — Migration 0069 iagen_answers (Manus)
  ALTER TABLE iagen_answers
    ADD COLUMN risk_category_code VARCHAR(64) NULL,
    ADD COLUMN category_assignment_mode ENUM('llm_assigned','human_validated') NULL,
    ADD COLUMN used_profile_fields JSON NULL,
    ADD COLUMN prompt_version VARCHAR(20) NULL,
    ADD CONSTRAINT fk_iagen_risk_category FOREIGN KEY (risk_category_code) REFERENCES risk_categories(codigo) ON UPDATE CASCADE ON DELETE SET NULL;
  CREATE INDEX idx_iagen_category ON iagen_answers(risk_category_code);

ENTREGA 4 — analyzeGapsFromQuestionnaires() (Claude Code)
  Arquivo: server/routers/gapEngine.ts
  NÃO alterar analyzeGaps() existente
  Nova função lê solaris_answers + iagen_answers por risk_category_code
  Map<string, AnswerData[]> com agregação pessimista
  INSERT em project_gaps_v3 seguindo padrão iagen-gap-analyzer.ts:
    requirement_code: 'CAT-' + risk_category_code
    requirement_name: risk_categories.nome
    requirement_id:   NULL
    source:           'solaris' ou 'iagen'
    gap_level:        'operacional'
    gap_type:         'normativo'
    evidence_status:  'ausente'
    operational_dependency: 'baixa'
    score:            70
    risk_level:       'alto'
    priority_score:   70
    action_priority:  'imediata'
    estimated_days:   30
    analysis_version: 3
    deterministic_reason: 'Gap identificado via questionário Onda 1+2'
    source_reference: 'risk_categories:' + risk_category_code

ENTREGA 5 — Prompt Onda 2 reescrito (Claude Code)
  Arquivo: server/routers-fluxo-v3.ts linhas 2492-2560
  + Lê 5 JSONs do projeto
  + Categorias ativas do banco dinamicamente
  + risk_category_code no schema LLM (obrigatório)
  + temperature: 0.1
  + Limite dinâmico 3-12 perguntas
  + Few-shot examples bons vs ruins
  + ONDA2_PROMPT_VERSION = 'Z11-v1'
  + Validação: risk_category_code deve existir no banco
  + Validação: used_profile_fields.length >= 2

ENTREGA 6 — Fix iagen-gap-analyzer.ts (Claude Code)
  Se risk_category_code preenchido → usar diretamente
  Se null → fallback KEYWORD_TO_TOPIC (legado mantido)

ENTREGA 7 — ADR-0027 + ADR-0028 (Claude Code)
  docs/adr/ADR-0027-fonte-verdade-respostas-por-onda.md
  docs/adr/ADR-0028-categorizacao-onda2-iagen.md

## Gates A→E (stop/go obrigatório)

GATE A: projects.taxComplexity != null após criar projeto
GATE B: migrations 0068 + 0069 aplicadas e FKs verificadas
GATE C: 16/16 testes unitários PASS + tsc 0 erros
GATE D: risks_v4 > 0 após smoke test backend
GATE E: P.O. aprova visualmente (REGRA-SMOKE-02 Camada 2)

## Sequência de execução

FASE 1 (paralelo): Manus ENTREGA 1 + Claude Code verifica schema real
FASE 2: GATE A
FASE 3 (Manus): ENTREGA 2 → merge → ENTREGA 3 → merge → GATE B
FASE 4 (Claude Code após GATE B): ENTREGAS 4+6 paralelas → GATE C
FASE 5 (Claude Code): ENTREGA 5 + ENTREGA 7
FASE 6 (Manus): Deploy + Smoke Camada 1 → GATE D
FASE 7 (P.O.): Smoke Camada 2 → GATE E
FASE 8 (Manus): ESTADO-ATUAL + BASELINE + encerramento Z-11

## Escopo negativo
NÃO alterar analyzeGaps() existente (Onda 3 intacta)
NÃO regulatory_requirements_v3 para Ondas 1+2
NÃO risk_category_code em regulatory_requirements_v3 → Z-12
NÃO campos novos no formulário → Z-12
NÃO Score CPIE v4 → pendente
NÃO GitHub Actions → Z-11 item 2

*IA SOLARIS · HANDOFF Z-11 · 2026-04-10*
*Meta: 98% · Determinismo preservado*
