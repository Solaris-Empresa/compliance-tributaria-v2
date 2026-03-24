# Pull Request — Correção Estrutural

<!--
⚠️  Este template é obrigatório para PRs que referenciam issues com label `structural-fix`.
    O CI bloqueará o merge se qualquer seção obrigatória estiver vazia ou o checklist incompleto.
    Preencha TODAS as seções antes de solicitar revisão.
-->

## 1. Problema ✅ OBRIGATÓRIO

<!-- Descreva o problema do ponto de vista do usuário/produto. O que estava quebrando? -->

**Issue relacionada:** Closes #[número]

**Sintoma observado:**
> _[descreva o que o usuário via / o que o sistema fazia de errado]_

---

## 2. Causa Raiz ✅ OBRIGATÓRIO

<!-- Descreva a causa raiz técnica identificada. Seja específico: arquivo, função, linha. -->

```
Arquivo:   [caminho/arquivo.ts]
Função:    [nome da função]
Linha(s):  [número(s)]
Causa:     [descrição técnica precisa]
```

**Como foi confirmada a causa raiz:** _[teste / log / análise estática / diagnóstico manual]_

---

## 3. Contrato / ADR Afetado ✅ OBRIGATÓRIO

<!-- Qual contrato formal ou ADR esta PR modifica ou protege? -->

| Contrato / ADR | Arquivo | Status após este PR |
|---|---|---|
| _ex.: Prefill Contract v3_ | `docs/prefill-contract-sprint.md` | ✅ Protegido |
| _ex.: DA-2 — API normalizada_ | `server/db.ts` | ✅ Implementado |

---

## 4. Solução Aplicada ✅ OBRIGATÓRIO

<!-- Descreva tecnicamente o que foi feito. Inclua diff conceitual se útil. -->

**Arquivos modificados:**

| Arquivo | O que mudou |
|---|---|
| `server/db.ts` | _[descrição da mudança]_ |
| `shared/questionario-prefill.ts` | _[descrição da mudança]_ |

**Abordagem escolhida e por quê:** _[justifique a decisão técnica]_

---

## 5. Invariants Protegidos ✅ OBRIGATÓRIO

<!-- Liste os invariants do produto que esta PR protege ou restaura -->

| Invariant | Status antes | Status após |
|---|---|---|
| `campo_coletado_no_perfil → nunca_reaparece_vazio` | ❌ Violado | ✅ Restaurado |
| _[outro invariant]_ | _[antes]_ | _[depois]_ |

---

## 6. Testes Adicionados ✅ OBRIGATÓRIO

<!-- Liste todos os testes novos adicionados nesta PR -->

**Arquivo de testes:** `server/[nome].test.ts`

| Teste | Invariant coberto | Resultado |
|---|---|---|
| `[nome do teste]` | `[invariant]` | ✅ Passando |

**Total de testes novos:** _[número]_
**Total de testes na suíte após PR:** _[número]_

---

## 7. Regressões Cobertas ✅ OBRIGATÓRIO

<!-- Liste os cenários de regressão executados -->

- [ ] Suíte PCT completa: `pnpm vitest run server/prefill-contract.test.ts` → _[X/X passando]_
- [ ] Suite completa: `pnpm test` → _[X/X passando]_
- [ ] Regressão manual: _[descrição do cenário testado manualmente]_

**Resultado da regressão:** _[todos passando / falhas identificadas e tratadas]_

---

## 8. Evidências Anexadas ✅ OBRIGATÓRIO

<!-- Marque o que foi entregue e inclua links -->

- [ ] Evidence Pack: `docs/evidence-packs/YYYY-MM-DD-<slug>.md` → [link]
- [ ] Payload antes/depois: _[inline abaixo ou link]_
- [ ] Print / evidência visual: _[inline ou link]_
- [ ] Output dos testes: _[inline abaixo ou link]_
- [ ] Link do checkpoint: `manus-webdev://[version_id]`

**Payload antes/depois (resumo):**
```diff
- [campo antes da correção]
+ [campo depois da correção]
```

---

## 9. Risco Residual ✅ OBRIGATÓRIO

<!-- O que ainda pode falhar após esta PR? Por que é aceitável? -->

**Risco residual identificado:** _[descreva]_

**Por que é aceitável:** _[justifique]_

**Mitigação aplicada:** _[o que foi feito para minimizar o risco]_

---

## 10. Checklist de Merge ✅ TODOS OBRIGATÓRIOS

### Código
- [ ] Não altera lógica de produto fora do escopo da issue
- [ ] Não introduz dependências novas sem justificativa
- [ ] Segue padrão de changeset disciplinado (docs → impl → testes → evidências)

### Testes
- [ ] Testes novos adicionados cobrindo a causa raiz
- [ ] Testes de regressão executados e passando
- [ ] `pnpm test` completo passando

### Documentação
- [ ] Evidence Pack criado em `docs/evidence-packs/`
- [ ] Contrato / ADR atualizado se necessário
- [ ] Invariant Registry atualizado se necessário (`docs/governance/invariant-registry.md`)

### Processo
- [ ] Issue referenciada com `Closes #[número]`
- [ ] Labels corretas aplicadas na issue e no PR
- [ ] Checkpoint salvo antes do merge (`checkpoint-required`)
- [ ] Gate do orquestrador obtido (se severidade CRÍTICO/ALTO)

---

## Notas para o Revisor

<!-- Qualquer contexto adicional que o revisor precisa saber -->

_[preencher se necessário]_
