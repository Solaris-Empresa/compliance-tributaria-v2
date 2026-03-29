# Guia de Testes de Aceitação do Usuário (UAT) — Equipe Jurídica
## Plataforma IA SOLARIS — Compliance Tributário

**URL de acesso:** https://iasolaris.manus.space  
**Versão da plataforma:** `5d7ad7d` (Sprint K — K-4-D concluído · 2026-03-28)  
**Data de início do UAT:** 2026-03-23  
**Janela de monitoramento:** 48–72h (até 2026-03-26)  
**Responsável técnico:** Equipe Solaris  
**Perfil de acesso dos testadores:** `advogado_senior`

---

## 1. Objetivo do UAT

Este documento orienta a equipe jurídica na execução dos testes de aceitação da Plataforma IA SOLARIS de Compliance Tributário. O objetivo é validar, sob a perspectiva do usuário final (advogado tributarista), que:

- O fluxo completo de diagnóstico funciona sem erros do início ao fim.
- O conteúdo gerado pela IA (briefing, matrizes de risco, plano de ação) é juridicamente coerente e adequado para uso profissional.
- O comportamento do sistema ao navegar entre etapas é previsível e seguro.
- A experiência de uso é satisfatória para o contexto de trabalho do advogado.

O UAT é a última etapa antes da ativação do modo `new` (produção plena com o motor V3). A aprovação da equipe jurídica é o gate de qualidade definitivo.

---

## 2. Contexto Técnico (para o P.O.)

A plataforma opera atualmente em **modo Shadow** (`DIAGNOSTIC_READ_MODE=shadow`): todos os projetos novos são processados pelo motor V3 (novo), mas o sistema ainda serve os dados pelo motor V1 (legado) como fallback de segurança. O Shadow Monitor registra automaticamente qualquer divergência entre os dois motores.

**Estado atual do Shadow Monitor (baseline em 2026-03-23):**

| Indicador | Valor | Interpretação |
|---|---|---|
| Total de divergências registradas | 274 | Todos são projetos pré-v2.1 (esperado) |
| Divergências críticas (conflito real) | **0** | ✅ Seguro |
| Projetos afetados | 38 de 2.145 (1,8%) | ✅ Normal |
| Campos monitorados | 3 (briefing, matrizes, plano) | ✅ |
| Padrão das divergências | "Legado tem valor, nova é null" | ✅ Esperado |

Durante as 48–72h de UAT, o Shadow Monitor será monitorado continuamente. **A meta é: 0 novas divergências críticas** nos projetos criados pelos testadores.

---

## 3. Instruções de Acesso

### 3.1 Primeiro acesso

1. Abrir o navegador e acessar **https://iasolaris.manus.space**
2. Clicar no botão **"Entrar"** (canto superior direito)
3. Autenticar com a conta Manus fornecida pela equipe Solaris
4. Após o primeiro login, informar o e-mail ao responsável técnico para que o perfil `advogado_senior` seja atribuído à conta

> **Atenção:** O perfil `advogado_senior` é necessário para acessar todas as funcionalidades de diagnóstico. Sem ele, algumas etapas podem aparecer bloqueadas.

### 3.2 Regras obrigatórias do ambiente de teste

| Regra | Detalhe |
|---|---|
| **Prefixo obrigatório** | Todos os projetos devem iniciar com `[UAT]`. Exemplo: `[UAT] Empresa Teste Ltda` |
| **Dados fictícios** | Não usar dados de clientes reais — usar CNPJs e nomes fictícios |
| **Não aprovar projetos** | Manter os projetos no estado em que estão ao final do teste |
| **Reportar bugs** | Incluir: etapa, ação realizada, comportamento esperado, comportamento observado |
| **Não alterar outros projetos** | Não modificar projetos de outros usuários ou configurações do sistema |

---

## 4. Cenários de Teste

### Cenário 1 — Fluxo Completo V3 (Caminho Feliz)

**Objetivo:** Percorrer as 5 etapas do fluxo de diagnóstico sem interrupções e validar o resultado final.

**Tempo estimado:** 30–45 minutos

**Dados de entrada sugeridos:**

| Campo | Valor sugerido |
|---|---|
| Nome do projeto | `[UAT] Distribuidora Alimentos SA` |
| CNAE principal | 4639-7/01 — Comércio atacadista de alimentos em geral |
| Porte da empresa | Médio (50–200 funcionários) |
| Regime tributário | Lucro Real |
| Faturamento anual estimado | R$ 15.000.000 |

**Roteiro passo a passo:**

**Etapa 1 — Criação do Projeto**
1. No Painel, clicar em **"+ Novo Projeto"**
2. Preencher o formulário com os dados acima
3. Clicar em **"Criar Projeto"**

*Critério de aceite:* Projeto criado e visível na lista do Painel com status "Rascunho".

**Etapa 2 — Questionário CNAE**
1. Abrir o projeto recém-criado
2. Navegar até a aba **"Questionário"**
3. Responder todas as perguntas apresentadas para o CNAE 4639-7/01
4. Clicar em **"Salvar e Avançar"**

*Critério de aceite:* Perguntas relevantes ao CNAE aparecem; progresso visível; respostas salvas corretamente.

**Etapa 3 — Briefing**
1. Na aba **"Briefing"**, clicar em **"Gerar Briefing"**
2. Aguardar a geração (estimativa: 20–60 segundos)
3. Ler o briefing gerado e avaliar o conteúdo

*Critério de aceite:* Briefing gerado em menos de 60s; conteúdo coerente com o CNAE e o regime tributário informados.

**Etapa 4 — Matrizes de Risco**
1. Na aba **"Riscos"**, clicar em **"Gerar Matrizes"** para cada área disponível
2. Aguardar a geração de cada matriz
3. Revisar os riscos identificados por área

*Critério de aceite:* Riscos relevantes à Reforma Tributária aparecem por área; nenhuma área retorna vazia sem justificativa.

**Etapa 5 — Plano de Ação**
1. Na aba **"Plano de Ação"**, clicar em **"Gerar Plano"**
2. Aguardar a geração
3. Revisar as tarefas geradas

*Critério de aceite:* Tarefas com prazo, responsável e prioridade; coerentes com os riscos identificados na Etapa 4.

**Resultado esperado:** Fluxo concluído sem erros, conteúdo juridicamente coerente com o CNAE informado.

---

### Cenário 2 — Retrocesso com Confirmação (Proteção de Dados)

**Objetivo:** Validar que o sistema avisa corretamente antes de apagar dados ao retroceder entre etapas.

**Pré-condição:** Ter um projeto com briefing já gerado (Etapa 3 concluída).

**Passos:**
1. Estando na **Etapa 3 (Briefing)** com o briefing já gerado, clicar no chip **"Questionário"** no stepper superior
2. Observar se o **modal de confirmação** aparece
3. Ler a lista de dados que serão perdidos exibida no modal
4. Clicar em **"Cancelar"** — verificar que nada mudou
5. Repetir o clique no chip e desta vez clicar em **"Confirmar"**
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

### Cenário 4 — Segundo CNAE (Empresa com Múltiplas Atividades)

**Objetivo:** Validar o comportamento com empresa que possui mais de um CNAE.

**Dados sugeridos:**

| Campo | Valor |
|---|---|
| Nome | `[UAT] Construtora e Incorporadora XYZ` |
| CNAE principal | 4120-4/00 — Construção de edifícios |
| CNAE secundário | 6810-2/01 — Compra e venda de imóveis próprios |
| Regime | Lucro Presumido |

**Passos:**
1. Criar o projeto com os dados acima
2. Verificar se o questionário apresenta perguntas específicas para ambos os CNAEs
3. Completar o fluxo até o Plano de Ação
4. Verificar se os riscos e o plano contemplam as especificidades de ambas as atividades

**Critério de aceite:** Conteúdo gerado reflete a complexidade de uma empresa com atividades de construção e incorporação simultaneamente.

---

### Cenário 5 — Avaliação Jurídica do Briefing

**Objetivo:** Avaliar se o briefing gerado pela IA é juridicamente adequado para uso profissional.

**Instrução:** Após gerar o briefing no Cenário 1, preencher a tabela abaixo:

| Critério | Nota (1–5) | Comentário |
|---|---|---|
| Identificação correta do regime tributário (Lucro Real) | | |
| Menção às mudanças da Reforma Tributária relevantes ao CNAE | | |
| Clareza da linguagem jurídica | | |
| Completude das obrigações acessórias mencionadas | | |
| Ausência de informações incorretas ou desatualizadas | | |
| **Média** | | |

> **Escala:** 1 = Inadequado | 2 = Insuficiente | 3 = Aceitável | 4 = Bom | 5 = Excelente

---

### Cenário 6 — Avaliação Jurídica das Matrizes de Risco

**Objetivo:** Avaliar se as matrizes de risco refletem adequadamente os riscos tributários do CNAE.

| Área | Riscos identificados são relevantes? (S/N) | Riscos importantes estão faltando? | Nota (1–5) |
|---|---|---|---|
| Contabilidade | | | |
| Negócio | | | |
| T.I. | | | |
| Advocacia Tributária | | | |

---

### Cenário 7 — Avaliação Jurídica do Plano de Ação

**Objetivo:** Avaliar se o plano de ação é executável e juridicamente fundamentado.

| Critério | Nota (1–5) | Comentário |
|---|---|---|
| Tarefas são específicas e executáveis | | |
| Prazos sugeridos são realistas | | |
| Responsáveis sugeridos fazem sentido | | |
| Cobertura de todas as áreas de risco | | |
| Ausência de tarefas redundantes ou irrelevantes | | |
| **Média** | | |

---

### Cenário 8 — Navegação e UX Geral

**Objetivo:** Avaliar a experiência de uso geral da plataforma.

| Critério | Nota (1–5) | Comentário |
|---|---|---|
| Facilidade de encontrar as funcionalidades | | |
| Clareza das mensagens de erro e aviso | | |
| Velocidade de resposta do sistema | | |
| Consistência visual entre as etapas | | |
| Clareza dos textos de instrução em cada etapa | | |
| **Média** | | |

---

## 5. Formulário de Feedback Final

**Testador:** ___________________________  
**Data de conclusão:** ___________________  
**Projetos criados durante o teste:** ___________________________

**Avaliação geral do produto (1–5):** ___

**O produto está pronto para uso em produção com clientes reais?**
- [ ] Sim, sem ressalvas
- [ ] Sim, com ajustes menores (descrever abaixo)
- [ ] Não, requer ajustes significativos (descrever abaixo)
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

**Sugestões de novos cenários de teste não cobertos neste guia:**
```
[descrever aqui]
```

---

## 6. Critérios de Aprovação do UAT

O UAT será considerado **aprovado** quando:

| Critério | Meta |
|---|---|
| Cenários 1–4 executados sem erros bloqueantes | 100% |
| Nota média dos Cenários 5–7 (qualidade jurídica) | ≥ 3,5 / 5,0 |
| Nota média do Cenário 8 (UX) | ≥ 3,5 / 5,0 |
| Bugs críticos (bloqueiam o fluxo) | 0 |
| Bugs moderados (degradam a experiência) | ≤ 3 |
| Avaliação geral ≥ 3 | Pelo menos 2/3 dos testadores |

Se todos os critérios forem atendidos, a equipe técnica ativará o modo `new` (`DIAGNOSTIC_READ_MODE=new`), desativando o fallback V1 e operando 100% no motor V3.

---

## 7. Monitoramento Shadow Mode durante o UAT

Durante as 48–72h de testes, o Shadow Monitor será verificado a cada 24h. O responsável técnico deve acessar:

**URL:** https://iasolaris.manus.space/admin/shadow-monitor

**O que monitorar:**

| Indicador | Baseline (2026-03-23) | Meta durante UAT |
|---|---|---|
| Total de divergências | 274 | Crescimento ≤ 5% (≤ 288) |
| Divergências críticas (conflito) | 0 | **Permanecer em 0** |
| Projetos UAT com divergência | 0 | **Permanecer em 0** |

**Ação imediata se detectada divergência crítica:** Pausar o UAT, investigar o projeto afetado, corrigir antes de retomar.

---

## 8. Contato e Suporte

Em caso de dúvidas ou problemas durante os testes:

- **Canal técnico:** Contatar a equipe Solaris pelo canal definido pelo P.O.
- **Para bugs:** Descrever detalhadamente (etapa + ação + comportamento esperado + comportamento observado) e enviar ao responsável técnico
- **Para dúvidas sobre o sistema:** Consultar o responsável técnico antes de prosseguir

---

## 9. Cronograma Sugerido

| Dia | Atividade |
|---|---|
| **Dia 1 (2026-03-23)** | Onboarding, acesso à plataforma, Cenários 1 e 2 |
| **Dia 2 (2026-03-24)** | Cenários 3, 4, 5, 6 e 7; preenchimento das avaliações jurídicas |
| **Dia 3 (2026-03-25)** | Cenário 8, formulário de feedback final, consolidação dos resultados |
| **Dia 4 (2026-03-26)** | Reunião de revisão UAT; decisão sobre ativação do modo `new` |

---

---

## Cenários Adicionais — Sprint K (Etapas 7 e 8 do DiagnosticoStepper)

> **Adicionados em 2026-03-29** após a conclusão da Sprint K (PRs #177–#184).  
> As etapas 7 e 8 do stepper foram implementadas nos PRs K-4-B e K-4-D.

---

### Cenário 9 — Questionário IA Generativa (Onda 2 — Etapa 7)

**Objetivo:** Validar o fluxo da Onda 2: geração do Questionário IA Generativa após conclusão da Onda 1.

**Pré-condição:** Ter concluído a Onda 1 (Etapas 1–6) com pelo menos um CNAE ativo.

**Tempo estimado:** 20–30 minutos

**Passos:**
1. A partir de um projeto com Onda 1 concluída, clicar no chip **"Onda 2"** no stepper superior
2. Verificar se o botão **"Iniciar Questionário IA Generativa"** está habilitado
3. Clicar no botão e aguardar a geração do questionário (pode levar 10–30 segundos)
4. Responder as perguntas geradas pela IA — verificar se são contextualmente relevantes ao CNAE
5. Clicar em **"Finalizar Questionário"** ao concluir
6. Verificar se o sistema avança para a Etapa 8

**Critério de aceite:**

| Verificação | Esperado |
|---|---|
| Botão "Iniciar" habilitado após Onda 1 concluída | SIM |
| Perguntas geradas são relevantes ao CNAE do projeto | SIM |
| Sistema aguarda resposta antes de avançar | SIM |
| Progresso salvo automaticamente entre perguntas | SIM |
| Avanço para Etapa 8 após finalizar | SIM |

---

### Cenário 10 — Wiring Etapas 7-8: Continuidade do Fluxo

**Objetivo:** Verificar que o stepper navega corretamente entre as etapas 7 e 8 sem perda de estado.

**Passos:**
1. Iniciar o Questionário IA Generativa (Etapa 7) e responder 2–3 perguntas
2. Navegar para outra etapa (ex: Etapa 3) usando o stepper
3. Retornar à Etapa 7 — verificar se as respostas foram preservadas
4. Concluir o questionário e verificar a transição para a Etapa 8

**Critério de aceite:**

| Verificação | Esperado |
|---|---|
| Respostas preservadas ao navegar entre etapas | SIM |
| Modal de confirmação ao tentar retroceder com dados | SIM |
| Etapa 8 desbloqueada somente após Etapa 7 concluída | SIM |
| Indicador de progresso no stepper atualizado corretamente | SIM |

---

### Cenário 11 — Etapa 8: Consolidação Final e Plano de Ação V3

**Objetivo:** Validar a geração do Plano de Ação consolidado na Etapa 8, incorporando dados da Onda 1 e Onda 2.

**Pré-condição:** Etapas 1–7 concluídas.

**Passos:**
1. Na Etapa 8, clicar em **"Gerar Plano de Ação Consolidado"**
2. Aguardar a geração (pode levar 15–45 segundos)
3. Verificar se o plano incorpora dados de ambas as ondas
4. Avaliar a qualidade jurídica usando a tabela abaixo

**Avaliação jurídica do Plano Consolidado:**

| Critério | Nota (1–5) | Comentário |
|---|---|---|
| Integração coerente entre Onda 1 e Onda 2 | | |
| Tarefas específicas para cada área de risco | | |
| Prazos alinhados com a Reforma Tributária | | |
| Ausência de contradições entre as ondas | | |
| Completude do plano para o CNAE testado | | |
| **Média** | | |

---

### Cenário 12 — Regressão: Fix T06.1 (Questionário Solaris)

**Objetivo:** Confirmar que o fix do T06.1 (PR #184) está funcionando em produção — o questionário deve usar o identificador `questionario-solaris` (não `questionario-corporativo-v2`).

**Passos:**
1. Criar um projeto novo com qualquer CNAE
2. Avançar até a Etapa 2 (Questionário)
3. Verificar no título/header da página o identificador do questionário exibido
4. Confirmar que não há referência a `questionario-corporativo-v2`

**Critério de aceite:** O questionário exibe `questionario-solaris` como identificador. Nenhum erro de carregamento.

---

## Critérios de Aprovação Atualizados (v2.1)

Os critérios originais da Seção 6 permanecem válidos. Adicionalmente, para aprovação dos cenários 9–12:

| Critério adicional | Meta |
|---|---|
| Cenários 9–12 executados sem erros bloqueantes | 100% |
| Nota média dos Cenários 9 e 11 (qualidade IA) | ≥ 3,5 / 5,0 |
| Fix T06.1 confirmado (Cenário 12) | SIM |
| Wiring etapas 7-8 sem perda de estado (Cenário 10) | SIM |

---

## Cronograma Atualizado (v2.1)

| Dia | Atividade |
|---|---|
| **Dia 1** | Onboarding, acesso, Cenários 1 e 2 |
| **Dia 2** | Cenários 3, 4, 5, 6 e 7 |
| **Dia 3** | Cenários 8, 9 e 10 (Onda 2 + wiring) |
| **Dia 4** | Cenários 11 e 12 (Plano consolidado + regressão T06.1) |
| **Dia 5** | Formulário de feedback final, consolidação, decisão GO/NO-GO |

---

*Atualizado em 2026-03-29 — v2.1 — Sprint K concluída (PRs #177, #182, #184).*  
*Adicionados Cenários 9–12 cobrindo etapas 7-8 do DiagnosticoStepper e fix T06.1.*  
*Versão original: 2.0 — 2026-03-23 — 107/107 testes aprovados, 0 divergências críticas.*
