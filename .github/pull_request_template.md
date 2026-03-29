## Objetivo
[Descrever claramente o que esta PR resolve]

## Escopo da alteração

**Tipo:**
- [ ] Feature
- [ ] Bugfix
- [ ] Refactor
- [ ] Migration (DB)
- [ ] Observabilidade
- [ ] Governança / Docs
- [ ] Infra / CI

**Componentes afetados:**
- [ ] Backend (Node / tRPC)
- [ ] Frontend (React)
- [ ] Banco de dados / Schema
- [ ] RAG (CNAE / requisitos) ❗
- [ ] Infraestrutura / CI
- [ ] Apenas documentação

## Classificação de risco
- [ ] Baixo — sem impacto em dados ou fluxo principal
- [ ] Médio — impacto controlado e reversível
- [ ] Alto — impacto estrutural, requer aprovação explícita

**Justificativa do risco:**
[Descrever objetivamente]

## Declaração de escopo (obrigatório)
Esta PR:
- [ ] NÃO altera comportamento visível ao usuário final
- [ ] NÃO toca no adaptador `getDiagnosticSource()`
- [ ] NÃO impacta o domínio RAG
- [ ] NÃO ativa `DIAGNOSTIC_READ_MODE=new`
- [ ] NÃO executa DROP COLUMN em colunas legadas

Se qualquer item acima for falso → explicar aqui:

## Validação executada

**Testes:**
- [ ] `npx tsc --noEmit` — 0 erros
- [ ] `npx vitest run` — 100% passando
- [ ] Invariants verificados (INV-001..INV-008)

**Evidência estruturada (obrigatório):**
```json
{
  "data_integrity": true,
  "regression": false,
  "rag_impact": false,
  "unexpected_behavior": false,
  "tests_passed": true,
  "typescript_errors": 0,
  "risk_level": "low"
}
```

## Migração de banco (preencher apenas se aplicável)
- [ ] Tipo: ADD COLUMN / UPDATE / DROP / INDEX
- [ ] Reversível: sim / não
- [ ] Testado em ambiente isolado antes do merge
- [ ] Não impacta dados existentes

## Classificação da task
- [ ] Nível 1 — Seguro (autônomo — não precisa de revisão humana)
- [ ] Nível 2 — Controlado (requer revisão do Orquestrador)
- [ ] Nível 3 — Crítico (requer aprovação explícita do P.O.)

## Sincronização P0/P1 + Skills (obrigatório em PRs de fechamento de sprint)

> Marcar apenas se este PR fecha uma sprint ou altera o estado do produto.
> Se não se aplica, deixar em branco — mas justificar abaixo.

- [ ] `docs/governance/ESTADO-ATUAL.md` — HEAD, PRs, testes, sprint concluída (**P0**)
- [ ] `docs/BASELINE-PRODUTO.md` — versão, HEAD, indicadores (**P1**)
- [ ] `docs/HANDOFF-MANUS.md` — estado operacional atual (**P1**)
- [ ] `skills/solaris-contexto/SKILL.md` — seção "Estado atual do produto" + `Versão do skill`
- [ ] `skills/solaris-orquestracao/SKILL.md` — campo `Versão do skill` no topo

⚠️ **Se qualquer um dos 5 arquivos acima não foi atualizado, este PR NÃO deve ser mergeado.**

Justificativa (se não aplicável):

## Checklist final
- [ ] Código revisado pelo próprio autor
- [ ] Evidência JSON preenchida e verdadeira
- [ ] Sem arquivos fora do escopo declarado modificados
- [ ] Documentação atualizada se necessário

## Declaração final
Declaro que a implementação é determinística, não há risco oculto,
a alteração é auditável e atende o nível de confiabilidade exigido.
