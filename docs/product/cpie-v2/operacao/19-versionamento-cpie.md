# CPIE v2 — Versionamento do Motor

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado

---

## 1. Esquema de Versão

O motor CPIE v2 usa o esquema `cpie-v{major}.{minor}`:

| Componente | Descrição | Exemplo |
|---|---|---|
| `major` | Versão da arquitetura do motor | `2` |
| `minor` | Versão das regras e thresholds | `0` |

**Versão atual:** `cpie-v2.0`

---

## 2. Quando Incrementar

### Incremento de `minor` (ex: v2.0 → v2.1)

Incrementar quando houver:

- Adição de nova regra determinística (nova letra ou número)
- Modificação de threshold existente (ex: mudar penalização de `high` de -20 para -15)
- Modificação de veto de uma regra
- Adição de novo campo ao perfil de entrada
- Modificação do prompt da IA (extração ou arbitragem)
- Correção de bug que altera o comportamento de análise

### Incremento de `major` (ex: v2.x → v3.0)

Incrementar quando houver:

- Mudança na estrutura do output (campos adicionados/removidos do `CpieV2Result`)
- Mudança no esquema do banco (`consistency_checks`)
- Refatoração completa do pipeline
- Mudança no modelo de decisão (ex: adicionar novo tipo de bloqueio)

---

## 3. Procedimento de Versionamento

Ao incrementar a versão do motor:

1. Atualizar a constante `ANALYSIS_VERSION` em `server/cpie-v2.ts`:
   ```typescript
   const ANALYSIS_VERSION = "cpie-v2.1"; // era "cpie-v2.0"
   ```

2. Atualizar o campo `analysisVersion` no schema do banco se necessário

3. Atualizar o documento `14-single-source-of-truth.md` com os novos valores

4. Atualizar a `04-matriz-de-regras.md` se regras foram adicionadas/modificadas

5. Adicionar ou atualizar cenários na `09-matriz-de-cenarios.md` para cobrir as mudanças

6. Executar todos os testes:
   ```bash
   pnpm test server/cpie-v2.test.ts server/cpieV2Router.test.ts
   ```

7. Salvar checkpoint com mensagem descritiva: `"CPIE v2.1 — [descrição da mudança]"`

---

## 4. Histórico de Versões

| Versão | Data | Mudanças |
|---|---|---|
| `cpie-v2.0` | 2026-01-29 | Lançamento inicial do CPIE v2 |
| `cpie-v2.0` | 2026-03-22 | Adição do campo `mediumAcknowledged` no banco; filtro de falsos positivos de porte; melhoria dos prompts de IA com tabela BNDES/Sebrae |

---

## 5. Compatibilidade entre Versões

Registros no banco com `analysis_version = "cpie-v2.0"` são sempre lidos corretamente, independentemente da versão atual do motor. O campo `analysis_version` é informativo — não altera o comportamento de leitura.

Quando a versão do motor muda, **novos registros** são criados com a nova versão. Registros antigos não são migrados.

---

## 6. Critério de Release

Uma nova versão do motor só pode entrar em produção se:

1. ICE ≥ 98 para todas as regras afetadas pela mudança (ver doc 22)
2. Todos os 35 cenários da Matriz de Cenários passam (ver doc 09)
3. Cobertura de testes ≥ 85% nas regras CPIE v2
4. Revisão e aprovação do P.O.
5. Checkpoint salvo com a mensagem de versão
