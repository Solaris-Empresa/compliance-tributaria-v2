# MODELO OPERACIONAL — Equipe IA Solaris

**Versão:** 2.4 — 2026-03-29  
**Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2  
**Aprovador:** P.O. Uires Tapajós  
**Última sprint concluída:** Sprint K (K-4-A a K-4-D) · HEAD `5d7ad7d`  
**Próxima sprint:** Sprint L — Issue #191 (G16 Upload CSV SOLARIS)  
**Contexto de entrada:** `docs/governance/ESTADO-ATUAL.md` — leia antes de qualquer trabalho

---

## Estrutura da Equipe

| Papel | Quem | Responsabilidade central |
|---|---|---|
| **P.O.** | Uires Tapajós | Decisões de produto, priorização, aprovação de gates, decisões formais |
| **Orquestrador** | Claude (Anthropic) | Leitura do repositório real, análise crítica, geração de prompts para o Manus, revisão de entregas, bloqueios de governança |
| **Implementador** | Manus AI | Execução técnica — código, testes, commits, deploy |
| **Consultor** | ChatGPT ($200/mês) | Apoio estratégico, segunda opinião arquitetural, análise regulatória |

---

## Por que este modelo existe

O modelo anterior (ChatGPT como orquestrador) gerou um problema
estrutural: o orquestrador não tinha acesso ao repositório real.
O Manus reportava entregas como concluídas sem que houvesse
verificação independente do código de fato implementado.

Este modelo resolve isso com verificação externa obrigatória:
o Orquestrador (Claude) lê o repositório real antes de qualquer
análise — não aceita reports, aceita evidência no código.

---

## Fluxo de Trabalho por Tipo de Demanda

### 1. Bug / Incidente

```
P.O. reporta
→ Orquestrador analisa (repositório + ERROS-CONHECIDOS)
→ Classifica severidade (P0-P3)
→ Gera prompt técnico para Manus
→ Manus implementa
→ Orquestrador lê o código real no repositório e verifica
→ P.O. aprova ou rejeita
→ Merge + atualização BASELINE
```

### 2. Nova Feature / Sprint

```
P.O. define intenção
→ Orquestrador consulta ADRs + BASELINE + invariants
→ [se necessário] Consultor ChatGPT emite opinião
→ Orquestrador sintetiza e apresenta ao P.O.
→ P.O. decide
→ Orquestrador gera prompt de sprint para Manus
→ Manus implementa com Playrun
→ CI/CD executa validações automáticas
→ Orquestrador lê o código real e revisa
→ P.O. faz QA humano
→ Gate de saída → BASELINE atualizado
```

### 3. Decisão Arquitetural

```
Gatilho (bug, feature ou risco identificado)
→ Orquestrador analisa impacto nos ADRs vigentes
→ [se necessário] Consultor ChatGPT emite opinião
→ Orquestrador apresenta opções ao P.O.
→ P.O. decide
→ Orquestrador gera ADR
→ Manus commita
```

### 4. Análise / Relatório

```
P.O. solicita
→ Orquestrador lê documentação real do repositório
→ Produz análise com base em evidências
→ P.O. valida
```

---

## Regras de Governança do Orquestrador

### O Orquestrador SEMPRE:
- Lê o repositório real antes de qualquer análise ou prompt
- Verifica os 8 invariants (INV-001..INV-008) em todo prompt para o Manus
- Referencia ADRs vigentes em qualquer decisão técnica
- Distingue decisão técnica (Orquestrador recomenda) de decisão de produto (P.O. decide)
- Revisa o que o Manus entrega lendo o código real — não valida narrativa

### O Orquestrador NUNCA faz sem aprovação do P.O.:
- Instrui o Manus a ativar `DIAGNOSTIC_READ_MODE=new`
- Instrui o Manus a executar F-04 Fase 3
- Instrui o Manus a executar DROP COLUMN nas colunas legadas
- Mistura correção de bug com nova feature no mesmo prompt
- Aprova gate de saída no lugar do P.O. para mudanças de produção

---

## Bloqueios Ativos (2026-03-29)

Não remover sem aprovação documentada do P.O.:

| Bloqueio | Condição de desbloqueio |
|---|---|
| `DIAGNOSTIC_READ_MODE=new` | 48-72h de UAT com 0 divergências críticas |
| F-04 Fase 3 | Aprovação P.O. pós-UAT + relatório Shadow Mode |
| DROP COLUMN legadas | F-04 Fase 3 concluída |

---

## Backlog Ativo de Trabalho

### P0 — Concluído na Sprint K

| Item | Responsável | Status |
|---|---|---|
| Sprint de Governança CI/CD | Manus | ✅ Concluído |
| DEC-007 Infraestrutura de Contexto | Manus | ✅ Concluído |
| Sprint K — Onda 2 (K-4-A a K-4-D) | Manus | ✅ Concluído |
| UAT com advogados | P.O. + Orquestrador apoia | ⏳ Aguardando |

### P1 — Próximas sprints

| Item | Issue | Responsável | Status |
|---|---|---|---|
| G16 Upload CSV SOLARIS | #191 | Manus (Sprint L) | ⏳ Próxima |
| G11 Integração N8N | #187 | Manus | ⏳ Backlog |
| RFC-003 Corpus expansão | #189 | Manus | ⏳ Backlog |
| DECISÃO-001 Prefill cruzado QC-07→QO-03 | — | Manus, pós-UAT | ⏳ Backlog |

### Bloqueados (aguardam UAT)

| Item | Desbloqueio |
|---|---|
| Issue #56 — F-04 Fase 3 | 48-72h UAT + aprovação P.O. |
| Issue #61 — modo `new` | Após #56 |
| Issue #62 — DROP COLUMN | Após #61 |

---

## Como Acionar Cada Papel

**Orquestrador (Claude):** trazer qualquer demanda em linguagem natural,
reportar o que o Manus entregou para revisão, pedir análise de
documentação ou decisão técnica, pedir prompt estruturado para o Manus.

**Manus:** usar o prompt gerado pelo Orquestrador — não criar prompts
ad hoc. Sempre incluir contexto, arquivos afetados, invariants a
verificar e gate de saída.

**Consultor (ChatGPT):** questões estratégicas de produto, segunda
opinião arquitetural em decisões de alto impacto, análise regulatória
(LC 214/2025, LC 227/2025).

**Decisões exclusivas do P.O.:** toda decisão formal (DECISÃOn),
aprovação de go-live, mudanças de prioridade de backlog,
QA visual de frontend.

---

## Protocolo de Comunicação

```
[P.O.] → demanda em linguagem natural
[ORQUESTRADOR] → análise + prompt estruturado OU decisão necessária
[P.O.] → aprova prompt ou toma decisão
[MANUS] → executa + entrega report com evidência JSON
[CI/CD] → valida automaticamente (testes, TypeScript, invariants)
[ORQUESTRADOR] → lê código real no repo → aprovado / rejeitado
[P.O.] → QA humano quando necessário → merge
```

Quando o Consultor (ChatGPT) for acionado:

```
[ORQUESTRADOR] → formula a pergunta para o Consultor
[P.O.] → leva ao ChatGPT e traz a resposta
[ORQUESTRADOR] → analisa e sintetiza para decisão
[P.O.] → decide
```

---

## Referências

- [docs/governance/ESTADO-ATUAL.md](./governance/ESTADO-ATUAL.md) — **LEIA PRIMEIRO** — porta de entrada universal
- [PRODUCT-LIFECYCLE.md](./PRODUCT-LIFECYCLE.md) — ciclo de vida do produto
- [BASELINE-PRODUTO.md](./BASELINE-PRODUTO.md) — estado atual do produto (v2.4)
- [ERROS-CONHECIDOS.md](./ERROS-CONHECIDOS.md) — incidentes e invariants
- [docs/governance/invariant-registry.md](./governance/invariant-registry.md) — 8 invariants
- [docs/governance/HANDOFF-IMPLEMENTADOR.md](./governance/HANDOFF-IMPLEMENTADOR.md) — guia do Manus
- [docs/governance/CONTEXTO-ORQUESTRADOR.md](./governance/CONTEXTO-ORQUESTRADOR.md) — guia do Claude
- [docs/GATES-DOCUMENTACAO-COMPLETA-v5.md](./GATES-DOCUMENTACAO-COMPLETA-v5.md) — Sistema de Engenharia de Qualidade v5.0
- [docs/governance/POST-MORTEM-TEMPLATE.md](./governance/POST-MORTEM-TEMPLATE.md) — Gate 4 Post-mortem
- [server/config/feature-flags.ts](../server/config/feature-flags.ts) — Feature Flags

---

## DORA Metrics — Contrato de Saúde do Sistema (v5.0)

> Atualizar a cada sprint com os valores reais.  
> Ref: docs/GATES-DOCUMENTACAO-COMPLETA-v5.md § 11

| Métrica | Definição | Meta | Sprint N (real) |
|---|---|---|---|
| **Deployment frequency** | Deploys por semana | Diária (Sprint pace) | ~5 PRs/semana |
| **Lead time for changes** | Issue criada → produção | < 1 dia (features simples) | ~4h (G17 P0) |
| **MTTR** | Anomalia detectada → fix em prod | P0: < 1h / P1: < 4h | ~4h (G17 INSERT silencioso) |
| **Change failure rate** | % de deploys que causam bug | < 5% | ~15% (Sprint N — 9 bugs documentados) |

**Plano Sprint O:** CFR < 10% com Gates v5.0 ativos.

---

## Tabela de Erros Recorrentes — v5.0

> Atualizada após cada bug em produção ou UAT.  
> Gate 4 obrigatório após qualquer bug em produção — template: `docs/governance/POST-MORTEM-TEMPLATE.md`

| Data | Bug | Causa raiz (5 Whys resumido) | Gate preventivo | MTTR |
|---|---|---|---|---|
| 2026-03-30 | Lista retorna 0 após upsert | `vigencia_inicio = ''` → IS NULL não encontra | G0 D4 + G1 S3 + G2 Q1 | ~2h |
| 2026-03-30 | TiDB rejeita scoringEngine | DISTINCT + ORDER BY → incompatibilidade TiDB | G1 S3 + G2 Q2 | ~1h |
| 2026-03-31 | Lista retorna 0 silencioso | `LIMIT ?` → bind param TiDB rejeita | G1 S3 + G2 Q2 | ~3h |
| 2026-03-31 | Race condition tRPC | `queryInput` sem `useMemo` → re-renders | G1 S4 + G2 Q5 | ~1h |
| 2026-03-31 | isError silencioso | `isError` = lista vazia → 13 testes auto | G1 S4 + G2 Q5 | ~2h |
| 2026-03-31 | G17 INSERT silencioso | Enums inválidos + catch engolindo | G1.5 R5 + G2 Q6 | ~4h |
| 2026-03-31 | Script backfill side effects | Import de router em script | G1.5 R1 | ~2h |
| 2026-03-31 | Mistura de drivers | Drizzle ORM + raw SQL | G1.5 R2 + G2 Q7 | ~1h |
| 2026-03-31 | `void` impossível de validar | `Promise<void>` em função de persistência | G1.5 R4 + G2 Q6 | ~1h |

---

*MODELO-OPERACIONAL.md — IA Solaris v1.2 · 2026-03-31 · Gates v5.0 adicionados*
*Revisar se a composição da equipe ou os papéis mudarem*
*Aprovador: P.O. Uires Tapajós*
