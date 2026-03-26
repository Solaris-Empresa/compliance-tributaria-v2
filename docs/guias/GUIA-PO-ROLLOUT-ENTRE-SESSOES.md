# GUIA DO P.O. — ROLLOUT ENTRE SESSÕES E SPRINTS
## IA SOLARIS — Compliance Tributária
**Versão:** 1.0 — 2026-03-26
**Audiência:** Uires Tapajós — P.O.
**Objetivo:** Entender o que acontece entre sessões, como retomar o trabalho e o que fazer em cada momento do ciclo

---

## O que é um "rollout entre sessões"

Toda sessão de trabalho com Claude tem início e fim. O Claude não guarda memória entre sessões — cada nova conversa começa do zero. O rollout é o conjunto de ações que garante que a próxima sessão começa exatamente de onde a anterior parou, sem perda de contexto, sem retrabalho, sem decisões repetidas.

O rollout não é burocracia. É o que transforma sessões isoladas num projeto contínuo.

---

## Quem faz o quê no rollout

| Momento | Quem age | O que faz |
|---|---|---|
| **Final de sessão** | Orquestrador gera | Prompt de baseline + handoff de sessão + snapshot |
| **Final de sessão** | Manus executa | Abre PR com todos os documentos de rollout |
| **Final de sessão** | Você aprova | Merge do PR de rollout (Nível 1 — pode ser rápido) |
| **Início da próxima sessão** | Você cola | Texto do handoff no novo chat com Claude |
| **Início da próxima sessão** | Claude executa | Gate 0: lê baseline, confirma estado, declara contexto |
| **Início da próxima sessão** | Manus ativa | `/solaris-orquestracao` no início da tarefa |

---

## O ciclo completo — visão do P.O.

```
┌─────────────────────────────────────────────────────────┐
│  SESSÃO ATIVA                                           │
│                                                         │
│  Você conversa com Claude                               │
│  Claude gera prompts → Manus implementa                 │
│  Você aprova merges                                     │
└──────────────────────┬──────────────────────────────────┘
                       │ ao encerrar
                       ▼
┌─────────────────────────────────────────────────────────┐
│  ROLLOUT (último passo da sessão)                       │
│                                                         │
│  Claude gera: prompt de rollout                         │
│  Manus executa: PR com 5 documentos                     │
│  Você aprova: merge (1 clique — Nível 1)                │
└──────────────────────┬──────────────────────────────────┘
                       │ próxima sessão
                       ▼
┌─────────────────────────────────────────────────────────┐
│  RETOMADA                                               │
│                                                         │
│  Você abre novo chat no Project IA SOLARIS              │
│  Cola o texto do handoff de sessão                      │
│  Claude lê o baseline (Gate 0) e confirma contexto      │
│  Sprint continua do ponto exato onde parou              │
└─────────────────────────────────────────────────────────┘
```

---

## Os 5 documentos do rollout — o que é cada um

### 1. BASELINE-PRODUTO.md (atualizado a cada sprint)
**O que é:** a única fonte de verdade do estado do produto. Contém testes, migrations, gaps resolvidos, decisões, próximos passos.
**Por que importa para você:** se precisar responder "onde está o produto agora?" em qualquer reunião, este é o documento.
**Quando muda:** a cada sprint concluída. Nunca fica desatualizado por mais de 1 sprint.

### 2. HANDOFF-MANUS.md (atualizado a cada sprint)
**O que é:** o texto que o Manus lê no início de qualquer nova sessão para saber onde estamos.
**Por que importa para você:** garante que o Manus nunca repita trabalho já feito nem ignore bloqueios ativos.
**Quando muda:** junto com o baseline.

### 3. HANDOFF-SESSAO-[data].md (criado ao final de cada sessão)
**O que é:** resumo desta sessão específica — o que foi decidido, o que foi implementado, como retomar.
**Por que importa para você:** é o texto que você cola no próximo chat para que Claude entenda imediatamente o contexto sem precisar reconstruir tudo.
**Quando muda:** criado uma vez, imutável. Fica como histórico.

### 4. SNAPSHOT-[sprint].md (criado ao final de cada bloco)
**O que é:** fotografia imutável do estado do produto em um momento específico. Como um "save point" do jogo.
**Por que importa para você:** permite auditar exatamente o que estava funcionando em cada sprint. Se algo quebrar no futuro, você sabe exatamente o que estava correto antes.
**Quando muda:** nunca — é imutável por definição.

### 5. INDICE-DOCUMENTACAO.md (atualizado quando novos documentos são criados)
**O que é:** mapa de todos os documentos do projeto.
**Por que importa para você:** se você precisar de qualquer documento do projeto, este é o ponto de entrada.

---

## O que você precisa fazer em cada momento

### Ao encerrar uma sessão
1. Peça ao Claude: *"Gere o prompt de rollout para encerrar esta sessão"*
2. Envie o prompt ao Manus
3. Aguarde o PR de rollout
4. Aprove o merge (é sempre Nível 1 — apenas documentação, sem código)

### Ao iniciar uma nova sessão
1. Abra o Project "IA SOLARIS — Compliance Tributária" no Claude
2. Cole o texto do handoff de sessão (está em `docs/handoffs/HANDOFF-SESSAO-[data].md`)
3. Aguarde Claude confirmar: *"Estado verificado — baseline v[X], [N] testes"*
4. A partir daí, trabalhe normalmente

### Para iniciar uma nova sprint
Você não precisa fazer nada técnico. Apenas diga ao Claude qual é a prioridade:
> *"Vamos iniciar a Sprint G — corpus complementar"*

Claude vai:
- Executar o Gate 0 automaticamente (via skill `solaris-contexto`)
- Verificar o baseline antes de gerar qualquer prompt
- Confirmar o estado antes de propor qualquer implementação

---

## As skills — o que mudou com elas

Antes das skills, cada sessão começava do zero. Claude precisava reconstruir todo o contexto a partir do que você descrevia. Isso levava a erros — engines já implementadas sendo planejadas como se não existissem, baseline desatualizado, contagem de testes incorreta.

Com as skills:

**Skill do Claude (`solaris-contexto`)** — ativa em toda sessão do Project automaticamente. Claude já sabe: quem é o P.O., qual é o repositório, quais são os bloqueios, o que o Gate 0 exige. Não precisa ser explicado de novo.

**Skill do Manus (`/solaris-orquestracao`)** — ativa quando o Manus digita `/solaris-orquestracao`. Manus já sabe: padrão de commits, template de PR obrigatório, obrigação de atualizar baseline, bloqueios permanentes. Não precisa ser repetido em cada prompt.

**O que muda para você na prática:** os prompts ficam menores e mais precisos. Menos ciclos de correção. Menos retrabalho.

---

## O ciclo de uma sprint — visão executiva

```
Sprint planejada
    │
    ▼
Claude: Gate 0 → verifica estado real antes de começar
    │
    ▼
Claude: gera prompt técnico para Manus
    │
    ▼
Manus: lê /solaris-orquestracao → executa → abre PR
    │
    ▼
Claude: revisa o PR com base no código real
    │
    ▼
Você: aprova ou rejeita o merge
    │
    ▼
Claude: gate pós-merge → confirma testes + baseline
    │
    ▼
Rollout → baseline atualizado → próxima sprint
```

**Sua participação:** decidir prioridades, aprovar merges, validar o produto no browser. O resto é orquestrado automaticamente.

---

## Sinais de que o processo está funcionando

✅ Claude começa a sessão com: *"Estado verificado — baseline v[X], [N] testes"*
✅ Manus usa o template correto de PR sem você precisar pedir
✅ Cada PR tem número exato de testes — nunca aproximado
✅ Baseline é atualizado antes da próxima sprint começar
✅ Você aprova merges com confiança porque o scope está declarado

## Sinais de que algo saiu do trilho

⚠️ Claude começa uma sprint sem verificar o baseline primeiro
⚠️ Manus reporta testes sem número exato ("testes passando" sem contagem)
⚠️ Baseline não foi atualizado depois de 2 ou mais sprints
⚠️ PR com arquivos fora do escopo declarado
⚠️ Rollout não foi feito ao encerrar a sessão

Quando isso acontecer, pare e peça: *"Execute o Gate 0 antes de continuar."*

---

## Referências rápidas

| Documento | Localização | Para que serve |
|---|---|---|
| Estado atual do produto | `docs/BASELINE-PRODUTO.md` | Responder "onde estamos?" |
| Como retomar no Manus | `docs/HANDOFF-MANUS.md` | Início de sessão do Manus |
| Como retomar no Claude | `docs/handoffs/HANDOFF-SESSAO-[data].md` | Início de sessão do Claude |
| Controles de qualidade | `docs/GATE-CHECKLIST.md` | O que Claude verifica antes de agir |
| Skill do Manus | `.manus/skills/solaris-orquestracao/SKILL.md` | Comportamento permanente do Manus |
| Skill do Claude | `.claude/skills/solaris-contexto/SKILL.md` | Comportamento permanente do Claude |
| Todos os documentos | `docs/INDICE-DOCUMENTACAO.md` | Mapa completo |
| Cockpit | `docs/painel-po/index.html` | Visão executiva do projeto |

---

*Documento criado pelo Orquestrador (Claude — Anthropic) em 2026-03-26*
*Audiência: P.O. Uires Tapajós*
*Revisar quando o modelo operacional mudar*
