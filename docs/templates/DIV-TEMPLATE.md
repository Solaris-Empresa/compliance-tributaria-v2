# DIV-{SPRINT}-{ID} — Divergência de Spec vs Implementação
## IA SOLARIS · Governance

**Sprint:** {Z-01 / Z-02 / etc.}
**ID:** {sequencial por sprint}
**Data:** {YYYY-MM-DD}
**Reportado por:** Manus
**Status:** ABERTA | RESOLVIDA · Opção {A/B/C}

---

## Divergência identificada

| Campo | Spec (prompt/ADR/DEC) | Implementação real |
|---|---|---|
| {campo} | {valor esperado} | {valor encontrado} |

## Contexto

Arquivo da spec: {prompt / ADR-XXXX / DEC-M3-XX}
Arquivo do código: {server/lib/arquivo.ts : linha N}
Bloco de teste afetado: {ex: CD-01 a CD-08}

## Assert original (mantido sem alteração)

```typescript
// assert como estava na spec:
expect(result.campo).toBe('valor_spec')
```

## Impacto

```
Se B (código errado): {descrição do impacto em produção}
Se A (spec errada):   {componentes que precisam ser atualizados}
```

## Decisão do Orquestrador

```
[ ] Opção A: spec estava errada → atualizar {ADR/DEC} com nome real
[ ] Opção B: código está errado → corrigir {arquivo : linha}
[ ] Opção C: equivalentes → registrar alias em {ADR/DEC} + adaptar assert
```

**Decisão:** {A / B / C}
**Justificativa:** {texto}
**Ação:** {o que fazer}
**Resolvido em:** {PR #XXX}
