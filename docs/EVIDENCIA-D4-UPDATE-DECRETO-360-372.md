# Evidência D4 — UPDATE cnaeGroups Decreto 12.955 Arts. 360-372

**Data:** 29/06/2026 14h35  
**Despacho:** Nominal 29/06/2026 14h35 · D4=A  
**Aprovação:** P.O. Uires Tapajós  
**Fundamento jurídico:** Dr. José (manifestação preparatória) — Arts. 360-372 são integralmente do Capítulo dos Bens Imóveis da CBS  
**Executor:** Manus  
**Método:** UPDATE direto no banco de produção (TiDB Cloud) via mysql2

---

## Verificação pré-UPDATE (READ-ONLY)

| Campo | Valor |
|-------|-------|
| Tabela | `ragDocuments` |
| Filtro | `lei = 'decreto12955' AND artigo BETWEEN 360 AND 372` |
| Chunks encontrados | 18 |
| cnaeGroups VAZIO antes | 18 |
| cnaeGroups PREENCHIDO antes | 0 |

---

## SQL executado

```sql
UPDATE ragDocuments
SET cnaeGroups = '41,42,43,68'
WHERE lei = 'decreto12955'
  AND CAST(REGEXP_SUBSTR(artigo, '[0-9]+') AS UNSIGNED) BETWEEN 360 AND 372
  AND (cnaeGroups IS NULL OR cnaeGroups = '');
-- affectedRows: 18
```

**Cláusula de segurança:** `AND (cnaeGroups IS NULL OR cnaeGroups = '')` — não sobrescreve valores existentes.

---

## Verificação pós-UPDATE

| Artigo | cnaeGroups | Status |
|--------|------------|--------|
| Art. 360 | 41,42,43,68 | ✅ |
| Art. 360 (parte 2) | 41,42,43,68 | ✅ |
| Art. 360 (parte 3) | 41,42,43,68 | ✅ |
| Art. 361 | 41,42,43,68 | ✅ |
| Art. 362 | 41,42,43,68 | ✅ |
| Art. 363 | 41,42,43,68 | ✅ |
| Art. 364 | 41,42,43,68 | ✅ |
| Art. 364 (parte 2) | 41,42,43,68 | ✅ |
| Art. 364 (parte 3) | 41,42,43,68 | ✅ |
| Art. 365 | 41,42,43,68 | ✅ |
| Art. 366 | 41,42,43,68 | ✅ |
| Art. 366 (parte 2) | 41,42,43,68 | ✅ |
| Art. 367 | 41,42,43,68 | ✅ |
| Art. 368 | 41,42,43,68 | ✅ |
| Art. 369 | 41,42,43,68 | ✅ |
| Art. 370 | 41,42,43,68 | ✅ |
| Art. 371 | 41,42,43,68 | ✅ |
| Art. 372 | 41,42,43,68 | ✅ |

**Total:** 18/18 chunks corretos (100%) · Outros: 0

---

## Impacto no RAG

Os 18 chunks do Decreto 12.955 Arts. 360-372 passaram de **pool universal** (cnaeGroups='') para **pool setorial construção civil** (cnaeGroups='41,42,43,68').

**Antes:** qualquer empresa recebia esses chunks no RAG, independente do CNAE.  
**Depois:** apenas empresas com CNAE 41xx, 42xx, 43xx, 68xx recebem esses chunks.

**Melhoria esperada:** o RAG passa a recuperar os artigos do Decreto 12.955 para construtoras (CNAE 41/42/43/68) com maior precisão, contribuindo para a cobertura dos 13 riscos do Dr. José.

---

## Correspondência artigo → risco (Dr. José)

| Artigo Decreto | Artigo LC 214 | Risco |
|----------------|---------------|-------|
| Art. 360 | Art. 252 | Regime específico bens imóveis |
| Art. 361 | Art. 253 | Locação/cessão/arrendamento |
| Art. 362 | Art. 254 | Exclusões do regime |
| Art. 363-364 | Art. 255 | SINTER / avaliação |
| Art. 365 | Art. 255 §5º | Crédito construção civil + CIB |
| Art. 366-368 | Art. 256 | Redutor de Ajuste |
| Art. 369 | Art. 257 | Créditos do IBS |
| Art. 370-372 | Art. 257 §§ | Controle por empreendimento / parcelas |

---

## Declaração

UPDATE executado conforme autorização D4=A do P.O. Uires Tapajós (Despacho 29/06/2026 14h35).  
Sujeito a ratificação posterior do Dr. José (formalidade — conteúdo sem dúvida jurídica).  
Nenhum chunk com cnaeGroups pré-existente foi modificado (cláusula de segurança aplicada).
