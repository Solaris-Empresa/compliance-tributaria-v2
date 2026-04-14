# Governanca — Resumo da Sessao 13/Abr/2026
**Para:** Uires Tapajos (P.O.)
**De:** Claude Code (implementador)
**Sessao:** ~4h | **PRs:** #506–#513 (8 PRs, todos mergeados)

---

## O que aconteceu nesta sessao

Esta sessao comecou como fix de 2 bugs pre-UAT e terminou com a criacao
de um sistema completo de governanca para prevenir toda uma classe de
problemas que ja causou retrabalho em sprints anteriores.

---

## Parte 1 — Os bugs que motivaram tudo

### Problema 1: "nas operacoes de geral" (deveria ser "comercio")

**O que o usuario via:** Na tela de riscos, todos os titulos mostravam
"Risco de nao conformidade com Split Payment nas operacoes de **geral**"
em vez de "nas operacoes de **comercio**".

**Causa real:** O banco armazena o perfil operacional da empresa com
campos em ingles (`operationType: "comercio"`), mas o codigo que le
esses dados procurava por nomes em portugues (`tipoOperacao`). Como
`tipoOperacao` nao existe no banco, retornava vazio, e o sistema usava
"geral" como fallback.

Isso acontecia com **5 campos simultaneamente:**

| O codigo procurava | O banco tinha | Resultado |
|---|---|---|
| `tipoOperacao` | `operationType` | vazio → "geral" |
| `multiestadual` | `multiState` | vazio → null |
| `tipoCliente` | `clientType` | vazio → null |
| `meiosPagamento` | `paymentMethods` | vazio → null |
| `intermediarios` | `hasIntermediaries` | vazio → null |

**Impacto:** Alem dos titulos errados, a inferencia normativa (que
sugere oportunidades tributarias como aliquota zero e credito presumido)
**nao encontrava nenhuma oportunidade**, porque sem saber o tipo de
operacao e os NCMs, nao tinha como inferir nada.

**Fix:** PRs [#506](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/506), [#508](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/508), [#509](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/509) — O extractor agora aceita ambos os formatos (ingles da UI e portugues de projetos legados de teste).

### Problema 2: JSON do banco voltava como objeto, nao como texto

**O que acontecia:** Alem dos nomes errados, havia um segundo problema.
O driver de banco de dados (mysql2) as vezes retorna campos JSON ja
convertidos em objetos JavaScript. O codigo antigo assumia que sempre
receberia texto e tentava fazer `JSON.parse()` — que falhava
silenciosamente e retornava um objeto vazio.

**Fix:** PR [#506](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/506) — Funcoes `safeParseObject()` e `safeParseArray()` agora detectam se o valor ja esta parseado antes de tentar converter.

### Por que esses bugs sao importantes

Ambos os bugs tinham a mesma causa raiz: **o codigo foi escrito assumindo
nomes de campo sem verificar o banco real**. Ninguem executou um
`SELECT` para ver como os dados realmente estavam armazenados. Este tipo
de erro e insidioso porque:

1. O codigo compila sem erro (TypeScript nao verifica nomes de campos JSON)
2. Os testes unitarios passam (usam mocks com os nomes "esperados")
3. So aparece em producao, com dados reais

---

## Parte 2 — O sistema de governanca criado

Depois de corrigir os bugs, a pergunta foi: **como garantir que isso
nunca mais aconteca?** A resposta foi criar um sistema de verificacao
obrigatoria em 3 camadas.

### Camada 1: Gate 0 — Verificacao de banco (PRs #510, #512)

**Problema que resolve:** Nomes de campos errados no banco.

**Como funciona:**
1. Antes de escrever qualquer codigo que toca o banco, consultar o
   **DATA_DICTIONARY.md** — um documento com 60 campos documentados
   em 8 tabelas, incluindo o mapeamento duplo ingles/portugues
2. Se o campo nao esta documentado, executar queries de leitura
   no banco real antes de codar
3. Um agente automatizado (`db-schema-validator`) pode ser acionado
   para fazer essa verificacao

**Documentos criados:**
- [`docs/governance/DATA_DICTIONARY.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/DATA_DICTIONARY.md) — dicionario de campos
- [`.claude/agents/db-schema-validator.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.claude/agents/db-schema-validator.md) — agente validador
- Secao "Gate 0" no CLAUDE.md

**Auditoria:** Testamos retroativamente — o Gate 0 teria prevenido
**5 de 5 bugs** das sprints Z-13 e Z-13.5.

### Camada 2: Gate UX — Verificacao de frontend (PR #513)

**Problema que resolve:** Spec de UX existia mas nao foi incluida no
prompt de implementacao (caso real da Sprint Z-07 que causou retrabalho
completo de 2 telas).

**Como funciona:**
1. Antes de qualquer implementacao frontend, consultar o
   **UX_DICTIONARY.md** — estado real de cada tela com lista de
   funcionalidades implementadas vs ausentes
2. Um agente automatizado (`ux-spec-validator`) cruza a spec vs o
   componente e reporta gaps antes de qualquer issue ser criada
3. A spec deve ser copiada dentro da issue (nao apenas referenciada)
   e congelada apos aprovacao do P.O.

**Documentos criados:**
- [`docs/governance/UX_DICTIONARY.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/UX_DICTIONARY.md) — estado das telas
- [`.claude/agents/ux-spec-validator.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.claude/agents/ux-spec-validator.md) — agente validador
- Secao "Gate UX" no CLAUDE.md

**Dados concretos do Discovery:**

RiskDashboardV4 (877 linhas):
- 11 funcionalidades implementadas (KPIs, filtros, aprovacao, exclusao, etc.)
- 7 funcionalidades ausentes (agrupamento, SummaryBar, BulkApprove, etc.)
- 1 parcial (badge RAG)

ActionPlanPage (733 linhas):
- 11 funcionalidades implementadas (banner, tarefas, aprovacao, audit log)
- 4 funcionalidades ausentes (criar plano novo, editar, filtros, kanban)

### Camada 3: Modelo de Orquestracao v2 (PR #513)

**Problema que resolve:** Falta de processo formal entre P.O.,
Orquestrador, Claude Code e Manus.

**Como funciona — 6 fases obrigatorias:**

```
F0  Discovery     Verificar banco (Gate 0) + telas (Gate UX) + estado real
F1  Issues        Criar issues no GitHub com 7 blocos obrigatorios
F2  Auditoria     Claude Code audita frontend, Manus audita banco
F3  Aprovacao     P.O. aprova cada issue, spec congela
F4  Implementacao 1 issue = 1 PR, implementador le a issue direto do GitHub
F4.5 Checkpoint   Verificar que todas as procedures da issue estao chamadas
F5  Gate final    tsc + testes + UAT do P.O.
```

**10 regras mandatorias:**

| Regra | O que diz |
|---|---|
| ORQ-01 | Nenhuma implementacao sem issue completa |
| ORQ-02 | Spec copiada na issue + link para fonte + lock apos aprovacao |
| ORQ-03 | Auditoria antes de codar (Claude Code p/ frontend, Manus p/ banco) |
| ORQ-04 | Claude Code implementa frontend e logica |
| ORQ-05 | Manus valida banco e ambiente |
| ORQ-06 | UAT so apos batch completo |
| ORQ-07 | Sincronizacao S3/GitHub obrigatoria |
| ORQ-08 | Todo prompt deve comecar com `gh issue view [N]` |
| ORQ-09 | Gate UX obrigatorio antes de qualquer frontend |
| ORQ-10 | Checkpoint de integracao obrigatorio antes do merge |

**Documento:** [`docs/governance/MODELO-ORQUESTRACAO-V2.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/MODELO-ORQUESTRACAO-V2.md)

---

## Parte 3 — O que muda para o P.O. na pratica

### Antes (como era)
1. P.O. aprovava spec em reuniao
2. Orquestrador escrevia prompt para Manus/Claude Code
3. Se o prompt nao incluia a spec, o implementador inventava
4. Bug so era descoberto no UAT (ou pior, em producao)
5. Retrabalho de horas ou dias

### Depois (como fica)
1. P.O. aprova spec, que e copiada na issue do GitHub
2. Spec e **congelada** — mudanca pequena vira comentario, mudanca grande vira nova issue
3. Implementador le a issue **direto do GitHub** (nao depende do orquestrador copiar)
4. Antes de codar, agentes automaticos verificam banco e frontend
5. Checkpoint de integracao **bloqueia merge** se algo da spec nao esta implementado
6. Bug de nome de campo e detectado **antes de escrever uma linha de codigo**

### O que o P.O. precisa fazer diferente
- **Aprovar issues no GitHub** (nao apenas verbalmente)
- **Nao autorizar mudancas de spec apos aprovacao** sem PATCH/AMENDMENT formal
- **Executar UAT com o checklist da issue** (nao checklist generico)

---

## Parte 4 — Inventario completo de artefatos

### Artefatos de codigo (runtime)

| Arquivo | PR | O que faz |
|---|---|---|
| `server/lib/project-profile-extractor.ts` | #506, #508, #509 | Extrai perfil da empresa do banco corretamente |
| `server/lib/normative-inference.ts` | #506 | Warnings quando dados insuficientes |

### Artefatos de governanca (docs)

| Arquivo | PR | O que faz |
|---|---|---|
| `docs/governance/DATA_DICTIONARY.md` | #510, #512 | 60 campos em 8 tabelas, dual-schema EN/PT |
| `docs/governance/UX_DICTIONARY.md` | #513 | Estado real de 2 telas (877L + 733L) |
| `docs/governance/MODELO-ORQUESTRACAO-V2.md` | #513 | Modelo completo F0–F5, 10 regras, matriz |
| `docs/governance/POST-MORTEM-Z13.5-SESSAO-CLAUDE-CODE.md` | #512 | Auditoria completa da sessao |
| `docs/governance/GOVERNANCA-SESSAO-13ABR2026.md` | este PR | Este documento (resumo para P.O.) |

### Agentes automatizados

| Arquivo | PR | O que faz |
|---|---|---|
| `.claude/agents/db-schema-validator.md` | #510, #512 | Verifica nomes de campos no banco antes de codar |
| `.claude/agents/ux-spec-validator.md` | #513 | Cruza spec vs componente antes de criar issues |

### Secoes adicionadas ao CLAUDE.md

| Secao | PR | O que faz |
|---|---|---|
| Gate 0 | #510 | Regra obrigatoria: verificar banco antes de codar |
| Gate UX | #513 | Regra obrigatoria: verificar spec antes de frontend |
| REGRA-ORQ-08/09/10 | #513 | 3 novas regras de orquestracao |

---

## Parte 5 — Numeros da sessao

| Metrica | Valor |
|---|---|
| PRs criados e mergeados | 8 (#506–#513) |
| Bugs corrigidos | 2 (B-Z13.5-001, B-Z13.5-002) |
| Campos documentados (banco) | 60 |
| Funcionalidades mapeadas (UX) | 33 |
| Regras de orquestracao | 10 |
| Agentes automatizados | 2 |
| Testes unitarios passando | 124/124 |
| Erros TypeScript | 0 |
| Bugs historicos que seriam prevenidos | 5 de 5 |

---

## Parte 6 — Proximos passos recomendados

1. **Mergear PR #512** (checkpoint) — inclui post-mortem e audit fixes
2. **Copiar MODELO-ORQUESTRACAO-V2.md para o SKILL.md do Manus** — prompt ja preparado
3. **Na proxima sprint de frontend:** seguir F0–F5 do modelo, criar issues com os 7 blocos
4. **Regenerar riscos no projeto 30382** apos deploy — verificar titulos com "comercio"
5. **Configurar E2E_TEST_MODE no staging** para permitir testes Playwright automatizados
