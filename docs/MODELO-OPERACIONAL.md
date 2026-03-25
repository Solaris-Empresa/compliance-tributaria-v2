# MODELO OPERACIONAL — Equipe IA Solaris

**Versão:** 1.0 — 2026-03-24
**Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2
**Aprovador:** P.O. Uires Tapajós

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

## Bloqueios Ativos (2026-03-24)

Não remover sem aprovação documentada do P.O.:

| Bloqueio | Condição de desbloqueio |
|---|---|
| `DIAGNOSTIC_READ_MODE=new` | 48-72h de UAT com 0 divergências críticas |
| F-04 Fase 3 | Aprovação P.O. pós-UAT + relatório Shadow Mode |
| DROP COLUMN legadas | F-04 Fase 3 concluída |

---

## Backlog Ativo de Trabalho

### P0 — Obrigatório antes de qualquer sprint de produto

| Item | Responsável | Status |
|---|---|---|
| Sprint de Governança (CI/CD automação GitHub) | Manus, prompt do Orquestrador | ⏳ Aguardando |
| UAT com advogados | P.O. + Orquestrador apoia | ⏳ Aguardando |

### P1 — Próximas sprints

| Item | Responsável | Status |
|---|---|---|
| DECISÃO-001 Opção A (prefill cruzado QC-07→QO-03) | Manus, pós-UAT | ⏳ Backlog |
| Script migração ERR-009 | Manus após aprovação P.O. | ⏳ Backlog |
| Alerta ERR-006 no monitoramento | Manus | ⏳ Backlog |

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

- [PRODUCT-LIFECYCLE.md](./PRODUCT-LIFECYCLE.md) — ciclo de vida do produto
- [BASELINE-PRODUTO.md](./BASELINE-PRODUTO.md) — estado atual do produto
- [ERROS-CONHECIDOS.md](./ERROS-CONHECIDOS.md) — incidentes e invariants
- [docs/governance/invariant-registry.md](./governance/invariant-registry.md) — 8 invariants

---

*MODELO-OPERACIONAL.md — IA Solaris v1.0 · 2026-03-24*
*Revisar se a composição da equipe ou os papéis mudarem*
*Aprovador: P.O. Uires Tapajós*
