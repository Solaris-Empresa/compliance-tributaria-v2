# RAG-RESPONSABILIDADES.md — RACI do Corpus RAG

> **Versão:** 1.2 | **Data:** 2026-04-05
> **Modelo:** RACI (Responsible · Accountable · Consulted · Informed)
> **Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2

---

## Papéis do sistema

| Papel | Quem | Natureza |
|-------|------|---------|
| **P.O.** | Uires Tapajós | Humano — decisões de produto e aprovações finais |
| **Orquestrador** | Claude (Anthropic) | IA — análise, planejamento, geração de prompts |
| **Implementador** | Manus AI | IA — execução de código, banco, commits |
| **Equipe Jurídica** | Advogados SOLARIS | Humano — validação de conteúdo regulatório |
| **Consultor** | ChatGPT | IA — segunda opinião estratégica (quando acionado) |

**Legenda RACI:**
- **R** — Responsável pela execução
- **A** — Accountable (aprovador final — assina)
- **C** — Consultado antes da decisão
- **I** — Informado após a decisão

---

## Matriz RACI — decisões do corpus RAG

### 1. Gestão de mudanças (RFCs)

| Decisão | P.O. | Orquestrador | Manus | Jur. |
|---------|------|-------------|-------|------|
| Detectar anomalia no corpus | I | R | C | — |
| Abrir RFC (criar arquivo) | A | R | — | — |
| Executar diagnóstico (queries read-only) | I | C | R | — |
| Analisar diagnóstico e definir ação | C | R | — | — |
| Aprovar RFC para execução | **A** | R | — | — |
| Executar dry-run | I | C | R | — |
| Autorizar UPDATE/DELETE no banco | **A** | C | — | — |
| Executar UPDATE/DELETE no banco | I | C | R | — |
| Validar gold set pós-execução | C | R | I | — |
| Fechar RFC (EXECUTED) | A | R | I | — |
| Atualizar CORPUS-BASELINE.md | I | R | R | — |
| Abrir PR de encerramento | I | C | R | — |
| Mergear PR | **A** | I | — | — |

> **Regra de ouro:** P.O. é o único Accountable final para qualquer escrita no banco. Sem a palavra "EXECUTAR" do P.O., nenhum UPDATE acontece.

---

### 2. Expansão do corpus (novas leis)

| Decisão | P.O. | Orquestrador | Manus | Jur. |
|---------|------|-------------|-------|------|
| Decidir incluir nova lei no corpus | **A** | C | — | C |
| Definir gold set da nova lei | C | R | — | C |
| Abrir RFC de expansão | A | R | — | — |
| Adicionar lei ao enum (migration) | A | C | R | — |
| Selecionar artigos para ingestão | C | R | — | **A** |
| Validar conteúdo jurídico dos artigos | I | I | — | **A** |
| Executar script de ingestão | A | C | R | — |
| Validar gold set pós-ingestão | C | R | I | I |
| Aprovar publicação em produção | **A** | C | — | C |

> **Regra da equipe jurídica:** nenhum artigo de lei entra em produção sem validação da equipe jurídica. Isso é especialmente crítico para `lei = 'solaris'` (DEC-004).

---

### 3. Qualidade e monitoramento

| Decisão | P.O. | Orquestrador | Manus | Jur. |
|---------|------|-------------|-------|------|
| Definir meta de confiabilidade | **A** | C | — | — |
| Revisar gold set (semestral) | A | R | — | C |
| Monitorar cockpit RAG | C | R | I | — |
| Alertar sobre degradação de cobertura | I | R | — | — |
| Priorizar RFC no backlog | **A** | C | — | — |
| Definir SLAs de resolução | **A** | C | — | — |

---

### 4. Arquitetura e tecnologia

| Decisão | P.O. | Orquestrador | Manus | Jur. |
|---------|------|-------------|-------|------|
| Alterar schema `ragDocuments` | **A** | C | R | — |
| Alterar `rag-retriever.ts` | A | R | R | — |
| Alterar `corpus-utils.mjs` | A | R | R | — |
| Alterar gold-set-queries.sql | A | R | — | C |
| Alterar RAG-GOVERNANCE.md | A | R | — | — |
| Alterar este documento | **A** | R | — | — |
| Atualizar skill `solaris-contexto` | A | R | I | — |

---

## Escalação e conflitos

| Situação | Ação |
|---|---|
| Orquestrador e P.O. divergem sobre ação de RFC | P.O. decide — Orquestrador documenta ressalva na RFC |
| Equipe jurídica reprova artigo já ingerido | Abrir RFC de remoção — P.O. aprova — Executar |
| Anomalia P0 detectada (lei com 0 chunks) | Acionar P.O. imediatamente — RFC emergencial em 24h |
| Manus identifica risco não mapeado na RFC | Manus para execução e reporta ao Orquestrador antes de continuar |
| Claude (nova sessão) diverge de decisão anterior | Consultar CORPUS-BASELINE.md e RFCs anteriores — histórico é fonte de verdade |

---

## O que NUNCA pode acontecer sem aprovação do P.O.

Esta lista é absoluta — não há exceções:

1. Qualquer `UPDATE`, `INSERT` ou `DELETE` na tabela `ragDocuments`
2. Qualquer `ALTER TABLE` ou `db:push` que afete a tabela `ragDocuments`
3. Merge de PR que contenha mudanças no banco
4. Publicação de nova lei em produção
5. Remoção de chunks do corpus

---

## Revisão desta matriz

Este documento deve ser revisado quando:
- Um novo papel for adicionado ao projeto
- Uma decisão importante não estiver coberta pela matriz
- Um conflito real revelar gap na RACI
- Mudança relevante na arquitetura do produto

**Responsável pela atualização:** P.O. com suporte do Orquestrador.
**Processo:** PR que atualiza este arquivo + CORPUS-BASELINE.md.

---

*RAG-RESPONSABILIDADES.md v1.2 · 2026-04-05 (Milestone 1 — Decision Kernel: source='engine' ativo, 5/6 casos validados, gate triplo aprovado)*
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
