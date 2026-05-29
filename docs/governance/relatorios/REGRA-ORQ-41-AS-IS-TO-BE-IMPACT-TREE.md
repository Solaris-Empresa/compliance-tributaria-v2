# REGRA-ORQ-41 — Protocolo AS-IS/TO-BE com impact-tree

> **Espelho do bloco adicionado a `.claude/rules/governance.md`.**
> **Origem:** sessão 29/05/2026 — caso canônico AS-IS/TO-BE CPF agro (v1 75% → v4 99%).
> **Numeração:** sequencial sobre REGRA-ORQ-40 (última no governance.md em 29/05/2026).

**Vigência:** permanente, a partir de 2026-05-29
**Severidade:** governança crítica — bloqueante para implementação de mudanças cross-cutting

---

## Quando aplicar (gatilhos)

Esta regra aplica a TODA mudança que cumpra qualquer uma das condições:

| Gatilho | Sinal |
|---|---|
| Campo persistido | nova coluna em schema OU mudança de shape em JSON compartilhado |
| Tipo compartilhado | `interface`/`type` consumido por backend + frontend + shared |
| Identidade | `cnpj`, `cpf`, `user_id`, `project_id` e similares |
| Enum global | `companyType`, `taxRegime`, `status`, etc. |
| Contrato ADR | `perfilHash`, `archetypeVersion`, contratos canônicos versionados |

Se qualquer gatilho aplicar, esta regra é **obrigatória antes de qualquer código de produção**.

---

## Obrigatório no AS-IS/TO-BE (10 itens hard-enforced)

1. **Toda afirmação com citação `arquivo:linha`** (REGRA-ORQ-27 reforçada — sem exceção)
2. **Skill `impact-tree` aplicada** (11 passos) — `.claude/skills/impact-tree/SKILL.md`
3. **LOC reais medidos** (`wc -l`) **antes** de classificar Classe B vs C (REGRA-ORQ-24)
4. **Snapshots `.snap` LIDOS** (não assumidos) — `find . -name "*.snap" + grep <alvo>`
5. **ADRs afetados identificados com bump declarado** (MAJOR/MINOR/PATCH)
6. **`UX_DICTIONARY.md` analisado** (regra Z-13.5) — se a mudança toca frontend
7. **Plano de rollback com N níveis declarado** (referência REGRA-ORQ-34 Protocolo 1-4)
8. **Spec do banco (`DB-SPEC-*.md`) separada do AS-IS/TO-BE**
9. **Plano de testes de aceitação (`PLANO-TESTES-*.md`) separado** com DoD por fase
10. **Issues pré-existentes verificadas** (`gh issue search` — Lição #83)

---

## Tooling obrigatório (instalável globalmente)

| Tool | Comando install | Uso |
|---|---|---|
| `ast-grep` | `npm install -g @ast-grep/cli` | Padrões semânticos em corpo de função/expressão |
| `knip` | `npm install -g knip` | Dead-exports (NÃO dead-fields — usar grep manual para fields) |
| `ts-prune` | `npm install -g ts-prune` | Alternativa enxuta ao knip |
| `dependency-cruiser` | `npm install -g dependency-cruiser` | Grafo formal de dependências |
| `grep`/`gh` | já instalados | Padrões textuais + busca de issues |

Guia operacional: `docs/governance/relatorios/TOOLING-IMPACT-TREE-GUIDE-20260529.md` (a ser commitado em Opção 1 ou 2 — P.O. decide).

---

## Limitações conhecidas (capturadas na sessão 29/05/2026 — Lição #93)

1. **`knip` / `ts-prune` detectam dead-EXPORTS, não dead-FIELDS de schema**
   - Para campos de schema (ex: `users.cpf` dead-read), usar:
     ```bash
     grep -rn "\.<campo>\b" server/ client/src
     ```
2. **`ast-grep` tem limitação com padrões em interfaces TS**
   - Padrões `cnpj?: string` puros não casam como linhas isoladas em `interface { }`
   - Para tipos em interfaces, manter `grep -nE "fieldName\s*\??\s*:"`
3. **`depcruise` global emite warning recomendando devDependency local**
   - Funcional, ignorável em uso pontual

---

## Versionamento do documento AS-IS/TO-BE

| Versão | Cobertura mínima | Observação |
|---|---|---|
| v1 | sem mínimo | cobertura inicial (pode ser <90%) |
| v2+ | ≥97% | skill `impact-tree` aplicada |
| Cada versão | declarar cobertura % e evidência empírica | tabela de auto-auditoria final obrigatória |

---

## Entregáveis obrigatórios (4 artefatos antes de implementar)

Toda implementação de mudança cross-cutting exige a presença dos 4:

1. **`AS-IS-TO-BE-<feature>-v<N>.md`** — spec principal (9 seções da skill `impact-tree`)
2. **`DB-SPEC-<feature>.md`** — spec do banco + migrations UP/DOWN + queries de verificação
3. **`PLANO-TESTES-<feature>.md`** — contratos de teste por fase (unit + integração + regressão + E2E) + DoD por fase
4. **`CHECKLIST-ACEITE-<feature>.md`** — checklist P.O. com assinatura antes de autorizar F0

---

## Refutação técnica obrigatória (Lição #93)

Se outro agente (Manus, ChatGPT, outro Claude) fornecer análise técnica de comportamento de campo/função/lógica **sem citação `arquivo:linha`**, o Claude Code DEVE validar via Read antes de incorporar ao TO-BE.

**Caso canônico (sessão 29/05/2026):** Manus afirmou que a flag `analise_1_cnpj_operacional` "verifica se o CNPJ existe". Claude Code validou empiricamente em `buildPerfilEntidade.ts:346-369` + `routers/perfil.ts:186` e descobriu que a flag **NÃO** é sobre "CNPJ existe" — é sobre "escopo unitário de 1 entidade vs consolidação multi-CNPJ de grupo econômico". Conclusão final (manter o nome) permaneceu correta, mas pela razão certa.

---

## Consequências

- Mudança cross-cutting **sem AS-IS/TO-BE compliant** → P.O. **NÃO** autoriza F0
- Implementação iniciada sem os **4 artefatos** → `validate-pr` reprova
- Afirmação técnica sem citação `arquivo:linha` no AS-IS → review reprova
- Skill `impact-tree` não aplicada → cobertura declarada é considerada **<90%** e bloqueada

---

## Exceções

- **Hotfix P0** (REGRA-ORQ-11) — entregáveis mínimos: AS-IS resumido + DB-SPEC + CHECKLIST (sem PLANO-TESTES completo). Fast-track com justificativa.
- **Mudanças triviais** (≤50 LOC · 1 arquivo · sem schema · sem ADR) — Classe A: dispensada da regra completa. AS-IS curto suficiente.

---

## Origem documentada

Sessão 29/05/2026 — sequência de 4 versões do AS-IS/TO-BE CPF agro:

| Versão | Cobertura | Salto | Causa do salto |
|---|---|---|---|
| v1 | 75% | inicial | manual, sem skill, sem ferramentas |
| v2 | 97% | +22pp | auto-crítica forçada pelo P.O. + 4 ferramentas instaladas + skill criada |
| v3 | 98% | +1pp | aprovações P.O. (mockup + rollback + validação CPF) |
| v4 | 99% | +1pp | refutação técnica via Read empírico (Manus errou semântica de flag) |

**Lição central:** o salto v1 → v2 (75% → 97%) **não foi inteligência adicional** — foi rigor metodológico. Esta REGRA-ORQ-41 cristaliza esse rigor.

---

## Vinculadas

- REGRA-ORQ-24 (classe de impacto B vs C)
- REGRA-ORQ-26 (branch obrigatória)
- REGRA-ORQ-27 (validação de consumo / Lição #59)
- REGRA-ORQ-28 (Triade de garantia)
- REGRA-ORQ-34 (Pipeline de Dados Bugfix Protocol)
- REGRA-ORQ-35 (NUNCA ASSUMA)
- REGRA-ORQ-36 (técnicas de investigação T1-T5)
- Lições #59, #64, #65, #66, #83, #87, **#93**
- Skill: `.claude/skills/impact-tree/SKILL.md`
- Guia operacional: `docs/governance/relatorios/TOOLING-IMPACT-TREE-GUIDE-20260529.md`
- Caso canônico: 4 versões em `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-*.md`
