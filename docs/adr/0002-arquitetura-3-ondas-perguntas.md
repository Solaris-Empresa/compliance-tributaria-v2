# ADR-0002 — Arquitetura das 3 Ondas de perguntas

**Data:** 2026-03-31 | **Status:** aceito | **Issue:** #192
**Risk score:** high | **Autores:** P.O., Claude

---

## Contexto

Perguntas do questionário não têm rastreabilidade de fonte.
O advogado não distingue se uma pergunta vem de requisito legal,
orientação SOLARIS ou inferência do LLM (INV-005 sem cobertura).

## Decisão — campo `fonte` no QuestionSchema

| Onda | Fonte | Enum | Quem define |
|---|---|---|---|
| 1ª | Requisito regulatório | `regulatorio` | Corpus RAG |
| 2ª | Orientação jurídica SOLARIS | `solaris` | Seeds SOL-001..012 |
| 3ª | Inferência contextual LLM | `ia_gen` | Prompt de geração |

```typescript
fonte: z.enum(['regulatorio', 'solaris', 'ia_gen'])
```

## Consequências

- **Positivas:** rastreabilidade completa por pergunta, INV-005 coberto
- **Trade-offs:** prompts de geração IA precisam classificar explicitamente
- **Bloqueios gerados:** nenhum novo
- **VALID_TRANSITIONS:** não alterado

## Rollback

```sql
-- S6 — rollback completo
ALTER TABLE solaris_questions DROP COLUMN fonte;
ALTER TABLE iagen_questions DROP COLUMN fonte;
```

> ⚠️ DROP COLUMN requer aprovação do P.O. conforme bloqueio permanente.

## Feature flag

```typescript
// server/config/feature-flags.ts
'g15-fonte-perguntas': false // habilitar após validação P.O.
```

## Revisão obrigatória se

Nova fonte de perguntas for adicionada ao sistema.

---

*IA SOLARIS · ADR-0002 · Criado em 2026-03-31 · Sprint N · Issue #192*
