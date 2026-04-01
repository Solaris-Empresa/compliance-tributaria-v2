# Governança Operacional do Manus — Sprint 98% Confidence

**Versão:** 1.0  
**Data:** 2026-03-23  
**Milestone:** [Sprint-98-Confidence-Content-Engine](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/7)

---

## Sequência de blocos (ordem obrigatória)

| Bloco | Conteúdo | Gate | Status |
|-------|----------|------|--------|
| **B0** | Governança GitHub: milestone, labels, 34 issues, PR template, CONTRIBUTING.md, MANUS-GOVERNANCE.md | Checkpoint + Push | ✅ Concluído |
| **B1** | ADR-010, Matriz canônica inputs/outputs, Matriz de rastreabilidade req→pergunta→gap→risco→ação | Aprovação do Orquestrador | 🟡 Aguardando gate |
| **B2** | Implementação das 6 engines + briefing + shadow + CI | Checkpoint por engine + Shadow validation | 🔵 Backlog |

**Regra crítica:** nenhum bloco pode ser iniciado sem o gate do bloco anterior aprovado pelo Orquestrador.

---

## Rotina por bloco

### Ao iniciar um bloco
1. Verificar se o gate do bloco anterior foi aprovado
2. Ler as issues do bloco no GitHub (milestone `Sprint-98-Confidence-Content-Engine`)
3. Verificar `pnpm test` — todos os testes devem estar passando antes de começar

### Durante a implementação
1. Um commit por mudança significativa (não acumular)
2. Formato: `tipo(escopo): descrição` (ver CONTRIBUTING.md)
3. Push ao concluir cada issue (não ao final do bloco)
4. Atualizar o status da issue no GitHub ao concluir

### Ao concluir uma engine (B2)
1. Executar `pnpm test` — todos os testes passando
2. Executar `tsc --noEmit` — zero erros TypeScript
3. Executar Shadow Mode — zero divergências críticas novas
4. Criar checkpoint no Manus
5. Registrar evidências (output de test + screenshot Shadow Monitor)
6. Fechar a issue no GitHub com `Closes #N`

### Ao concluir um bloco
1. Push de todos os commits do bloco
2. Criar checkpoint no Manus com descrição do bloco
3. Notificar o Orquestrador para aprovação do gate
4. Aguardar aprovação antes de iniciar o próximo bloco

---

## Evidências obrigatórias por tipo de issue

| Label | Evidência obrigatória |
|-------|----------------------|
| `checkpoint-required` | Versão do checkpoint Manus registrada no PR |
| `shadow-required` | Screenshot do Shadow Monitor ou query SQL com resultado |
| `evidence-required` | Output de `pnpm test` + link do commit |
| `needs-orchestrator` | Aprovação explícita do Orquestrador antes do merge |

---

## Confidence Score — dimensões e pesos

O Confidence Score 98% é calculado sobre as seguintes dimensões:

| Dimensão | Peso | Métrica | Meta |
|----------|------|---------|------|
| Coverage regulatório | 25% | requisitos_cobertos / requisitos_aplicáveis | 100% |
| Qualidade de gaps | 15% | gaps_com_evidência / total_gaps | ≥ 95% |
| Consistência cross-stage | 15% | 1 - (contradições / total_checks) | ≥ 98% |
| Qualidade de perguntas | 10% | média dos scores LLM-as-judge | ≥ 4.0/5.0 |
| Precisão de riscos | 15% | riscos_com_origem_gap / total_riscos | 100% |
| Qualidade de ações | 10% | ações_com_template / total_ações | ≥ 95% |
| Estabilidade Shadow | 10% | 1 - (divergências_críticas / total_checks) | 100% |

**Score mínimo para promoção a produção:** 95%  
**Score alvo da sprint:** 98%

---

## Regras fundamentais (invioláveis)

1. **Fonte obrigatória:** toda pergunta tem `requirement_id` + `source_reference`
2. **Coverage total:** 100% dos requisitos aplicáveis avaliados antes do briefing
3. **Cadeia obrigatória:** Requisito → Gap → Risco → Ação (sem exceção)
4. **Anti-alucinação:** LLM transforma RAG, não cria conhecimento
5. **CNAE condicionado:** sem requisito aplicável → sem questionário

---

## Checkpoints da sprint

| Bloco | Versão Manus | Data | Status |
|-------|-------------|------|--------|
| B0 — Governança GitHub | *(a preencher)* | 2026-03-23 | 🟡 Em andamento |
| B1 — Modelo canônico | *(a preencher)* | *(a definir)* | 🔵 Aguardando B0 |
| B2 — Requirement Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Question Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Gap + Consistency Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Risk + Action Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Briefing + Relatório | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Shadow + CI + QA | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |

---

## Links rápidos

- [Milestone Sprint-98-Confidence](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/7)
- [Issues abertas da sprint](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues?q=milestone%3ASprint-98-Confidence-Content-Engine+is%3Aopen)
- [ADR-010](../docs/adr/ADR-010-content-architecture-98.md) *(a criar em B1)*
- [Tabela de melhorias técnicas](../docs/product/cpie-v2/produto/TABELA-MELHORIAS-TECNICAS-HOW-v1.md)
- [Playbook v3.0](../docs/product/cpie-v2/produto/PLAYBOOK-DA-PLATAFORMA-v3.md)
- [Shadow Monitor](https://iasolaris.manus.space/admin/shadow-monitor)

---

## Erros Recorrentes e Lições Aprendidas

| Data | Erro | Causa Raiz | Resolução |
|------|------|-----------|-----------|
| 2026-04-01 | SOLARIS_GAPS_MAP 96% ineficaz | 7/10 chaves com acentos vs snake_case no banco — grep aceitou como OK, query real revelou falha | Q6 adicionado ao CONTRIBUTING.md |
