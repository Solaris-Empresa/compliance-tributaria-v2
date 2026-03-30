# PROTOCOLO-CONTEXTO — Governança de Contexto IA SOLARIS

> **Versão:** 1.0 · **Sprint:** L · **Data:** 2026-03-30  
> **Autores:** P.O. Uires Tapajós · Orquestrador Claude · Implementador Manus  
> **Status:** ATIVO — substituiu práticas ad-hoc anteriores

---

## 1. Propósito

Este documento define o protocolo oficial de **transferência e manutenção de contexto** entre os três agentes do projeto IA SOLARIS:

| Agente | Papel | Ferramenta |
|---|---|---|
| **P.O.** (Uires Tapajós) | Decisões de produto, aprovações finais | Interface humana |
| **Orquestrador** (Claude) | Planejamento de sprints, geração de prompts, revisão de PRs | Skill `solaris-contexto` |
| **Implementador** (Manus) | Implementação técnica, commits, abertura de PRs | Skill `solaris-orquestracao` |

---

## 2. Fonte de Verdade Hierárquica

A hierarquia de documentos de contexto é:

```
P0 — docs/governance/ESTADO-ATUAL.md          ← SEMPRE ler primeiro
P1 — docs/BASELINE-PRODUTO.md                 ← versão e testes
P1 — docs/HANDOFF-MANUS.md                    ← estado para Manus
P2 — docs/rag/CORPUS-BASELINE.md              ← corpus RAG
P2 — docs/rag/HANDOFF-RAG.md                  ← estado RAG
P3 — docs/governance/CONTEXTO-ORQUESTRADOR.md ← contexto longo
```

**Regra:** em caso de conflito entre documentos, o de menor número (P0) prevalece.

---

## 3. Gate 0 — Obrigatório para Todos os Agentes

Antes de qualquer trabalho (sprint, PR, análise):

1. Ler `docs/governance/ESTADO-ATUAL.md` (P0)
2. Confirmar HEAD do repositório
3. Confirmar contagem exata de testes (não aproximada)
4. Confirmar número de migrations aplicadas
5. Declarar: "Estado verificado — baseline v[X], [N] testes, HEAD [SHA]"

---

## 4. Regras de Atualização de Contexto

### 4.1 Quando atualizar (obrigatório)

| Evento | Documentos a atualizar |
|---|---|
| PR mergeado | `ESTADO-ATUAL.md`, `BASELINE-PRODUTO.md`, `HANDOFF-MANUS.md` |
| Nova migration | `ESTADO-ATUAL.md` (indicadores técnicos) |
| Novo sprint concluído | Todos os P0/P1 |
| RFC executada no corpus | `CORPUS-BASELINE.md`, `ESTADO-ATUAL.md` |
| Decisão do P.O. | `ESTADO-ATUAL.md` (seção Decisões) |

### 4.2 Como atualizar

- Sempre via PR (nunca push direto em `main`)
- Commit com prefixo `docs:` ou `chore(governance):`
- Incluir no PR body: qual versão anterior → nova versão

---

## 5. Protocolo de Início de Sprint

### Para o Orquestrador (Claude)

```
1. Executar Gate 0 (seção 3)
2. Ler docs/governance/ESTADO-ATUAL.md completo
3. Verificar issues abertas no Milestone ativo
4. Buscar no repo se o que será implementado já existe (grep)
5. Gerar prompt para Manus com:
   - Leitura obrigatória de docs
   - Perguntas de confirmação (não implementar sem resposta)
   - Escopo declarado explicitamente
   - Bloqueios permanentes listados
```

### Para o Implementador (Manus)

```
1. Executar Gate 0 (seção 3)
2. Ler skill solaris-orquestracao/SKILL.md
3. Responder todas as perguntas de confirmação antes de codar
4. Criar branch feat/sprint-[letra]
5. Implementar apenas o escopo declarado
6. Rodar pnpm test e confirmar contagem exata
7. Abrir PR com template preenchido + JSON de evidência
8. Atualizar docs P0/P1 no mesmo PR
```

---

## 6. Protocolo de Handoff entre Sessões

Quando uma sessão do Manus termina sem PR mergeado:

1. Manus documenta estado atual em `docs/HANDOFF-MANUS.md`
2. Inclui: arquivos modificados, testes passando, próximo passo
3. Orquestrador lê o handoff antes de gerar novo prompt
4. Novo prompt inclui: "Continuar de onde parou — ler HANDOFF-MANUS.md"

---

## 7. Bloqueios Permanentes

Os seguintes itens **nunca podem ser executados** sem aprovação explícita do P.O.:

| Bloqueio | Issue | Motivo |
|---|---|---|
| `DIAGNOSTIC_READ_MODE=new` | — | Aguarda UAT com advogados |
| F-04 Fase 3 | #56 | Aguarda UAT |
| `DROP COLUMN` em colunas legadas | #62 | Aguarda F-04 Fase 3 |
| Push direto em `main` | — | Regra de governança |

---

## 8. Protocolo de Contexto para o ChatGPT (Consultor)

O ChatGPT atua como consultor técnico e não tem acesso direto ao repositório. Para garantir contexto correto:

1. P.O. ou Orquestrador fornece snapshot do `ESTADO-ATUAL.md`
2. ChatGPT não deve propor implementações sem ver o estado atual
3. Propostas do ChatGPT devem ser validadas pelo Orquestrador antes de virar prompt para Manus
4. ChatGPT não tem autoridade para aprovar PRs ou alterar bloqueios

---

## 9. Skill Registry

| Skill | Agente | Localização | Versão |
|---|---|---|---|
| `solaris-contexto` | Orquestrador (Claude) | `/home/ubuntu/skills/solaris-contexto/SKILL.md` | v2.4 |
| `solaris-orquestracao` | Implementador (Manus) | `/home/ubuntu/skills/solaris-orquestracao/SKILL.md` | v1.0 |

> **Nota:** Os skills têm estado hardcoded que pode ficar desatualizado. Sempre usar `ESTADO-ATUAL.md` como fonte de verdade para números (testes, migrations, versão).

---

## 10. Indicadores de Saúde do Contexto

O contexto está saudável quando:

- [ ] `ESTADO-ATUAL.md` atualizado há menos de 1 sprint
- [ ] Skills sincronizados com estado real (ou nota de divergência)
- [ ] Último PR mergeado refletido em todos os P0/P1
- [ ] Contagem de testes bate com `pnpm test`
- [ ] Nenhum documento P0/P1 com badge "Defasado" no Cockpit P.O.

---

*IA SOLARIS · Sprint L · DEC-007 · 2026-03-30*
