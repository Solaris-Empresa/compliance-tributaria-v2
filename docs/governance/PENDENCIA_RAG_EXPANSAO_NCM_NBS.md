# PENDÊNCIA — Expansão do Corpus RAG: NCM e NBS
## IA SOLARIS · Registrado em: 2026-04-06
## Status: ABERTA · Responsável: Orquestrador + Manus
## Prioridade: P2 — executar em paralelo com Sprint Y ou logo após

---

## Contexto

O corpus RAG atual cobre 10 leis (2.509 chunks) com 100% de confiabilidade
para análise qualitativa. Para diagnóstico preciso por NCM (produtos) e NBS
(serviços), a cobertura está em 55% — suficiente para identificar riscos, mas
insuficiente para responder "qual alíquota exata para este produto/serviço".

Esta pendência registra o que PODEMOS fazer agora vs o que depende do governo.

---

## O QUE DEPENDE DE NÓS — executar em ordem

### Lote D-1 — Resoluções CGIBS nº 1, 2 e 3/2026
**Status:** mapeado · Issue #191 do repositório
**Impacto:** +8% cobertura NCM/NBS → de 55% para ~63%
**Natureza:** documentos públicos, existem hoje, pronto para indexar
**O que são:** primeiras resoluções operacionais do Comitê Gestor do IBS
com critérios de classificação por NCM e NBS sob a nova sistemática
**Ação:** gerar prompt para Manus indexar no corpus RAG (mesmo pipeline
dos lotes anteriores)
**Bloqueio:** nenhum — pode iniciar após Sprint Y

---

### Lote D-2 — TIPI 2022 (Decreto 11.158/2022)
**Status:** pendente de levantamento e indexação
**Impacto:** +15% cobertura NCM → de ~63% para ~78%
**Natureza:** catálogo oficial com todos os NCMs do Brasil (~10.000 códigos)
com classificações fiscais. Documento público, existente.
**O que são:** Tabela de Incidência do IPI — base de toda classificação de
produto no Brasil. Com ela indexada, o sistema reconhece qualquer NCM
informado pelo advogado e cruza com as regras da Reforma.
**Ação:** download, tratamento estruturado por NCM, indexação no RAG
**Bloqueio:** nenhum — requer trabalho técnico de estruturação (~800 chunks)

---

### Lote D-3 — Reindexação estruturada do Anexo I da LC 214/2025
**Status:** pendente de reprocessamento
**Impacto:** +6% cobertura NCM → de ~78% para ~84%
**Natureza:** o texto da LC 214 já está indexado como prosa. O Anexo I
precisa ser reprocessado como tabela estruturada NCM × benefício, para
permitir consultas diretas "este código tem alíquota zero?"
**Ação:** reprocessar Anexo I da LC 214 como lookup table + reindexa no RAG
**Bloqueio:** nenhum — reprocessamento interno

---

### Lote E — NBS (Nomenclatura Brasileira de Serviços)
**Status:** pendente de levantamento
**Impacto:** de 30% para ~65% cobertura NBS
**Natureza:** equivalente da NCM para serviços. A NBS completa com os
códigos de serviço precisa ser indexada para que empresas de serviço
recebam diagnóstico granular.
**Ação:** levantar NBS atualizada + Notas Técnicas RFB sobre CBS por
segmento de serviço, estruturar e indexar
**Bloqueio:** nenhum — requer levantamento e trabalho técnico

---

## O QUE DEPENDE DO GOVERNO — monitorar, não bloqueia nosso avanço

| Documento | Status | Previsão |
|---|---|---|
| Lista oficial alíquota zero por NCM (Art. 14, LC 214) | Não publicada | 2º sem. 2025 — atrasada |
| Tabela de alíquotas IBS/CBS por NCM (completa) | Em elaboração | Sem data |
| Lista definitiva do Imposto Seletivo por NCM | Consulta pública | Sem data |
| Alíquotas CBS por código NBS | Em elaboração | Sem data |

**Ação para itens do governo:** monitoramento trimestral.
Quando publicados, entram como Lote F (próximo lote RAG).
NÃO bloqueiam nenhuma feature do produto — o sistema já sinaliza
corretamente que essas listas estão pendentes de publicação.

---

## Projeção de cobertura

| Após | Cobertura NCM | Cobertura NBS |
|---|---|---|
| Hoje | 55% | 30% |
| Lote D-1 (CGIBS) | 63% | 45% |
| Lote D-2 (TIPI) | 78% | 45% |
| Lote D-3 (Anexo I) | 84% | 45% |
| Lote E (NBS) | 84% | 65% |
| Lote F (quando governo publicar) | 95%+ | 85%+ |

---

## Sequência de execução recomendada

```
Sprint Y (em andamento)
  → Lote D-1: CGIBS 1–3/2026       ← sem bloqueio, maior impacto/esforço
  → Lote D-2: TIPI 2022             ← maior volume, indexar em paralelo
  → Lote D-3: Reindexação Anexo I   ← reprocessamento interno
  → Lote E: NBS completa            ← requer levantamento prévio
  → Lote F: aguarda governo
```

---

## Observação de governança

Esta pendência NÃO desvia o TO-BE. O RAG é infraestrutura de dados —
sua expansão ocorre em paralelo com M3 e não bloqueia nenhuma feature
arquitetural. O Consolidador de Completude (M3 Fase 1) e o Consolidador
de Diagnóstico (M3 Fase 2) funcionam com qualquer nível de cobertura RAG.
Maior cobertura = diagnóstico mais preciso, não arquitetura diferente.

---

*Registrado pelo Orquestrador Claude — 2026-04-06*
*Repositório: github.com/Solaris-Empresa/compliance-tributaria-v2*
