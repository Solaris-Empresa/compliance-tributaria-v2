# Parecer Técnico-Transparente — A plataforma responde automaticamente a risco de compliance?

> **Destinatário:** Dr. José (jurídico) · P.O. (Uires Tapajós) · Consultor
> **Autor:** Claude Code (Orquestrador técnico) · **Data:** 28/06/2026
> **Caso:** CONSTRUTORA VII — construção civil · Issue #1607
> **Natureza:** parecer de transparência. Linguagem acessível ao jurídico; o detalhamento técnico (com referências de código linha a linha) está nos relatórios anexos.
> **Compromisso:** este parecer não ameniza nem exagera. Relata o que o sistema **faz**, verificado na fonte da verdade (o próprio código) e nos dados do banco de produção.

---

## 1. A pergunta que importa

> **A plataforma identifica, de forma automática, os riscos de compliance tributário de um cliente — ou não?**

O Dr. José analisou um caso real de construção civil e constatou que **13 riscos relevantes** do setor **não apareceram** no diagnóstico, embora a fundamentação jurídica, o método e a base legal (RAG) estivessem **100% corretos**. A pergunta dele é a pergunta certa — e merece resposta direta.

---

## 2. Resposta direta e transparente

**Sim e não — e a distinção é o ponto central.**

- **SIM**, a plataforma responde a uma parte dos riscos: no caso da construtora, gerou 8 riscos, sendo 6 **transversais** (válidos para qualquer empresa: split payment, confissão automática, inscrição cadastral, obrigação acessória, etc.) com **alta confiança (97%)**.

- **NÃO** — para os riscos **setoriais específicos** de construção civil (Redutor de Ajuste, SINTER, permuta, apuração por empreendimento, CIB, custos históricos, etc.), a plataforma **hoje não responde de forma completa nem confiável**. Apareceram apenas **2** riscos de imóveis, e mesmo esses com **confiança baixa (64%)** — gerados por uma estimativa automática baseada no CNAE, **não** pela análise das respostas que o cliente deu no questionário.

**Em termos simples:** o cliente **respondeu corretamente** a um questionário que **fez as perguntas certas** (inclusive confirmou que faz permuta de imóveis, locação, obras para órgãos públicos) — mas essas respostas **não chegaram ao motor que gera os riscos.** É como um formulário preenchido com precisão que nunca foi entregue ao analista.

---

## 3. O que está CORRETO (e deve tranquilizar)

A **fundação** da plataforma está sólida — confirmado pelo próprio Dr. José e verificado tecnicamente:

1. **A base legal (RAG) tem os artigos certos.** Os artigos da LC 214 sobre regime de imóveis (Arts. 252 a 270) e construção estão no acervo, e os principais com a marcação setorial correta.
2. **O método é determinístico** (mesma entrada → mesma resposta; sem "chute" do modelo de IA).
3. **O questionário funciona** e captura os fatos certos do negócio.
4. **As categorias de risco de imóveis existem** e estão aprovadas internamente.

> **Conclusão desta seção:** não há erro de direito, nem alucinação de IA, nem base legal errada. O problema **não é de conteúdo jurídico.**

---

## 4. O que NÃO apareceu — e por quê (em 3 lacunas)

A análise determinística identificou **três lacunas independentes**, todas de **encanamento/curadoria de dados**, não de direito:

**Lacuna 1 — A "ponte" entre as respostas e o catálogo de riscos não existe.**
As respostas do questionário setorial são guardadas **sem um identificador** que as ligue ao catálogo de requisitos legais. Sem essa ligação, o motor não consegue dizer "esta resposta corresponde a este risco". As 9 respostas de alto risco do cliente ficaram, na prática, **desconectadas**.

**Lacuna 2 — A peça que faria essa ligação está desligada.**
Existe no sistema um componente projetado exatamente para conectar respostas a requisitos — mas ele está **inativo** (foi deixado como um "espaço reservado" vazio, aguardando curadoria). Já existe tarefa registrada para ativá-lo (itens de backlog #966 e #963).

**Lacuna 3 — Faltam os requisitos setoriais no catálogo.**
O catálogo central de requisitos tem **138 itens**, mas **apenas 1** está associado a imóveis — e ainda assim **classificado na categoria errada**. Sem requisitos setoriais cadastrados, não há "destino" para as respostas se conectarem, mesmo que as lacunas 1 e 2 fossem resolvidas.

> As três são **cumulativas**: resolver uma só não faz os riscos aparecerem. É preciso tratar as três (a boa notícia: todas são conhecidas, específicas e corrigíveis — não exigem reescrever a plataforma).

---

## 5. É um problema existencial?

**Resposta honesta: depende de como a plataforma é apresentada ao cliente.**

- **Não é existencial no sentido técnico/de fundação.** A base jurídica, o método e o acervo estão corretos. As falhas são em três pontos identificados de dados/encanamento, todos corrigíveis sem refazer a arquitetura. Não é um defeito irreversível.

- **É existencial no sentido de reputação e viabilidade — SE não for transparente.** A plataforma tem como meta declarada **98% de confiabilidade**. Hoje esse número é calculado sobre os requisitos que **existem** no catálogo. Para um setor pouco curado, como construção civil, isso significa que o sistema pode exibir "cobertura completa" enquanto, na prática, **não cobre a maioria dos riscos setoriais**. Apresentar "98%" sobre uma base incompleta a um advogado ou cliente — sem ressalva — é o verdadeiro risco reputacional.

> **Em uma frase:** a plataforma é **sólida na fundação e incompleta na cobertura setorial automática**. O risco não está em "ela não funciona", e sim em "ela parecer mais completa do que é" para setores ainda não curados.

---

## 6. O que é preciso para a plataforma responder (linguagem de negócio)

| # | O que falta | Quem decide / executa | Esforço |
|---|---|---|---|
| 1 | Criar a "ponte" (identificador) entre respostas do questionário e o catálogo de requisitos | Decisão P.O. (muda estrutura de dados) + execução técnica | Médio |
| 2 | Ligar o componente que conecta resposta→risco (já existe, está desligado) | Backlog #966/#963 — execução técnica | Médio |
| 3 | Cadastrar os requisitos setoriais de construção (Arts. 252-270/365) no catálogo, com a categoria correta | **Curadoria jurídica (Dr. José)** + P.O. | Curadoria (jurídico) |
| 4 | Corrigir marcações de setor erradas no acervo (alguns artigos estão associados a "agropecuária" ou "financeiro" por engano) | **Curadoria jurídica (Dr. José)** | Curadoria (jurídico) |
| 5 | Ajustar a meta de 98% para medir cobertura **setorial real** (não só dos requisitos já cadastrados) | Decisão P.O. | Médio |

> **Importante:** a solução é **data-driven** (cadastro e curadoria), **não** "remendo de código por setor". O caminho escalável é cadastrar requisitos e perguntas por setor — exatamente o que a curadoria jurídica do Dr. José habilita. Cada novo setor (saúde, transporte, agro, etc.) seguirá o mesmo caminho.

---

## 7. Recomendação

1. **Transparência imediata:** enquanto as lacunas não forem corrigidas, comunicar claramente que a cobertura automática é **completa para riscos transversais** e **parcial para riscos setoriais não curados** (como construção civil). Não apresentar "98%" sem essa ressalva.
2. **Priorizar a curadoria jurídica** dos requisitos setoriais de construção (Dr. José) — é o insumo que destrava o maior valor e só o jurídico pode produzir.
3. **Executar as 3 lacunas em conjunto** (não isoladamente) para que os riscos passem a aparecer de forma determinística e com alta confiança.
4. **Validar com um caso real** (a própria CONSTRUTORA VII) após as correções: a resposta "faço permuta" deve gerar, automaticamente, o risco de permuta — com rastreabilidade até o artigo da lei.

---

## 8. Declaração de transparência

Este parecer foi produzido com método determinístico: cada afirmação técnica foi verificada na **fonte da verdade** (o código da plataforma) e os fatos de banco foram confirmados por consulta direta (somente leitura) ao banco de produção. **Não houve inferência apresentada como evidência.** Onde havia dúvida, está declarada como pendência de confirmação. Os relatórios técnicos completos (com referências linha a linha) estão anexos e disponíveis no repositório, para auditoria independente.

**Resumo de uma linha para o Dr. José:** *a plataforma está certa no direito e no método; o que falta não é jurídico — é conectar as respostas ao catálogo e cadastrar os requisitos do seu setor. Enquanto isso não acontece, os riscos setoriais de construção não aparecem de forma confiável, e isso precisa ser dito com transparência.*

---

## Anexos técnicos (no repositório)
- `AUDITORIA-DET-CONSTRUCAO-CIVIL-1607-v2-20260628.md` — auditoria determinística (causa-raiz, código linha a linha)
- `AS-IS-TO-BE-CONSTRUCAO-CIVIL-RISCOS-SETORIAIS-20260628.md` — análise de impacto inicial
- `AS-IS-TO-BE-QCNAE-REQUIREMENT-LINK-20260628.md` — análise de impacto da "ponte" (Lacuna 1)
- `ISSUE-CONSTRUCAO-CIVIL-RISCOS-SETORIAIS-20260628.md` — issue de rastreabilidade (#1607)
- Evidência de banco (Manus): `EVIDENCIA-1607-CONSTRUCAO-CIVIL.md`
- Issue #1607 (GitHub) + backlog #966 / #963 / #1025
