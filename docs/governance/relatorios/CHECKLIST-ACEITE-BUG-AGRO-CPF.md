# CHECKLIST DE ACEITE — BUG-AGRO-CPF

> **Uso:** P.O. (Uires Tapajós) assina este checklist ANTES de autorizar a F0.
> Sem assinatura nos 6 blocos abaixo, **NENHUM código de produção** começa.

**Data limite para preenchimento:** indefinida (controlada pelo P.O.)
**Branch:** `docs/cpf-pf-spec-exaustiva` · HEAD `e163f47` (após push)
**Spec principal:** `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md`
**REGRA-ORQ:** 41 (AS-IS/TO-BE com impact-tree) — todos os 10 itens hard-enforced cumpridos

---

## Bloco 1 — Pré-requisitos Manus (§F) — CONCLUÍDOS 29/05/2026

| ID | Query | Verificado | Resultado real |
|---|---|---|---|
| Q1 | `SHOW COLUMNS FROM projects` + `SHOW COLUMNS FROM users WHERE Field IN ('cnpj','cpf')` | ✅ | `users.cpf` existe (varchar 14) · `companyProfile` JSON sem CPF — DB-SPEC §B.1 |
| Q2 | `SELECT COUNT(*) ... companyProfile.cnpj LIKE '00000000%'` (workaround CNPJ fake) | ✅ | **0 projetos** — barreira absoluta (PFs não usam a plataforma) — DB-SPEC §B.6 |
| Q3 | Contagem de fixtures CNPJ nos test files (bash, não SQL) | ✅ | **14 fixtures · 3 arquivos** (não 17 como estimado) — DB-SPEC §B.7 |
| Q4 | `grep -n "generateDiagnosticoPDF" client/src/pages/ComplianceDashboard.tsx` (passa `cnpj:undefined`?) | ✅ | `cnpj` **não** passado · campo opcional · sem crash · PDF usa fallback `"sem-cnpj"` — DB-SPEC §B.8 |
| Q5 | `tax_id_type` já existe em projects? (esperado: 0) | ✅ | Não existe · Migration **0119** disponível para criar — DB-SPEC §B.2 |
| Q6 | Último número de migration sequencial | ✅ | **0118** = última · próxima = **`0119_tax_id_type_projects.sql`** — DB-SPEC §B.2 |

**Gate Bloco 1:** ✅ **6/6 ✓** · DB-SPEC atualizado com valores reais (não placeholders) · commit incorpora os dados.

---

## Bloco 2 — Spec completa (4 artefatos da REGRA-ORQ-41)

| Artefato | Path | Revisado? | Aprovado? |
|---|---|---|---|
| AS-IS/TO-BE v4 (commit `e163f47`) | `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md` | [ ] | [ ] |
| DB-SPEC | `docs/governance/relatorios/DB-SPEC-BUG-AGRO-CPF.md` | [ ] | [ ] |
| PLANO-TESTES (13+5+5+6 contratos) | `docs/governance/relatorios/PLANO-TESTES-BUG-AGRO-CPF.md` | [ ] | [ ] |
| Este CHECKLIST | `docs/governance/relatorios/CHECKLIST-ACEITE-BUG-AGRO-CPF.md` | [ ] | [ ] |
| REGRA-ORQ-41 em `governance.md` | `.claude/rules/governance.md` (após linha 2360) | [ ] | [ ] |

**Cobertura mínima da spec principal:** 97% (alvo) · v4 declara 99%.

---

## Bloco 3 — UX_DICTIONARY (regra Z-13.5)

| Item | Path | Atualizado? |
|---|---|---|
| §M1.1 `NovoProjeto.tsx` — mudanças do radio + CPF + 6 `data-testid` | `docs/governance/UX_DICTIONARY.md` linhas 199-216 | [ ] |
| Nova entrada: `PerfilEmpresaIntelligente.tsx` (componente compartilhado) | `docs/governance/UX_DICTIONARY.md` (seção nova) | [ ] |
| Nova entrada: `M1PerfilEntidade.tsx` (tela paralela) | `docs/governance/UX_DICTIONARY.md` (seção nova) | [ ] |
| Atualização: `Clientes.tsx` placeholder + badge (se já catalogada) | `docs/governance/UX_DICTIONARY.md` | [ ] |
| **Mockup HTML criado** (regra Z-14: componente significativo com 2 estados PJ/PF) | `docs/sprints/<sprint>/MOCKUP_perfil-empresa-cpf-pf.html` | [ ] |

**Responsável pelo mockup HTML:** P.O. (Uires) — regra Z-14: "Todo mockup HTML deve ser criado pelo Orquestrador antes da issue de implementação".

---

## Bloco 4 — Pré-requisitos de rollback (Manus · antes da F0)

| ID | Item | Verificado? | Local |
|---|---|---|---|
| P1 | Snapshot DB (`mysqldump` completo) | [ ] | S3 + cópia Manus |
| P2 | Tag git `pre-cpf-pf-baseline` em `f29ab50` (ou HEAD pós-merge de #1287/#1288) | [ ] | `git tag pre-cpf-pf-baseline <SHA> && git push origin pre-cpf-pf-baseline` |
| P3 | Feature flag `ENABLE_TAX_ID_DUAL` no env de produção (default `false`) | [ ] | env Manus |
| P4 | Down migration declarada e testada em staging | [ ] | `drizzle/<N>_<feature>_DOWN.sql` (par com UP) · DB-SPEC §B.2 |
| P5 | DoD negativo SQL declarado por fase (REGRA-ORQ-34 Protocolo 3) | [ ] | DB-SPEC §B.5 Gates 1-5 |
| P6 | Runbook `docs/deploy/runbook-rollback-cpf-pf.md` criado | [ ] | path acima |

**Gate Bloco 4:** 6/6 ✓ obrigatório antes de qualquer ALTER TABLE em prod.

---

## Bloco 5 — Decisões confirmadas (não-renegociáveis após assinatura)

| Decisão | Confirmação |
|---|---|
| Nomenclatura: **`taxIdType` + `taxId`** (não `subjectType`/`documentNumber`) | [ ] confirmada |
| **Sem enquadramento jurídico** nesta sprint (sem Art. 164/165, sem "produtor rural integrado", sem "receita anual" no fluxo) | [ ] confirmada |
| ADR-0032 bump **MINOR** (manter nome `analise_1_cnpj_operacional` — validação empírica v4 §3.1) | [ ] confirmada |
| ADR-0033 "Identidade fiscal dual (CPF ou CNPJ)" **a criar** na F3 | [ ] confirmada |
| F4 do Manus (`risk_category` + perguntas SOLARIS Arts. 164-166) → **tech debt P2** para sprint posterior | [ ] confirmada |
| Estimativa: **5-7 dias** · Classe B · **~250-370 LOC delta** (revisada pós-Q3: F5 cai para ~50-70 LOC porque são 3 arquivos de teste, não 17) | [ ] confirmada |
| Mockup UX: **Variante A simplificada** (sem campos jurídicos) — aprovação P.O. 29/05 | [ ] confirmada |
| Validação CPF: **Opção A** (DV local sem RFB) — aprovação P.O. 29/05 | [ ] confirmada |
| Plano de rollback: **5 níveis** (N1 flag → N5 restore catastrófico) — aprovação P.O. 29/05 | [ ] confirmada |

---

## Bloco 6 — Assinatura P.O.

```
Data: ___/___/2026

[ ] Bloco 1 (Pré-requisitos Manus) ✓
[ ] Bloco 2 (Spec completa) ✓
[ ] Bloco 3 (UX_DICTIONARY) ✓
[ ] Bloco 4 (Pré-requisitos rollback) ✓
[ ] Bloco 5 (Decisões confirmadas) ✓

AUTORIZAÇÃO F0:
  [ ] SIM — pode iniciar implementação F0 imediatamente
  [ ] NÃO — listar pendências abaixo:

Pendências:
  1. ___
  2. ___
  3. ___

Observações:
___

Assinatura P.O.: ___________________________
                 Uires Tapajós
```

---

## Próximas autorizações pós-F0 (não cobertas por este checklist)

Cada fase F1-F5 terá seu próprio "DoD por fase" (PLANO-TESTES §C.5) validado pelo Manus + revisão final P.O. antes de prosseguir para a próxima.

**Sequência:**
- F0 (schema) → P.O. autoriza F1
- F1 (validação) → CI verde + revisão Claude Code → autoriza F2
- F2 (UI) → Manus testa greenfield → autoriza F3
- F3 (hash + ADR) → CI verde + revisão P.O. → autoriza F4
- F4 (PDF + briefing) → Manus gera PDF + verifica → autoriza F5
- F5 (testes + UX_DICT) → revisão final P.O. → feature pronta para produção

---

## Vinculadas

- AS-IS/TO-BE v4: `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md`
- DB-SPEC: `docs/governance/relatorios/DB-SPEC-BUG-AGRO-CPF.md`
- PLANO-TESTES: `docs/governance/relatorios/PLANO-TESTES-BUG-AGRO-CPF.md`
- REGRA-ORQ-41: `.claude/rules/governance.md` (após REGRA-ORQ-40) + `docs/governance/relatorios/REGRA-ORQ-41-AS-IS-TO-BE-IMPACT-TREE.md`
- Skill: `.claude/skills/impact-tree/SKILL.md` (PR #1287)
- TOOLING-GUIDE: `docs/governance/relatorios/TOOLING-IMPACT-TREE-GUIDE-20260529.md`
- ISSUE-BODY (raiz): `docs/governance/relatorios/ISSUE-BUG-AGRO-CPF-BODY.md`
