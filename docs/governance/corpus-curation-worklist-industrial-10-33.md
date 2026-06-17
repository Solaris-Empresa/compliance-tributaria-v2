# Corpus Curation Worklist — cnaeGroups faixa industrial 10–33

**Criado:** 16/06/2026 · **Atualizado:** 16/06/2026 (lc224/227 do corpus derivado) · **Origem:** Gate 0 fonte primária LC 214/2025 (despacho v34)
**Total:** 136 chunks · 111 artigos · **Status:** 🔴 Aguarda validação jurídica (`blocked-legal-gate`)

> **Regra de ouro (Lição #133, corrigida 16/06/2026):** a LC 214/2025 cita CNAE em **apenas 1 artigo** — **Art. 273, § 2º, I** (CNAE **5620-1/01**, regime de bares/restaurantes; fonte primária `Lcp 214.pdf`, `pdftotext`: 1 ocorrência de "CNAE" na lei inteira). Para **todos os demais artigos** do worklist o mapeamento artigo→CNAE **não existe na lei** — o campo `cnaeGroups` é camada interpretativa editorial. Nunca preencher "cnaeGroups proposto" sem ler o caput completo + assinatura jurídica. Em dúvida sobre o setor, preferir **"universal"** a uma lista restrita incorreta.

> **⚠️ Provenance:** LC 214 = caput da **fonte primária** `lc214.json` (acervo v3). **LC 224 / LC 227 = `conteudo` do corpus DERIVADO** (`rag-corpus-lcs-novas.ts`) — `lc224.json`/`lc227.json` **não existem no acervo primário v3** (verificado em `corpus_normativo_v3.zip`). O jurídico DEVE confirmar o texto LC224/227 contra a fonte primária quando disponível (Lição #126).

## Contexto

136 chunks de `server/rag-corpus-lcs-novas.ts` compartilham faixa industrial copy-paste (`10..33` ou `35..39,10..33`) independentemente do tema do artigo. Casos comprovadamente errados: **Art.140** (comunicação institucional → adm. pública) e **Art.176** (contribuintes de combustíveis). Muitos são artigos **gerais/estruturais/de alteração** (incidência, fato gerador, base de cálculo, alterações a outras leis) sem qualquer relação com indústria. Issues: CORPUS-FIX-01 #1466 · CORPUS-FIX-02 #1467 (`blocked-legal-gate`).

## Como usar (Consultor/Jurídico)

Para cada artigo: (1) ler o caput na coluna **Texto legal**; (2) preencher **Setor regulado**; (3) preencher **cnaeGroups proposto** (grupos CNAE de 2 dígitos) — ou marcar **"universal"** se for artigo geral sem restrição setorial; (4) assinar nome+data em **Validado por**. Anti-regressão: confirmar que remover um CNAE não oculta artigo legítimo (corpus-audit-checklist §3).

### LC 214/2025 — 99 artigos (123 chunks) · fonte primária `lc214.json` ✅

| Artigo | Linhas corpus | Faixa atual | Texto legal (caput — fonte primária) | Setor regulado | cnaeGroups proposto | Validado por |
|---|---|---|---|---|---|---|
| Art.5 | 11449 | 35–39,10–33 | O IBS e a CBS também incidem sobre as seguintes operações: | _(preencher)_ | — | ⬜ Pendente |
| Art.6 | 11345 | 10–33 | O IBS e a CBS não incidem sobre: | _(preencher)_ | — | ⬜ Pendente |
| Art.10 | 262 | 35–39,10–33 | Considera-se ocorrido o fato gerador do IBS e da CBS no momento do fornecimento nas operações com bens ou com serviços, ainda que de execução continuada ou fracionada. | _(preencher)_ | — | ⬜ Pendente |
| Art.11 | 349 | 35–39,10–33 | Considera-se local da operação com: | _(preencher)_ | — | ⬜ Pendente |
| Art.12 | 11086 | 10–33 | A base de cálculo do IBS e da CBS é o valor da operação, salvo disposição em contrário prevista nesta Lei Complementar. | _(preencher)_ | — | ⬜ Pendente |
| Art.14 | 10191, 11307 | 10–33 | As alíquotas da CBS e do IBS serão fixadas por lei específica do respectivo ente federativo, nos seguintes termos: | _(preencher)_ | — | ⬜ Pendente |
| Art.18 | 10606 | 10–33 | As alíquotas de referência serão fixadas por resolução do Senado Federal: | _(preencher)_ | — | ⬜ Pendente |
| Art.19 | 497 | 10–33 | Qualquer alteração na legislação federal que reduza ou eleve a arrecadação do IBS ou da CBS: | _(preencher)_ | — | ⬜ Pendente |
| Art.23 | 10042 | 35–39,10–33 | A plataforma digital, inclusive a domiciliada no exterior, deverá se inscrever no cadastro do IBS e da CBS no regime regular para fins de cumprimento do disposto no art. 22. | _(preencher)_ | — | ⬜ Pendente |
| Art.24 | 662 | 35–39,10–33 | Sem prejuízo das demais hipóteses previstas na Lei nº 5.172, de 25 de outubro de 1966 (Código Tributário Nacional) e na legislação civil, são solidariamente responsáveis pelo pagamento do IBS e da CBS… | _(preencher)_ | — | ⬜ Pendente |
| Art.31 | 11162 | 10–33 | Nas transações de pagamento relativas a operações com bens ou com serviços, os prestadores de serviços de pagamento eletrônico e as instituições operadoras de sistemas de pagamentos deverão segregar e… | _(preencher)_ | — | ⬜ Pendente |
| Art.35 | 935 | 10–33 | O Poder Executivo da União e o Comitê Gestor do IBS deverão aprovar orçamento para desenvolvimento, implementação, operação e manutenção do sistema do split payment. Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.38 | 10999 | 10–33 | Em caso de pagamento indevido ou a maior, a restituição do IBS e da CBS somente será devida ao contribuinte na hipótese em que: | _(preencher)_ | — | ⬜ Pendente |
| Art.58 | 1375 | 10–33 | O Comitê Gestor do IBS e a RFB atuarão de forma conjunta para implementar soluções integradas para a administração do IBS e da CBS, sem prejuízo das respectivas competências legais. Produção de efeito… | _(preencher)_ | — | ⬜ Pendente |
| Art.60 | 1425 | 10–33 | O sujeito passivo do IBS e da CBS, ao realizar operações com bens ou com serviços, inclusive exportações, e importações, deverá emitir documento fiscal eletrônico. | _(preencher)_ | — | ⬜ Pendente |
| Art.67 | 10122 | 10–33 | Para efeitos de cálculo do IBS e da CBS, considera-se ocorrido o fato gerador do IBS e da CBS na importação de bens materiais: | _(preencher)_ | — | ⬜ Pendente |
| Art.69 | 1636 | 35–39,10–33 | A base de cálculo do IBS e da CBS na importação de bens materiais é o valor aduaneiro acrescido de: | _(preencher)_ | — | ⬜ Pendente |
| Art.73 | 1697 | 10–33 | É responsável pelo IBS e pela CBS na importação de bens materiais, em substituição ao contribuinte: | _(preencher)_ | — | ⬜ Pendente |
| Art.82 | 1872 | 10–33 | Poderá ser suspenso o pagamento do IBS e da CBS no fornecimento de bens materiais com o fim específico de exportação a empresa comercial exportadora que atenda cumulativamente aos seguintes requisitos… | _(preencher)_ | — | ⬜ Pendente |
| Art.83 | 1938 | 35–39,10–33 | A habilitação a que se refere o § 1º do art. 82 desta Lei Complementar poderá ser cancelada nas seguintes hipóteses: | _(preencher)_ | — | ⬜ Pendente |
| Art.89 | 2017 | 35–39,10–33 | No caso de bens admitidos temporariamente no País para utilização econômica, a suspensão do pagamento do IBS e da CBS será parcial, devendo ser pagos o IBS e a CBS proporcionalmente ao tempo de perman… | _(preencher)_ | — | ⬜ Pendente |
| Art.90 | 2054 | 10–33 | Fica suspenso o pagamento do IBS e da CBS incidentes na importação enquanto os bens materiais estiverem submetidos a regime aduaneiro especial de aperfeiçoamento, observada a disciplina estabelecida n… | _(preencher)_ | — | ⬜ Pendente |
| Art.92 | 2080 | 35–39,10–33 | No caso de os bens nacionais ou nacionalizados saírem, temporariamente, do País para operação de transformação, elaboração, beneficiamento ou montagem ou, ainda, para processo de conserto, reparo ou r… | _(preencher)_ | — | ⬜ Pendente |
| Art.93 | 2113 | 10–33 | Observada a disciplina estabelecida na legislação aduaneira, fica suspenso o pagamento do IBS e da CBS nas seguintes operações: | _(preencher)_ | — | ⬜ Pendente |
| Art.97 | 2175 | 35–39,10–33 | Nas hipóteses dos arts. 95 e 96 desta Lei Complementar, o destinatário de remessa internacional, ainda que não seja o importador, é solidariamente responsável pelo pagamento do IBS e da CBS relativos … | _(preencher)_ | — | ⬜ Pendente |
| Art.98 | 2189 | 35–39,10–33 | Considera-se exportação o fornecimento de combustível ou lubrificante para abastecimento de aeronaves em tráfego internacional e com destino ao exterior. | _(preencher)_ | — | ⬜ Pendente |
| Art.100 | 2232 | 35–39,10–33 | As importações ou as aquisições no mercado interno de matérias-primas, de produtos intermediários e de materiais de embalagem realizadas por empresa autorizada a operar em zonas de processamento de ex… | _(preencher)_ | — | ⬜ Pendente |
| Art.101 | 2248 | 10–33 | Os produtos industrializados ou adquiridos para industrialização por empresa autorizada a operar em zonas de processamento de exportação poderão ser vendidos para o mercado interno, desde que a pessoa… | _(preencher)_ | — | ⬜ Pendente |
| Art.118 | 2558 | 35–39,10–33 | O percentual a ser aplicado nos termos do art. 117 desta Lei Complementar será de: | _(preencher)_ | — | ⬜ Pendente |
| Art.140 | 2991 | 10–33 | Ficam reduzidas em 60% (sessenta por cento) as alíquotas do IBS e da CBS incidentes sobre o fornecimento dos seguintes serviços de comunicação institucional à administração pública direta, autarquias … | _(preencher)_ | — | ⬜ Pendente |
| Art.149 | 3170, 3187 | 35–39,10–33 | Ficam reduzidas a zero as alíquotas do IBS e da CBS incidentes sobre a venda de automóveis de passageiros de fabricação nacional de, no mínimo, 4 (quatro) portas, inclusive a de acesso ao bagageiro, q… | _(preencher)_ | — | ⬜ Pendente |
| Art.172 | 3644 | 35–39,10–33 | O IBS e a CBS incidirão uma única vez sobre as operações, ainda que iniciadas no exterior, com os seguintes combustíveis, qualquer que seja a sua finalidade: | _(preencher)_ | — | ⬜ Pendente |
| Art.173 | 3658 | 35–39,10–33 | A base de cálculo do IBS e da CBS será a quantidade de combustível objeto da operação. | _(preencher)_ | — | ⬜ Pendente |
| Art.174 | 3676, 3710, 3745 | 10–33 | As alíquotas do IBS e da CBS para os combustíveis de que trata o art. 172 desta Lei Complementar serão: | _(preencher)_ | — | ⬜ Pendente |
| Art.175 | 3763 | 35–39,10–33 | Fica assegurada aos biocombustíveis e ao hidrogênio de baixa emissão de carbono tributação inferior à incidente sobre os combustíveis fósseis, de forma a garantir o diferencial competitivo estabelecid… | _(preencher)_ | — | ⬜ Pendente |
| Art.176 | 3797 | 35–39,10–33 | São contribuintes do regime específico de IBS e de CBS de que trata este Capítulo: | _(preencher)_ | — | ⬜ Pendente |
| Art.177 | 3817 | 35–39,10–33 | Nas operações realizadas diretamente com os contribuintes de que trata o art. 176 desta Lei Complementar, o adquirente fica solidariamente responsável pelo pagamento do IBS e da CBS incidentes na oper… | _(preencher)_ | — | ⬜ Pendente |
| Art.178 | 3828 | 35–39,10–33 | Fica atribuída à refinaria de petróleo ou suas bases, à CPQ, ao formulador de combustíveis e ao importador, relativamente ao percentual de biocombustível utilizado na mistura, nas operações com gasoli… | _(preencher)_ | — | ⬜ Pendente |
| Art.266 | 5432 | 10–33 | Ficam estabelecidos os seguintes prazos de inscrição de todos os bens imóveis no CIB: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.317 | 6189 | 10–33 | Compete: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.403 | 7886 | 10–33 | A RFB especificará sistema eletrônico próprio para o processamento e tratamento das informações, atos e procedimentos descritos nesta Lei Complementar, devendo ser reservados recursos específicos em o… | _(preencher)_ | — | ⬜ Pendente |
| Art.413 | 8132 | 35–39,10–33 | O Imposto Seletivo não incide sobre: | _(preencher)_ | — | ⬜ Pendente |
| Art.423 | 8324 | 35–39,10–33 | Caso o gás natural seja destinado à utilização como insumo em processo industrial e como combustível para fins de transporte, a alíquota estabelecida na forma do § 2º do art. 422 desta Lei Complementa… | _(preencher)_ | — | ⬜ Pendente |
| Art.425 | 8363 | 10–33 | São obrigados ao pagamento do Imposto Seletivo como responsáveis, sem prejuízo das demais hipóteses previstas em lei e da aplicação da pena de perdimento: | _(preencher)_ | — | ⬜ Pendente |
| Art.429 | 8430 | 10–33 | Ressalvado o caso de exportação, o tabaco em folhas tratadas, total ou parcialmente destaladas, aparadas ou não, mesmo cortadas em forma regular ou picadas, somente será vendido ou remetido a empresa … | _(preencher)_ | — | ⬜ Pendente |
| Art.442 | 8604 | 10–33 | Nos termos definidos em regulamento, é condição para habilitação aos incentivos fiscais da Zona Franca de Manaus: | _(preencher)_ | — | ⬜ Pendente |
| Art.474 | 9178 | 10–33 | Durante o período compreendido entre 2027 e 2032, os percentuais para incidência ou creditamento de IBS e de CBS previstos nos arts. 447, § 1º, 449, § 1º, e 465, § 1º, desta Lei Complementar serão red… | _(preencher)_ | — | ⬜ Pendente |
| Art.481 | 9365, 9381, 9399, 9410 | 10–33 | O Conselho Superior do CGIBS, instância máxima de deliberação do CGIBS, tem a seguinte composição: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.482 | 9429 | 10–33 | Os membros do Conselho Superior do CGIBS serão escolhidos dentre cidadãos de reputação ilibada e de notório conhecimento em administração tributária, observado o seguinte: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.492 | 9676 | 10–33 | Para efeito do disposto nesta Lei Complementar: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.493 | 9686 | 10–33 | As referências feitas nesta Lei Complementar à taxa SELIC, à taxa DI, ao IPCA e a outros índices ou taxas são aplicáveis aos respectivos índices e taxas que venham a substituí-los. Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.496 | 9696 | 10–33 | A Lei nº 5.172, de 25 de outubro de 1966 - Código Tributário Nacional, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 9º […alteração de outra lei — texto no corpo alterado] […a… | _(preencher)_ | — | ⬜ Pendente |
| Art.497 | 9720 | 10–33 | O Decreto-Lei nº 37, de 18 de novembro de 1966, passa a vigorar com a seguinte redação: Produção de efeitos “Art. 44 […alteração de outra lei — texto no corpo alterado] | _(preencher)_ | — | ⬜ Pendente |
| Art.498 | 9742 | 10–33 | A Lei nº 10.931, de 2 de agosto de 2004, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 3º O terreno e as acessões objeto da incorporação imobiliária sujeitas ao regime especia… | _(preencher)_ | — | ⬜ Pendente |
| Art.499 | 9767 | 10–33 | A Lei nº 7.998, de 11 de janeiro de 1990, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 11. […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — text… | _(preencher)_ | — | ⬜ Pendente |
| Art.500 | 9789 | 10–33 | A Lei nº 8.019, de 11 de abril de 1990, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 1º A arrecadação correspondente a 18% (dezoito por cento) da Contribuição Social sobre Be… | _(preencher)_ | — | ⬜ Pendente |
| Art.501 | 9824 | 10–33 | A Lei Complementar nº 87, de 13 de setembro de 1996, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 31-A. Em relação aos fatos geradores ocorridos de 1º de janeiro de 2029 a 31… | _(preencher)_ | — | ⬜ Pendente |
| Art.502 | 9865 | 10–33 | A Lei nº 9.430, de 27 de dezembro de 1996, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 64. Os pagamentos efetuados por órgãos, autarquias e fundações da administração públic… | _(preencher)_ | — | ⬜ Pendente |
| Art.503 | 9887 | 10–33 | A Lei nº 9.432, de 8 de janeiro de 1997, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 11. […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — texto… | _(preencher)_ | — | ⬜ Pendente |
| Art.504 | 9909 | 10–33 | A Lei nº 9.718, de 27 de novembro de 1998, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 9º As variações monetárias dos direitos de crédito e das obrigações do contribuinte, e… | _(preencher)_ | — | ⬜ Pendente |
| Art.505 | 9930 | 10–33 | A Lei nº 9.779, de 19 de janeiro de 1999, passa a vigorar com a seguinte redação: Produção de efeitos “Art. 11. […alteração de outra lei — texto no corpo alterado] | _(preencher)_ | — | ⬜ Pendente |
| Art.506 | 9951 | 10–33 | A Medida Provisória nº 2.158-35, de 24 de agosto de 2001, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 30. A partir de 1º de janeiro de 2000, as variações monetárias dos dire… | _(preencher)_ | — | ⬜ Pendente |
| Art.507 | 9973 | 10–33 | A Lei nº 10.637, de 30 de dezembro de 2002, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 35. A receita decorrente da avaliação de títulos e valores mobiliários, instrumentos … | _(preencher)_ | — | ⬜ Pendente |
| Art.508 | 9998 | 10–33 | A Lei Complementar nº 116, de 31 de julho de 2003, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 8º-B. Em relação aos fatos geradores ocorridos de 1º de janeiro de 2029 a 31 d… | _(preencher)_ | — | ⬜ Pendente |
| Art.509 | 10030 | 10–33 | A Lei nº 10.833, de 29 de dezembro de 2003, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 23. A incidência da CIDE, nos termos do inciso V do art. 3º da Lei nº 10.336, de 19 d… | _(preencher)_ | — | ⬜ Pendente |
| Art.510 | 10132 | 10–33 | A Lei nº 10.931, de 2 de agosto de 2004, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 4º Para cada incorporação submetida ao regime especial de tributação, a incorporadora fi… | _(preencher)_ | — | ⬜ Pendente |
| Art.511 | 10178 | 10–33 | A Lei nº 11.033, de 21 de dezembro de 2004, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 14. Serão efetuadas com suspensão do Imposto sobre Produtos Industrializados - IPI, e… | _(preencher)_ | — | ⬜ Pendente |
| Art.512 | 10201 | 10–33 | A Lei nº 11.051, de 29 de dezembro de 2004, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 32. Para efeito de determinação da base de cálculo do Imposto sobre a Renda das Pesso… | _(preencher)_ | — | ⬜ Pendente |
| Art.513 | 10224 | 10–33 | A Lei nº 11.079, de 30 de dezembro de 2004, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 6º […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — tex… | _(preencher)_ | — | ⬜ Pendente |
| Art.514 | 10253 | 10–33 | A Lei nº 11.096, de 13 de janeiro de 2005, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 8º […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — text… | _(preencher)_ | — | ⬜ Pendente |
| Art.515 | 10276 | 10–33 | A Lei nº 11.196, de 21 de novembro de 2005, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 11. A importação de bens novos relacionados pelo Poder Executivo destinados ao desenv… | _(preencher)_ | — | ⬜ Pendente |
| Art.516 | 10319 | 10–33 | A Lei Complementar nº 123, de 14 de dezembro de 2006, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 1º […alteração de outra lei — texto no corpo alterado] […alteração de outra… | _(preencher)_ | — | ⬜ Pendente |
| Art.517 | 10512 | 10–33 | A Lei Complementar nº 123, de 14 de dezembro de 2006, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 3º […alteração de outra lei — texto no corpo alterado] […alteração de outra… | _(preencher)_ | — | ⬜ Pendente |
| Art.518 | 10874 | 10–33 | A Lei Complementar nº 123, de 14 de dezembro de 2006, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 3º […alteração de outra lei — texto no corpo alterado] […alteração de outra… | _(preencher)_ | — | ⬜ Pendente |
| Art.519 | 10968 | 10–33 | Os Anexos I a V da Lei Complementar nº 123, de 14 de dezembro de 2006, passam a vigorar com a redação dos Anexos XVIII a XXII desta Lei Complementar. Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.520 | 10978 | 10–33 | A Lei Complementar nº 123, de 14 de dezembro de 2006, passa a vigorar acrescida do Anexo VII constante do Anexo XXIII desta Lei Complementar. Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.521 | 10988 | 10–33 | A Lei nº 11.488, de 15 de junho de 2007, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 38. É concedida isenção do Imposto de Importação, do Imposto sobre Produtos Industrializ… | _(preencher)_ | — | ⬜ Pendente |
| Art.522 | 11009 | 10–33 | A Lei nº 11.508, de 20 de julho de 2007, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 6º-A. […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — tex… | _(preencher)_ | — | ⬜ Pendente |
| Art.523 | 11051 | 10–33 | A Lei nº 11.898, de 8 de janeiro de 2009, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 10. Os impostos e contribuições federais devidos pelo optante pelo Regime de que trata … | _(preencher)_ | — | ⬜ Pendente |
| Art.524 | 11074 | 10–33 | A Lei nº 11.945, de 4 de junho de 2009, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 12. A aquisição no mercado interno ou a importação, de forma combinada ou não, de mercado… | _(preencher)_ | — | ⬜ Pendente |
| Art.525 | 11096 | 10–33 | A Lei nº 12.249, de 11 de junho de 2010, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 30. […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — texto… | _(preencher)_ | — | ⬜ Pendente |
| Art.526 | 11134 | 10–33 | A Lei nº 12.350, de 20 de dezembro de 2010, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 30. As subvenções governamentais de que tratam o art. 19 da Lei nº 10.973, de 2 de de… | _(preencher)_ | — | ⬜ Pendente |
| Art.527 | 11172 | 10–33 | A Lei nº 12.431, de 24 de junho de 2011, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 16-E. […alteração de outra lei — texto no corpo alterado] | _(preencher)_ | — | ⬜ Pendente |
| Art.528 | 11194 | 10–33 | A Lei nº 12.598, de 21 de março de 2012, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 9º […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — texto … | _(preencher)_ | — | ⬜ Pendente |
| Art.529 | 11218 | 10–33 | A Lei nº 12.599, de 23 de março de 2012, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 14. […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — texto… | _(preencher)_ | — | ⬜ Pendente |
| Art.530 | 11242 | 10–33 | A Lei nº 12.715, de 17 de setembro de 2012, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 18. […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — te… | _(preencher)_ | — | ⬜ Pendente |
| Art.531 | 11293 | 10–33 | A Lei nº 13.097, de 19 de janeiro de 2015, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 14. Observado o disposto nesta Lei, serão exigidos na forma da legislação aplicável à … | _(preencher)_ | — | ⬜ Pendente |
| Art.532 | 11328 | 10–33 | A Lei nº 13.586, de 28 de dezembro de 2017, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 6º […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — tex… | _(preencher)_ | — | ⬜ Pendente |
| Art.533 | 11355 | 10–33 | A Lei nº 14.148, de 3 de maio de 2021, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 4º […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — texto no… | _(preencher)_ | — | ⬜ Pendente |
| Art.534 | 11378 | 10–33 | A Lei nº 14.789, de 29 de dezembro de 2023, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 11. O valor do crédito fiscal não será computado na base de cálculo do IRPJ e da CSLL… | _(preencher)_ | — | ⬜ Pendente |
| Art.535 | 11409 | 10–33 | A Lei Complementar nº 101, de 4 de maio de 2000, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 2º […alteração de outra lei — texto no corpo alterado] […alteração de outra lei … | _(preencher)_ | — | ⬜ Pendente |
| Art.537 | 11434 | 10–33 | A Lei nº 9.718, de 27 de novembro de 1998, passa a vigorar com as seguintes alterações: Produção de efeitos “Art. 5º A Contribuição para o PIS/Pasep e a Cofins incidentes sobre a receita bruta auferid… | _(preencher)_ | — | ⬜ Pendente |
| Art.538 | 11474 | 10–33 | A Lei nº 10.637, de 30 de dezembro de 2002, passa a vigorar com a seguinte redação: Produção de efeitos “Art. 2º […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — texto no… | _(preencher)_ | — | ⬜ Pendente |
| Art.539 | 11497 | 10–33 | A Lei nº 10.833, de 29 de dezembro de 2003, passa a vigorar com a seguinte redação: Produção de efeitos “Art. 2º […alteração de outra lei — texto no corpo alterado] […alteração de outra lei — texto no… | _(preencher)_ | — | ⬜ Pendente |
| Art.540 | 11526 | 10–33 | Ficam revogados os seguintes dispositivos do art. 5º da Lei nº 9.718, de 27 de dezembro de 1998: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.541 | 11535 | 10–33 | Fica revogado, a partir de 1º de janeiro de 2025, o inciso VII do § 1º do art. 13 da Lei Complementar nº 123, de 2006. Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.542 | 11560, 11587, 11612, 11647, 11671 | 10–33 | Ficam revogados a partir de 1º de janeiro de 2027: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.543 | 11704 | 10–33 | Ficam revogados a partir de 1º de janeiro de 2033: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.544 | 11715, 11783, 11912, 12400, 12929, 12956, 12983, 13012, 13049, 13082, 13127, 13172, 13209, 13297 | 10–33 | Esta Lei Complementar entra em vigor na data de sua publicação, produzindo efeitos: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |

### LC 224 + LC 227 — 12 artigos (13 chunks) · ⚠️ texto do **corpus derivado** (fonte primária ausente do acervo v3)

| Artigo | Lei | Linhas corpus | Faixa atual | Texto legal (corpus derivado — confirmar) | Setor regulado | cnaeGroups proposto | Validado por |
|---|---|---|---|---|---|---|---|
| Art.4 | lc224 | 13447, 13478 | 10–33 | Art. 4º Os incentivos e benefícios federais de natureza tributária são reduzidos na forma deste artigo. Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.7 | lc224 | 13566 | 10–33 | Art. 7º O art. 3º da Lei nº 7.689, de 15 de dezembro de 1988, passa a vigorar com a seguinte redação: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.9 | lc224 | 13621 | 10–33 | Art. 9º O art. 30 da Lei nº 13.756, de 12 de dezembro de 2018, passa a vigorar com a seguinte redação: Produção de efeitos | _(preencher)_ | — | ⬜ Pendente |
| Art.106 | lc227 | 18967 | 10–33 | Art. 106. […alteração de outra lei — texto no corpo alterado] | _(preencher)_ | — | ⬜ Pendente |
| Art.11 | lc227 | 18369 | 35–39,10–33 | II - o local do estabelecimento principal do adquirente, definido nos termos do § 4º deste artigo, | _(preencher)_ | — | ⬜ Pendente |
| Art.12 | lc227 | 18388 | 35–39,10–33 | Art. 12. […alteração de outra lei — texto no corpo alterado] | _(preencher)_ | — | ⬜ Pendente |
| Art.169 | lc227 | 17864 | 10–33 | Art. 169. A Lei Complementar nº 123, de 14 de dezembro de 2006, passa a vigorar com as seguintes alterações: Produção | _(preencher)_ | — | ⬜ Pendente |
| Art.172 | lc227 | 19152 | 35–39,10–33 | Art. 172. […alteração de outra lei — texto no corpo alterado] | _(preencher)_ | — | ⬜ Pendente |
| Art.179 | lc227 | 21588 | 10–33 | Art. 179. O aumento da receita decorrente da alteração do art. 172 da Lei Complementar nº 214, de 16 de janeiro de 2025, | _(preencher)_ | — | ⬜ Pendente |
| Art.2 | lc227 | 21576 | 35–39,10–33 | Art. 2º […alteração de outra lei — texto no corpo alterado] | _(preencher)_ | — | ⬜ Pendente |
| Art.440 | lc227 | 20517 | 10–33 | Art. 440. […alteração de outra lei — texto no corpo alterado] | _(preencher)_ | — | ⬜ Pendente |
| Art.442 | lc227 | 20535 | 10–33 | Art. 442. […alteração de outra lei — texto no corpo alterado] | _(preencher)_ | — | ⬜ Pendente |

## Vinculadas

- Lição #131 · #132 · **#133** (cnaeGroups é camada interpretativa) · #126 (fonte primária) · REGRA-ORQ-45/46 · REGRA-ORQ-33 (gate jurídico)
- `docs/governance/corpus-audit-checklist.md` · CORPUS-FIX-01 #1466 · CORPUS-FIX-02 #1467
- Fonte primária LC214: `0-RAG/0-acervo-v3-06mai26/0-Acervo/JSON/lc214.json` · Corpus derivado: `server/rag-corpus-lcs-novas.ts` · LC224/227 primária: **pendente carga no acervo**
