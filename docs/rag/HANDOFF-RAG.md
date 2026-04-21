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
| Versão do baseline | **v5.0** | 2026-04-13 (Sprint Z-13 ENCERRADA · Gate 7 PASS · PRs #485–#497) — **sem alterações de corpus desde Z-13** |
| Total de chunks | **2.515** | Sprint Z-12 Lote D (CGIBS +6 chunks) |
| Leis ativas | **13** | lc214 · lc227 · lc224 · ec132 · lc123 · lc87 · lc116 · cg_ibs · rfb_cbs · conv_icms · resolucao_cgibs_1 · resolucao_cgibs_2 · resolucao_cgibs_3 |
| Confiabilidade gold set | 100% (8/8) | Sprint G |
| RFCs abertas | 0 | Sprint S concluída (RFC-003 e RFC-004 executadas) |
| Próxima revisão gold set | 2026-09-26 | Semestral |

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

*HANDOFF-RAG.md v1.5 · 2026-04-13 (Sprint Z-13 ENCERRADA · Gate 7 PASS · HEAD 1ea5c64 · PRs #485–#497 · 2.515 chunks · 13 leis · 100% anchor_id)*
*Atualizar a cada sprint que altere o corpus ou o Decision Kernel*
