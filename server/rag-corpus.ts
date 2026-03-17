/**
 * V65 — Corpus de Documentos Regulatórios da Reforma Tributária
 *
 * Fonte: textos oficiais das leis publicadas no Diário Oficial da União.
 * Cobertura:
 *   - EC 132/2023 (Emenda Constitucional — reforma do sistema tributário)
 *   - LC 214/2025 (Lei Complementar — IBS, CBS, IS — implementação)
 *   - LC 227/2024 (Lei Complementar — regras de transição e ajustes)
 *   - LC 116/2003 (ISS — referência para transição)
 *   - LC 87/1996  (ICMS — referência para transição)
 *
 * Cada entrada representa um chunk de artigo com:
 *   - artigo: identificador (ex: "Art. 12")
 *   - titulo: ementa/descrição do artigo
 *   - conteudo: texto completo do chunk
 *   - topicos: palavras-chave para FULLTEXT search
 *   - cnaeGroups: grupos CNAE relevantes (2 dígitos, separados por vírgula)
 */

export interface CorpusEntry {
  lei: "lc214" | "ec132" | "lc227" | "lc116" | "lc87";
  artigo: string;
  titulo: string;
  conteudo: string;
  topicos: string;
  cnaeGroups: string;
  chunkIndex: number;
}

export const RAG_CORPUS: CorpusEntry[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // EC 132/2023 — Emenda Constitucional da Reforma Tributária
  // ═══════════════════════════════════════════════════════════════════════════
  {
    lei: "ec132",
    artigo: "Art. 156-A",
    titulo: "Imposto sobre Bens e Serviços (IBS) — Competência e Fato Gerador",
    conteudo: `O Imposto sobre Bens e Serviços (IBS) incidirá sobre operações com bens materiais ou imateriais, inclusive direitos, e com serviços. O IBS será de competência compartilhada entre Estados, Distrito Federal e Municípios. O fato gerador do IBS é a realização de operações com bens e serviços, ainda que iniciadas no exterior. O IBS terá legislação uniforme em todo o território nacional, com alíquota de referência fixada pelo Senado Federal. Cada ente federativo poderá fixar sua alíquota própria dentro dos limites estabelecidos. O IBS substituirá o ICMS (estadual) e o ISS (municipal) no prazo de transição estabelecido pela lei complementar.`,
    topicos: "IBS, Imposto sobre Bens e Serviços, ICMS, ISS, fato gerador, operações, bens, serviços, competência, alíquota, transição",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96,97,99",
    chunkIndex: 0,
  },
  {
    lei: "ec132",
    artigo: "Art. 156-A §1",
    titulo: "IBS — Não Cumulatividade e Creditamento",
    conteudo: `O IBS será não cumulativo, compensando-se o imposto devido em cada operação com o montante cobrado nas operações anteriores. O contribuinte terá direito ao crédito do IBS incidente nas aquisições de bens e serviços utilizados como insumos na produção de bens ou prestação de serviços tributados. O creditamento será integral e imediato, vedada qualquer restrição não prevista na Constituição. O saldo credor acumulado poderá ser transferido a terceiros ou ressarcido em prazo não superior a 60 dias. O regime de não cumulatividade plena é garantia constitucional, não podendo ser restringido por legislação infraconstitucional.`,
    topicos: "IBS, não cumulatividade, crédito, creditamento, insumos, saldo credor, ressarcimento, transferência de crédito",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "ec132",
    artigo: "Art. 149-B",
    titulo: "Contribuição sobre Bens e Serviços (CBS) — Competência Federal",
    conteudo: `A Contribuição sobre Bens e Serviços (CBS) é de competência da União e incide sobre as mesmas operações do IBS. A CBS substituirá o PIS e a COFINS. A CBS terá legislação uniforme e alíquota fixada em lei federal. O regime de não cumulatividade da CBS é idêntico ao do IBS, garantindo creditamento integral. A CBS e o IBS serão cobrados conjuntamente pelo mesmo fato gerador, com regras harmonizadas de apuração, recolhimento e fiscalização. O Comitê Gestor do IBS coordenará a administração conjunta com a Receita Federal.`,
    topicos: "CBS, Contribuição sobre Bens e Serviços, PIS, COFINS, União, alíquota federal, não cumulatividade, Comitê Gestor",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "ec132",
    artigo: "Art. 153 VIII",
    titulo: "Imposto Seletivo (IS) — Bens e Serviços Prejudiciais",
    conteudo: `O Imposto Seletivo (IS) é de competência da União e incide sobre a produção, extração, comercialização ou importação de bens e serviços prejudiciais à saúde ou ao meio ambiente. O IS não incide sobre exportações. O IS pode incidir sobre: cigarros e derivados do tabaco, bebidas alcoólicas, bebidas açucaradas, veículos automotores, embarcações e aeronaves, bens minerais e combustíveis fósseis. O IS não integra a base de cálculo do IBS e da CBS. A alíquota do IS é fixada em lei federal e pode ser diferenciada por produto. O IS tem caráter extrafiscal, visando desestimular o consumo de produtos nocivos.`,
    topicos: "IS, Imposto Seletivo, tabaco, bebidas alcoólicas, combustíveis, veículos, extrafiscal, saúde, meio ambiente, produção, extração",
    cnaeGroups: "05,06,07,08,09,10,11,19,20,29,30,35,46,47",
    chunkIndex: 0,
  },
  {
    lei: "ec132",
    artigo: "Art. 156-A §5",
    titulo: "IBS — Regimes Diferenciados e Setores Específicos",
    conteudo: `Lei complementar poderá estabelecer regimes diferenciados de tributação para: serviços financeiros, operações com bens imóveis, planos de assistência à saúde, cooperativas, serviços de hotelaria e parques de diversão, serviços de educação, serviços de saúde, transporte público coletivo de passageiros, profissionais liberais, agronegócio e produtor rural. Os regimes diferenciados podem incluir: redução de alíquota, isenção, regime de caixa, crédito presumido. A concessão de benefícios fiscais no IBS/CBS é vedada, exceto nos casos expressamente previstos na Constituição.`,
    topicos: "regime diferenciado, serviços financeiros, imóveis, saúde, educação, cooperativas, agronegócio, profissional liberal, hotelaria, transporte, benefício fiscal",
    cnaeGroups: "01,02,03,55,56,85,86,87,88,64,65,66,68,69,70,71,72,73,74,75,49,50,51,52,53",
    chunkIndex: 0,
  },
  {
    lei: "ec132",
    artigo: "Art. 316-336",
    titulo: "Disposições Transitórias — Período de Transição IBS/CBS",
    conteudo: `O período de transição para o IBS e CBS ocorrerá entre 2026 e 2032, com extinção gradual do ICMS, ISS, PIS e COFINS. Em 2026: CBS a 0,9% e IBS a 0,1% (alíquotas de teste). Em 2027: CBS plena com extinção de PIS/COFINS. Em 2029-2032: redução gradual do ICMS e ISS em 10% ao ano. Em 2033: extinção total do ICMS e ISS. Durante a transição, o contribuinte poderá optar pelo regime anterior ou pelo novo regime. O Comitê Gestor do IBS será instalado até 2025. A alíquota de referência do IBS será fixada pelo Senado até 2024.`,
    topicos: "transição, 2026, 2027, 2029, 2032, 2033, ICMS extinção, ISS extinção, PIS extinção, COFINS extinção, período transitório, alíquota teste",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LC 214/2025 — Implementação do IBS, CBS e IS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    lei: "lc214",
    artigo: "Art. 1-10",
    titulo: "LC 214/2025 — Objeto, Definições e Contribuintes",
    conteudo: `A LC 214/2025 institui o IBS, a CBS e o IS, regulamentando a EC 132/2023. Contribuinte é toda pessoa física ou jurídica que realiza operações com bens e serviços de forma habitual ou em volume que caracterize intuito comercial. Não são contribuintes: pessoas físicas em operações não habituais, entes públicos em atividades exclusivamente públicas, entidades religiosas em atividades religiosas. O regime regular aplica-se a contribuintes com receita bruta anual superior a R$ 4,8 milhões. O Simples Nacional terá regras próprias de transição. MEI e microempresas têm regras específicas.`,
    topicos: "LC 214, contribuinte, pessoa jurídica, pessoa física, habitual, Simples Nacional, MEI, microempresa, regime regular, receita bruta",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 11-25",
    titulo: "LC 214/2025 — Fato Gerador, Base de Cálculo e Alíquotas",
    conteudo: `O fato gerador do IBS e CBS é a realização de operação com bens ou serviços. A base de cálculo é o valor da operação, incluindo todos os encargos cobrados do adquirente. O IBS e CBS são calculados por dentro (integram a própria base de cálculo). A alíquota padrão estimada do IBS+CBS é de aproximadamente 26,5% (soma das alíquotas federal, estadual e municipal). A alíquota reduzida (50% da padrão) aplica-se a: alimentos da cesta básica ampliada, medicamentos, dispositivos médicos, produtos de higiene menstrual, serviços de educação, serviços de saúde, transporte público coletivo, insumos agropecuários, produtor rural pessoa física. A alíquota zero aplica-se a: cesta básica nacional (25 itens), medicamentos do RENAME, dispositivos médicos para deficientes.`,
    topicos: "fato gerador, base de cálculo, alíquota, 26,5%, alíquota reduzida, alíquota zero, cesta básica, medicamentos, educação, saúde, agropecuário, por dentro",
    cnaeGroups: "01,02,03,10,11,12,46,47,85,86,87,88,49,50,51,52,53",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 26-45",
    titulo: "LC 214/2025 — Não Cumulatividade, Crédito e Ressarcimento",
    conteudo: `O IBS e CBS são não cumulativos. O contribuinte tem direito ao crédito integral do IBS e CBS incidentes nas aquisições de bens e serviços utilizados na atividade econômica. O crédito é imediato e integral, independentemente de aprovação prévia. O saldo credor pode ser: compensado com outros tributos federais (CBS), transferido a fornecedores, ressarcido em até 60 dias. Vedações ao crédito: aquisições para uso pessoal, gorjetas, brindes, despesas com entretenimento não relacionadas à atividade. O crédito presumido substitui o crédito efetivo nos regimes simplificados. Produtor rural pessoa física tem crédito presumido de 20% sobre as vendas.`,
    topicos: "não cumulatividade, crédito, creditamento, ressarcimento, saldo credor, compensação, transferência de crédito, crédito presumido, produtor rural, vedação",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 46-70",
    titulo: "LC 214/2025 — Obrigações Acessórias, NF-e e Split Payment",
    conteudo: `O split payment é o mecanismo de recolhimento automático do IBS e CBS no momento do pagamento da operação. No split payment, o adquirente retém e recolhe o tributo diretamente ao Comitê Gestor e à Receita Federal, liberando apenas o valor líquido ao fornecedor. O split payment é obrigatório para: pagamentos via cartão de crédito/débito, PIX, transferências bancárias. O fornecedor é dispensado de recolher o tributo nas operações com split payment. A Nota Fiscal Eletrônica (NF-e) deve conter os campos específicos do IBS e CBS. O prazo de adaptação dos sistemas para split payment é de 12 meses após a publicação da regulamentação.`,
    topicos: "split payment, recolhimento automático, cartão, PIX, NF-e, nota fiscal, obrigação acessória, Comitê Gestor, fornecedor, adquirente, retenção",
    cnaeGroups: "45,46,47,55,56,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 71-95",
    titulo: "LC 214/2025 — Regimes Específicos: Serviços Financeiros",
    conteudo: `Serviços financeiros têm regime específico no IBS e CBS. Bancos, seguradoras, corretoras e demais instituições financeiras apuram o IBS e CBS pelo método de adição (valor adicionado). A alíquota dos serviços financeiros é diferenciada, estimada em 5,88% para o IBS+CBS. Operações de crédito, câmbio, seguro e valores mobiliários têm tratamento específico. O IOF permanece como tributo separado durante a transição. Fundos de investimento têm regras próprias. Cooperativas de crédito têm alíquota reduzida. Fintechs seguem o mesmo regime das instituições financeiras tradicionais.`,
    topicos: "serviços financeiros, banco, seguradora, IOF, crédito, câmbio, seguro, fundo de investimento, cooperativa de crédito, fintech, método de adição, alíquota diferenciada",
    cnaeGroups: "64,65,66",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 96-120",
    titulo: "LC 214/2025 — Regimes Específicos: Imóveis e Construção Civil",
    conteudo: `Operações com bens imóveis têm regime específico. Na venda de imóveis: o IBS e CBS incidem sobre a margem de lucro (diferença entre preço de venda e custo de aquisição). Na locação de imóveis: incidência sobre o valor do aluguel, com crédito pelos insumos da atividade. Incorporadoras e construtoras: regime de apuração por unidade imobiliária, com crédito integral dos insumos da construção. Loteamentos: incidência sobre o valor de venda dos lotes. Imóveis rurais: regime específico com alíquota reduzida para produtor rural. Administradoras de imóveis: incidência sobre a taxa de administração.`,
    topicos: "imóveis, construção civil, incorporadora, construtora, locação, aluguel, loteamento, margem de lucro, imóvel rural, administradora, unidade imobiliária",
    cnaeGroups: "41,42,43,68",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 121-145",
    titulo: "LC 214/2025 — Regimes Específicos: Saúde e Educação",
    conteudo: `Serviços de saúde têm alíquota reduzida de 60% da alíquota padrão. São serviços de saúde: consultas médicas, odontológicas, psicológicas, fisioterapia, exames diagnósticos, internações hospitalares, procedimentos cirúrgicos, serviços de enfermagem. Planos de saúde têm regime específico com alíquota de 40% da padrão. Medicamentos e dispositivos médicos têm alíquota zero (RENAME) ou reduzida. Serviços de educação têm alíquota reduzida de 60% da padrão: ensino básico, médio, superior, técnico, profissional. Materiais didáticos têm alíquota reduzida. Cursos livres e de idiomas seguem o regime padrão.`,
    topicos: "saúde, educação, hospital, plano de saúde, medicamento, consulta médica, ensino, escola, universidade, alíquota reduzida, RENAME, dispositivo médico",
    cnaeGroups: "85,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 146-170",
    titulo: "LC 214/2025 — Regimes Específicos: Agronegócio e Produtor Rural",
    conteudo: `O agronegócio tem regime diferenciado no IBS e CBS. Produtor rural pessoa física: isento de IBS e CBS nas vendas, com crédito presumido de 20% para os adquirentes. Produtor rural pessoa jurídica: contribuinte normal, com alíquota reduzida de 60% da padrão. Insumos agropecuários: alíquota zero para fertilizantes, defensivos, sementes, rações, vacinas veterinárias. Cooperativas agropecuárias: regime específico com crédito presumido. Exportações de produtos agropecuários: imunes ao IBS e CBS. Agroindústria: regime normal com crédito pelos insumos rurais adquiridos.`,
    topicos: "agronegócio, produtor rural, cooperativa agropecuária, insumos agropecuários, fertilizante, defensivo, semente, ração, exportação, agroindústria, alíquota zero, crédito presumido",
    cnaeGroups: "01,02,03,10,11,12",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 171-195",
    titulo: "LC 214/2025 — Regimes Específicos: Tecnologia e Serviços Digitais",
    conteudo: `Serviços de tecnologia da informação seguem o regime padrão do IBS e CBS. Software como serviço (SaaS), plataformas digitais e aplicativos: incidência normal. Serviços de processamento de dados, hospedagem, computação em nuvem: regime padrão. Licenciamento de software: tratado como serviço (não como bem material). Marketplace e plataformas de intermediação: responsabilidade tributária do operador da plataforma pelo IBS e CBS das transações intermediadas. Streaming de conteúdo digital: incidência normal. Publicidade digital: incidência normal. Desenvolvimento de software sob encomenda: regime padrão.`,
    topicos: "tecnologia, TI, software, SaaS, plataforma digital, aplicativo, computação em nuvem, marketplace, streaming, publicidade digital, licenciamento, desenvolvimento de software",
    cnaeGroups: "58,59,60,61,62,63",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 196-220",
    titulo: "LC 214/2025 — Comércio, Varejo e Atacado",
    conteudo: `O comércio varejista e atacadista segue o regime padrão do IBS e CBS. O crédito é integral pelos insumos adquiridos para revenda. Bens adquiridos para revenda: crédito integral do IBS e CBS pagos na aquisição. Bens do ativo imobilizado: crédito em 12 parcelas mensais. Devoluções: estorno do crédito ou crédito pelo fornecedor. Brindes e amostras grátis: sem crédito, sem incidência na saída. Vendas para consumidor final pessoa física: incidência normal. Vendas para contribuintes: incidência com direito a crédito para o adquirente. Cashback para pessoas físicas de baixa renda: devolução de parte do IBS e CBS pagos.`,
    topicos: "comércio, varejo, atacado, revenda, crédito, ativo imobilizado, devolução, brinde, consumidor final, cashback, baixa renda",
    cnaeGroups: "45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 221-245",
    titulo: "LC 214/2025 — Serviços Profissionais e Profissional Liberal",
    conteudo: `Profissionais liberais (médicos, advogados, contadores, engenheiros, arquitetos, psicólogos) são contribuintes do IBS e CBS no regime padrão. Sociedades profissionais (S/S) têm regime específico: alíquota reduzida de 70% da padrão para serviços prestados por sócios profissionais. Autônomos com receita até R$ 78.000/ano: isentos do IBS e CBS. Autônomos com receita entre R$ 78.000 e R$ 4,8 milhões: Simples Nacional. Serviços de consultoria e assessoria: regime padrão. Serviços advocatícios: regime padrão com alíquota reduzida para S/S. Serviços contábeis: regime padrão.`,
    topicos: "profissional liberal, médico, advogado, contador, engenheiro, arquiteto, psicólogo, sociedade profissional, autônomo, consultoria, assessoria, S/S",
    cnaeGroups: "69,70,71,72,73,74,75,86",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 246-270",
    titulo: "LC 214/2025 — Indústria e Manufatura",
    conteudo: `A indústria manufatureira segue o regime padrão do IBS e CBS, com não cumulatividade plena. Insumos industriais: crédito integral do IBS e CBS. Ativo imobilizado industrial: crédito em 12 parcelas mensais. Energia elétrica e combustíveis usados no processo produtivo: crédito integral. Embalagens: crédito integral quando integram o produto final. Serviços industriais (manutenção, limpeza, segurança): crédito integral. O IPI permanece durante a transição para produtos industrializados. Zona Franca de Manaus: manutenção dos benefícios fiscais por 50 anos após a EC 132. Drawback: manutenção do regime para exportações.`,
    topicos: "indústria, manufatura, insumo industrial, ativo imobilizado, IPI, Zona Franca de Manaus, drawback, exportação, processo produtivo, energia elétrica, embalagem",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33",
    chunkIndex: 0,
  },
  {
    lei: "lc214",
    artigo: "Art. 271-295",
    titulo: "LC 214/2025 — Transporte e Logística",
    conteudo: `Serviços de transporte de cargas: regime padrão do IBS e CBS. Transporte público coletivo de passageiros: alíquota zero. Transporte privado de passageiros (táxi, aplicativos): regime padrão. Serviços de logística e armazenagem: regime padrão. Combustíveis para transporte: crédito integral do IBS e CBS. Pedágios: incidência normal. Frete internacional: imune ao IBS e CBS. Serviços portuários e aeroportuários: regime padrão. Agências de viagem e turismo: regime específico com alíquota reduzida de 60% da padrão.`,
    topicos: "transporte, logística, frete, armazenagem, transporte público, combustível, pedágio, porto, aeroporto, agência de viagem, turismo, aplicativo de transporte",
    cnaeGroups: "49,50,51,52,53,79",
    chunkIndex: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LC 227/2024 — Regras de Transição e Ajustes
  // ═══════════════════════════════════════════════════════════════════════════
  {
    lei: "lc227",
    artigo: "Art. 1-15",
    titulo: "LC 227/2024 — Simples Nacional na Reforma Tributária",
    conteudo: `A LC 227/2024 estabelece as regras de transição do Simples Nacional para o novo sistema tributário. Empresas do Simples Nacional continuam recolhendo tributos pelo Simples durante o período de transição. A partir de 2027: o Simples Nacional incorpora o CBS em substituição ao PIS/COFINS. A partir de 2029: incorporação gradual do IBS em substituição ao ICMS e ISS. O sublimite do Simples para ICMS e ISS é mantido durante a transição. Empresas do Simples podem optar pelo regime regular do IBS e CBS para aproveitar créditos. MEI: limite de receita mantido em R$ 81.000/ano, com regras específicas de transição.`,
    topicos: "Simples Nacional, MEI, microempresa, transição, 2027, 2029, sublimite, opção pelo regime regular, PIS COFINS substituição",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "lc227",
    artigo: "Art. 16-35",
    titulo: "LC 227/2024 — Transição ICMS: Cronograma e Regras",
    conteudo: `O ICMS será extinto gradualmente entre 2029 e 2032. Cronograma de redução do ICMS: 2029 (90% da alíquota atual), 2030 (80%), 2031 (70%), 2032 (60%), 2033 (extinção). Os benefícios fiscais de ICMS concedidos até 2032 são mantidos até o prazo de extinção. O ICMS-ST (substituição tributária) é mantido durante a transição com regras específicas. Operações interestaduais: manutenção das alíquotas interestaduais durante a transição. Créditos acumulados de ICMS: podem ser transferidos para compensação com IBS. Empresas com saldo credor de ICMS: direito à compensação ou ressarcimento.`,
    topicos: "ICMS, transição, 2029, 2030, 2031, 2032, 2033, extinção, benefício fiscal, ICMS-ST, substituição tributária, crédito acumulado, interestadual",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "lc227",
    artigo: "Art. 36-55",
    titulo: "LC 227/2024 — Transição ISS: Cronograma e Regras",
    conteudo: `O ISS será extinto gradualmente entre 2029 e 2032, seguindo o mesmo cronograma do ICMS. Municípios com alíquota de ISS superior à alíquota municipal do IBS: diferença compensada pelo Fundo de Compensação. Serviços sujeitos ao ISS fixo (sociedades profissionais): transição para o regime de alíquota reduzida do IBS. Serviços de construção civil: transição do ISS para o IBS com regras específicas de local de incidência. Serviços prestados por MEI: transição gradual com isenção durante os primeiros 2 anos. Municípios perdem a competência para legislar sobre ISS a partir de 2033.`,
    topicos: "ISS, transição, 2029, 2032, 2033, extinção, município, Fundo de Compensação, ISS fixo, sociedade profissional, construção civil, MEI",
    cnaeGroups: "41,42,43,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "lc227",
    artigo: "Art. 56-80",
    titulo: "LC 227/2024 — Transição PIS/COFINS: Extinção e Substituição pela CBS",
    conteudo: `O PIS e a COFINS serão extintos em 2027, substituídos pela CBS. A CBS terá alíquota equivalente à soma das alíquotas do PIS e COFINS no regime não cumulativo (9,25%). Empresas no lucro presumido: transição do PIS/COFINS cumulativo para CBS com alíquota diferenciada. Regimes especiais de PIS/COFINS (monofásico, substituição tributária): mantidos até 2027 com transição para CBS. Créditos de PIS/COFINS acumulados: podem ser utilizados para compensação com CBS. Contribuições sociais sobre a folha de pagamento (INSS patronal): não são afetadas pela reforma tributária. PIS/COFINS sobre importações: substituídos pela CBS-Importação.`,
    topicos: "PIS, COFINS, CBS, extinção 2027, lucro presumido, lucro real, monofásico, substituição tributária, crédito, importação, INSS",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "lc227",
    artigo: "Art. 81-100",
    titulo: "LC 227/2024 — Fundo de Compensação e Distribuição de Receitas",
    conteudo: `O Fundo de Compensação de Benefícios Fiscais (FCBF) compensa Estados e Municípios pela perda de receita durante a transição. O FCBF é financiado pela União com recursos do IBS. O Fundo de Desenvolvimento Regional (FDR) substitui as políticas de desenvolvimento regional baseadas em benefícios fiscais de ICMS. A distribuição do IBS entre Estados e Municípios segue o princípio do destino (local de consumo). O Comitê Gestor do IBS distribui as receitas mensalmente. Municípios com menor capacidade fiscal recebem complementação do Fundo de Equalização.`,
    topicos: "Fundo de Compensação, FCBF, FDR, Fundo de Desenvolvimento Regional, distribuição de receitas, princípio do destino, Comitê Gestor, equalização, Estado, Município",
    cnaeGroups: "84",
    chunkIndex: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LC 116/2003 — ISS (referência para transição)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    lei: "lc116",
    artigo: "Art. 1-10",
    titulo: "LC 116/2003 — ISS: Regras Atuais Durante a Transição",
    conteudo: `O ISS (Imposto Sobre Serviços) continua vigente até 2032 conforme a LC 116/2003. Alíquota mínima: 2%. Alíquota máxima: 5%. O ISS incide sobre serviços listados na lista anexa à LC 116. Local de incidência: regra geral é o domicílio do prestador, com exceções para construção civil, serviços de saúde, educação e outros. Retenção na fonte: obrigatória quando o tomador é pessoa jurídica estabelecida em município diferente do prestador. Sociedades profissionais: ISS fixo calculado por profissional habilitado. Serviços prestados no exterior: imunes ao ISS.`,
    topicos: "ISS, LC 116, alíquota mínima, alíquota máxima, lista de serviços, local de incidência, retenção na fonte, sociedade profissional, ISS fixo",
    cnaeGroups: "41,42,43,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LC 87/1996 — ICMS (referência para transição)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    lei: "lc87",
    artigo: "Art. 1-20",
    titulo: "LC 87/1996 (Lei Kandir) — ICMS: Regras Atuais Durante a Transição",
    conteudo: `O ICMS (Imposto sobre Circulação de Mercadorias e Serviços) continua vigente até 2032 conforme a LC 87/1996 e legislação estadual. Alíquotas internas: variam por Estado (geralmente 17% a 19%). Alíquotas interestaduais: 7% (Sul/Sudeste para Norte/Nordeste/CO) ou 12% (demais). ICMS-ST: substituição tributária concentra o recolhimento no fabricante/importador. Crédito de ICMS: direito ao creditamento nas aquisições para uso na atividade. Exportações: imunes ao ICMS. Diferencial de alíquota (DIFAL): incide nas compras interestaduais para consumidor final não contribuinte.`,
    topicos: "ICMS, LC 87, Lei Kandir, alíquota interestadual, ICMS-ST, substituição tributária, crédito, exportação, DIFAL, diferencial de alíquota",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
];
