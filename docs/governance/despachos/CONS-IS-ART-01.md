# CONS-IS-ART-01 — Artigo do Imposto Seletivo (LC 214/2025)

**Tipo:** Despacho ao Consultor + Parecer (verificação determinística) · **Data:** 23/06/2026
**Lei:** Lei Complementar nº 214, de 16 de janeiro de 2025
**Regra:** REGRA-ORQ-6 (determinismo · PDF literal) + Lição #126 (PDF primário, nunca código/RAG) + ORQ-45
**Status:** ✅ RESOLVIDO — errata aplicada (PR `fix/errata-is-art409`, despacho v116)

---

## Despacho (pergunta)

O código citava **4 artigos divergentes** para o IS:
- `Art. 2` — prompt do briefing (`routers-fluxo-v3.ts:1804,4380` fallback; ADR-0018)
- `Art. 57` — explicitamente **excluído** do IS (ADR-0012)
- `Art. 393 §1º` — filtro de elegibilidade IS por NCM/CNAE (`risk-eligibility-is-ncm-cnae.ts:5`, Issue #1046)
- `Art. 409 §1º` — afirmado por análise anterior, sem evidência de código

Pergunta determinística: **qual artigo da LC 214/2025 estabelece a lista taxativa de bens/serviços sujeitos ao IS?**

---

## Parecer (resposta do Consultor — fonte: `Lcp_214.pdf`, extração literal)

**Veredito: o artigo do IS é o `Art. 409 §1º`** (PDF pg. 90, "LIVRO II — DO IMPOSTO SELETIVO"). O código errava ao citar Art. 393.

### Tabela de reconciliação (citação literal + página)

| Artigo | O que é (literal, PDF) | Pág. | É IS? |
|---|---|---|---|
| **Art. 2º** | Princípio da neutralidade do IBS e CBS | 1 | ❌ NÃO |
| **Art. 57** | Bens/serviços de uso ou consumo pessoal (vedação de crédito) | 17 | ❌ NÃO (lista itens parecidos, finalidade distinta) |
| **Art. 393** | Regularização de crédito apurado a maior + devolução ao Fundo (Art. 384) | 86 | ❌ NÃO |
| **Art. 409 §1º** | **Institui o IS + lista taxativa (7 incisos) por NCM/SH + Anexo XVII** | 90 | ✅ **SIM** |

### Texto literal do Art. 409 §1º (lista taxativa — 7 incisos)
> § 1º Para fins de incidência do Imposto Seletivo, consideram-se prejudiciais à saúde ou ao meio ambiente os bens classificados nos códigos da NCM/SH e o carvão mineral, e os serviços listados no Anexo XVII, referentes a:
> **I** - veículos; **II** - embarcações e aeronaves; **III** - produtos fumígenos; **IV** - bebidas alcoólicas; **V** - bebidas açucaradas; **VI** - bens minerais; **VII** - concursos de prognósticos e fantasy sport.

### Divergências determinísticas identificadas
1. Número do artigo: código dizia **393**, lei é **409**.
2. Incisos: código tinha **8** (separava "embarcações" e "aeronaves"); a lei tem **7** (une no inciso II).
3. A **substância** (7 tipos de bens/serviços + NCMs) está correta no código — erram só a **referência legal** e a **estrutura de incisos**.

### Pendência não-bloqueante
- **Anexo XVII** (lista literal de **serviços** do IS) — necessário só se o gate cobrir serviços. O gate atual é por NCM/SH (bens) → Art. 409 §1º + NCMs bastam. C4 fora do escopo da errata.

---

## Correções aplicadas (errata v116 · PR `fix/errata-is-art409`)

| # | Item | De → Para |
|---|---|---|
| C1 | `risk-eligibility-is-ncm-cnae.ts` JSDoc | Art. 393 §1º → **Art. 409 §1º** · incisos 8→7 (une embarcações/aeronaves) · NCMs inalterados |
| C2 | Prompt briefing IS (`routers-fluxo-v3.ts:1804,4380`) + testes `bug-manual-03` / `briefing-context-injection` | Art. 2 → **Art. 409 §1º** |
| C3 | `FLOW_DICTIONARY.md` | fixado Art. 409 §1º + contagem real (22 ativas) |

## Residual (decidido fora do escopo desta errata — despacho v116)
- **ADR-0012** (Art. 57 vs Art. 2 IS) e **ADR-0018** (Art. 2 para IS) ainda documentam o Art. 2 como IS — **factualmente refutado** por este parecer. Decisão P.O.: tratar como **errata de código** agora; limpeza dos ADRs é follow-up separado (não amendment nesta errata). Art. 57 **permanece corretamente excluído** do IS.
