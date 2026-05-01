# Backlog M3 — IA SOLARIS Compliance Tributária

**Atualizado:** 2026-05-01 pós-sessão histórica (21 PRs mergeados)
**HEAD:** `8dd0268` (pós-merge #898)
**Próximo marco principal:** M3 RAG consome arquétipo

---

## Prioridade 1 — Destravar cliente real

1. **PR-LISTCLIENTS-FIX** (Classe A ~30min)
   Destrava `role=cliente` para criação de projeto pela UI. Decisão de produto pendente: cliente vincula a 1 projeto OU N projetos? Define forma do `clientId` auto-vinculado.

## Prioridade 2 — M3 Consumo arquétipo no RAG ⭐ MARCO PRINCIPAL

2. **M3-RAG-01** — `retrieveArticles` aceitar `PerfilDimensional` opcional (Classe B ~4h)
   Hoje recebe apenas CNAEs + texto livre. Adicionar parâmetro dimensional para boost por `objeto`/`papel`/`tipo_de_relacao`.

3. **M3-RAG-02** — `briefingEngine` lê `projects.archetype` (Classe B ~3h)
   Substituir leitura legada (`companyProfile` + `operationProfile`) por leitura dimensional canônica.

4. **M3-RAG-03** — `gap-engine` consome dimensões (Classe B ~4h)
   Análise de gaps usa eixos do arquétipo, não classificação plana.

5. **M3-RAG-04** — Smoke E2E dimensional completo (P.O. + Manus ~30min)
   Cliente real → arquétipo confirmado → RAG dimensional → briefing → riscos → ações. Validação ponta-a-ponta.

## Prioridade 3 — Operacional crítica

6. **Issue #873 abordagem A+C** (Manus ~5h Classe B)
   CI prod isolation Camadas 1-4. Provisiona TEST DB + secret `CI_HAS_TEST_DB=true` → desativa guard PR-FIX-2 sem PR adicional.

7. **Issue #875 cleanup retroativo** (Manus Classe C com gates)
   16k+ users sintéticos + 268 projetos teste. Pré-requisito: Issue #873 mergeada (senão Sísifo).

8. **cpie_analysis_history Opção A revisada** (Claude Code ~30min)
   Pré-check Manus: `SHOW TABLES LIKE 'cpie_%'` em prod. Se existe: rodar 0088 manual. Registrar 0088 no `_journal.json`.

## Prioridade 4 — Bugs latentes M2

9. **PR-H 3 bugs ALTOS adapter** (Classe B ~6h — base limpa pós PR-J)
   BUG-5 `abrangencia_operacional` hardcoded `["Nacional"]`. BUG-6 `atua_importacao` hardcoded false. BUG-7 `atua_exportacao` hardcoded false. Fix em UM lugar via `seedNormalizers.ts`.

10. **PR-I 5 bugs MÉDIOS regime/ZFM** (Classe B ~4h)
    `tipo_regime_especial`, `opera_territorio_incentivado`, `tipo_territorio_incentivado` etc. Mesma estratégia centralizada.

11. **PR-FIN-OBJETO-V3** (Reativo, não preemptivo)
    Generalização Mudança 1+2 do V2 para outros setores regulados (saúde, energia, telecom, combustíveis, transporte). **Trigger:** cliente real entra na carteira E reproduz cenário análogo BUG-FIN-OBJETO. Lição #41 aplicada.

## Prioridade 5 — UX/cosméticos

12. **PR-G PC-04 fix UX tela branca** (Classe C com SPEC + ADR + crítica ORQ-22)
    Erro NCM/NBS deixa tela em branco. Aguarda SPEC formal Manus. REGRA-ORQ-24 exige Classe C → ADR + 2 rounds crítica.

## Prioridade 6 — Validação contínua

13. **Smokes 7-10** setores regulados (~10-15min cada)
14. **Lições #1-#40** consolidação (~2-3h Classe A)
    Varrer `git log --all --grep="Lição"` + handoffs históricos para preencher placeholder em `LICOES_ARQUITETURAIS.md`.
15. **TAX_REGIME_ALIASES vs SNAKE_TO_LABEL** — bug ou design? (Decisão produto)
    Decisão de não-consolidação documentada no PR-J Fase 2b — confirmar se é design ou retrabalho futuro.
16. **PR-FIX-3 LLM tests sem `OPENAI_API_KEY`** (~30min Classe A)
    Endereça fails residuais Run Unit Tests não-DB. Padrão similar ao PR-FIX-2 (`SKIP_LLM_TESTS = !process.env.OPENAI_API_KEY`).

## Prioridade 7 — Governança

17. **BACKLOG_M3.md atualizar status PRs** (~15min Classe A) — manutenção contínua deste arquivo
18. **Lições #46-#49 a registrar** (~30min Classe A)
    - #46 ✅ já registrada (PR #890 + PR #898) — validação empírica de ambiente
    - #47 Validações P.O. devem ser explicitamente mapeadas no plano de sprint
    - #48 Issue #873 bloqueia cobertura runtime efetiva
    - #49 Análise de duplicação deve verificar escopo lexical, não só similaridade textual

---

## Roadmap Epic Perfil da Empresa

```
[Marco 1: M1 Arquétipo determinístico]                        ✅
[Marco 2: M2 Perfil Entidade UI]                              ✅
[Marco 3: Cliente real ponta-a-ponta]                         🔄
[Marco 4: M3 RAG consome arquétipo] ⭐ PRÓXIMO                  ⏸️
[Marco 5: Robustez setores regulados]                         ⏸️
[Marco 6: Cobertura bugs latentes M2]                         ⏸️
[Marco 7: UX polishing M2]                                    ⏸️
[Marco 8: Operacional saudável]                               ⏸️
```

---

## Fontes da verdade

- `docs/produto/PERFIL-DA-ENTIDADE-FONTE-DA-VERDADE.md` (NEW canonical)
- `docs/governance/BASELINE-PRODUTO.md`
- `docs/governance/LICOES_ARQUITETURAIS.md`
- `docs/governance/PROMPT_HANDOFF_ORQUESTRADOR.md`
- `docs/HANDOFF-MANUS.md` (handoff Manus operacional)
