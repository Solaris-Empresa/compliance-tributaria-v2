# Decisões de Dados — IA SOLARIS
## Documento oficial — P.O.: Uires Tapajós
## Consultar OBRIGATORIAMENTE antes de qualquer
## TRUNCATE · DROP · DELETE em massa

---

## DEC-DADOS-01 — Limpeza de dados legados de riscos
Data: 2026-04-09 · P.O.: Uires Tapajós

AUTORIZADO — pode executar TRUNCATE a qualquer momento:
  project_risks_v3    (riscos legados)
  riskMatrix          (matriz legada)
  action_plans_v3     (planos legados)

NUNCA APAGAR — bloqueio permanente:
  rag_chunks          (corpus RAG — 2.509 chunks)
  rag_documents       (documentos originais das leis)
  solaris_questions   (corpus Dr. José Rodrigues)
  cnaes               (base de filtro setorial)
  projects            (projetos dos clientes)
  users               (usuários da plataforma)
  risk_categories     (categorias configuráveis — novo)
  risks_v4            (riscos novos — não apagar)
  action_plans        (planos novos — não apagar)

Motivo DEC-DADOS-01:
  O produto migrou para o engine v4 (Sprint Z-07).
  Dados em project_risks_v3 e riskMatrix são do
  pipeline legado e não serão mais utilizados.
  O novo pipeline escreve em risks_v4 e action_plans.

---

## Como adicionar nova decisão

Formato obrigatório:
  ## DEC-DADOS-XX — [título]
  Data: · P.O.:
  AUTORIZADO: [lista]
  NUNCA APAGAR: [lista]
  Motivo: [justificativa]

Toda decisão deve ser aprovada pelo P.O.
antes de ser adicionada a este documento.

---
*IA SOLARIS · DECISOES-DADOS.md · 2026-04-09*
