# FAQ — Perguntas Frequentes
## IA Solaris — Plataforma de Compliance Tributário

**Plataforma:** https://iasolaris.manus.space
**Audiência:** Advogados e usuários da plataforma em produção
**Versão:** 1.1 — 2026-03-29

> Não encontrou sua resposta aqui? Consulte o [fluxo de escalação](./ESCALACAO.md).

---

## Acesso e configuração

**Por que algumas funcionalidades aparecem bloqueadas?**
Você precisa do perfil `advogado_senior` atribuído à sua conta. Esse perfil é configurado pela equipe Solaris após o seu primeiro login. Acesse a plataforma, faça login com sua conta Manus e informe seu e-mail ao responsável técnico para que o perfil seja ativado. Funcionalidades bloqueadas sem esse perfil é comportamento esperado, não um erro.

**Posso usar qualquer navegador?**
Chrome e Firefox são os navegadores recomendados. Safari e Edge funcionam, mas podem ter pequenas diferenças visuais. Evite usar versões muito antigas — se sua versão foi lançada antes de 2023, atualize antes de usar.

**Preciso instalar algum programa?**
Não. A plataforma é 100% web — você acessa pelo navegador, sem instalação.

**Esqueci minha senha. Como recupero?**
O acesso é feito pela conta Manus. Use o fluxo de recuperação de senha da própria Manus na tela de login.

---

## Criação e gestão de projetos

**Quantos projetos posso criar?**
Não há limite fixo documentado para produção. Durante o UAT, crie quantos projetos precisar para os testes, sempre com o prefixo `[UAT]` no nome.

**Posso usar dados de clientes reais?**
Durante o UAT: não. Use apenas CNPJs e nomes fictícios. Em produção, a política de uso de dados reais será definida pelo P.O. antes da ativação completa.

**Posso editar um projeto depois de criado?**
Sim, mas com uma regra importante: ao retroceder para uma etapa anterior (por exemplo, voltar do Briefing para o Questionário), o sistema exibe um modal de confirmação listando quais dados serão perdidos. Isso é uma proteção — você decide se quer retroceder e perder os dados gerados naquela etapa, ou cancelar e manter o que já foi produzido.

**O sistema apagou meus dados sem eu pedir. O que aconteceu?**
Isso não deve ocorrer. Se aconteceu sem que você tenha confirmado o modal de retrocesso, é um bug de severidade P1. Documente a etapa, a ação realizada e o que foi perdido, e escale para o Nível 2 conforme `ESCALACAO.md`.

**Posso ter mais de um CNAE no projeto?**
Sim. O sistema suporta CNAE principal e CNAEs secundários. O questionário e os conteúdos gerados levam em conta todas as atividades informadas.

---

## Geração de conteúdo (Briefing, Matrizes, Plano de Ação)

**Quanto tempo leva para gerar o briefing?**
Entre 20 e 60 segundos em condições normais. Se ultrapassar 2 minutos sem nenhum progresso visível, recarregue a página (`Ctrl+Shift+R` ou `Cmd+Shift+R`) e tente novamente. Se persistir, escale como P2.

**O briefing gerado está vazio ou com conteúdo claramente errado. O que faço?**
Se o conteúdo for vazio: recarregue e tente gerar novamente. Se persistir, escale como P1.
Se o conteúdo for juridicamente incorreto ou perigoso (informações erradas sobre a LC 214/2025, obrigações equivocadas, riscos ausentes para o CNAE): escale imediatamente como P0, pois isso afeta a integridade do produto.

**As matrizes de risco não apareceram para alguma área. É normal?**
Pode acontecer quando a combinação de CNAE + regime tributário não gera riscos mapeados para aquela área específica — mas o sistema deve exibir uma mensagem explicativa, não uma área simplesmente vazia. Área vazia sem justificativa é um bug; documente e escale como P2.

**O plano de ação gerado não está alinhado com as matrizes de risco. O que fazer?**
Verifique se todas as matrizes foram geradas antes de pedir o plano. O plano usa os riscos identificados nas matrizes como entrada — se alguma matriz não foi gerada, o plano ficará incompleto. Gere todas as matrizes primeiro, depois gere o plano.

**Posso regenerar o briefing ou as matrizes se não gostar do resultado?**
Sim, mas atenção: regenerar apaga o conteúdo anterior para aquela etapa. O sistema exibirá o modal de confirmação antes de apagar.

---

## Fluxo de navegação e etapas

**Posso pular etapas?**
Não. O fluxo é sequencial: Criação → Questionário → Briefing → Matrizes de Risco → Plano de Ação. Cada etapa depende da anterior para funcionar corretamente.

**O botão "Salvar e Avançar" não está habilitado. Por quê?**
O sistema exige que todas as perguntas obrigatórias do questionário sejam respondidas antes de avançar. Verifique se há perguntas sem resposta marcadas em vermelho na tela.

**Travei em uma etapa e não consigo nem avançar nem voltar. O que faço?**
Primeiro tente `Ctrl+Shift+R` para recarregar. Se o problema persistir, escale como P1 com o nome do projeto e a etapa em que travou.

---

## Qualidade jurídica do conteúdo

**O conteúdo gerado pela IA está desatualizado em relação à Reforma Tributária?**
A plataforma opera sobre os 499 requisitos canônicos derivados da LC 214/2025 e LC 227/2025. Se você identificar conteúdo desatualizado em relação à legislação vigente, registre como feedback qualitativo no formulário UAT (Cenário 5) e escale como P0 — mudanças regulatórias que invalidam conteúdo gerado são tratadas com prioridade máxima.

**A IA pode substituir a análise do advogado?**
Não. A plataforma é uma ferramenta de auxílio ao diagnóstico — ela mapeia riscos, gera briefings e planos de ação com base nos dados informados e na legislação mapeada. A análise jurídica final, a validação das interpretações e os pareceres são de responsabilidade exclusiva do advogado.

**O sistema leva em conta CNAEs de atividades que a empresa encerrou?**
Não — informe apenas os CNAEs das atividades em exercício. CNAEs encerrados devem ser omitidos para evitar riscos incorretamente mapeados.

---

## Durante o UAT

**O que significa o prefixo `[UAT]` obrigatório?**
Todos os projetos criados durante os testes devem começar com `[UAT]` no nome (exemplo: `[UAT] Distribuidora Alimentos SA`). Isso permite que a equipe técnica monitore e separe os dados de teste dos dados de produção.

**Posso aprovar ou publicar projetos durante o UAT?**
Não. Mantenha os projetos no estado em que estiverem ao final de cada teste. Aprovações durante o UAT podem interferir no monitoramento do Shadow Mode.

**Encontrei um comportamento estranho, mas não sei se é bug ou intenção do sistema.**
Documente e reporte. A equipe decide a classificação. Melhor reportar algo que é comportamento esperado do que deixar passar um bug real.

---

*FAQ.md — IA Solaris v1.0 · 2026-03-24*
*Responsável: P.O. Uires Tapajós*
*Revisão: ao final de cada sprint ou quando novos padrões de dúvida forem identificados via suporte*

---

## Perguntas Frequentes — Sprint K (Onda 2)

**P: O que é a Onda 2 do diagnóstico?**  
R: A Onda 2 é a segunda fase do fluxo, composta pelas etapas 7 (Questionário IA Generativa) e 8 (Consolidação Final). Ela aprofunda a análise com perguntas geradas dinamicamente pela IA.

**P: Preciso completar a Onda 1 antes de iniciar a Onda 2?**  
R: Sim. O chip 'Onda 2' no stepper só fica habilitado após a conclusão de todas as etapas da Onda 1 (etapas 1-6).

**P: O que é o `questionario-solaris`?**  
R: É o identificador do questionário principal após o fix T06.1 (PR #184). Substitui o identificador legado `questionario-corporativo-v2`.

*Atualizado em 2026-03-29 — Sprint K concluída.*
