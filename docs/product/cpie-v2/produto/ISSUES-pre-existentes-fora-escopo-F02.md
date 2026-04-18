# ISSUES PRÉ-EXISTENTES — Fora do Escopo da F-02

**Documento:** ISSUES-pre-existentes-fora-escopo-F02.md  
**Data de registro:** 2026-03-23  
**Registrado por:** manus-agent (F-02B → F-02C transition gate)  
**Status:** ABERTO — aguardando sprint de correção  
**Escopo:** Estas falhas existiam **antes** da migração F-02 e foram confirmadas no baseline (commit `51f308b1`). Não são causadas pela F-02 e não bloqueiam a continuidade da migração.

---

## ISSUE-001 — saveQuestionnaireProgress: status renomeado

**Arquivo de teste:** `server/routers-fluxo-v3-etapas2-5.test.ts`  
**Linha aproximada:** 213  
**Tipo:** Falha de teste por divergência de nomenclatura  
**Severidade:** Média (testes falham, funcionalidade pode estar operacional)

### Descrição

O teste espera que `saveQuestionnaireProgress` retorne `status: "assessment_fase2"`, mas o endpoint retorna `status: "diagnostico_cnae"`.

```
Expected: "assessment_fase2"
Received: "diagnostico_cnae"
```

### Causa provável

O campo `status` do projeto foi renomeado em algum sprint anterior (provavelmente durante a migração para o `flowStateMachine.ts`), mas o teste não foi atualizado para refletir o novo nome.

### Impacto

- Testes falham no CI
- Funcionalidade pode estar operacional em produção (o status `"diagnostico_cnae"` é o nome correto atual)
- Não afeta a migração F-02

### Ação necessária

Atualizar o teste para usar `"diagnostico_cnae"` (ou o nome correto do status atual) e verificar se há outros testes com o mesmo problema.

### Confirmação de pré-existência

```bash
# Verificado no baseline antes da F-02A (commit 51f308b1):
git stash && pnpm vitest run server/routers-fluxo-v3-etapas2-5.test.ts
# Resultado: MESMA FALHA presente antes da migração
git stash pop
```

---

## ISSUE-002 — generateActionPlan: mock incompleto no teste

**Arquivo de teste:** `server/routers-fluxo-v3-etapas2-5.test.ts`  
**Linha aproximada:** 1170  
**Tipo:** Falha de teste por mock incompleto  
**Severidade:** Média (testes falham, funcionalidade operacional em produção)

### Descrição

O teste de `generateActionPlan` falha com:

```
TypeError: Cannot read properties of undefined (reading 'length')
at answers.length
```

O mock do banco não está configurado para retornar um array para a query `select().from(questionnaireAnswersV3).where(...)`, retornando `undefined` em vez de `[]`.

### Causa provável

O endpoint `generateActionPlan` faz uma query direta à tabela `questionnaireAnswersV3` (não à coluna JSON do projeto), e o mock do teste não inclui essa query. O mock foi escrito antes de o endpoint ser atualizado para usar a tabela.

### Impacto

- Testes falham no CI
- Funcionalidade operacional em produção (banco real retorna array)
- Não afeta a migração F-02

### Ação necessária

Adicionar ao mock do teste:
```typescript
vi.mocked(getDb).mockResolvedValue({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]), // ← adicionar este mock
  limit: vi.fn().mockResolvedValue([...]),
} as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);
```

### Confirmação de pré-existência

```bash
# Verificado no baseline antes da F-02A (commit 51f308b1):
git stash && pnpm vitest run server/routers-fluxo-v3-etapas2-5.test.ts
# Resultado: MESMA FALHA presente antes da migração
git stash pop
```

---

## ISSUE-003 — routers-fluxo-v3-etapas2-5.test.ts: terceira falha (correlacionada)

**Arquivo de teste:** `server/routers-fluxo-v3-etapas2-5.test.ts`  
**Tipo:** Falha de teste correlacionada com ISSUE-001 ou ISSUE-002  
**Severidade:** Baixa (correlacionada com as issues acima)

### Descrição

Uma terceira falha no mesmo arquivo de teste, correlacionada com as issues acima. Provavelmente causada pela mesma divergência de nomenclatura de status ou pelo mock incompleto que propaga o erro para testes subsequentes.

### Ação necessária

Resolver ISSUE-001 e ISSUE-002 primeiro — a terceira falha provavelmente se resolve em cascata.

---

## Resumo

| Issue | Arquivo | Causa | Sprint sugerido |
|---|---|---|---|
| ISSUE-001 | `routers-fluxo-v3-etapas2-5.test.ts` | Status renomeado, teste desatualizado | Sprint pós-F-02 |
| ISSUE-002 | `routers-fluxo-v3-etapas2-5.test.ts` | Mock incompleto para `questionnaireAnswersV3` | Sprint pós-F-02 |
| ISSUE-003 | `routers-fluxo-v3-etapas2-5.test.ts` | Correlacionada com ISSUE-001/002 | Sprint pós-F-02 |

**Total de testes afetados:** 3 de 187 (1,6%)  
**Impacto em produção:** Nenhum (funcionalidades operacionais)  
**Bloqueio para F-02:** Não  
**Bloqueio para F-03:** A ser avaliado — recomendado corrigir antes de F-03

---

*Documento gerado automaticamente como pré-condição 2 da F-02C.*  
*Referência: ADR-006, Bloco 5 — Rollback Drill.*
