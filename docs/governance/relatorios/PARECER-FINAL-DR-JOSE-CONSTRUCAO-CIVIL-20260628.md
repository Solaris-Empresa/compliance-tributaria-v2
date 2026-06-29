# PARECER FINAL — PLATAFORMA IA SOLARIS
## Cobertura de Riscos Setoriais: Setor de Construção Civil
**Destinatário:** Dr. José (Consultor Jurídico)
**Emitido por:** Uires Tapajós — P.O., IA SOLARIS
**Data:** 28 de junho de 2026
**Referência:** Issue #1607 · Auditoria determinística concluída em 28/06/2026
**Método:** Auditoria de código (fonte da verdade) + confirmação por consulta direta ao banco de produção (somente leitura)

---

## 1. A pergunta

**A plataforma IA SOLARIS identifica automaticamente os riscos de compliance tributário de uma empresa do setor de construção civil?**

Esta é a questão central levantada pelo Dr. José após verificar que os 13 riscos setoriais por ele apontados — todos com fundamentação jurídica correta — não apareceram no diagnóstico gerado para a empresa CONSTRUTORA VII.

---

## 2. Resposta direta e transparente

**Para riscos transversais (aplicáveis a qualquer empresa, independente do setor):** sim, a plataforma identifica com alta confiança e fundamentação jurídica verificada.

**Para riscos setoriais específicos de construção civil:** não, a plataforma não os identifica de forma confiável no estado atual. Os riscos aparecem de forma parcial e com baixa confiança (0,64 em escala de 0 a 1), derivados apenas do código de atividade econômica (CNAE) da empresa — não das respostas que o próprio cliente forneceu no questionário.

Em uma frase: **a plataforma está certa no direito e no método; o que falta é conectar as respostas do cliente ao catálogo de requisitos e cadastrar os requisitos específicos do setor de construção civil.**

---

## 3. O que está correto — e foi validado pelo Dr. José

O Dr. José confirmou, após verificação independente: **"100% corretas"** as fundamentações jurídicas geradas pela plataforma para o setor de construção civil. Isso abrange:

- A base legal (LC 214/2023, EC 132/2023 e legislação complementar);
- O método determinístico de inferência normativa adotado;
- O acervo de recuperação de informação jurídica (RAG — Retrieval-Augmented Generation), composto por **25 normas indexadas** e **16.702 fragmentos jurídicos** disponíveis para consulta.

A fundação jurídica e técnica da plataforma está sólida. O problema identificado não é de direito — é de encanamento de dados.

---

## 4. O que não apareceu e por quê — evidência de banco confirmada

A auditoria identificou **três lacunas independentes e cumulativas** que impedem as respostas do questionário de se converterem em riscos no diagnóstico. Cada uma foi confirmada por consulta direta ao banco de produção em 28/06/2026.

### Lacuna 1 — O questionário não tem identificador que conecte a resposta ao catálogo de requisitos

A plataforma coleta as respostas do cliente em um formulário (questionário Q.CNAE). Cada resposta fica registrada no banco de dados. Porém, o registro da resposta **não contém nenhum campo que a vincule a um requisito normativo específico** — é como preencher um formulário cujas respostas vão para uma gaveta separada, sem etiqueta que diga a qual processo cada resposta pertence.

**Confirmação de banco (28/06/2026):** a tabela de respostas (`questionnaireAnswersV3`) possui os campos `id`, `projectId`, `cnaeCode`, `questionIndex`, `questionText`, `answerValue` e outros — e **não possui** nenhum campo de vínculo (`requirement_id`, `source_reference` ou equivalente). Confirmado por inspeção direta da estrutura da tabela.

### Lacuna 2 — Nenhuma resposta do questionário gerou um risco em nenhum projeto

A consequência direta da Lacuna 1 é que o motor de geração de riscos nunca conseguiu usar as respostas do questionário como insumo. Isso foi verificado de forma abrangente: **em toda a base de dados da plataforma, nenhum risco foi originado a partir das respostas do questionário Q.CNAE.**

**Confirmação de banco (28/06/2026) — prova negativa:**

| Origem dos riscos | Total na base | Projeto CONSTRUTORA VII |
|---|---|---|
| Motor normativo (v1) | 276 | 138 |
| Motor SOLARIS | 37 | 11 |
| Motor de engine | 3 | 3 |
| **Questionário Q.CNAE** | **0** | **0** |

O valor zero na linha do questionário é a prova mais objetiva da lacuna: o caminho resposta→risco **nunca funcionou**, em nenhum projeto.

### Lacuna 3 — O catálogo de requisitos não tem os requisitos específicos de construção civil

Mesmo que as Lacunas 1 e 2 fossem corrigidas, os riscos setoriais de construção civil ainda não apareceriam, porque os requisitos correspondentes **não estão cadastrados no catálogo normativo** da plataforma.

**Confirmação de banco (28/06/2026):**

- Total de requisitos normativos ativos: **138**
- Requisitos que cobrem operações imobiliárias ou de construção civil: **1** (`REQ-CLA-005 — Revisar operações imobiliárias e com imóveis`)
- Esse único requisito está classificado na categoria `imposto_seletivo` — **classificação incorreta** para os riscos de construção civil identificados pelo Dr. José

Os 13 riscos apontados pelo Dr. José (redutor de ajuste, SINTER, permuta, incorporação por parcelas, SPE/SCP, custos históricos 2027, CIB, contrapartidas urbanísticas, revisão de contratos, entre outros) **não têm nenhum requisito correspondente** nos 138 ativos.

Adicionalmente, a tabela de mapeamento entre perguntas e requisitos (`requirement_question_mapping`), que seria o mecanismo de ligação, está **completamente vazia** — confirmado por consulta direta: `COUNT(*) = 0`.

---

## 5. É um problema existencial?

**Não é existencial no sentido técnico.** A arquitetura da plataforma é correta, a base jurídica é sólida e as três lacunas são conhecidas, específicas e corrigíveis sem necessidade de reescrever a plataforma. Não há defeito irreversível.

**É existencial no sentido de reputação, se não houver transparência.** A plataforma tem como meta declarada 98% de confiabilidade. Esse indicador é calculado sobre os requisitos que *existem* no catálogo. Para um setor pouco curado, como construção civil, isso significa que o sistema pode exibir alta cobertura enquanto, na prática, não cobre a maioria dos riscos setoriais. Apresentar "98% de confiabilidade" a um cliente ou parceiro jurídico — sem a ressalva de que a cobertura setorial de construção civil ainda não está completa — seria uma afirmação imprecisa.

**Em síntese:** a plataforma é sólida na fundação e incompleta na cobertura setorial automática. O risco não está em "ela não funciona", e sim em "ela parecer mais completa do que é" para setores ainda não curados.

---

## 6. O que é necessário para a plataforma cobrir os riscos de construção civil

| # | O que falta | Quem decide / executa | Esforço estimado |
|---|---|---|---|
| 1 | Criar o identificador de vínculo entre respostas do questionário e o catálogo de requisitos | Decisão P.O. + execução técnica (Backlog #963) | Médio |
| 2 | Ativar o componente que converte resposta→risco (já existe no código, está desligado) | Execução técnica (Backlog #966) | Médio |
| 3 | Cadastrar os requisitos setoriais de construção civil (Arts. 252–270 e Art. 365 da LC 214/2023) no catálogo, com categorias corretas | **Curadoria jurídica (Dr. José)** + P.O. | Curadoria jurídica |
| 4 | Corrigir marcações de setor incorretas no acervo (alguns artigos estão associados a categorias erradas) | **Curadoria jurídica (Dr. José)** | Curadoria jurídica |
| 5 | Ajustar o indicador de cobertura para refletir a cobertura setorial real, não apenas os requisitos já cadastrados | Decisão P.O. | Baixo |

**Nota importante:** a solução é orientada a dados (cadastro e curadoria), não a correções pontuais de código por setor. O caminho escalável — que a plataforma já suporta — é cadastrar requisitos e perguntas por setor. Cada novo setor (saúde, transporte, agronegócio, etc.) seguirá o mesmo processo. A curadoria jurídica do Dr. José é, portanto, o insumo que destrava o maior valor para o setor de construção civil.

---

## 7. Recomendação

**1. Transparência imediata.** Enquanto as lacunas não forem corrigidas, comunicar com clareza que a cobertura automática da plataforma é completa para riscos transversais e parcial para riscos setoriais de construção civil. O indicador de 98% deve ser acompanhado dessa ressalva.

**2. Priorizar a curadoria jurídica dos requisitos setoriais de construção civil.** O Dr. José já demonstrou domínio do tema e validou a base jurídica da plataforma. Sua curadoria dos 13 riscos identificados — transformando-os em requisitos cadastrados no catálogo — é o insumo que nenhum sistema automatizado pode substituir.

**3. Executar as três lacunas em conjunto.** Corrigir apenas uma delas não fará os riscos aparecerem. As três precisam ser tratadas de forma coordenada.

**4. Validar com um caso real.** Após as correções, utilizar a própria CONSTRUTORA VII como caso de validação: a resposta "realizamos permuta de imóveis" deve gerar, automaticamente, o risco de permuta com rastreabilidade até o artigo da lei — com confiança superior a 0,90.

---

## 8. Declaração de transparência

Este parecer foi produzido com método determinístico: cada afirmação técnica foi verificada na fonte da verdade (o código da plataforma, linha a linha) e os fatos de banco foram confirmados por consulta direta ao banco de produção em modo somente leitura, em 28/06/2026. Não houve inferência apresentada como evidência. Onde havia dúvida, foi declarada como pendência de confirmação.

A auditoria foi conduzida de forma independente pelo sistema IA SOLARIS (Manus) e validada pelo Orquestrador Claude Code. Os relatórios técnicos completos estão disponíveis no repositório para auditoria independente.

---

**Resumo de uma linha para o Dr. José:**

> *A plataforma está correta no direito e no método — validado pelo próprio Dr. José. O que falta não é jurídico: é conectar as respostas do questionário ao catálogo e cadastrar os requisitos do setor de construção civil. Enquanto isso não acontece, os riscos setoriais não aparecem de forma confiável, e isso precisa ser dito com transparência.*

---

## Evidências e Anexos Técnicos

Todos os documentos abaixo estão disponíveis no repositório `Solaris-Empresa/compliance-tributaria-v2`, branch `main`, para auditoria independente:

| Documento | Descrição |
|---|---|
| `AUDITORIA-DET-CONSTRUCAO-CIVIL-1607-v2-20260628.md` | Auditoria determinística — causa-raiz, código linha a linha |
| `AS-IS-TO-BE-QCNAE-REQUIREMENT-LINK-20260628.md` | Análise de impacto da Lacuna 1 (ponte resposta→requisito) |
| `DESPACHO-MANUS-1607-COMPLETO-20260628.md` | Despacho técnico completo com queries de banco (Parte A) |
| `EVIDENCIA-1607-CONSTRUCAO-CIVIL.md` | Saída literal das queries de confirmação (banco de produção) |
| Issue #1607 (GitHub) | Rastreabilidade completa da investigação |
| Backlog #966, #963, #1025 | Itens de correção das três lacunas |

---

*Documento gerado em 28/06/2026 · Método: auditoria determinística + confirmação de banco (READ-ONLY) · git=e1481840 · checkpoint=0e9ff96b*
