# Pull Request — Sprint 98% Confidence

## Resumo

> Descreva em 2-3 frases o que este PR faz e por quê.

---

## Issue relacionada

Closes #<!-- número da issue -->

---

## Tipo de mudança

- [ ] `feat` — nova funcionalidade
- [ ] `fix` — correção de bug
- [ ] `docs` — documentação
- [ ] `test` — testes
- [ ] `refactor` — refatoração sem mudança de comportamento
- [ ] `chore` — configuração, CI/CD, governança

---

## Épico / Engine

- [ ] B0 — Governança
- [ ] B1 — Modelo canônico (ADR-010)
- [ ] B2 — Requirement Engine
- [ ] B2 — Coverage Engine
- [ ] B2 — Question Engine
- [ ] B2 — Gap Engine
- [ ] B2 — Consistency Engine
- [ ] B2 — Risk Engine
- [ ] B2 — Action Engine
- [ ] B2 — Briefing / Relatório
- [ ] B2 — Shadow Mode / QA / CI

---

## Checklist de governança obrigatório

### Código
- [ ] `tsc --noEmit` — zero erros TypeScript
- [ ] `pnpm test` — todos os testes passando (incluindo novos testes para este PR)
- [ ] Nenhum `console.log` de debug deixado no código
- [ ] Nenhum segredo ou token hardcoded

### Rastreabilidade
- [ ] Issue referenciada com `Closes #N` ou `Relates to #N`
- [ ] Milestone `Sprint-98-Confidence-Content-Engine` atribuída
- [ ] Labels de domínio atribuídas (ex: `question-engine`, `risk-engine`)
- [ ] Commit segue o padrão: `feat(engine): descrição` / `docs(adr): descrição` / `test(engine): descrição`

### Qualidade de conteúdo (quando aplicável)
- [ ] Toda pergunta gerada tem `requirement_id` e `source_reference`
- [ ] Todo gap tem status formal (atende/nao_atende/parcial/evidencia_insuficiente/nao_aplicavel)
- [ ] Todo risco tem `gap_id` de origem
- [ ] Toda ação tem `risk_id` de origem e `evidence_required`
- [ ] Protocolo NO_QUESTION implementado (sem pergunta sem base RAG)

### Shadow Mode (quando label `shadow-required`)
- [ ] Shadow Mode executado após a mudança
- [ ] Zero divergências críticas novas
- [ ] Screenshot ou query SQL de evidência incluída no PR

### Checkpoint (quando label `checkpoint-required`)
- [ ] Checkpoint criado no Manus antes do merge
- [ ] Versão do checkpoint registrada aqui: `version_id: ___________`

### Evidência objetiva (quando label `evidence-required`)
- [ ] Output de `pnpm test` incluído no PR
- [ ] Link do commit no GitHub incluído
- [ ] Screenshot ou log relevante incluído

---

## Evidências

> Cole aqui o output de `pnpm test`, screenshot do Shadow Monitor, ou outro artefato relevante.

```
# Output de pnpm test (cole aqui)
```

---

## Notas para o Orquestrador

> Preencha se este PR requer revisão do Orquestrador (label `needs-orchestrator`).

---

## Impacto em produção

- [ ] Sem impacto em dados existentes
- [ ] Requer migração de banco (`pnpm db:push`)
- [ ] Requer atualização de variável de ambiente
- [ ] Requer restart do servidor
- [ ] Requer limpeza de cache
