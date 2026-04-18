# Manual do Usuário — IA Solaris
## Plataforma de Compliance da Reforma Tributária

**Plataforma:** https://iasolaris.manus.space
**Audiência:** Advogados tributaristas — usuários da plataforma em produção
**Versão:** 1.0 — 2026-03-24
**Aprovador:** P.O. Uires Tapajós

---

## O que é a IA Solaris

A IA Solaris é uma plataforma de compliance tributário voltada para advogados tributaristas. Ela mapeia os impactos da Reforma Tributária (LC 214/2025 e LC 227/2025) sobre empresas específicas, considerando suas atividades econômicas (CNAEs), regime tributário e porte.

O resultado do trabalho na plataforma são três entregas estruturadas: um **briefing executivo**, uma **matriz de riscos por área** e um **plano de ação com prioridades e prazos**.

A plataforma é uma ferramenta de auxílio ao diagnóstico. A análise jurídica final e os pareceres são de responsabilidade do advogado.

---

## Acesso

**URL:** https://iasolaris.manus.space

**Requisitos:**
- Navegador atualizado (Chrome ou Firefox recomendados)
- Conta Manus fornecida pela equipe Solaris
- Perfil `advogado_senior` atribuído (ativado pela equipe após o primeiro login)

**Primeiro acesso:**
1. Acesse https://iasolaris.manus.space
2. Clique em **"Entrar"** no canto superior direito
3. Autentique com sua conta Manus
4. Informe seu e-mail ao responsável técnico para ativação do perfil `advogado_senior`

> Sem o perfil `advogado_senior`, algumas funcionalidades aparecerão bloqueadas. Isso é esperado até a ativação.

---

## Visão geral do fluxo

Todo trabalho na plataforma segue um fluxo sequencial de 5 etapas. Cada etapa depende da anterior:

```
Etapa 1          Etapa 2          Etapa 3       Etapa 4             Etapa 5
Criação    →   Questionário   →   Briefing   →   Matrizes   →   Plano de Ação
do projeto        CNAE                           de Risco
```

Não é possível pular etapas. O sistema garante que cada saída seja baseada nas entradas anteriores.

---

## Etapa 1 — Criação do projeto

**O que acontece aqui:** Você cadastra as informações básicas da empresa que será analisada.

**Como fazer:**

1. No Painel inicial, clique em **"+ Novo Projeto"**
2. Preencha o formulário:

| Campo | O que informar |
|---|---|
| Nome do projeto | Nome identificador (ex: `Distribuidora Alimentos SA`) |
| CNAE principal | Código e descrição da atividade principal |
| CNAEs secundários | Se houver, informe todos os CNAEs ativos |
| Porte da empresa | Micro / Pequeno / Médio / Grande |
| Regime tributário | Simples Nacional / Lucro Presumido / Lucro Real |
| Faturamento anual estimado | Valor em reais |

3. Clique em **"Criar Projeto"**

**Resultado:** Projeto criado com status "Rascunho" e visível no Painel.

**Atenção:**
- Informe apenas CNAEs de atividades em exercício — CNAEs encerrados geram riscos incorretos.
- O nome do projeto é identificador interno — use um nome que facilite localizar a empresa depois.

---

## Etapa 2 — Questionário CNAE

**O que acontece aqui:** A plataforma apresenta perguntas específicas para os CNAEs informados. Suas respostas qualificam o diagnóstico — quanto mais preciso, melhor o resultado.

**Como fazer:**

1. Abra o projeto no Painel
2. Navegue até a aba **"Questionário"**
3. Responda todas as perguntas apresentadas
   - Perguntas obrigatórias ficam marcadas com `*`
   - O botão "Salvar e Avançar" só é habilitado após todas as obrigatórias serem respondidas
4. Clique em **"Salvar e Avançar"**

**O que esperar:**
- As perguntas variam conforme o CNAE — uma construtora vê perguntas diferentes de uma distribuidora.
- Empresas com múltiplos CNAEs recebem perguntas para cada atividade.
- O progresso fica salvo automaticamente — se precisar pausar, pode voltar depois.

**Atenção:**
- Respostas vagas produzem diagnósticos genéricos. Quanto mais específico, melhor o briefing e as matrizes.

---

## Etapa 3 — Briefing

**O que acontece aqui:** A IA gera um briefing executivo sobre os impactos da Reforma Tributária para a empresa, com base no CNAE, regime e nas respostas do questionário.

**Como fazer:**

1. Na aba **"Briefing"**, clique em **"Gerar Briefing"**
2. Aguarde a geração — leva entre 20 e 60 segundos
3. Leia e avalie o conteúdo gerado

**O que o briefing contém:**
- Resumo do impacto da Reforma Tributária para o setor e regime da empresa
- Principais mudanças relevantes da LC 214/2025 aplicáveis ao CNAE
- Obrigações acessórias afetadas
- Contexto para a análise de riscos

**O que fazer após ler:**
- Se o conteúdo estiver correto e completo, avance para a Etapa 4.
- Se identificar imprecisões jurídicas ou informações desatualizadas, registre e escale conforme `ESCALACAO.md` (P0 se comprometer a integridade jurídica).
- Se quiser regenerar (resultado insatisfatório): clique em gerar novamente — o sistema pedirá confirmação antes de sobrescrever.

---

## Etapa 4 — Matrizes de Risco

**O que acontece aqui:** A plataforma gera matrizes de risco por área, identificando exposições tributárias específicas para a empresa.

**Como fazer:**

1. Na aba **"Riscos"**, clique em **"Gerar Matrizes"** para cada área disponível:
   - Contabilidade
   - Negócio
   - T.I.
   - Advocacia Tributária
2. Aguarde a geração de cada matriz
3. Revise os riscos identificados em cada área

**O que cada matriz contém:**
- Riscos identificados por área com descrição e fundamentação
- Nível de criticidade de cada risco
- Relação com a Reforma Tributária e a LC 214/2025

**Atenção:**
- Gere **todas** as matrizes antes de avançar para a Etapa 5. O plano de ação usa os riscos de todas as áreas como entrada — matrizes não geradas = riscos ausentes no plano.
- Se uma área aparecer vazia sem nenhuma mensagem explicativa, é um bug — documente e escale como P2.

---

## Etapa 5 — Plano de Ação

**O que acontece aqui:** A IA gera um plano de ação estruturado com tarefas, prazos, responsáveis e prioridades, com base nos riscos identificados nas matrizes.

**Como fazer:**

1. Na aba **"Plano de Ação"**, clique em **"Gerar Plano"**
2. Aguarde a geração
3. Revise as tarefas geradas

**O que o plano contém:**
- Tarefas específicas e executáveis por área de risco
- Prazos sugeridos para cada ação
- Responsáveis sugeridos (contabilidade, jurídico, TI, gestão)
- Priorização por criticidade dos riscos

**Após revisar:**
O projeto está completo. Você pode usar o briefing, as matrizes e o plano como insumos para sua análise jurídica e para os próximos passos com o cliente.

---

## Navegação entre etapas — proteção de dados

O sistema protege os dados gerados contra perda acidental. Ao tentar retroceder para uma etapa anterior (por exemplo, voltar do Briefing para o Questionário), o sistema exibe um **modal de confirmação** com:

- Quais dados serão perdidos se você confirmar o retrocesso
- Botão "Cancelar" — nada muda, você permanece na etapa atual
- Botão "Confirmar" — você retrocede e os dados daquela etapa são removidos

**Regra prática:** Se o briefing já foi gerado e você quiser alterar uma resposta do questionário, precisará regenerar o briefing após a alteração. O mesmo vale para as matrizes e o plano.

Se a etapa anterior não tiver dados a perder (por exemplo, voltar do Questionário para Criação sem ter respondido nenhuma pergunta), o modal informa: "Nenhum dado será perdido nesta operação."

---

## Painel — visão geral dos seus projetos

O Painel inicial lista todos os seus projetos com:

| Indicador | Descrição |
|---|---|
| Nome do projeto | Identificador que você definiu |
| Status | Rascunho / Em andamento / Concluído |
| Etapa atual | Em qual das 5 etapas o projeto está |
| Última atualização | Data e hora da última ação |

Clique em qualquer projeto para abri-lo na etapa em que parou.

---

## Limites e comportamentos esperados

| Situação | Comportamento esperado |
|---|---|
| Geração de briefing leva mais de 2 minutos | Recarregue (`Ctrl+Shift+R`) e tente novamente |
| Botão "Salvar e Avançar" desabilitado | Há perguntas obrigatórias não respondidas |
| Área de risco vazia sem mensagem | Bug — escale como P2 |
| Modal aparece ao clicar em etapa anterior | Comportamento correto — leia antes de confirmar |
| Funcionalidades bloqueadas | Perfil `advogado_senior` não ativado — contate suporte |

---

## Quando pedir ajuda

| Situação | Onde ir |
|---|---|
| Dúvida rápida sobre uso | `docs/suporte/FAQ.md` |
| Bug ou comportamento inesperado | `docs/suporte/ESCALACAO.md` — Nível 2 |
| Problema bloqueante ou dado comprometido | `docs/suporte/ESCALACAO.md` — Nível 3 (P.O.) |
| Dúvida jurídica sobre o conteúdo gerado | Seu time jurídico |
| Problema com login ou senha Manus | Suporte da plataforma Manus |

---

## O que a plataforma não faz

- Não emite pareceres jurídicos — isso é trabalho do advogado.
- Não considera histórico fiscal da empresa — apenas os dados informados no projeto.
- Não acompanha mudanças legislativas em tempo real — o corpus é atualizado pela equipe Solaris a cada sprint com base na LC 214/2025 e LC 227/2025.
- Não substitui a análise crítica do profissional — use o conteúdo gerado como insumo, não como produto final.

---

*MANUAL-USUARIO.md — IA Solaris v1.0 · 2026-03-24*
*Responsável: P.O. Uires Tapajós*
*Revisão: ao final de cada sprint ou quando o fluxo do produto for alterado*

---

## Seção 6 — Fluxo Completo (Onda 1 + Onda 2)

*Adicionado em 2026-03-29 — Sprint K*

### Onda 1 (Etapas 1-6)
| Etapa | Nome | Descrição |
|---|---|---|
| 1 | Criação do Projeto | Dados básicos (CNAE, regime, porte) |
| 2 | Questionário CNAE | Perguntas por atividade econômica |
| 3 | Briefing | Diagnóstico inicial gerado pela IA |
| 4 | Matrizes de Risco | Riscos tributários por área |
| 5 | Plano de Ação | Tarefas com prazo e responsável |
| 6 | Revisão Onda 1 | Consolidação e aprovação |

### Onda 2 (Etapas 7-8)
| Etapa | Nome | Descrição |
|---|---|---|
| 7 | Questionário IA Generativa | Perguntas aprofundadas geradas pela IA |
| 8 | Consolidação Final | Plano integrado Onda 1 + Onda 2 |

> A Onda 2 só fica disponível após a conclusão completa da Onda 1.

*Atualizado em 2026-03-29.*
