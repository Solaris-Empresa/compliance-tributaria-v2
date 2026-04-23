# Epic #830 — RAG com Arquetipo — Documentação pré-M1

> **Status:** pré-M1 em exploração avançada
> **REGRA-M1-GO-NO-GO ativa** — implementação bloqueada
> **Última atualização:** 2026-04-23

## Propósito deste diretório

Consolidar conhecimento da exploração pré-M1 **sem travar criatividade**.
Documenta decisões consolidadas, mantém lista de decisões abertas, versiona
mockups e specs em evolução.

**Princípio:** documentação **segue** a exploração, não a trava.

## Estrutura

- `adr/` — Architecture Decision Records (decisões consolidadas)
- `mockups/` — Versões visuais do formulário arquétipo
- `specs/` — Especificações (regras de negócio, campos, BLOCKERS, pendências)
- `schema/` — Estrutura de dados proposta do arquétipo
- `cenarios/` — 15 cenários da REGRA-M1-GO-NO-GO (bateria de testes)
- `exploracao/` — Documentos exploratórios (análises, descobertas)

## Como contribuir

### Quando documentar (document-as-you-go)
- Decisão tomada → ADR curto em `adr/`
- Descoberta importante → entra em `specs/BLOCKERS-pre-m1.md` ou `specs/PENDING-DECISIONS.md`
- Cenário novo testado → arquivo em `cenarios/`
- Campo do form modificado → atualizar `specs/RN-form-campos.md`
- Mudança visual → nova versão em `mockups/`

### Quando NÃO travar
- Discussão em andamento → deixa em draft, não bloqueia
- Mudança de direção → versiona (v1 → v2), não apaga
- Hipótese especulativa → marca com `[EXPLORATÓRIO]`, não como "decidido"

## Governança leve

- Commits vão direto para branch `docs/pre-m1-exploracao` (1 branch longa)
- Sem templates obrigatórios
- Sem revisão formal antes de commit
- Sem datas-limite

## REGRA-M1-GO-NO-GO

M1 só inicia após 3 condições PASS:
- **C1** Modelo determinístico (regras explícitas, zero LLM, campo obrigatório com UI)
- **C2** 15/15 cenários de negócio com arquétipo=valido
- **C3** Amarração formulário↔testes (suite = fonte de verdade)

**Durante o gate:** proibido implementar, gerar código, alterar backend ou RAG.

## Links relacionados

- Issue-mãe do Epic: #830
- Milestones M1-M8: #831-#838
- M9 backlog: #839
