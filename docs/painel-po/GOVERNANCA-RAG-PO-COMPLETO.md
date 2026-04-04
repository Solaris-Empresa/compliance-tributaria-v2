# Governança de Rastreabilidade RAG — Documento P.O. Completo

**Projeto:** IA SOLARIS — Compliance Tributária  
**Versão:** v1.1  
**Data:** 2026-04-04  
**Autor:** Manus AI (implementador técnico)  
**Revisão:** Uires Tapajós (P.O.)  
**Status:** ✅ Implementado e ativo

---

## Sumário Executivo

Este documento descreve o sistema de governança de rastreabilidade implementado para o componente **RAG (Retrieval-Augmented Generation)** da plataforma IA SOLARIS. O RAG é o mecanismo que busca artigos de leis tributárias (LC 214, EC 132, LC 227, LC 224, LC 123) para enriquecer o diagnóstico gerado pela IA. Qualquer alteração nesse componente — seja uma nova funcionalidade, expansão do corpus, incidente, RFC ou auditoria de performance — agora é rastreada automaticamente do momento em que o desenvolvedor abre o issue até o momento em que o P.O. visualiza o resultado no cockpit.

A governança opera em **quatro camadas independentes e complementares**, garantindo que nenhuma mudança passe despercebida, independentemente de quem a fez ou quando.

---

## 1. O que é o RAG e por que ele precisa de governança especial

O RAG (Retrieval-Augmented Generation) é a camada de recuperação de conhecimento jurídico da plataforma. Ele funciona como uma biblioteca especializada: quando o sistema precisa responder sobre uma regra tributária específica, o RAG busca os artigos relevantes no corpus de 2.454 chunks de legislação (10 leis) e os entrega ao modelo de linguagem (GPT-4.1) para que a resposta seja fundamentada em lei, não em memória do modelo.

Por ser a base de conhecimento jurídico do produto, qualquer falha ou desatualização no RAG tem impacto direto na qualidade dos diagnósticos entregues aos advogados e contadores. Um corpus desatualizado pode gerar um diagnóstico incorreto sobre a reforma tributária. Uma falha no retriever pode fazer o sistema responder sem base legal. Por isso, a governança do RAG é tratada com o mesmo rigor de uma auditoria contábil: toda mudança deve ser documentada, rastreada e verificável.

---

## 2. Estado atual do corpus RAG

| Dimensão | Valor atual | Baseline |
|---|---|---|
| Total de chunks | **2.454** | v2.2 (2026-04-04) |
| Chunks com `anchor_id` | 2.454 (100%) | Sprint S |
| Leis ativas | 10 | lc214, ec132, lc227, lc224, lc123, lc87, lc116, cg-ibs, rfb-cbs, conv-icms |
| Anomalias abertas | 0 | Sprint S concluída |
| Modelo de retrieval | GPT-4.1 (re-ranking) | Sprint H |
| Estratégia de busca | Híbrida (keyword LIKE + re-ranking LLM) | Sprint F |
| RFCs pendentes | 0 — RFC-003 e RFC-004 executadas na Sprint S | ✅ Sprint S |

---

## 3. As quatro camadas de governança

### Camada 1 — Automação por palavras-chave (GitHub Actions)

**Arquivo:** `.github/workflows/label-governance.yml`

Toda vez que um desenvolvedor cria ou edita um issue ou PR, o sistema analisa automaticamente o título e o corpo do texto em busca de palavras-chave relacionadas ao RAG. Se encontrar, aplica a label correspondente sem intervenção humana.

| Label | Cor | Keywords que disparam |
|---|---|---|
| `rag:corpus` | 🩵 `#0E7490` | corpus, chunks, embeddings, ingestão, lc214, lc224, ec132, lc227, lc123 |
| `rag:retriever` | 🔵 `#0369A1` | retriever, retrieveArticles, re-ranking, keywords, busca, similarity |
| `rag:incidente` | 🔴 `#DC2626` | incidente, falha, hallucination, alucinação, erro rag, corpus desatualizado |
| `rag:rfc` | 🟣 `#7C3AED` | RFC, proposta, mudança arquitetural, expansão corpus, nova lei |
| `rag:performance` | 🟠 `#D97706` | latência, rate limit, cache, performance, timeout, lento |
| `rag:governanca` | 🟢 `#16A34A` | auditoria, rastreabilidade, governança, versionamento, baseline |

**Garantia:** Mesmo que o desenvolvedor esqueça de aplicar a label manualmente, o sistema a aplica automaticamente. A label é idempotente — não duplica se já existir.

### Camada 2 — Auditoria de impacto automática (GitHub Actions)

**Arquivo:** `.github/workflows/rag-impact-audit.yml`

Esta é a camada mais crítica. Toda vez que um PR com label `rag:*` é aberto ou atualizado, o workflow:

1. Detecta quais arquivos RAG foram modificados no PR
2. Consulta a tabela de impacto para saber quais documentos de rastreabilidade devem ser atualizados
3. Verifica se esses documentos foram de fato atualizados no PR
4. Posta um comentário automático no PR com o resultado da auditoria
5. Falha o check se um arquivo crítico foi alterado sem atualizar a rastreabilidade

A tabela de impacto que o workflow usa:

| Arquivo alterado | Documentos que DEVEM ser atualizados |
|---|---|
| `server/rag-retriever.ts` | `RAG-PROCESSO.md`, `HANDOFF-RAG.md`, `RASTREABILIDADE-RAG-PO.md` |
| `docs/rag/CORPUS-BASELINE.md` | `RAG-GOVERNANCE.md`, `RAG-PROCESSO.md`, `RASTREABILIDADE-RAG-PO.md` |
| Qualquer RFC (`RFC-*.md`) | `CORPUS-BASELINE.md`, `RAG-PROCESSO.md`, `RASTREABILIDADE-RAG-PO.md` |
| Schema `ragDocuments` | `CORPUS-BASELINE.md`, `HANDOFF-RAG.md` |
| `rag-retriever.ts` + schema | Todos os documentos acima |

**Garantia:** Um PR que altera o retriever mas não atualiza o `HANDOFF-RAG.md` será bloqueado com aviso explícito antes do merge.

### Camada 3 — Protocolo operacional nas skills (Manus + Orquestrador)

**Arquivos:** `/home/ubuntu/skills/solaris-orquestracao/SKILL.md` e `/home/ubuntu/skills/solaris-contexto/SKILL.md`

Toda sessão do Manus e do Orquestrador (Claude) carrega automaticamente as skills do projeto. Ambas as skills agora contêm o **Protocolo de Auditoria RAG** — um conjunto de regras que o agente deve seguir ao trabalhar com qualquer issue ou PR RAG:

**Antes de abrir um PR RAG, o agente DEVE:**
- Aplicar a label `rag:*` correspondente ao tipo de mudança
- Verificar a tabela de impacto e atualizar os documentos afetados
- Preencher o template `rag-pr.md` com o JSON de evidência
- Confirmar que o cockpit Seção 7 refletirá a mudança

**Para incidentes (P0–P3), o protocolo adicional é:**
- P0 (produção parada): abrir issue com `rag:incidente` + `priority:critical` imediatamente
- P1 (degradação severa): issue em até 1 hora
- P2 (degradação leve): issue em até 24 horas
- P3 (cosmético): issue no próximo sprint

**Para RFCs, o protocolo adicional é:**
- Toda RFC deve ser aprovada pelo P.O. antes da implementação
- A RFC deve ter critérios de aceite mensuráveis
- O impacto no corpus (chunks antes/depois) deve ser estimado

**Garantia:** Mesmo que o GitHub Actions não detecte uma mudança (ex: alteração em comentário de código), o agente seguirá o protocolo por instrução direta nas skills.

### Camada 4 — Visibilidade em tempo real no cockpit (Seção 7)

**Arquivo:** `docs/painel-po/index.html` — Seção 7 RAG

O cockpit P.O. exibe em tempo real o estado do RAG, buscando dados diretamente da API do GitHub a cada abertura (com cache TTL de 5 minutos):

| Sub-painel | O que exibe | Tipo |
|---|---|---|
| **7A — Estado do Corpus** | Barras de progresso por lei, total de chunks, data do baseline | ⚙ estático baseline v2.5 |
| **7B — Rastreabilidade Viva** | Issues e PRs por label RAG — abas: Abertos / Incidentes / RFCs / Histórico | ⟳ vivo API GitHub |
| **7C — Consistência Global** | CI status, PRs abertos, RFCs pendentes, incidentes P0/P1 | ⟳ vivo API GitHub |
| **7D — Documentos RAG** | 10 MDs renderizados inline via fetch raw GitHub | ⟳ vivo fetch raw |

**Garantia:** O P.O. pode abrir o cockpit a qualquer momento e ver o estado atual do RAG sem precisar acessar o GitHub diretamente.

---

## 4. Fluxo E2E — Do evento à rastreabilidade

O fluxo a seguir descreve o ciclo completo de rastreabilidade para qualquer evento RAG, do momento em que é identificado até o momento em que aparece no cockpit do P.O.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EVENTO RAG IDENTIFICADO                          │
│         (nova funcionalidade / corpus / incidente / RFC /           │
│                    performance / governança)                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ABERTURA DO ISSUE                                 │
│  • Usar template: .github/ISSUE_TEMPLATE/rag-change.md              │
│  • Preencher: tipo, lei afetada, severidade (se incidente)          │
│  • Preencher: RFC motivação + critérios de aceite (se RFC)          │
│  • Preencher: chunks antes/depois (se corpus)                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              LABEL-GOVERNANCE.YML DISPARA                           │
│  • Analisa título + corpo do issue                                   │
│  • Aplica label rag:corpus / rag:retriever / rag:incidente /        │
│    rag:rfc / rag:performance / rag:governanca                        │
│  • Idempotente — não duplica labels existentes                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTAÇÃO                                     │
│  • Desenvolvedor / Manus implementa a mudança                       │
│  • Skill solaris-orquestracao instrui: atualizar docs de            │
│    rastreabilidade conforme tabela de impacto                       │
│  • Documentos a atualizar dependem do arquivo alterado              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ABERTURA DO PR                                    │
│  • Usar template: .github/PULL_REQUEST_TEMPLATE/rag-pr.md           │
│  • Preencher: checklist dos 9 arquivos de rastreabilidade           │
│  • Preencher: JSON de evidência estruturado                         │
│  • Aplicar label rag:* correspondente                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              RAG-IMPACT-AUDIT.YML DISPARA                           │
│  • Detecta arquivos RAG alterados no PR                             │
│  • Consulta tabela de impacto                                       │
│  • Verifica se documentos de rastreabilidade foram atualizados      │
│  • Posta comentário com resultado da auditoria no PR                │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐   │
│  │ ✅ AUDITORIA OK      │    │ ❌ AUDITORIA FALHOU               │   │
│  │ Todos os docs foram │    │ Arquivo crítico alterado sem     │   │
│  │ atualizados         │    │ atualizar rastreabilidade        │   │
│  └──────────┬──────────┘    └──────────────┬───────────────────┘   │
│             │                              │                        │
│             ▼                              ▼                        │
│        Prossegue                   Bloqueia o PR                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ (apenas se auditoria OK)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    REVIEW E MERGE                                    │
│  • RFC: requer aprovação explícita do P.O. antes do merge           │
│  • Incidente P0/P1: merge imediato após fix validado                │
│  • Demais: fluxo normal de review                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    COCKPIT P.O. ATUALIZADO                          │
│  • Seção 7B: issue/PR aparece na aba correspondente                 │
│  • Seção 7C: CI status atualizado, contadores de incidentes/RFCs   │
│  • Seção 7D: documentos renderizados com conteúdo mais recente     │
│  • Cache TTL 5 min — próxima abertura reflete o merge              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Templates disponíveis

### 5.1 Template de Issue RAG

**Arquivo:** `.github/ISSUE_TEMPLATE/rag-change.md`

Campos obrigatórios por tipo de evento:

| Tipo de evento | Campos específicos |
|---|---|
| **Nova funcionalidade** | Descrição, critérios de aceite, sprint alvo |
| **Expansão de corpus** | Lei a adicionar, chunks estimados, fonte oficial |
| **Incidente** | Severidade P0–P3, leis afetadas, impacto no diagnóstico |
| **RFC** | Motivação, alternativas consideradas, critérios de aceite, aprovação P.O. |
| **Performance** | Métrica atual, meta, ambiente (dev/prod) |
| **Governança** | Tipo de auditoria, escopo, resultado esperado |

Todos os tipos compartilham o **checklist de rastreabilidade** com os 9 arquivos que podem ser impactados.

### 5.2 Template de PR RAG

**Arquivo:** `.github/PULL_REQUEST_TEMPLATE/rag-pr.md`

Inclui:
- Tipo de mudança e labels correspondentes
- Checklist dos 9 arquivos de rastreabilidade
- JSON de evidência estruturado (obrigatório)
- Auditoria do Cockpit P.O. (Seções 7A/7B/7D verificadas)

**Exemplo de JSON de evidência:**
```json
{
  "tipo": "corpus",
  "lei_adicionada": "lc116",
  "chunks_antes": 2078,
  "chunks_depois": 2312,
  "migration": "0060_add_lc116_corpus.sql",
  "docs_atualizados": ["CORPUS-BASELINE.md", "RAG-PROCESSO.md", "RASTREABILIDADE-RAG-PO.md"],
  "cockpit_auditado": true,
  "aprovacao_po": "required"
}
```

---

## 6. Os 9 documentos de rastreabilidade RAG

| # | Arquivo | Localização | Atualizado quando |
|---|---|---|---|
| 1 | `CORPUS-BASELINE.md` | `docs/rag/` | Qualquer mudança no corpus |
| 2 | `RAG-PROCESSO.md` | `docs/rag/` | Mudança no pipeline de retrieval |
| 3 | `RAG-GOVERNANCE.md` | `docs/rag/` | Mudança nas regras de governança |
| 4 | `RAG-RESPONSABILIDADES.md` | `docs/rag/` | Mudança de responsáveis |
| 5 | `HANDOFF-RAG.md` | `docs/rag/` | Mudança técnica significativa |
| 6 | `RFC-001` / `RFC-002` | `docs/rag/RFC/` | Aprovação ou rejeição de RFC |
| 7 | `RFC-003` / `RFC-004` | `docs/` | Aprovação ou rejeição de RFC |
| 8 | `RASTREABILIDADE-RAG-PO.md` | `docs/painel-po/` | Qualquer mudança RAG |
| 9 | `GOVERNANCA-RAG-PO-COMPLETO.md` | `docs/painel-po/` | A cada sprint |

---

## 7. Histórico de PRs RAG desta sessão

| PR | Título | Sprint | Status | Labels |
|---|---|---|---|---|
| #225 | Seção 7 cockpit + 6 labels RAG + GitHub Actions | K | ✅ Mergeado | `rag:governanca`, `cockpit:3ondas` |
| #226 | 7D — documentos RAG vivos (10 MDs via fetch) | K | ✅ Mergeado | `rag:governanca`, `cockpit:3ondas` |
| #227 | Protocolo de auditoria RAG — workflow + templates + skills | K | ✅ Mergeado | `rag:governanca` |

---

## 8. Histórico completo de PRs RAG do projeto

| Sprint | PRs | Foco |
|---|---|---|
| A–C | #001–#045 | Infraestrutura inicial, schema, autenticação |
| D–E | #046–#089 | Pipeline RAG v1, ingestão corpus LC 214 |
| F | #090–#120 | Retrieval híbrido (keyword + re-ranking), Sprint F |
| G | #121–#155 | Limpeza de anomalias, 100% anchor_id, Sprint G |
| H | #156–#190 | GPT-4.1 re-ranking, performance, Sprint H |
| I–J | #191–#213 | Integração 3 Ondas, Onda 3 RAG, Sprint I–J |
| K | #214–#227 | Governança rastreabilidade, cockpit, labels, Sprint K |
| S (atual) | #292–#298 | Pipeline 3 Ondas, fix iagen (`isNonCompliantAnswer`), 5 novas leis (2.454 chunks, 10 leis) |

---

## 9. Critérios de aceite — todos verificados

| Código | Critério | Status |
|---|---|---|
| R-01 | Labels RAG criadas no repositório | ✅ 6 labels ativas |
| R-02 | GitHub Actions aplica labels automaticamente | ✅ label-governance.yml ativo |
| R-03 | Auditoria de impacto bloqueia PRs sem rastreabilidade | ✅ rag-impact-audit.yml ativo |
| R-04 | Template de issue RAG disponível | ✅ rag-change.md criado |
| R-05 | Template de PR RAG disponível | ✅ rag-pr.md criado |
| R-06 | Skill Manus atualizada com protocolo RAG | ✅ solaris-orquestracao atualizada |
| R-07 | Skill Orquestrador atualizada com protocolo RAG | ✅ solaris-contexto atualizada |
| R-08 | Cockpit Seção 7 exibe estado RAG ao vivo | ✅ 7A/7B/7C/7D implementados |
| R-09 | Documentos RAG acessíveis no cockpit (7D) | ✅ 10 MDs via fetch raw |
| R-10 | Protocolo de incidentes P0–P3 documentado | ✅ nas skills e templates |

---

## 10. O que muda para o P.O.

**Antes desta implementação:**
- Mudanças no RAG eram rastreadas apenas por commit no GitHub
- Não havia visibilidade de incidentes ou RFCs no cockpit
- Documentos de rastreabilidade podiam ficar desatualizados sem aviso
- O P.O. precisava acessar o GitHub para saber o estado do RAG

**Depois desta implementação:**
- Toda mudança RAG é classificada automaticamente por tipo e severidade
- Incidentes P0/P1 aparecem imediatamente no cockpit com destaque visual
- RFCs pendentes de aprovação ficam visíveis no cockpit com botão de ação
- O P.O. vê o estado completo do RAG em tempo real sem sair do cockpit
- PRs que não atualizam a rastreabilidade são bloqueados automaticamente
- O histórico completo de mudanças está disponível na aba "Histórico PRs" do 7B

---

## 11. Decisões de produto desta sessão

| Data | Decisão | Impacto |
|---|---|---|
| 2026-03-30 | Criar 6 labels RAG específicas por tipo | Rastreabilidade granular por categoria |
| 2026-03-30 | Implementar auditoria de impacto automática | PRs sem rastreabilidade são bloqueados |
| 2026-03-30 | Protocolo P0–P3 para incidentes | Resposta proporcional à severidade |
| 2026-03-30 | RFC requer aprovação P.O. antes do merge | Governança de mudanças arquiteturais |
| 2026-03-30 | 10 documentos RAG acessíveis no cockpit | Visibilidade total sem sair do cockpit |
| 2026-03-30 | Skills atualizadas com protocolo RAG | Governança permanente em toda sessão futura |

---

*Documento gerado em 2026-03-30. Atualizado em 2026-04-04 (Sprint S — 10 leis, 2.454 chunks, fix iagen). Próxima revisão: Sprint T (NCM + engine Onda 3).*
