# ANEXO I AO PARECER TÉCNICO DE VALIDAÇÃO (20/05/2026)

## Caso Concreto — Pipeline End-to-End em Projeto Real

**Documento principal:** `PARECER-TECNICO-SUITE-M1-2026-05-20.md`
**Anexo I — Tipo:** evidência empírica de operação em caso real
**Data:** 20 de maio de 2026
**Plataforma:** IA SOLARIS Compliance Tributária v2

---

## I. PROPÓSITO DESTE ANEXO

O Parecer principal documenta a **validação determinística do motor M1 (Perfil da Entidade)** mediante execução da suite oficial de 60 cenários sintéticos. Este Anexo I documenta, em complemento, **a operação efetiva do pipeline completo** (Perfil → Questionário → Briefing → Riscos → Plano) em um projeto real submetido à plataforma em 20/05/2026, com objetivo de:

1. Comprovar que o motor validado na suite **é o mesmo motor em produção** (vide ponte forense, item III abaixo);
2. Fornecer ao advogado tributarista visão tangível das saídas que o sistema entrega ao usuário final;
3. Discriminar claramente o que é **classificação determinística do motor** versus o que demanda **validação jurídica humana** sobre o caso concreto.

---

## II. IDENTIFICAÇÃO DO CASO

| Campo | Valor |
|---|---|
| **Projeto** | Projeto - transporte de carga |
| **Cliente vinculado** | Pharma Brasil Grande Ltda — CNPJ 22.333.444/0001-08 |
| **CNPJ do projeto auditado** | 43.251.473/0001-74 |
| **Tipo jurídico** | LTDA — Sociedade Limitada |
| **Porte** | Média (até R$ 300 mi/ano) |
| **Faturamento estimado** | R$ 4,8 mi – R$ 78 mi/ano |
| **Regime tributário** | Lucro Real |
| **Operação principal** | Misto (Comércio + Serviços) |
| **Tipo de cliente** | B2B |
| **Multi-estadual** | Não (mono-UF) |
| **UF principal** | (não declarada explicitamente nos PDFs analisados) |
| **Grupo econômico** | Não |
| **Centralização fiscal** | Centralizada na matriz |

### CNAEs declarados e confirmados

| CNAE | Descrição | Confiança IA |
|---|---|---|
| **4623-1/09** | Comércio Atacadista de Alimentos para Animais | 98% |
| **4930-2/02** *(declarado na criação)* | Transporte Rodoviário de Carga, Exceto Produtos Perigosos e Mudanças, Intermunicipal, Interestadual e Internacional | 97% |
| **4930-2/03** *(impresso no Perfil da Entidade e no Briefing)* | Transporte Rodoviário de Produtos Perigosos | — |

> **⚠️ Observação técnica nº 1:** os documentos `projeto.pdf` (Etapa 1) e `briefing.pdf`/`perfil.pdf` (Etapas 2/3) apresentam divergência aparente no segundo CNAE: declarado como **4930-2/02** (carga não-perigosa) na criação e impresso como **4930-2/03** (produtos perigosos) nas etapas subsequentes. Trata-se de fato que **requer esclarecimento operacional pelo usuário do sistema** antes de qualquer parecer jurídico definitivo, pois a classificação altera substancialmente o regime regulatório aplicável (transporte de cargas perigosas tem disciplina própria — Resolução ANTT, ANP, Decreto 96.044/88 e correlatos).

### Códigos fiscais declarados

| Código | Tipo | Descrição associada |
|---|---|---|
| **NCM 2306.10.00** | Produto | Tortas e demais resíduos sólidos da extração do óleo de soja (insumo para alimentação animal) |
| **NCM 2304.00.10** | Produto | Tortas e demais resíduos sólidos da extração do óleo de soja — farinha forrageira |
| **NBS 1.0501.11.10** | Serviço | (Código não mapeado no dataset interno — fallback acionado) |

> **⚠️ Observação técnica nº 2:** os três códigos fiscais acima foram acionados como **fallback** pelo motor M1 (blocker `V-10-FALLBACK`, severidade INFO). Isto significa que a categorização interna fina (subcategoria) **não está estabilizada**; a classificação dimensional (objeto/papel/relação/território/regime) permanece válida, mas a precisão de subcategorização pode demandar enriquecimento do dataset NBS/NCM em sprint futura.

---

## III. PONTE FORENSE COM O PARECER PRINCIPAL — IDENTIDADE DE MOTOR

A página de Perfil da Entidade deste cliente (`perfil.pdf`, p. 3) registra explicitamente o hash determinístico de regras aplicado na classificação:

```
4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272
```

Este valor é **bit-a-bit idêntico** ao `rules_hash` obtido na execução da suite oficial de 60 cenários reportada no Parecer principal (item IV — Resultado Quantitativo):

```
sha256:4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272
```

### Consequência jurídica desta identidade

A correspondência exata do hash entre **suite de validação** e **operação em produção** estabelece, como matéria de fato técnico:

1. **O motor que classificou este cliente é matematicamente o mesmo motor** submetido à validação determinística de 60 cenários representativos da economia brasileira;
2. **Toda a propriedade de reprodutibilidade** demonstrada na suite (mesma entrada → mesma saída byte-a-byte) **transfere-se a este caso concreto** — a classificação do perfil deste cliente é, no mesmo grau, reproduzível e auditável;
3. **A garantia de ausência de regras divergentes em paralelo**, atestada na suite, **vale para este caso** — não há motor sombra ou caminho alternativo de classificação que pudesse ter produzido resultado diverso.

Em termos forenses: caso este diagnóstico venha a ser questionado em contencioso administrativo ou judicial, a defesa técnica do sistema pode comprovar, por mera execução do mesmo comando no mesmo `data_version`, que a saída é reproduzível.

---

## IV. RESULTADOS POR ETAPA DO PIPELINE

### IV.1 — Etapa 1: Criação do Projeto (`projeto.pdf`)

Estágio de entrada de dados. Foram coletados:

- Identificação societária completa (CNPJ, tipo jurídico, porte);
- Regime tributário e faixa de faturamento;
- Tipo de operação principal (Misto) e tipo de cliente (B2B);
- 2 NCMs + 1 NBS declarados;
- Resposta "Não" a: operações multi-UF, múltiplos estabelecimentos, importação/exportação, regime especial, intermediação financeira, grupo econômico, equipe tributária interna, auditoria fiscal periódica, passivo tributário pendente;
- Centralização fiscal: matriz.

Análise de CNAE pela IA: 2 CNAEs identificados com confiança 97-98%. **Descrição declarada suficiente para análise** (235 caracteres).

### IV.2 — Etapa 2: Perfil da Entidade (`perfil.pdf`) — saída do motor M1

| Dimensão | Classificação | Origem da inferência |
|---|---|---|
| **Objeto** | `bens_mercadoria_geral`, `servico_geral` | Fallback (NCM/NBS não mapeados — INFO) |
| **Papel na cadeia** | `distribuidor` | Usuário (preenchido) |
| **Tipo de relação** | `venda`, `servico` | Usuário (preenchido) |
| **Território** | `nacional` | CNAE (inferido) |
| **Regime** | `lucro_real` | Usuário (preenchido) |

**Status formal:** `confirmado` em 20/05/2026 às 09:09:11 — Snapshot imutável (ADR-0031).

**Confiança do caso:** 100 / 100
- Completude (peso 40%): 100%
- Inferência validada (peso 30%): 100%
- Coerência (peso 30%): 100%

**Pendências e bloqueios:** 3 itens INFO (`V-10-FALLBACK` para NCMs 2306.10.00, 2304.00.10 e NBS 1.0501.11.10) — **não bloqueiam o fluxo**.

> **Nota técnica:** O hash do snapshot é `cbc7dbd2…` (perfil) atrelado ao hash de regras `4929516b…` (motor) — ambos preservados de forma imutável conforme `ADR-0031`. Esta dupla hash é a unidade de auditabilidade do M1.

### IV.3 — Etapa 3: Briefing de Compliance (`briefing.pdf`)

**Confiança declarada:** 91% — **Alta** — *"Revisão por advogado tributarista recomendada"*

**Composição da confiança** (média ponderada de 6 pilares):

| Pilar | Peso | Completude | Contribuição |
|---|---|---|---|
| Perfil da empresa | 8 | 100% (7/7 obrigatórios + 12/12 opcionais) | 8,0 |
| Q3 Produtos (NCM) | 10 | 100% (2/2 NCM + 6/6 perguntas) | 10,0 |
| Q3 Serviços (NBS) | 10 | 100% (1/1 NBS + 3/3 perguntas) | 10,0 |
| Q3 CNAE especializado | 10 | **59%** (10/17 perguntas) | 5,9 |
| Q1 SOLARIS (Onda 1) | 5 | 100% (24/24 perguntas) | 5,0 |
| Q2 IA Gen (Onda 2) | 2 | 100% (5 respostas) | 2,0 |
| **Total aplicável** | **45** | — | **40,9** |
| **Confiança = 40,9 / 45** | — | — | **= 91%** |

> O pilar **Q3 CNAE especializado em 59%** é o principal vetor de redução da confiança total. Para elevação a >95%, recomenda-se complementar o questionário CNAE específico (cada pergunta completa adiciona ~0,6 ponto percentual de confiança).

**Limitações declaradas no próprio briefing:**

1. Análise baseada exclusivamente nas respostas dos questionários e dados cadastrais — sem acesso a documentos fiscais, contratos ou sistemas internos;
2. Não foi possível validar a destinação efetiva dos produtos NCM 2306.10.00 e 2304.00.10 (a destinação à alimentação animal vs. industrial muda alíquota aplicável);
3. Ausência de detalhamento sobre operações interestaduais e controles internos;
4. Validação por advogado tributarista especializado em Reforma Tributária é **explicitamente recomendada** pelo próprio sistema.

### IV.4 — Etapa 4: Matriz de Riscos v4 (`matriz-riscos.pdf`)

Motor determinístico de classificação em 10 categorias canônicas da LC 214/2025. Saída para o caso:

**6 riscos ativos · 3 oportunidades · 100% RAG-validados:**

| # | Categoria | Severidade | Base legal | Fonte multi | Urgência |
|---|---|---|---|---|---|
| 1 | Inscrição Cadastral | **Alta** | Art. 213 LC 214/2025 | Regulatório + Solaris | Imediata |
| 2 | Split Payment | **Alta** | Art. 9 LC 214/2025 | Regulatório + Solaris | Imediata |
| 3 | Confissão Automática | **Alta** | Art. 45 LC 214/2025 | **IA Gen + Regulatório + Solaris** | Imediata |
| 4 | Transição ISS/IBS | Média | Arts. 6-12 LC 214/2025 | Regulatório | Médio Prazo |
| 5 | Obrigação Acessória | Média | Art. 102 LC 214/2025 | Regulatório + Solaris | Curto Prazo |
| 6 | Regime Diferenciado | Média | Art. 29 LC 214/2025 | Regulatório + Solaris | Curto Prazo |

**Oportunidades tributárias identificadas:**

| Categoria | Base legal |
|---|---|
| Alíquota Reduzida | Art. 24 LC 214/2025 |
| Alíquota Zero | Art. 125 c/c Anexo I LC 214/2025 |
| Crédito Presumido | Art. 58 LC 214/2025 |

> **Nota técnica:** A presença simultânea de 2 ou 3 fontes no breadcrumb de cada risco (Regulatório + Solaris, e Confissão Automática com IA Gen + Regulatório + Solaris) demonstra que o motor **agrega evidência multi-fonte por risco** — comportamento auditado e validado na Sprint M3.10 (post-mortem `2026-05-05-mono-fonte-matriz-riscos.md`). Cada risco é fundamentado em pelo menos uma fonte normativa (Regulatório com RAG ✓), comprovando aderência à **REGRA-ORQ-29** (sem requisito normativo verificável, nenhum risco é emitido).

### IV.5 — Etapa 5: Consolidação / Plano de Ação (`consolidacao.pdf`)

**Diagnóstico Reforma Tributária — LC 214/2025**

| Métrica | Valor |
|---|---|
| **Score de Exposição** | **65/100 — 🟠 ALTA EXPOSIÇÃO** |
| Faixa atual | 56–75 (Alta — *Priorizar mitigação*) |
| Meta | ≤ 30 pontos (faixa verde) |
| Distância para sair da faixa alta | 10 pontos |
| Riscos Alta | 3 |
| Riscos Média | 3 |
| Oportunidades | 3 |
| Planos aprovados | 0 (em revisão pelo usuário) |
| Tarefas geradas | 19 |

**Fórmula do score:** `peso × max(confiança, 0,5) / n × 9 × 100` (v4.0)

**Aviso legal explícito do sistema:**

> *"AVISO LEGAL: Este diagnóstico é uma ferramenta de apoio à decisão tributária elaborada com base nas informações fornecidas pela empresa. Os resultados apresentados — incluindo a identificação de riscos, oportunidades e planos de ação — **NÃO constituem parecer jurídico**. Toda classificação e recomendação deve ser validada por advogado tributarista ou contador habilitado antes de qualquer ação fiscal, contábil ou de compliance. A severidade dos riscos é determinística (baseada em tabelas normativas), mas a aplicabilidade ao caso concreto depende de análise humana qualificada. IA SOLARIS não se responsabiliza por decisões tomadas sem a devida validação profissional."*

---

## V. SUMÁRIO DOS GAPS DE COMPLIANCE IDENTIFICADOS PELO SISTEMA

Para conveniência do advogado revisor, reproduzem-se abaixo os 4 gaps formalizados no briefing automático:

### Gap 1 — Parametrização de alíquotas IBS interestaduais

- **Causa raiz declarada:** empresa não avaliou necessidade de parametrizar alíquotas IBS conforme destino das operações interestaduais.
- **Base legal apontada:** Arts. 14 e 15 LC 214/2025
- **Urgência:** 🔴 Imediata
- **Fonte:** Regra semântica (gatilho #4 — IBS interestadual)

### Gap 2 — Atualização cadastral no IBS/CBS

- **Causa raiz declarada:** empresa não avaliou o correto enquadramento dos CNAEs nem revisou inscrição no contexto do novo regime.
- **Base legal apontada:** Art. 21 §1º LC 214/2025
- **Urgência:** 🔴 Imediata
- **Fonte:** Regra semântica (gatilho #5 — Inscrição cadastral IBS/CBS)

### Gap 3 — Não aplicação das reduções de alíquotas para NCM 2306.10.00 e 2304.00.10

- **Causa raiz declarada:** empresa declarou não aplicar redução de 60% nas alíquotas, mesmo havendo previsão específica para esses NCMs quando destinados à alimentação animal.
- **Base legal apontada:** Arts. 137 e 138 LC 214/2025
- **Urgência:** 🔴 Imediata
- **Fonte:** Respostas do questionário (Q.Produtos NCM — respostas negativas)

> **Observação para o advogado:** o briefing afirma destinação "à alimentação animal ou cadeia do agronegócio". A **destinação efetiva** dos produtos comercializados pela empresa **não foi documentalmente comprovada** (vide limitação nº 2 declarada pelo sistema). A correta enquadramento do benefício de redução depende, portanto, de verificação documental (notas fiscais de saída, contratos com clientes, perfil dos adquirentes).

### Gap 4 — Segregação de receitas + emissão de NFS-e + transição ISS→IBS

- **Causa raiz declarada:** empresa não realiza segregação de receitas, não emite corretamente NFS-e para serviços de transporte e não avaliou impactos da substituição do ISS pelo IBS, especialmente em operações interestaduais.
- **Base legal apontada:** Art. 128 LC 214/2025
- **Urgência:** 🔴 Imediata
- **Fonte:** Respostas do questionário (Q.Serviços NBS — negativas para emissão de NFS-e e apuração)

---

## VI. PONTOS DE ATENÇÃO PARA REVISÃO JURÍDICA

Os pontos abaixo são listados como **roteiro de validação** ao advogado tributarista. Não constituem opinião jurídica do sistema — são lacunas factuais que o pipeline determinístico **não consegue suprir sozinho** e que precisam de validação humana qualificada:

1. **Reconciliação CNAE 4930-2/02 vs. 4930-2/03** — confirmar com o cliente qual a atividade efetiva de transporte (carga geral vs. produtos perigosos). A divergência entre Etapa 1 e Etapas 2/3 nos PDFs requer esclarecimento. Transporte de produtos perigosos enseja obrigações regulatórias adicionais (Resolução ANTT 5.232/2016, Decreto 96.044/88) que extrapolam o escopo do IBS/CBS mas afetam riscos operacionais correlatos.

2. **Destinação efetiva dos NCMs 2306.10.00 e 2304.00.10** — a aplicabilidade da redução de 60% (Arts. 137-138 LC 214/2025) depende de comprovação documental da destinação à alimentação animal / agronegócio. O sistema declarou impossibilidade de validar esta destinação sem documentação (notas fiscais, contratos).

3. **Multi-estadualidade declarada como "Não"** vs. **Gap 1 que pressupõe operações interestaduais** — há tensão lógica entre a declaração da empresa (não opera em múltiplos estados) e a emissão de gap específico para parametrização interestadual. Possíveis interpretações: (a) a empresa eventualmente faz operação interestadual mesmo sendo majoritariamente mono-UF; (b) o gap foi disparado por gatilho de risco potencial em razão dos CNAEs (transporte interestadual). **Cabe esclarecimento operacional.**

4. **Ausência de equipe tributária interna + ausência de auditoria fiscal periódica + porte médio** — combinação que justifica recomendação enfática de assessoria externa contínua, não apenas pontual.

5. **NBS 1.0501.11.10 não mapeado** — código de serviço utilizado pela empresa não consta do dataset interno. Cabe ao advogado verificar **se este é o código correto** para a atividade de transporte rodoviário declarada (e, em caso negativo, qual NBS aplicável).

6. **Plano de ação ainda não aprovado** — o status atual mostra 19 tarefas geradas mas **0 planos aprovados** pelo usuário. Não houve validação humana das ações recomendadas; o score de exposição (65) reflete diagnóstico cru, anterior a qualquer mitigação.

7. **Validação substantiva das bases legais citadas** — todas as referências a "Art. X LC 214/2025" são extraídas pelo motor a partir do corpus normativo RAG (16.129 chunks · 25 leis · versão `corpus-baseline-v8.1`). Recomenda-se que o advogado **confira independentemente** a leitura desses dispositivos contra a redação oficial da Lei Complementar 214/2025.

---

## VII. CONCLUSÃO DO ANEXO

O caso documentado constitui exemplo de operação **íntegra do pipeline de diagnóstico** da plataforma IA SOLARIS Compliance Tributária v2:

- O motor M1 — Perfil da Entidade — classificou o cliente com **score 100/100 de confiança** e produziu snapshot imutável (ADR-0031);
- O motor utilizado é **demonstravelmente o mesmo** validado na suite oficial de 60 cenários (ponte forense via `rules_hash` único);
- O briefing automático atingiu **91% de confiança** (ponderação de 6 pilares), com limitações explicitamente declaradas;
- A matriz de riscos identificou **6 riscos categorizados** e **3 oportunidades**, todos com referência normativa RAG-validada;
- A consolidação produziu **score de exposição 65/100** (alta exposição), com 19 tarefas operacionais geradas e aguardando revisão humana.

**Recomendação ao advogado tributarista:** o diagnóstico gerado é tecnicamente íntegro e auditável, mas **não substitui parecer jurídico individualizado**. Os 7 pontos do Item VI acima constituem roteiro mínimo de validação substantiva sobre o caso, e devem ser cotejados com documentos fiscais, contratos e declarações da empresa antes da emissão de qualquer parecer formal ou recomendação de ação fiscal/contábil concreta.

---

## VIII. EVIDÊNCIA DOCUMENTAL ARQUIVADA

Os seguintes documentos integram o conjunto probatório deste Anexo I (PDFs gerados pelo sistema em 20/05/2026):

| Documento | Conteúdo |
|---|---|
| `projeto.pdf` | Etapa 1 — Criação do Projeto e inputs cadastrais |
| `perfil.pdf` | Etapa 2 — Perfil da Entidade confirmado (saída do motor M1) |
| `briefing.pdf` | Etapa 3 — Briefing de Compliance (91% confiança) |
| `matriz-riscos.pdf` | Etapa 4 — Matriz de Riscos v4 (6 riscos + 3 oportunidades) |
| `consolidacao.pdf` | Etapa 5 — Consolidação e Plano de Ação (score 65) |

---

## IX. IDENTIFICAÇÃO TÉCNICA

| Campo | Valor |
|---|---|
| Documento principal | `PARECER-TECNICO-SUITE-M1-2026-05-20.md` |
| Anexo | I — Caso Concreto |
| Plataforma | IA SOLARIS Compliance Tributária v2 |
| Repositório | github.com/Solaris-Empresa/compliance-tributaria-v2 |
| Commit auditado | `f4c898fc678b44f6a3217ff64261403ec69ce7b7` |
| Branch | `docs/corpus-baseline-v8.1` |
| Versão do corpus normativo (RAG) | v8.1 — 16.129 chunks · 25 leis · 100% `anchor_id` |
| Rules hash (motor M1) | `sha256:4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272` |
| Snapshot do perfil deste cliente (`cbc7dbd2…`) | Imutável conforme ADR-0031 |
| Data/hora do perfil (confirmação) | 2026-05-20 09:09:11 (horário local do servidor) |

---

*Este Anexo I deve ser lido em conjunto com o Parecer Técnico principal datado de 20/05/2026 e referente à suite oficial M1-arquetipo-51-casos-brasil-v3 (60 cenários). A validade probatória deste Anexo está condicionada à validade do parecer principal e à identidade de motor demonstrada no Item III.*
