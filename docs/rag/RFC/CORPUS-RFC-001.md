# CORPUS-RFC-001 — Correção chunk fragmentado id 811 (lc227)

| Campo            | Valor                          |
|------------------|--------------------------------|
| RFC              | 001                            |
| Data de criação  | 2026-03-26                     |
| Tipo             | Correção de conteúdo           |
| Severidade       | P2 — Médio                     |
| Sprint           | G                              |
| Autor            | Manus AI                       |
| Aprovação P.O.   | [ ] Pendente                   |
| Status           | DRAFT — aguardando diagnóstico |

---

## Problema

O chunk `id=811` (lei=`lc227`) tem `chunkIndex=2` e inicia no meio de uma frase, sem caput do artigo.
O chunk `id=810` (chunk anterior) provavelmente contém o início truncado ou é de artigo diferente.

**Evidência:**
- `chunkIndex: 2`
- `conteudo_bytes: 1706`
- Conteúdo inicia sem caput identificável (começa com "349 da Lei Complementar nº 214...")

---

## Diagnóstico necessário antes da execução

```sql
-- Inspecionar id 811 e seus vizinhos
SELECT id, lei, artigo, titulo, chunkIndex,
       anchor_id, autor, data_revisao,
       LEFT(conteudo, 500) AS conteudo_inicio,
       LENGTH(conteudo) AS bytes
FROM ragDocuments
WHERE id IN (809, 810, 811, 812, 813)
ORDER BY id;
```

O resultado desta query deve ser colado nesta RFC antes da execução.

---

## Ação proposta

A definir após diagnóstico. Opções:
- **A) Reingesta completa do artigo** — se o chunk 1 estiver ausente
- **B) Fusão com chunk anterior** — se id=810 contém o caput truncado
- **C) Correção do conteúdo** — UPDATE com texto completo do artigo

---

## Snapshot pré-execução

A ser preenchida pelo Manus antes de qualquer escrita no banco.

---

## SQL de execução

A ser definido após diagnóstico e aprovação do P.O.

---

## SQL de rollback

A ser definido após diagnóstico.

---

## Snapshot pós-execução

A ser preenchida pelo Manus após execução.

---

## Aprovações

- [ ] Orquestrador (Claude) — após diagnóstico
- [ ] P.O. (Uires Tapajós) — antes da execução no banco
