# DIV-Z02-003 — enum operationType: inglês vs português
Sprint: Z-02 · ID: 003 · Data: 2026-04-07 · Status: RESOLVIDA · Opção B · Corrigido em: feat/z02-to-be-flow-refactor · ADR-0010
SEVERIDADE: CRÍTICA — risco de bug silencioso em produção

## Divergência

DEC-M3-05 especifica:
```
operationType === 'product' → pula q_servico
operationType === 'service' → passa por q_servico
```

Schema Zod real (routers-fluxo-v3.ts linha ~88):
```typescript
z.enum(["produto", "servico", "misto", "industria", "comercio", "agronegocio", "financeiro"])
→ PORTUGUÊS, não inglês
```

## Impacto se não corrigido

- `operationType 'produto'` NÃO é igual a `'product'`
- `getNextStateAfterProductQ` retornaria `'q_servico'` para TODOS os tipos
- Empresa de produto puro nunca pularia Q.Serviços
- Bug silencioso: TypeScript não detecta (ambos são `string`), testes passam, usuário fica preso

## Decisão

**Opção B: usar valores em português conforme enum real.**

`getNextStateAfterProductQ` deve comparar com `"produto"`, não `"product"`.

## Valores canônicos confirmados

| operationType | Pula q_servico? | nextState |
|---|---|---|
| `"produto"` | ✅ Sim | `diagnostico_cnae` |
| `"comercio"` | ✅ Sim | `diagnostico_cnae` |
| `"servico"` | ❌ Não | `q_servico` |
| `"servicos"` | ❌ Não | `q_servico` |
| `"misto"` | ❌ Não | `q_servico` |
| `"industria"` | ❌ Não | `q_servico` |
| `"agronegocio"` | ❌ Não | `q_servico` |
| `"financeiro"` | ❌ Não | `q_servico` |
| `"product"` (inglês) | ❌ Não (bug evitado) | `q_servico` |
| qualquer outro | ❌ Não (conservador) | `q_servico` |

## Teste de regressão obrigatório

```typescript
// E2-08: 'produto' pula q_servico
expect(getNextStateAfterProductQ('produto')).toBe('diagnostico_cnae')

// E2-09: 'product' (inglês) NÃO pula q_servico — bug silencioso evitado
expect(getNextStateAfterProductQ('product')).toBe('q_servico')
```

## Rastreabilidade

- Arquivo: `server/flowStateMachine.ts` (a implementar)
- Schema: `server/routers-fluxo-v3.ts` linha ~88
- DEC-M3-05 v3: Passo 2 (usa inglês — erro)
- Contrato: `docs/contratos/CONTRATO-DEC-M3-05-v3-interface.md` Parte 3.1 (tabela de verdade)

---
*DIV-Z02-003 · IA SOLARIS · 2026-04-07*
