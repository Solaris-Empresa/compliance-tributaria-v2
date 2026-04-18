# ADR-0012 — Mapeamento Canônico: Art. 57 vs Art. 2 LC 214/2025 (Imposto Seletivo)

**Status:** Aceito  
**Data:** 2026-04-07  
**Autor:** Manus (implementador técnico)  
**Contexto:** BUG-MANUAL-03 — LLM associava Art. 57 ao Imposto Seletivo incorretamente  
**Referência:** ANALISE-CRITICA-DEC-M3-05-TO-BE.md · Diagnóstico E0-D da Z-02

---

## 1. Contexto

Durante a análise da Etapa 0 do Z-02, foi identificado que o LLM (`generateBriefingFromDiagnostic`) citava o **Art. 57 da LC 214/2025** ao identificar riscos de Imposto Seletivo (IS) em empresas de bebidas (NCM 2202).

O corpus RAG contém 6 chunks com "Art. 57" — todos tratando de **bens de uso/consumo pessoal** (não relacionados ao IS). O modelo recuperava esses chunks em buscas sobre "consumo" e "seletivo" e os associava incorretamente ao IS.

---

## 1.1 Causa Raiz

Falha de precisão na query RAG + ausência de instrução explícita no prompt do briefing.

O modelo não tinha instrução para distinguir:
- **Art. 2 LC 214/2025** → Imposto Seletivo (IS) — fato gerador, alíquotas, incidência
- **Art. 57 LC 214/2025** → Bens de uso/consumo pessoal — exclusões de crédito

---

## 2. Decisão

Adicionar instrução explícita e permanente ao prompt do `generateBriefingFromDiagnostic`:

```
- Quando identificar risco de Imposto Seletivo (IS), citar EXCLUSIVAMENTE Art. 2 da LC 214/2025.
- O Art. 57 da LC 214/2025 trata de bens de uso/consumo pessoal — NÃO está relacionado ao IS.
- NUNCA associar Art. 57 a riscos de IS. Se o contexto RAG trouxer Art. 57 em busca sobre IS, ignorar essa associação.
```

---

## 4. Mapeamento Canônico — Artigos LC 214/2025

| Artigo | Assunto | Quando citar |
|---|---|---|
| **Art. 2** | Imposto Seletivo (IS) — fato gerador | Sempre que houver risco IS em produtos NCM |
| **Art. 9** | IBS — fato gerador | Operações com bens e serviços em geral |
| **Art. 11** | CBS — fato gerador | Operações com bens e serviços em geral |
| **Art. 28** | Alíquota padrão IBS/CBS | Quando discutir alíquota de referência |
| **Art. 57** | Bens de uso/consumo pessoal | Exclusões de crédito — NÃO relacionado ao IS |
| **Art. 116** | Regimes diferenciados — saúde | Serviços de saúde NBS 1.03 |
| **Art. 117** | Regimes diferenciados — educação | Serviços de educação NBS 1.01 |
| **Art. 118** | Regimes diferenciados — transporte | Serviços de transporte coletivo |

---

## 5. Alternativas Rejeitadas

**A. Remover Art. 57 do corpus RAG:** Rejeitado — o Art. 57 é relevante para análise de crédito. O problema é de associação, não de presença no corpus.

**B. Filtrar Art. 57 na query RAG por tipo de busca:** Rejeitado — complexidade desnecessária. A instrução explícita no prompt é mais robusta e auditável.

---

## 6. Consequências

- O LLM passa a citar Art. 2 (correto) em vez de Art. 57 (incorreto) para riscos IS
- O mapeamento canônico serve de referência para futuros prompts que envolvam artigos da LC 214/2025
- Specs M03-01..M03-05 verificam a instrução no código e a ausência de associação Art. 57/IS
