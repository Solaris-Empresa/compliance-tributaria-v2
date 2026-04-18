# Changeset Disciplinado — Padrão para Issues Estruturais

> **Versão:** 1.0 | **Data:** 2026-03-24
>
> Este documento define o padrão obrigatório de organização de commits para issues estruturais.
> O objetivo é garantir rastreabilidade completa e reversibilidade segura de cada mudança.

---

## Princípio

> **"Cada commit deve ser reversível de forma independente sem quebrar o produto."**

Issues estruturais envolvem mudanças em múltiplas camadas (contrato, implementação, testes, evidências). Misturar essas camadas em um único commit torna a revisão difícil, o rollback arriscado e a rastreabilidade impossível.

---

## Os 4 Commits Obrigatórios

Toda issue estrutural deve ser resolvida em exatamente **4 commits atômicos**, nesta ordem:

### Commit 1 — `docs: contrato e ADR`

**O que inclui:**
- Atualização ou criação do documento de contrato afetado (`docs/prefill-contract-sprint.md`, `docs/adr/*.md`)
- Atualização do Invariant Registry se um novo invariant for identificado
- Atualização do PR template ou Issue template se necessário

**Convenção de mensagem:**
```
docs(structural): [descrição do contrato/ADR afetado]

Issue: #[número]
Contrato: [nome do contrato]
Invariant: [invariant afetado]
```

**Exemplo:**
```
docs(structural): atualizar Prefill Contract v3 com DA-1 e DA-2

Issue: #47
Contrato: Prefill Contract v3
Invariant: campo_coletado_no_perfil → nunca_reaparece_vazio
```

---

### Commit 2 — `fix: implementação`

**O que inclui:**
- Correção do código de produção (server, shared, client)
- Apenas os arquivos necessários para corrigir a causa raiz
- **Não inclui** testes nem evidências

**Convenção de mensagem:**
```
fix(structural): [descrição técnica da correção]

Issue: #[número]
Causa raiz: [arquivo:função:linha]
DA: [DA-N — nome da decisão arquitetural]
```

**Exemplo:**
```
fix(structural): normalizeProject() em getProjectById e getProjectsByUser

Issue: #47
Causa raiz: server/db.ts:getProjectById — MySQL2 retorna JSON como string
DA: DA-2 — API nunca entrega string JSON
```

---

### Commit 3 — `test: testes e regressão`

**O que inclui:**
- Novos testes cobrindo a causa raiz
- Testes de regressão adicionados
- Atualização de testes existentes se necessário

**Convenção de mensagem:**
```
test(structural): [descrição dos testes adicionados]

Issue: #[número]
Testes novos: [número]
Suíte: [nome do arquivo de teste]
Resultado: [X/X passando]
```

**Exemplo:**
```
test(structural): suíte PCT completa — 10 blocos, 117 testes

Issue: #47
Testes novos: 117
Suíte: server/prefill-contract.test.ts
Resultado: 117/117 passando
```

---

### Commit 4 — `docs: evidence pack`

**O que inclui:**
- Evidence Pack em `docs/evidence-packs/YYYY-MM-DD-<slug>.md`
- Prints ou evidências visuais (se houver)
- Resultado dos testes documentado

**Convenção de mensagem:**
```
docs(evidence): evidence pack para [slug da issue]

Issue: #[número]
Evidence Pack: docs/evidence-packs/YYYY-MM-DD-<slug>.md
Checkpoint: manus-webdev://[version_id]
Testes: [X/X passando]
```

**Exemplo:**
```
docs(evidence): evidence pack para prefill-contract-sprint

Issue: #47
Evidence Pack: docs/evidence-packs/2026-03-24-prefill-contract-sprint.md
Checkpoint: manus-webdev://f1babb41
Testes: 117/117 passando
```

---

## Sequência Visual

```
main
  │
  ├── [branch: fix/structural-#47-prefill-contract]
  │     │
  │     ├── Commit 1: docs(structural): atualizar Prefill Contract v3
  │     │
  │     ├── Commit 2: fix(structural): normalizeProject() em getProjectById
  │     │
  │     ├── Commit 3: test(structural): suíte PCT completa — 117 testes
  │     │
  │     └── Commit 4: docs(evidence): evidence pack para prefill-contract-sprint
  │
  └── [merge via PR após gate CI + gate orquestrador]
```

---

## Convenção de Nomenclatura de Branch

```
fix/structural-#[número]-[slug-descritivo]
```

**Exemplos:**
```
fix/structural-#47-prefill-contract-normalization
fix/structural-#52-briefing-coverage-validation
fix/structural-#61-action-plan-evidence-required
```

---

## Checklist de Changeset

Antes de abrir o PR, verifique:

- [ ] Commit 1 (docs/contrato) existe e tem mensagem no formato correto
- [ ] Commit 2 (implementação) existe e não mistura testes ou evidências
- [ ] Commit 3 (testes) existe e o resultado dos testes está na mensagem
- [ ] Commit 4 (evidence pack) existe com link do checkpoint
- [ ] Cada commit é reversível de forma independente
- [ ] Nenhum commit mistura camadas diferentes (código + teste + docs no mesmo commit)

---

## Por Que Este Padrão Importa

| Sem changeset disciplinado | Com changeset disciplinado |
|---|---|
| Rollback quebra testes junto com o código | Rollback do Commit 2 preserva testes e docs |
| Revisão confusa: o que é código, o que é teste? | Revisão clara: cada commit tem propósito único |
| Rastreabilidade impossível em histórico longo | `git log --oneline` conta a história da correção |
| Evidence pack esquecido ou incompleto | Commit 4 obrigatório garante entrega |
| CI falha sem saber qual camada quebrou | CI identifica exatamente qual commit causou falha |
