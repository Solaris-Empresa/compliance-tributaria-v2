---
name: RAG — Mudança / RFC / Incidente
about: Registrar qualquer mudança, RFC, incidente ou nova funcionalidade no RAG
title: "[RAG] "
labels: ["rag:governanca"]
assignees: ""
---

## Tipo de mudança

<!-- Marque o tipo correto — ele define a label adicional que deve ser aplicada -->

- [ ] 🔵 **Nova funcionalidade** — adicionar capacidade ao retriever ou corpus (`rag:retriever`)
- [ ] 🟤 **Expansão de corpus** — ingestão de nova lei ou atualização de chunks (`rag:corpus`)
- [ ] 🔴 **Incidente** — falha, hallucination, corpus desatualizado, degradação (`rag:incidente`)
- [ ] 🟣 **RFC** — proposta de mudança arquitetural ou de processo (`rag:rfc`)
- [ ] 🟠 **Performance** — latência, rate limit, cache, SLA (`rag:performance`)
- [ ] 🟢 **Governança** — rastreabilidade, auditoria, documentação (`rag:governanca`)

---

## Descrição

> Descreva claramente o que está sendo proposto, alterado ou reportado.

---

## Impacto esperado nos arquivos de rastreabilidade

<!-- Marque todos que se aplicam — o workflow rag-impact-audit.yml verificará automaticamente -->

- [ ] `docs/rag/CORPUS-BASELINE.md` — totais, distribuição por lei, anomalias
- [ ] `docs/rag/RAG-PROCESSO.md` — pipeline de recuperação
- [ ] `docs/rag/RAG-GOVERNANCE.md` — regras de governança
- [ ] `docs/rag/HANDOFF-RAG.md` — handoff para próxima sessão
- [ ] `docs/rag/RAG-RESPONSABILIDADES.md` — responsabilidades da equipe
- [ ] `docs/painel-po/RASTREABILIDADE-RAG-PO.md` — documento P.O.
- [ ] `docs/painel-po/index.html` — Seção 7 do Cockpit P.O.
- [ ] `skills/solaris-orquestracao/SKILL.md` — skill do Manus
- [ ] `skills/solaris-contexto/SKILL.md` — skill do Orquestrador
- [ ] Nenhum dos acima — justifique abaixo

---

## Para incidentes (preencher se tipo = Incidente)

**Severidade:**
- [ ] P0 — Crítico (sistema inoperante)
- [ ] P1 — Alto (degradação severa)
- [ ] P2 — Médio (degradação parcial)
- [ ] P3 — Baixo (cosmético)

**Leis afetadas:** <!-- ex: lc214, lc224, ec132 -->

**Comportamento esperado:**

**Comportamento atual:**

**Evidência:** <!-- log, query SQL, screenshot -->

---

## Para RFCs (preencher se tipo = RFC)

**Motivação:**

**Solução proposta:**

**Alternativas consideradas:**

**Critérios de aceite:**
- [ ] 
- [ ] 
- [ ] 

**Aprovação necessária do P.O.:** Sim / Não

---

## Para expansão de corpus (preencher se tipo = Corpus)

**Lei(s) a ingerir:** <!-- ex: lc116, lc87 -->

**Chunks estimados:**

**Fonte dos dados:**

**RFC associada:** <!-- ex: RFC-004 -->

**Impacto no CORPUS-BASELINE.md:**
- Total de chunks após ingestão:
- Novas leis ativas:

---

## Checklist de rastreabilidade obrigatório

- [ ] Label(s) `rag:*` aplicada(s) a esta issue
- [ ] PR associado terá os arquivos de impacto atualizados
- [ ] CORPUS-BASELINE.md será versionado (se corpus mudou)
- [ ] Cockpit P.O. será auditado após o merge
- [ ] Skill atualizada se processo/governança mudou

---

## Referências

<!-- PRs relacionados, issues anteriores, RFCs, sprints -->
