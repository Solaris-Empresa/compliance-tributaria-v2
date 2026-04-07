# DIV-Z01-004 — assertValidTransition: Error nativo vs TRPCError

**Sprint:** Z-01 (descoberta) / Z-02 (formalização)
**Data:** 2026-04-07
**Descoberta por:** Manus (durante testes BUG-E2E-01)
**Decisão do Orquestrador:** Opção B — corrigir (lança TRPCError)
**Status:** PENDENTE DE IMPLEMENTAÇÃO

---

## Descrição da Divergência

O JSDoc de `assertValidTransition` (linha 443 de `server/flowStateMachine.ts`) documenta:

```
* Lança TRPCError com code FORBIDDEN se a transição for inválida.
* @throws TRPCError({ code: 'FORBIDDEN' }) se a transição não for permitida
```

Mas a implementação real (linha 454–460) lança `Error` nativo:

```ts
// IMPLEMENTADO (incorreto):
throw new Error(`[flowStateMachine] Transição inválida "${from}" → "${to}"`);

// DOCUMENTADO (correto):
throw new TRPCError({ code: 'FORBIDDEN', message: `Transição inválida "${from}" → "${to}"` });
```

---

## Impacto

**Frontend:** Quando o botão "Confirmar CNAEs" ou qualquer ação de transição de estado falha, o erro retornado não tem o formato tRPC esperado (`{ code, message }`). O interceptor de erro do cliente tRPC não reconhece `Error` nativo como `TRPCError`, podendo:

1. Exibir toast genérico "Erro desconhecido" em vez de mensagem específica
2. Não acionar o `onError` do `useMutation` corretamente em alguns cenários
3. Logs de erro no servidor sem stack trace tRPC estruturado

**Testes:** Os testes de BUG-E2E-01 foram ajustados para capturar `Error` nativo — isso mascarou o problema durante a Z-01.

---

## Evidência

```
# Arquivo: server/flowStateMachine.ts
# Linha 443 (JSDoc):
* @throws TRPCError({ code: 'FORBIDDEN' })

# Linha 454 (implementação):
throw new Error(`[flowStateMachine] Transição inválida "${from}" → "${to}"`);

# Linha 460 (implementação):
throw new Error(`[flowStateMachine] Transição "${from}" → "${to}" não existe no mapa`);
```

---

## Opções de Resolução

| Opção | Descrição | Risco |
|---|---|---|
| **A** | Manter `Error` nativo e corrigir o JSDoc para refletir a realidade | Baixo — mas o frontend continua com UX degradada em erros de transição |
| **B** ✅ | Substituir `throw new Error(...)` por `throw new TRPCError({ code: 'FORBIDDEN', message: ... })` em ambas as linhas | Baixo — requer import de `TRPCError` no `flowStateMachine.ts` |

**Decisão do Orquestrador: Opção B** — corrigir para lançar `TRPCError`.

---

## Arquivos Afetados

```
server/flowStateMachine.ts  ← linhas 454 e 460
server/bug-e2e-01-confirm-cnaes.test.ts  ← testes precisarão ser atualizados para TRPCError
```

---

## Histórico

| Data | Evento |
|---|---|
| 2026-04-07 | Descoberta durante testes BUG-E2E-01 (Z-01) |
| 2026-04-07 | Formalizada como DIV-Z01-004 (Z-02, pré-merge PR #373) |
| Pendente | Implementação da Opção B |
