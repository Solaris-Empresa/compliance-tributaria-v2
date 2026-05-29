# ISSUE-BUG-AGRO-CPF — Body para `gh issue create`

> **Status:** body pronto. **NÃO abrir issue até autorização explícita do P.O.**
> Comando para abrir (quando autorizado):
> ```bash
> gh issue create \
>   --title "feat(agro): aceitar CPF para Pessoa Física — consistência frontend" \
>   --label "bug,legal-compliance,agro,P1" \
>   --body-file docs/governance/relatorios/ISSUE-BUG-AGRO-CPF-BODY.md
> ```
> Verificação prévia obrigatória (Lição #83):
> ```bash
> gh issue list --search "CPF Pessoa Física agro" --state all
> gh issue list --search "tax_id_type taxIdType" --state all
> gh issue list --search "produtor rural CPF" --state all
> ```

---

## Problema

A plataforma exige **CNPJ exclusivamente** no cadastro de projetos. Pessoa Física (ex: produtor rural com CPF) **não consegue criar projeto** — bloqueada na porta de entrada.

**Reclamação do tributarista** (29/05/2026): o agronegócio brasileiro tem produtores rurais pessoa física legítimos (CPF) que precisam de diagnóstico de compliance tributário. Hoje, esses clientes ficam fora ou usam CNPJ fake (workaround a verificar via Q2 do §F).

## Escopo desta issue

**APENAS** consistência de frontend/backend para aceitar **CPF ou CNPJ** no formulário de cadastro do projeto.

**Fora do escopo (tech debt P2 para sprint posterior):**
- ❌ Enquadramento jurídico do Art. 164/165 LC 214 (produtor rural não-contribuinte por padrão / opção pelo regime regular)
- ❌ Campos "produtor rural integrado", "receita anual < R$ 3,6 mi", "regime regular"
- ❌ Perguntas SOLARIS novas específicas de produtor rural
- ❌ `risk_categories` novas (Arts. 164-166)
- ❌ Consulta RFB async para validar status do CPF (Opção C)

**Justificativa do corte:** P.O. decidiu em 29/05/2026 (sessão presencial) priorizar **desbloqueio funcional** (cliente PF consegue criar projeto) sem entrar em diagnóstico jurídico profundo. Diagnóstico profundo vira sprint dedicada quando Dr. Swami validar enquadramento.

## Spec completa (em ordem de leitura)

| # | Documento | Path | Status |
|---|---|---|---|
| 1 | AS-IS/TO-BE v4 cirúrgica (principal) | `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md` | branch `docs/cpf-pf-spec-exaustiva` · commit `e163f47` |
| 2 | DB-SPEC (banco) | `docs/governance/relatorios/DB-SPEC-BUG-AGRO-CPF.md` | mesma branch |
| 3 | Plano de testes (aceitação) | `docs/governance/relatorios/PLANO-TESTES-BUG-AGRO-CPF.md` | mesma branch |
| 4 | Checklist de aceite P.O. | `docs/governance/relatorios/CHECKLIST-ACEITE-BUG-AGRO-CPF.md` | mesma branch |
| 5 | Guia de tooling (skill impact-tree + 4 ferramentas) | `docs/governance/relatorios/TOOLING-IMPACT-TREE-GUIDE-20260529.md` (Opção 1 ou 2 — P.O. decide) | local |

Predecessores (referência):
- v1 (75% confiabilidade — manual, sem skill): `AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-20260528.md`
- v2 (97% — skill `impact-tree` aplicada): `AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v2-20260528.md`
- v3 (98% — baseline com mockup + rollback + validação): `AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v3-20260529.md`

## Bloqueio raiz (citações empíricas)

```
server/routers-fluxo-v3.ts:201
  cnpj: z.string().min(14, "CNPJ é obrigatório"),
                       ↑ bloqueia PF (CPF tem 11 dígitos)

server/integration/test-e2e-v212.test.ts:18
  cnpj: z.string().min(14, "CNPJ é obrigatório"),
                       ↑ fixture E2E espelha o bloqueio
```

## Fases (escopo cirúrgico — Classe B · ~280-400 LOC delta)

| Fase | Conteúdo |
|---|---|
| **F0** Schema | `ALTER TABLE projects ADD tax_id_type ENUM('cnpj','cpf') DEFAULT 'cnpj'` + JSON shape aceita `cpf?` / `taxIdType?` / `taxId?` + feature flag `ENABLE_TAX_ID_DUAL` + tag git `pre-cpf-pf-baseline` + down migration |
| **F1** Validação | `validateCpf` + `maskCpf` (`client/src/lib/validate-cpf.ts`) + Zod `.refine` dual em `routers-fluxo-v3.ts:201` + `test-e2e-v212.test.ts:18` |
| **F2** UI | `PerfilEmpresaIntelligente.tsx` radio "Tipo de sujeito" + input CPF condicional (Variante A simplificada) + espelhar em `M1PerfilEntidade.tsx`, `NovoProjeto.tsx`, `Clientes.tsx` |
| **F3** Hash + ADR | `perfilHash.ts` aceitar `taxIdType` + `taxId`; manter `cnpj` legacy + nome `analise_1_cnpj_operacional` (validação empírica em v4 §3.1: a flag é sobre escopo unitário, não sobre "CNPJ existe") |
| **F4** PDF + briefing | `generateDiagnosticoPDF.ts:125` dual CPF/CNPJ + 3 telas que consomem (`ActionPlan`, `Consolidacao`, `ComplianceDashboard`) + `briefing-confidence-signals.ts:39,104` + `BriefingEngineView.tsx:71` |
| **F5** Testes + UX_DICT | `test-helpers.ts` fixture PF + 17 testes + `UX_DICTIONARY.md §M1.1` + 3 entradas novas + mockup HTML |

## Aceite

Ver: `docs/governance/relatorios/CHECKLIST-ACEITE-BUG-AGRO-CPF.md`

**6 blocos de aceite:**
1. Pré-requisitos Manus (§F do despacho — Q1 a Q6 SQL)
2. Spec completa (4 docs aprovados)
3. UX_DICTIONARY (§M1.1 + 3 entradas + mockup HTML)
4. Pré-requisitos de rollback (snapshot DB + tag git + feature flag + down migration + DoD negativo + runbook)
5. Decisões confirmadas (nomenclatura `taxIdType`/`taxId`, sem enquadramento jurídico, ADR-0032 MINOR, ADR-0033 novo, F4 Manus FORA, estimativa 5-7 dias)
6. Assinatura P.O. com autorização explícita de F0

## Plano de rollback (resumo — 5 níveis)

| Nível | Gatilho | Tempo |
|---|---|---|
| N1 | Bug visual | feature flag OFF | <5 min |
| N2 | Bug em UMA fase | `git revert <PR-fase>` | 15-30 min |
| N3 | Bug runtime crítico | revert F1-F5 mantendo F0 | 30-60 min |
| N4 | Decisão de remover | `DROP COLUMN tax_id_type` | 1-2h |
| N5 | Corrupção/drift | restore snapshot DB + tag `pre-cpf-pf-baseline` | 4-8h |

Detalhamento completo: v4 §7 (referência a v3 §5).

## Estimativa

**5-7 dias** (não 2-3 do Manus que omitiu pré-requisitos de rollback + UX_DICTIONARY + mockup HTML).

## Vinculadas (REGRAs e Lições aplicáveis)

- REGRA-ORQ-24 (classe de impacto B vs C)
- REGRA-ORQ-26 (branch obrigatória)
- REGRA-ORQ-27 (assemble ≠ consumption)
- REGRA-ORQ-32 (no hardcode)
- REGRA-ORQ-35 (NUNCA ASSUMA)
- REGRA-ORQ-36 (técnicas T1-T5 de investigação)
- **REGRA-ORQ-41** (NOVA — AS-IS/TO-BE com impact-tree) — criada neste PR de spec
- Lições #59, #64, #65, #66, #83, #87, **#93** (mecanismo verificado — refutação Manus)

## Skill aplicada

`.claude/skills/impact-tree/SKILL.md` (PR #1287 OPEN aguardando merge) — 11 passos obrigatórios antes de qualquer AS-IS/TO-BE de mudança cross-cutting.

## Confiabilidade da spec

**99%** (v4 — sobe 1pp em relação à v3 com validação empírica via Read em `buildPerfilEntidade.ts:346-369`).
Residual 1%: aguardando resultados Q1-Q6 do Manus para fechar §B (DB-SPEC) com dados reais.
