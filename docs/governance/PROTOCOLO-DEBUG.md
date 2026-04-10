# Protocolo de Debug — IA SOLARIS
## docs/governance/PROTOCOLO-DEBUG.md

---

## REGRA-DB-01 — Verificar campos reais antes de query SQL

Antes de escrever qualquer query SQL com WHERE ou JOIN
em tabela existente, executar obrigatoriamente:

SHOW COLUMNS FROM [tabela];

Nunca assumir nome de campo. Sempre verificar.

Tabelas críticas e seus campos de ownership:
  projects     → createdById (NÃO user_id)
  risks_v4     → createdById (NÃO user_id)
  action_plans → createdById (NÃO user_id)

Origem: bug fix PR #451 — gapEngine usava user_id inexistente.

---

## REGRA-SPEC-01 — Spec deve referenciar schema real

Toda spec que cria procedure tRPC com acesso ao banco
deve incluir:

  Campos obrigatórios: [lista dos campos usados]
  Verificar em: drizzle/schema.ts ou SHOW COLUMNS

Nunca escrever spec com nomes de campos presumidos.

---

## REGRA-TEST-01 — Teste de integração obrigatório para procedures

Toda procedure tRPC que executa query SQL em tabela real
deve ter ao menos 1 teste de integração (não mock).

Usar describe.skipIf(!DATABASE_URL) conforme padrão Z-09.

Sem teste de integração → PR bloqueado.

---

## REGRA-SMOKE-01 — Smoke test não pode pular etapas

Smoke test de pipeline completo deve seguir checklist:

[ ] Projeto criado com dados reais (NCM + CNAE)
[ ] Questionário SOLARIS respondido (não pulado)
[ ] Questionário IA GEN respondido (não pulado)
[ ] Briefing gerado e aprovado
[ ] Pipeline de riscos executado
[ ] risks_v4 verificado no banco (COUNT > 0)

Pular qualquer etapa invalida o smoke test.

---

## TiDB-FK-01 — Verificar dados antes de criar FK

Antes de ADD CONSTRAINT FOREIGN KEY:
  Verificar registros inválidos que violam a FK:
  SELECT * FROM [tabela] WHERE [campo] NOT IN
    (SELECT [pk] FROM [tabela_referenciada])

Se houver registros inválidos → remover antes do ALTER.
Origem: PR #443 — TiDB ignorou silenciosamente o ALTER
com dados violadores.

---

*IA SOLARIS · PROTOCOLO-DEBUG · 2026-04-10*
*Atualizar a cada bug encontrado em produção*
