---
description: Governance SPEC-FIRST — metodologia SOLARIS-SPEC-FIRST v1.2 + CHECKLIST-VAL-01 + CHECKLIST-REVIEW-01
globs:
  - "docs/governance/**"
---

# Governance Rules — SPEC-FIRST + Checklists

> Parte 3 de 4 do corpus de governança (split GOVERNANCE-SPLIT-01).

## SOLARIS-SPEC-FIRST v1.2 — índice da metodologia

> Materializada e consolidada em REGRA-ORQ-43 (índice) + REGRA-ORQ-44 (DoD negativo).
> Esta seção é o ponto de entrada; as regras canônicas vivem em `governance-core.md`.

A metodologia spec-first é o fluxo único obrigatório para features/bugs Classe B/C:

| Etapa | Regra canônica (em `governance-core.md`) |
|---|---|
| 1. Classificar impacto (A/B/C) | REGRA-ORQ-24 |
| 2. Análise cross-cutting AS-IS/TO-BE | REGRA-ORQ-41 + skill `.claude/skills/impact-tree/SKILL.md` |
| 3. Artefatos da issue (Triade) | REGRA-ORQ-28 |
| 4. Template canônico da issue | `.github/ISSUE_TEMPLATE/sprint-issue.md` |
| 5. Papéis (RACI) | REGRA-ORQ-33 |
| 6. DoD negativo por consumer crítico | REGRA-ORQ-44 |
| 7. Enforcement de merge | `.github/workflows/validate-pr.yml` |
| Auditoria de fim de sessão | REGRA-ORQ-19 (Passo 8: lições commitadas — REGRA-ORQ-46) |
| Auditoria de corpus | `docs/governance/corpus-audit-checklist.md` |

Os checklists operacionais que sustentam o spec-first estão abaixo (CHECKLIST-VAL-01 / CHECKLIST-REVIEW-01).

## CHECKLIST-VAL-01 — Rastreamento end-to-end obrigatório para fixes de validação

Vigência: permanente, a partir de 2026-05-07
Origem: Lição #74 (caso canônico PR #1015)
Severidade: bloqueante — fix não pode ser implementado sem checklist respondido

### Quando aplicar

SEMPRE que o fix tocar um dos seguintes arquivos/funções:

- `validateM1Input.ts` (e variantes `validateM1Seed*`)
- `computeMissing*` (qualquer função que produza `missing_required_fields`)
- `computeStatus.ts` (qualquer função que derive `status_arquetipo`)
- `buildSnapshot` (composição final do snapshot)
- `buildPerfilEntidade.ts` (engine principal)
- Qualquer função que produza ou consuma `status_arquetipo`,
  `missing_required_fields` ou `blockers_triggered`

### 5 perguntas obrigatórias antes de codar

**Q1.** Qual é o sintoma exato reportado pelo P.O. **na UI**?
(Não o erro técnico — o que o usuário **vê**.)

> Exemplo PR #1015: "Botão 'Confirmar Perfil da Entidade' desabilitado"
> NÃO: "validateM1Seed lança NBS_REQUIRED"

**Q2.** Mapa completo do fluxo end-to-end:

```
campo no form → mutation → DB → query → snapshot →
JSON de resposta → componente → estado UI → indicador visual
```

Listar **todos** os arquivos e funções no caminho. Citar `arquivo:linha`
para cada nó (REGRA-ORQ-27).

**Q3.** Para cada arquivo no caminho Q2: existe validação/gate que também
verifica o campo que estou alterando?

Listar `arquivo:linha` de **cada** gate encontrado. Verificar:
- Throws (TRPCError, Error customizado)
- Adições a arrays de erro/missing/blockers
- Branches condicionais que afetam status downstream
- Filtros que descartam dado

**Q4.** Se eu aplicar meu fix e simular mentalmente o cenário do P.O.,
qual é o valor de `status_arquetipo` retornado ao frontend?

É `"confirmado"`? Se não — **por quê?** Detalhar a função e linha que
força o valor não-confirmado.

> Exemplo PR #1015: pós-fix, `status_arquetipo === "inconsistente"`
> porque `computeStatus.ts:96-102` força quando
> `missing_required_fields.length > 0`.

**Q5.** Existe test existente que documenta o comportamento que estou
alterando?

Se sim:
- O test vai **FALHAR** após meu fix (comportamento mudou) **OU**
- O test vai **PASSAR** (comportamento preservado)?

Se passar: **confirmar explicitamente** que "passar" significa
"problema resolvido" e não "comportamento bloqueante preservado"
(Lição #59 — assemble vs consumption).

> Exemplo PR #1015: test `T73` em `build-perfil-entidade-pr-fin-objeto-v2.test.ts:137-146`
> documenta `status_arquetipo === "inconsistente"`. Pós-fix #1015 o test
> ainda passa **porque o comportamento bloqueante foi preservado**.
> Sinal de fix incompleto, não de fix correto.

### Aplicação

- Respostas Q1-Q5 devem estar **no PR body** antes de abrir
- Sem CHECKLIST-VAL-01 respondido → PR rejeitado em review
- Respostas vagas ou inferidas (sem `arquivo:linha`) → autor solicitado
  a refazer antes de avançar

### Vinculadas

- Lição #74 (motivação — fix downstream incompleto)
- REGRA-ORQ-27 (validação de consumo — citação `arquivo:linha`)
- REGRA-ORQ-35 (NUNCA ASSUMA — checklist Read Before Write)
- Lição #59 (assemble vs consumption)
- Lição #65 (fluxo end-to-end)
- CHECKLIST-REVIEW-01 (contramedida revisor)

## CHECKLIST-REVIEW-01 — Revisão obrigatória de PR que toca validação

Vigência: permanente, a partir de 2026-05-07
Origem: Lição #74 (caso canônico PR #1015)
Severidade: bloqueante — PR não pode ser mergeado sem checklist do revisor

### Quando aplicar

Aplicar pelo revisor (Manus) **antes de aprovar** qualquer PR que toque
os arquivos listados em CHECKLIST-VAL-01.

### 4 perguntas obrigatórias para revisor

**R1.** O PR body inclui as respostas ao CHECKLIST-VAL-01 (Q1 a Q5)?

Se não → solicitar antes de aprovar. PR sem CHECKLIST-VAL-01 respondido
**não pode ser mergeado**.

**R2.** A resposta Q4 do autor confirma `status_arquetipo === "confirmado"`
para o cenário reportado pelo P.O.?

Se não → **PR não resolve o sintoma**. Não aprovar. Solicitar autor
ampliar escopo para cobrir gates downstream.

> Caso canônico negativo: se autor responde Q4 com
> `"status_arquetipo === 'inconsistente'"` e justifica como
> "comportamento preservado por test T73", revisor deve **bloquear**.
> Comportamento preservado bloqueante = fix não resolve sintoma.

**R3.** Existe test E2E ou de integração que cobre o cenário completo
(form → `perfil.build` → `status_arquetipo === "confirmado"`)?

Se não → solicitar inclusão **OU** registrar como tech debt **explícito**
no PR body com:
- Justificativa de por que o test não foi incluído
- Issue de tracking para sprint futura
- Risco aceito declarado pelo P.O.

Tech debt sem justificativa explícita não é aceitável — solicitar antes
de aprovar.

**R4.** O diff toca apenas os arquivos declarados no escopo do fix?

Se sim **e** o sintoma envolve múltiplos gates (R2 negativo) → questionar
se o escopo está completo. Possível indicador de spec do P.O. cirúrgica
demais que não cobre o problema real.

> Caso canônico PR #1015: diff tocou apenas `validateM1Input.ts` (escopo
> declarado da spec) — mas sintoma "botão bloqueado" é controlado por
> `computeStatus.ts`. Diff cirúrgico não cobre o sintoma. R4 negativo
> → ampliar escopo OU bloquear merge.

### Aplicação

- Revisor responde R1-R4 **no comentário de review do PR**
- Respostas R1-R4 são **gate de aprovação** (não advisório)
- Se R1 ausente → bloquear merge sem fricção
- Se R2 negativo → bloquear merge mesmo com testes verdes
- Se R4 indica escopo insuficiente → escalar para P.O. (decisão de produto
  sobre ampliar spec ou aceitar fix parcial com tech debt declarado)

### Vinculadas

- Lição #74 (motivação)
- CHECKLIST-VAL-01 (autor produz respostas; revisor verifica)
- REGRA-ORQ-33 (RACI — Manus é o Validador)
- REGRA-ORQ-15 (PR body template — base para incluir CHECKLIST-VAL-01)

