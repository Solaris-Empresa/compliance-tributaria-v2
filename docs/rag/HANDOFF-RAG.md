# HANDOFF-RAG.md — Contexto de Sessão para Operações do Corpus RAG

> **Uso:** cole este documento no início de qualquer sessão Claude que envolva o corpus RAG.
> É o equivalente do HANDOFF-MANUS.md, mas focado no Orquestrador.
> **Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2

---

## Cole este prompt no início de qualquer sessão RAG

```
Você é o Orquestrador do projeto IA SOLARIS.

Antes de qualquer trabalho, execute o Gate 0 de RAG:

1. Leia docs/rag/CORPUS-BASELINE.md — versão atual, anomalias abertas, gold set
2. Leia docs/rag/RAG-PROCESSO.md — qual processo se aplica a esta sessão?
3. Leia docs/rag/RAG-RESPONSABILIDADES.md — RACI: quem aprova o quê?
4. Verifique /admin/rag-cockpit — confiabilidade atual vs meta 98%
5. Declare: "Estado RAG verificado — corpus v[X], [N] chunks, [N] leis,
   confiabilidade [X]%, [N] RFCs pendentes"

Só então inicie o trabalho solicitado.

Regras invioláveis:
- Nenhum UPDATE no banco sem dry-run + aprovação P.O.
- Nenhuma RFC sem template CORPUS-RFC-TEMPLATE.md
- Nenhuma expansão de lei sem gold set definido antes
- Toda sessão começa com estado verificado, nunca do zero
```

---

## Estado atual do corpus (atualizar a cada sprint)

| Indicador | Valor | Última atualização |
|---|---|---|
| Versão do baseline | **v5.1** | 2026-05-08 (adendo gaps de atualidade · PR #1033) — **sem alterações de corpus desde Z-13; 17 docs pendentes** |
| Total de chunks | **2.515** | Sprint Z-12 Lote D (CGIBS +6 chunks) |
| Leis ativas | **13** | lc214 · lc227 · lc224 · ec132 · lc123 · lc87 · lc116 · cg_ibs · rfb_cbs · conv_icms · resolucao_cgibs_1 · resolucao_cgibs_2 · resolucao_cgibs_3 |
| Confiabilidade gold set | 100% (8/8) | Sprint G |
| RFCs abertas | 0 (formal) · ⚠️ **17 documentos pós-abr/2026 pendentes** | Inventário Manus 2026-05-06 + gap table |
| Próxima revisão gold set | 2026-09-26 | Semestral |
| Q.CNAE fonte | **100% regulatório** (M1+M2+M3) | PR #1030 (Issue #1028 Opção C) — 2026-05-08 |
| Race condition auto-start | **Em fix** (PR #1032) | Issue #1031 — em validação Manus V1-V4 |

---

## Leis no corpus — escopo declarado

**Escopo aprovado pelo P.O. (2026-03-26):** todas as empresas brasileiras — privadas, públicas, de economia mista. Visão 100% holística da reforma tributária.

| Lei | Descrição | Chunks | Status |
|-----|-----------|--------|--------|
| lc214 | LC 214/2025 — IBS, CBS, IS | 1.573 | ✅ Ativo |
| lc227 | LC 227/2024 — CGIBS | 434 | ✅ Ativo |
| lc224 | LC 224/2024 — IBS compartilhado | 28 | ✅ Ativo |
| ec132 | EC 132/2023 — Emenda constitucional | 18 | ✅ Ativo |
| lc123 | LC 123/2006 — Simples Nacional / MEI | 25 | ✅ Ativo (RFC-002) |
| lc116 | LC 116/2003 — ISS | 60 | ✅ Ativo (Sprint S) |
| lc87  | LC 87/1996 — ICMS | 60 | ✅ Ativo (Sprint S) |
| cg_ibs | Regulamento CGIBS | 26 | ✅ Ativo (Sprint S) |
| rfb_cbs | Regulamento CBS/RFB | 7 | ✅ Ativo (Sprint S) |
| conv_icms | Convênios ICMS | 278 | ✅ Ativo (Sprint S) |
| resolucao_cgibs_1 | Resolução CGIBS 01/2025 | 4 | ✅ Ativo (Sprint Z-12 · Lote D) |
| resolucao_cgibs_2 | Resolução CGIBS 02/2025 | 1 | ✅ Ativo (Sprint Z-12 · Lote D) |
| resolucao_cgibs_3 | Resolução CGIBS 03/2025 | 1 | ✅ Ativo (Sprint Z-12 · Lote D) |
| solaris | Conhecimento jurídico SOLARIS | 0 | Pendente DEC-004 |

---

## RFCs executadas — histórico Sprint G

| RFC | Problema | Ação | Status |
|-----|---------|------|--------|
| RFC-001 | id 811 lc227 fragmentado | Fusão chunks 810+811 | EXECUTED 2026-03-26 |
| RFC-002 | 25 chunks lc214→lc123 | UPDATE cirúrgico | EXECUTED 2026-03-26 |
| RFC-003 | ~10 chunks leis avulsas | Reclassificação futura | EXECUTED Sprint S |
| RFC-004 | Expansão 5 novas leis | lc87, lc116, cg_ibs, rfb_cbs, conv_icms | EXECUTED Sprint S |

---

## Processos disponíveis

Antes de gerar qualquer prompt para o Manus, identificar qual processo se aplica:

| Situação | Processo | Documento |
|----------|----------|-----------|
| Anomalia detectada / erro no corpus | P-01 RFC | docs/rag/RAG-PROCESSO.md |
| Adicionar nova lei ao corpus | P-02 Ingestão | docs/rag/RAG-PROCESSO.md |
| Nova lei não está no enum | P-03 Expansão enum | docs/rag/RAG-PROCESSO.md |
| Revisão semestral de cobertura | P-04 Gold set | docs/rag/RAG-PROCESSO.md |

---

## Arquivos críticos do sistema RAG

| Arquivo | Impacto | Alterar com |
|---------|---------|-------------|
| `server/rag-retriever.ts` | Motor de recuperação | RFC + testes |
| `drizzle/schema.ts` | Enum de leis | P-03 + migration |
| `scripts/corpus-utils.mjs` | Ingestão | RFC de expansão |
| `docs/rag/CORPUS-BASELINE.md` | Estado do corpus | A cada RFC |
| `docs/rag/gold-set-queries.sql` | Critério de qualidade | P-04 semestral |

---

## Decisões estratégicas tomadas pelo P.O.

| Código | Decisão | Data |
|--------|---------|------|
| DEC-001 | Prefill cruzado QC-07→QO-03 pós-UAT | 2026-03-24 |
| DEC-002 | anchor_id como chave canônica imutável | Sprint D |
| DEC-003 | Estratégia ingestão Anexos LC 214 | Pendente |
| **DEC-004** | **Gate jurídico para lei='solaris'** | **Pendente** |
| DEC-005 | Escopo holístico: todas as empresas brasileiras | 2026-03-26 |
| DEC-006 | LC 123/2006 incluída no corpus (Opção A) | 2026-03-26 |

---

## Bloqueios permanentes

- ❌ Nenhum UPDATE no banco sem aprovação dupla (Orquestrador + P.O.)
- ❌ Nenhuma lei nova sem revisão jurídica (DEC-004 quando implementado)
- ❌ DIAGNOSTIC_READ_MODE=new (aguarda UAT)
- ❌ F-04 Fase 3 (aguarda UAT)

---

## Pendências operacionais — 2026-05-08

### Documentos não-ingeridos (17 itens — gap table)

🔴 **6 críticos (P0):** Decreto 12.955/2026 (CBS), Resoluções CGIBS 4/5/6, Portaria Conjunta MF/CGIBS 7/2026, NT 2025.002 v1.36, NT 008/2026 (NFS-e DANFSe), Página "Orientações 2026" RFB.

🟠 **9 secundários (P1-P2):** DeRE pacote, Manuais RTC (Piloto v2, Produção Beta v1, Primeiros Passos), Cartilhas IBS, GT-08, Guia EFD-ICMS/IPI v3.2.2, FAQ piloto CBS, FAQ prazos LC 227, NTs 011/012 EFD-Contribuições.

⚠️ **2 parciais:** Ajuste SINIEF 49/2025 com alterações abr/2026, Ato Conjunto RFB/CGIBS 1/2025.

Fonte: `docs/0-RAG/0-acervo-v3-06mai26/Gap table Atualidade x Plataforma RAG da Solaris IA.md`.

### Próximos passos pendentes (autorização P.O.)

- [ ] Onda 1 ingestão emergencial (6 críticos) — 1-3 semanas
- [ ] Pipeline Watcher (anti-gap-futuro) — 4-8 semanas
- [ ] Refactor architectural (taxonomia + vigência) — 8-16 semanas
- [ ] Skill custom `/ingest-rag-batch` para 98% confiabilidade
- [ ] Issue #1031 — fix race condition auto-start (PR #1032 em validação)

Detalhes em `docs/rag/RAG-PROCESSO.md` (P-06 — 3 estratégias) e `docs/rag/E2E-RAG-FLUXO.md` (fluxo end-to-end).

---

*HANDOFF-RAG.md v1.6 · 2026-05-08 (adendo gaps de atualidade · PR #1033 mergeado · Issue #1028 Opção C concluída · Issue #1031 em validação · 2.515 chunks · 13 leis · backbone legal completo · camada regulamentar/operacional defasada em 17 itens)*
*Atualizar a cada sprint que altere o corpus ou o Decision Kernel*
