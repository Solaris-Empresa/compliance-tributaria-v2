# Guia de Testes UAT — Equipe de Advogados

**Plataforma:** Diagnóstico Inteligente de Compliance — Reforma Tributária  
**URL:** https://iasolaris.manus.space  
**Versão testada:** `63a19f5` (Sprint Final)  
**Data:** 2026-03-23  
**Perfil de acesso:** `advogado_senior`

---

## Instruções de Acesso

O acesso à plataforma é feito via **Manus OAuth**. Cada advogado deve:

1. Acessar https://iasolaris.manus.space
2. Clicar em **"Entrar"**
3. Autenticar com a conta Manus fornecida pela equipe Solaris
4. Após o primeiro login, informar o e-mail ao responsável técnico para que o perfil `advogado_senior` seja atribuído à conta

**Regra obrigatória:** todos os projetos criados durante os testes devem usar o prefixo `[UAT]` no nome. Exemplo: `[UAT] Empresa Teste Ltda`.

---

## Objetivo dos Testes

Validar o fluxo completo de diagnóstico V3 sob a perspectiva do usuário final (advogado tributarista), avaliando:

- Clareza e completude das informações exibidas em cada etapa
- Consistência do comportamento ao navegar entre etapas
- Qualidade do conteúdo gerado pela IA (briefing, matrizes, plano de ação)
- Confiabilidade percebida do sistema

---

## Cenários de Teste

### Cenário 1 — Fluxo Completo V3 (Caminho Feliz)

**Objetivo:** Percorrer as 5 etapas do fluxo sem interrupções e validar o resultado final.

**Dados de entrada sugeridos:**

| Campo | Valor sugerido |
|---|---|
| Nome do projeto | `[UAT] Distribuidora Alimentos SA` |
| CNAE principal | 4639-7/01 (Comércio atacadista de alimentos) |
| Porte | Médio (50–200 funcionários) |
| Regime tributário | Lucro Real |

**Etapas e critérios de aceite:**

| Etapa | O que fazer | Critério de aceite |
|---|---|---|
| **1 — Projeto** | Preencher formulário com os dados acima | Projeto criado, aparece na lista |
| **2 — Questionário** | Responder todas as perguntas do questionário CNAE | Perguntas relevantes ao CNAE aparecem; progresso visível |
| **3 — Briefing** | Clicar em "Gerar Briefing" e aguardar | Briefing gerado em menos de 60s; conteúdo coerente com o CNAE |
| **4 — Riscos** | Clicar em "Gerar Matrizes" para cada área | Riscos relevantes à Reforma Tributária aparecem por área |
| **5 — Plano de Ação** | Clicar em "Gerar Plano" e revisar tarefas | Tarefas com prazo, responsável e prioridade; coerentes com os riscos |

**Resultado esperado:** Fluxo concluído sem erros, conteúdo juridicamente coerente com o CNAE informado.

---

### Cenário 2 — Retrocesso com Confirmação

**Objetivo:** Validar que o sistema avisa corretamente antes de apagar dados ao retroceder.

**Pré-condição:** Ter um projeto em qualquer etapa após a Etapa 2 (Questionário).

**Passos:**

1. Estando na **Etapa 3 (Briefing)** com o briefing já gerado, clicar no chip **"Questionário"** no stepper superior
2. Observar se o modal de confirmação aparece
3. Ler a lista de dados que serão perdidos
4. Clicar em **"Cancelar"** — verificar que nada mudou
5. Repetir o clique no chip e desta vez confirmar o retrocesso
6. Verificar que o briefing foi removido e o projeto voltou ao Questionário

**Critério de aceite:**

| Verificação | Esperado |
|---|---|
| Modal aparece ao clicar em etapa anterior | SIM |
| Lista de dados a perder é exibida claramente | SIM |
| Cancelar não altera nada | SIM |
| Confirmar retrocede e limpa os dados | SIM |
| Botão "Voltar ao Questionário" na página do Briefing também aciona o modal | SIM |

---

### Cenário 3 — Retrocesso sem Perda de Dados

**Objetivo:** Verificar que o modal informa corretamente quando não há dados a perder.

**Passos:**

1. Criar um projeto novo e avançar até a **Etapa 2 (Questionário)** sem responder nada
2. Clicar no chip **"Projeto"** no stepper
3. Observar o modal — deve informar que nenhum dado será perdido

**Critério de aceite:** Modal aparece com mensagem "Nenhum dado será perdido nesta operação."

---

### Cenário 4 — Qualidade do Briefing (Avaliação Jurídica)

**Objetivo:** Avaliar se o briefing gerado pela IA é juridicamente adequado para uso profissional.

**Instrução:** Após gerar o briefing no Cenário 1, avaliar:

| Critério | Escala (1–5) | Comentário |
|---|---|---|
| Identificação correta do regime tributário | | |
| Menção às mudanças da Reforma Tributária relevantes ao CNAE | | |
| Clareza da linguagem jurídica | | |
| Completude das obrigações acessórias mencionadas | | |
| Ausência de informações incorretas ou desatualizadas | | |

---

### Cenário 5 — Qualidade das Matrizes de Risco (Avaliação Jurídica)

**Objetivo:** Avaliar se as matrizes de risco refletem adequadamente os riscos tributários do CNAE.

**Instrução:** Após gerar as matrizes no Cenário 1, avaliar por área:

| Área | Riscos identificados são relevantes? | Riscos importantes estão faltando? |
|---|---|---|
| Contabilidade | | |
| Negócio | | |
| T.I. | | |
| Advocacia Tributária | | |

---

### Cenário 6 — Qualidade do Plano de Ação (Avaliação Jurídica)

**Objetivo:** Avaliar se o plano de ação é executável e juridicamente fundamentado.

**Instrução:** Após gerar o plano no Cenário 1, avaliar:

| Critério | Escala (1–5) | Comentário |
|---|---|---|
| Tarefas são específicas e executáveis | | |
| Prazos sugeridos são realistas | | |
| Responsáveis sugeridos fazem sentido | | |
| Cobertura de todas as áreas de risco | | |
| Ausência de tarefas redundantes ou irrelevantes | | |

---

### Cenário 7 — Navegação e UX Geral

**Objetivo:** Avaliar a experiência de uso geral da plataforma.

| Critério | Escala (1–5) | Comentário |
|---|---|---|
| Facilidade de encontrar as funcionalidades | | |
| Clareza das mensagens de erro e aviso | | |
| Velocidade de resposta do sistema | | |
| Consistência visual entre as etapas | | |
| Clareza dos textos de instrução em cada etapa | | |

---

## Formulário de Feedback

Ao concluir os testes, preencher:

**Avaliação geral do produto (1–5):** ___

**O produto está pronto para uso em produção com clientes reais?**
- [ ] Sim, sem ressalvas
- [ ] Sim, com ajustes menores
- [ ] Não, requer ajustes significativos
- [ ] Não, requer reformulação

**Principais pontos positivos:**

```
[descrever aqui]
```

**Principais pontos a melhorar:**

```
[descrever aqui]
```

**Bugs ou comportamentos inesperados encontrados:**

```
[descrever aqui — incluir: etapa, ação realizada, comportamento esperado, comportamento observado]
```

---

## Regras do Ambiente de Teste

1. **Prefixo obrigatório:** todos os projetos devem iniciar com `[UAT]`
2. **Não usar dados de clientes reais** — usar dados fictícios ou genéricos
3. **Reportar bugs** diretamente ao responsável técnico com print e descrição
4. **Não aprovar projetos de teste** — manter os projetos no estado em que estão ao final do teste
5. **Não alterar configurações** de outros usuários ou projetos existentes

---

## Contato Técnico

Em caso de dúvidas ou problemas durante os testes, contatar a equipe Solaris pelo canal definido pelo P.O.

---

*Documento gerado por Manus Agent em 2026-03-23. Versão 1.0.*
