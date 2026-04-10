# ADR-0028 — Categorização da Onda 2 (IA GEN)
## Status: Aceito · 2026-04-10

## Contexto
iagen_answers não tinha risk_category_code.
iagen-gap-analyzer.ts usava KEYWORD_TO_TOPIC hardcoded
(~30 keywords → ~6 tópicos). Resultado: categorização
por palavras-chave — frágil e não auditável.

## Decisão
O LLM que gera a pergunta já sabe qual categoria investiga.
risk_category_code é retornado pelo LLM no momento da geração,
junto com a pergunta, e salvo em iagen_answers.

category_assignment_mode = 'llm_assigned' indica que foi o LLM.
Dr. Rodrigues pode revisar e mudar para 'human_validated'.

Categorias enviadas ao LLM são lidas do banco dinamicamente
(NÃO hardcoded no código).

## Guardrails obrigatórios
1. risk_category_code retornado pelo LLM deve existir em risk_categories.
   Se não existir → pergunta rejeitada → fallback.
2. used_profile_fields.length >= 2.
   Se < 2 → pergunta rejeitada (genérica).
3. temperature = 0.1 (determinístico).
4. Pré-filtro de categorias por perfil antes do LLM.
5. ONDA2_PROMPT_VERSION salvo para rastreabilidade de regressão.

## Consequências
- Prompt enriquecido com 5 JSONs do projeto + categorias do banco
- Limite dinâmico 3-12 perguntas calculado pelo perfil
- Fallback legado (KEYWORD_TO_TOPIC) mantido para respostas sem categoria
- Few-shot examples obrigatórios no prompt

## Rastreabilidade
DEC-Z11-ARCH-03 · DEC-Z11-02 · Sprint Z-11 · PR #461
P.O.: Uires Tapajós · Consultor: ChatGPT (análise arquitetural)
