# RAG-PROCESSO.md — Processos de Governança do Corpus RAG

> **Versão:** 1.2 | **Data:** 2026-04-05
> **Escopo:** Todos os processos que envolvem leitura, escrita ou expansão do corpus RAG da IA SOLARIS
> **Audiência:** P.O. · Orquestrador (Claude) · Implementador (Manus) · Equipe Jurídica
> **Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2

---

## Princípio central

> **O processo está no repositório, não na cabeça das pessoas.**
> Qualquer agente (humano ou IA) que precise operar o corpus RAG lê este documento
> e sabe exatamente o que fazer, quem aprova e como medir o resultado.

---

## Índice de processos

| Código | Nome | Gatilho | Duração estimada |
|--------|------|---------|-----------------|
| **P-01** | Ciclo de vida de uma RFC | Anomalia detectada ou incidente | 1–2 sprints |
| **P-02** | Ingestão de nova lei no corpus | Decisão estratégica do P.O. | 1 sprint |
| **P-03** | Expansão de cobertura (nova lei no enum) | RFC de expansão aprovada | 1 sprint |
| **P-04** | Revisão periódica do gold set | Semestral ou após mudança legislativa | 0,5 sprint |
| **P-05** | Abertura de sessão do Orquestrador | Início de qualquer sessão RAG | 10 minutos |

---

## P-01 — Ciclo de vida de uma RFC

**Gatilho:** anomalia detectada no cockpit, incidente em produção, ou necessidade de correção identificada pelo Orquestrador.

```
DETECÇÃO
    │
    ▼
[1] Abrir RFC a partir do template
    docs/rag/RFC/CORPUS-RFC-TEMPLATE.md
    → Copiar para CORPUS-RFC-NNN.md
    → Preencher Seções 1 e 2 (problema + impacto)
    → Status: DRAFT
    │
    ▼
[2] Diagnóstico (read-only — zero escrita no banco)
    → Executar queries de diagnóstico
    → Colar resultados na Seção 3 da RFC
    → Status: AGUARDA DIAGNÓSTICO
    │
    ▼
[3] Análise do Orquestrador
    → Orquestrador analisa resultados
    → Define ação (Seção 4) e SQL (Seção 5)
    → Documenta SQL de rollback (Seção 6)
    → Status: AGUARDA APROVAÇÃO
    │
    ▼
[4] Aprovação dupla (OBRIGATÓRIA)
    → Orquestrador: APROVADO
    → P.O.: EXECUTAR (palavra literal)
    → Sem aprovação dupla → não executar
    │
    ▼
[5] Dry-run (confirmar escopo)
    → Executar SELECT que mostra exatamente o que será afetado
    → Colar resultado na Seção 5a
    → Verificar: escopo bate com o esperado?
    → Se não bater → voltar ao passo 3
    │
    ▼
[6] Execução
    → Executar UPDATE/INSERT/DELETE
    → Colar resultado de verificação (Seção 5c)
    → Preencher snapshot pós-execução (Seção 7)
    │
    ▼
[7] Validação gold set
    → Executar docs/rag/gold-set-queries.sql (GS-01 a GS-08)
    → Preencher Seção 8 da RFC
    → Meta: confiabilidade ≥ 98%
    │
    ▼
[8] Encerramento
    → Atualizar CORPUS-BASELINE.md (versão +1)
    → Marcar RFC como EXECUTED
    → Atualizar BASELINE-PRODUTO.md
    → Abrir PR com evidências
    → Status: EXECUTED
```

**Regras invioláveis do P-01:**
- ❌ Nenhum UPDATE sem dry-run documentado
- ❌ Nenhum UPDATE sem aprovação dupla (Orquestrador + P.O.)
- ❌ Nenhum UPDATE sem SQL de rollback na RFC
- ❌ Nenhum merge sem gold set validado
- ✅ Toda RFC permanece no repositório com histórico completo

---

## P-02 — Ingestão de nova lei no corpus

**Gatilho:** P.O. decide ampliar cobertura do corpus para uma nova lei ou norma regulatória.

```
DECISÃO ESTRATÉGICA (P.O.)
    │
    ▼
[1] Verificar se lei já está no enum
    → SELECT DISTINCT lei FROM ragDocuments;
    → Se não estiver → executar P-03 (expansão do enum) primeiro
    │
    ▼
[2] Definir gold set ANTES da ingestão
    → Quais queries devem retornar chunks desta lei?
    → Documentar em docs/rag/gold-set-queries.sql
    → Este gold set define o critério de sucesso
    │
    ▼
[3] Abrir RFC de ingestão
    → CORPUS-RFC-NNN.md
    → Tipo: "Ingestão de nova lei"
    → Preencher artigos-alvo e critérios de cobertura
    │
    ▼
[4] Revisão jurídica (DEC-004)
    → Equipe jurídica valida os artigos selecionados
    → Confirma que o texto é a versão vigente
    → Gate: aprovação do advogado sênior
    │
    ▼
[5] Snapshot pré-ingestão
    → Documentar estado atual do corpus (CORPUS-BASELINE.md)
    │
    ▼
[6] Execução da ingestão (Manus)
    → Rodar script via corpus-utils.mjs
    → autor = 'ingestao-[lei]-sprint-[X]-YYYY-MM-DD'
    → Dry-run obrigatório antes do script real
    │
    ▼
[7] Validação gold set
    → Executar GS-01 a GS-08 + queries específicas da nova lei
    → Meta: 100% das queries da nova lei retornando resultados
    │
    ▼
[8] Encerramento
    → Atualizar CORPUS-BASELINE.md
    → Fechar RFC
    → PR com evidências
```

**Regra adicional:** nenhuma lei entra em produção sem revisão jurídica (passo 4). Chunks com `lei = 'solaris'` têm gate adicional — DEC-004 pendente de implementação.

---

## P-03 — Expansão do enum de leis

**Gatilho:** nova lei a ingerir não está no enum de `ragDocuments`.

```
[1] Verificar enum atual
    → Consultar drizzle/schema.ts campo lei
    → Confirmar que valor não existe

[2] Abrir RFC de expansão
    → Tipo: "Expansão de enum"
    → Documentar nova lei: código, nome, vigência, contexto regulatório

[3] Migration
    → Adicionar valor ao enum em drizzle/schema.ts
    → pnpm db:push
    → Colar output confirmando alteração

[4] Verificação
    → SELECT DISTINCT lei FROM ragDocuments ORDER BY lei;
    → Confirmar novo valor aceito

[5] Encerramento
    → Fechar RFC
    → Prosseguir para P-02
```

**Nota:** expansão de enum é sempre reversível e de baixo risco. Não adiciona dados — apenas expande os valores aceitos.

---

## P-04 — Revisão periódica do gold set

**Gatilho:** a cada 6 meses, ou quando uma lei sofrer alteração relevante, ou quando nova lei for adicionada ao corpus.

```
[1] Executar gold set atual
    → docs/rag/gold-set-queries.sql
    → Registrar resultados

[2] Avaliar cobertura
    → Todas as leis ativas têm ≥ 1 query no gold set?
    → Novas leis adicionadas desde a última revisão?
    → Queries existentes ainda fazem sentido?

[3] Atualizar gold set
    → Adicionar queries para leis novas
    → Revisar critérios de aprovação (pass/fail)
    → Documentar no arquivo .sql com comentários

[4] Atualizar documentação
    → CORPUS-BASELINE.md — seção gold set
    → RAG-GOVERNANCE.md — métricas atualizadas

[5] Comunicar
    → Informar P.O. sobre mudanças no critério de cobertura
    → Registrar no histórico do CORPUS-BASELINE.md
```

**Meta permanente:** toda lei ativa no corpus deve ter pelo menos 2 queries no gold set — uma de recuperabilidade básica e uma de caso de uso real (ex: split payment, confissão de dívida, CNAE).

---

## P-05 — Abertura de sessão do Orquestrador

**Gatilho:** início de qualquer sessão Claude que envolva o corpus RAG.

```
[1] Ler skill solaris-contexto
    → Gate 0 obrigatório
    → Verificar baseline atual

[2] Verificar CORPUS-BASELINE.md
    → Versão atual?
    → Anomalias abertas?
    → RFCs pendentes?

[3] Verificar RAG Cockpit (se disponível)
    → /admin/rag-cockpit
    → Confiabilidade atual vs meta 98%
    → Anomalias ativas

[4] Declarar estado
    → "Estado verificado — corpus v[X], [N] chunks,
       [N] leis ativas, confiabilidade [X]%,
       [N] RFCs pendentes"

[5] Só então iniciar trabalho
    → Com contexto completo
    → Sem diagnóstico manual necessário
```

**Este processo é o que substitui o ciclo manual de 2–4 horas por 10 minutos.**

---

## Métricas de processo (SLAs)

| Processo | SLA | Medição |
|---|---|---|
| P0 — RFC crítica: detecção → execução | 24 horas | Data detecção vs data EXECUTED |
| P1 — RFC alta: detecção → execução | 1 sprint | Data abertura vs data EXECUTED |
| P2 — RFC média: detecção → execução | 2 sprints | Data abertura vs data EXECUTED |
| P3 — RFC baixa: detecção → backlog | Próxima sprint | Data abertura vs sprint assignment |
| Ingestão nova lei: decisão → produção | 1 sprint | Data decisão P.O. vs data merge |
| Revisão gold set | Semestral | Último registro no CORPUS-BASELINE.md |

---

## Referências

- `docs/rag/RAG-GOVERNANCE.md` — regras de governança
- `docs/rag/CORPUS-BASELINE.md` — estado atual do corpus
- `docs/rag/RAG-RESPONSABILIDADES.md` — RACI completa
- `docs/rag/RFC/CORPUS-RFC-TEMPLATE.md` — template de RFC
- `docs/rag/gold-set-queries.sql` — gold set canônico
- `/admin/rag-cockpit` — painel de monitoramento ao vivo

---

*RAG-PROCESSO.md v1.4 · 2026-04-05 (Sprint V encerrada Lote 3: 37 casos NCM/NBS confirmados, NCM:19 · NBS:19 · Testes:48/48, PR #333)*
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
