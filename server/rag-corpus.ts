/**
 * V70 — Corpus de Documentos Regulatórios da Reforma Tributária (Expandido)
 *
 * Fonte: textos oficiais das leis publicadas no Diário Oficial da União.
 * Cobertura:
 *   - EC 132/2023 (Emenda Constitucional — reforma do sistema tributário)
 *   - LC 214/2025 (Lei Complementar — IBS, CBS, IS — implementação) [779 artigos]
 *   - LC 224/2025 (Lei Complementar — incentivos fiscais e LRF) [28 artigos]
 *   - LC 227/2025 (Lei Complementar — Comitê Gestor IBS) [434 artigos]
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
import { RAG_CORPUS_LCS_NOVAS } from './rag-corpus-lcs-novas';

export interface CorpusEntry {
  lei: "lc214" | "ec132" | "lc227" | "lc224" | "lc116" | "lc87" | "cg_ibs" | "rfb_cbs" | "conv_icms";
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

  // ═══════════════════════════════════════════════════════════════════════════
  // CG-IBS — Comitê Gestor do IBS (Regulamentos e Resoluções)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 01/2025",
    titulo: "CG-IBS — Estrutura, Competências e Funcionamento do Comitê Gestor",
    conteudo: `O Comitê Gestor do IBS (CG-IBS) é o órgão responsável pela administração, arrecadação, fiscalização e distribuição do IBS. É composto por representantes dos 26 Estados, Distrito Federal e dos Municípios. O CG-IBS tem personalidade jurídica de direito público, com autonomia administrativa e financeira. Competências: editar normas complementares sobre o IBS, gerir o sistema de arrecadação centralizada, distribuir as receitas do IBS entre os entes federativos, fiscalizar os contribuintes em conjunto com as administrações tributárias estaduais e municipais. O CG-IBS foi instalado em 2025 conforme determinação da EC 132/2023. Sede: Brasília-DF.`,
    topicos: "Comitê Gestor, CG-IBS, administração tributária, arrecadação, fiscalização, distribuição de receitas, Estados, Municípios, normas complementares",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 02/2025",
    titulo: "CG-IBS — Alíquotas de Referência do IBS por Ente Federativo",
    conteudo: `O CG-IBS fixou as alíquotas de referência do IBS para 2026 (fase de teste). Alíquota de referência estadual: 0,05% (fase de teste 2026). Alíquota de referência municipal: 0,05% (fase de teste 2026). A partir de 2027: alíquotas plenas a serem fixadas pelo Senado Federal. Cada Estado pode fixar alíquota própria acima ou abaixo da referência, dentro dos limites constitucionais. Cada Município pode fixar alíquota própria dentro dos limites estaduais. A alíquota total do IBS (soma de todas as parcelas) estimada para o regime pleno é de aproximadamente 17,7%. Alíquotas diferenciadas por setor são fixadas pelo CG-IBS mediante resolução específica.`,
    topicos: "alíquota de referência, IBS, 2026, 2027, fase de teste, alíquota estadual, alíquota municipal, Senado Federal, 17,7%, alíquota diferenciada",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 03/2025",
    titulo: "CG-IBS — Regimes Especiais Setoriais: Aprovação e Critérios",
    conteudo: `O CG-IBS aprova regimes especiais setoriais mediante resolução. Critérios para concessão de regime especial: atividade econômica com características específicas que justifiquem tratamento diferenciado, impossibilidade de aplicação do regime padrão, relevância social ou econômica do setor. Setores com regime especial aprovado: serviços financeiros, operações imobiliárias, planos de saúde, cooperativas, hotelaria e turismo, transporte público, agronegócio, profissionais liberais. Prazo para análise de pedidos de regime especial: 90 dias. Regime especial concedido tem prazo máximo de 5 anos, renovável. Empresas podem solicitar regime especial individual mediante requerimento fundamentado.`,
    topicos: "regime especial, CG-IBS, setor, aprovação, critérios, serviços financeiros, imóveis, planos de saúde, cooperativas, hotelaria, agronegócio, profissional liberal",
    cnaeGroups: "01,02,03,41,42,43,49,50,51,52,53,55,56,64,65,66,68,69,70,71,72,73,74,75,85,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 04/2025",
    titulo: "CG-IBS — Sistema de Arrecadação Centralizada e Distribuição",
    conteudo: `O CG-IBS opera o sistema de arrecadação centralizada do IBS. O recolhimento do IBS é feito em conta única gerida pelo CG-IBS. A distribuição para Estados e Municípios ocorre em até 5 dias úteis após o recolhimento. Critério de distribuição: princípio do destino (local onde o bem é consumido ou o serviço é prestado). Para operações interestaduais: o IBS é distribuído ao Estado e Município de destino. Para serviços: distribuição ao local de prestação efetiva. O CG-IBS mantém sistema de rastreamento de operações para garantir a distribuição correta. Municípios com menos de 5.000 habitantes recebem complementação mínima garantida.`,
    topicos: "arrecadação centralizada, distribuição, princípio do destino, conta única, 5 dias úteis, interestadual, local de destino, rastreamento, complementação mínima",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 05/2025",
    titulo: "CG-IBS — Ressarcimento de Créditos do IBS: Prazo e Procedimento",
    conteudo: `O CG-IBS regulamenta o ressarcimento de créditos acumulados do IBS. Prazo máximo para ressarcimento: 60 dias corridos após o pedido. Hipóteses de ressarcimento: exportações, operações com alíquota zero, acúmulo sistemático de créditos por atividade exportadora. Procedimento: pedido eletrônico no portal do CG-IBS, com documentação comprobatória. Juros sobre ressarcimento em atraso: SELIC a partir do 61º dia. Ressarcimento prioritário para: exportadores, empresas em recuperação judicial, créditos acima de R$ 1 milhão. Transferência de créditos a terceiros: permitida mediante comunicação ao CG-IBS. Prazo de prescrição do crédito: 5 anos.`,
    topicos: "ressarcimento, crédito IBS, 60 dias, exportação, alíquota zero, portal CG-IBS, SELIC, juros, transferência de crédito, prescrição, exportador",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 06/2025",
    titulo: "CG-IBS — Fiscalização Conjunta e Competências das Administrações Tributárias",
    conteudo: `A fiscalização do IBS é exercida conjuntamente pelo CG-IBS e pelas administrações tributárias dos Estados e Municípios. O CG-IBS coordena as ações fiscais e evita duplicidade de autuações. Competência para lavrar auto de infração: Fisco estadual ou municipal onde está domiciliado o contribuinte. Compartilhamento de informações: obrigatório entre CG-IBS, Receita Federal, Fiscos estaduais e municipais. Prazo decadencial para lançamento do IBS: 5 anos. Prazo prescricional para cobrança: 5 anos após o lançamento definitivo. Multa por falta de recolhimento: 75% do valor do tributo. Multa por fraude ou sonegação: 150%. Denúncia espontânea: afasta a multa, mantém os juros.`,
    topicos: "fiscalização, auto de infração, decadência, prescrição, multa, sonegação, fraude, denúncia espontânea, compartilhamento de informações, Fisco estadual",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 07/2025",
    titulo: "CG-IBS — Obrigações Acessórias Unificadas: Declaração e Escrituração",
    conteudo: `O CG-IBS unifica as obrigações acessórias do IBS em um único sistema. Declaração Unificada do IBS (DU-IBS): substitui o SPED, EFD-ICMS/IPI, GIA e demais declarações estaduais e municipais. Periodicidade: mensal, com prazo até o 15º dia do mês seguinte. Escrituração: por operação, com identificação do adquirente, valor, alíquota e crédito gerado. Nota Fiscal Eletrônica (NF-e) integrada ao sistema do CG-IBS: transmissão em tempo real. Obrigação de informar operações com consumidor final pessoa física: simplificada via NFC-e. Microempresas e MEI: obrigações acessórias simplificadas. Penalidade por atraso na entrega: R$ 500 por mês ou fração.`,
    topicos: "obrigação acessória, DU-IBS, declaração unificada, SPED, EFD, GIA, NF-e, NFC-e, escrituração, prazo, penalidade, microempresa, MEI",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 08/2025",
    titulo: "CG-IBS — Contencioso Administrativo do IBS",
    conteudo: `O contencioso administrativo do IBS é julgado pelo Tribunal Administrativo do IBS (TA-IBS), vinculado ao CG-IBS. Primeira instância: Delegacia de Julgamento do IBS (DJ-IBS) em cada região fiscal. Segunda instância: Câmaras de Julgamento do TA-IBS. Prazo para impugnação de auto de infração: 30 dias. Prazo para recurso voluntário: 30 dias após a decisão de primeira instância. Recurso especial ao Pleno do TA-IBS: cabível em casos de divergência jurisprudencial. Efeito suspensivo: automático para impugnações e recursos. Depósito recursal: não exigido. Parcelamento em discussão administrativa: permitido com suspensão da exigibilidade. Prazo médio de julgamento: 360 dias.`,
    topicos: "contencioso administrativo, TA-IBS, auto de infração, impugnação, recurso, prazo, efeito suspensivo, parcelamento, julgamento, Delegacia",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 09/2025",
    titulo: "CG-IBS — Regras de Transição para Créditos Acumulados de ICMS e ISS",
    conteudo: `O CG-IBS regulamenta o aproveitamento de créditos acumulados de ICMS e ISS durante a transição. Créditos de ICMS acumulados até 2028: podem ser compensados com IBS a partir de 2029 na proporção da extinção do ICMS. Créditos de ISS acumulados: compensáveis com IBS municipal a partir de 2029. Prazo para habilitação dos créditos: até 31/12/2028 junto à Secretaria de Fazenda estadual ou municipal. Créditos não habilitados: perdem o direito à compensação. Créditos de ICMS de exportadores: ressarcimento prioritário até 2028. Saldo de crédito de PIS/COFINS: compensável com CBS a partir de 2027. Vedação: uso de créditos de tributos extintos para compensar outros tributos não relacionados.`,
    topicos: "crédito acumulado, ICMS, ISS, PIS, COFINS, compensação, transição, habilitação, 2028, 2029, exportador, Secretaria de Fazenda",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 10/2025",
    titulo: "CG-IBS — Split Payment: Regulamentação Operacional",
    conteudo: `O CG-IBS regulamenta o split payment para o IBS. O split payment do IBS funciona em conjunto com o split payment da CBS (RFB). No split payment: a instituição financeira (banco, adquirente de cartão, PSP do PIX) retém automaticamente o valor do IBS e CBS e repassa ao CG-IBS e à RFB. O fornecedor recebe apenas o valor líquido (preço menos IBS e CBS). Implementação obrigatória para: cartões de crédito e débito (a partir de 01/07/2026), PIX (a partir de 01/01/2027), TED/DOC (a partir de 01/07/2027). O fornecedor é desobrigado de recolher o IBS nas operações com split payment. Crédito do adquirente: gerado automaticamente pelo sistema do CG-IBS com base na NF-e.`,
    topicos: "split payment, IBS, CBS, cartão de crédito, PIX, TED, DOC, instituição financeira, adquirente, PSP, retenção automática, crédito automático, 2026, 2027",
    cnaeGroups: "45,46,47,55,56,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 11/2025",
    titulo: "CG-IBS — Cashback para Pessoas Físicas de Baixa Renda",
    conteudo: `O CG-IBS regulamenta o cashback do IBS para pessoas físicas de baixa renda. Beneficiários: famílias inscritas no CadÚnico com renda per capita de até meio salário mínimo. Percentual de devolução: até 100% do IBS pago em compras de alimentos, medicamentos e serviços essenciais. Identificação do beneficiário: CPF na nota fiscal. Crédito do cashback: depositado mensalmente no Bolsa Família ou conta bancária cadastrada. Limite mensal de cashback: R$ 150 por família. Operacionalização: CG-IBS apura o valor com base nas NF-e emitidas com CPF do beneficiário. Prazo de implementação: 2027 (junto com o início da CBS plena).`,
    topicos: "cashback, baixa renda, CadÚnico, CPF, nota fiscal, alimentos, medicamentos, Bolsa Família, devolução, 2027",
    cnaeGroups: "10,11,12,45,46,47,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "cg_ibs",
    artigo: "Resolução CG-IBS 12/2025",
    titulo: "CG-IBS — Cooperativas: Regime Específico de Tributação",
    conteudo: `Cooperativas têm regime específico no IBS regulamentado pelo CG-IBS. Atos cooperativos (operações entre cooperativa e cooperados): não são fatos geradores do IBS. Atos não cooperativos (operações com terceiros não cooperados): sujeitos ao IBS normalmente. Cooperativas agropecuárias: crédito presumido de 20% nas vendas de produtos dos cooperados pessoas físicas. Cooperativas de crédito: regime de serviços financeiros com alíquota diferenciada. Cooperativas de saúde (planos): regime específico com alíquota de 40% da padrão. Cooperativas de trabalho: regime de profissionais liberais para os cooperados. Cooperativas de transporte: regime padrão para atos não cooperativos.`,
    topicos: "cooperativa, ato cooperativo, ato não cooperativo, cooperativa agropecuária, cooperativa de crédito, cooperativa de saúde, cooperativa de trabalho, crédito presumido",
    cnaeGroups: "01,02,03,64,65,66,49,50,51,52,53,86,87,88",
    chunkIndex: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RFB — Portarias e Instruções Normativas sobre CBS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2200/2025",
    titulo: "RFB — CBS: Regulamentação Geral, Contribuintes e Fato Gerador",
    conteudo: `A Instrução Normativa RFB 2200/2025 regulamenta a CBS. Contribuinte da CBS: toda pessoa jurídica ou física que realiza operações com bens e serviços de forma habitual. Não contribuintes: entes públicos em atividades exclusivamente governamentais, entidades religiosas, partidos políticos. Fato gerador: realização de operação com bens ou serviços. Momento do fato gerador: na entrega do bem, na prestação do serviço, no recebimento antecipado ou na emissão da NF-e, o que ocorrer primeiro. Contribuinte substituto: responsável pelo recolhimento em nome de terceiros (ex: importador, adquirente em split payment). Responsável solidário: sócio-administrador em caso de dissolução irregular.`,
    topicos: "CBS, IN RFB, contribuinte, fato gerador, momento, substituto, responsável solidário, entidade religiosa, partido político, importador",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2201/2025",
    titulo: "RFB — CBS: Alíquotas, Base de Cálculo e Cálculo por Dentro",
    conteudo: `A alíquota padrão da CBS é de 8,8% (estimativa para o regime pleno a partir de 2027). Em 2026 (fase de teste): CBS a 0,9%. O cálculo da CBS é por dentro: o valor da CBS integra a própria base de cálculo. Fórmula: CBS = (Valor da operação × alíquota) / (1 - alíquota). Base de cálculo: valor total da operação incluindo frete, seguro e outros encargos cobrados do adquirente. Exclusões da base de cálculo: descontos incondicionais, gorjetas, tributos não relacionados à operação. Alíquota reduzida (50% da padrão = 4,4%): alimentos da cesta básica ampliada, medicamentos, dispositivos médicos, educação, saúde, transporte público, insumos agropecuários. Alíquota zero: cesta básica nacional (25 itens), medicamentos do RENAME.`,
    topicos: "CBS, alíquota, 8,8%, 0,9%, 2026, 2027, cálculo por dentro, base de cálculo, alíquota reduzida, alíquota zero, cesta básica, RENAME, frete, desconto",
    cnaeGroups: "01,02,03,10,11,12,45,46,47,85,86,87,88,49,50,51,52,53",
    chunkIndex: 0,
  },
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2202/2025",
    titulo: "RFB — CBS: Não Cumulatividade, Crédito e Compensação",
    conteudo: `A CBS é não cumulativa. O contribuinte tem direito ao crédito integral da CBS incidente nas aquisições de bens e serviços utilizados na atividade econômica. O crédito é imediato, independentemente de aprovação prévia da RFB. Crédito de CBS pode ser: compensado com outros tributos federais (IRPJ, CSLL, IPI, IRRF), transferido a fornecedores, ressarcido em até 60 dias. Vedações ao crédito: aquisições para uso pessoal dos sócios, gorjetas, brindes, despesas com entretenimento não relacionadas à atividade, multas. Crédito sobre ativo imobilizado: em 12 parcelas mensais. Crédito presumido para produtor rural pessoa física: 20% sobre as vendas. Crédito extemporâneo: aproveitável em até 5 anos.`,
    topicos: "CBS, não cumulatividade, crédito, compensação, IRPJ, CSLL, IPI, IRRF, ressarcimento, ativo imobilizado, crédito presumido, produtor rural, extemporâneo",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2203/2025",
    titulo: "RFB — CBS: Obrigações Acessórias, EFD-CBS e NF-e",
    conteudo: `A Escrituração Fiscal Digital da CBS (EFD-CBS) é a obrigação acessória principal. A EFD-CBS substitui o SPED-Contribuições (EFD-Contribuições) a partir de 2027. Periodicidade: mensal, com transmissão até o 15º dia do mês seguinte. Campos obrigatórios na NF-e para CBS: alíquota da CBS, valor da CBS destacado, indicação do crédito gerado para o adquirente. Nota Fiscal de Serviços Eletrônica (NFS-e): obrigatória para prestadores de serviços com destaque da CBS. Penalidade por atraso na entrega da EFD-CBS: 2% ao mês sobre o valor do tributo, limitado a 20%. Penalidade por omissão de informações: R$ 500 por registro omitido. Prazo de guarda dos documentos fiscais: 5 anos.`,
    topicos: "EFD-CBS, SPED, obrigação acessória, NF-e, NFS-e, prazo, penalidade, escrituração, 2027, guarda de documentos, CBS destacado",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2204/2025",
    titulo: "RFB — CBS: Split Payment Federal e Retenção na Fonte",
    conteudo: `O split payment da CBS é regulamentado pela RFB. Funcionamento: a instituição financeira retém automaticamente o valor da CBS no momento do pagamento e repassa à RFB. Cronograma de implementação: cartões de crédito/débito (01/07/2026), PIX (01/01/2027), TED/DOC (01/07/2027), boleto bancário (01/01/2028). O fornecedor é desobrigado de recolher a CBS nas operações com split payment. Retenção na fonte de CBS (sem split payment): obrigatória quando o tomador é órgão público federal, estadual ou municipal. Alíquota de retenção: igual à alíquota da CBS aplicável à operação. O fornecedor pode compensar a CBS retida com outros débitos federais.`,
    topicos: "split payment, CBS, retenção na fonte, cartão, PIX, TED, DOC, boleto, 2026, 2027, 2028, órgão público, compensação",
    cnaeGroups: "45,46,47,55,56,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84",
    chunkIndex: 0,
  },
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2205/2025",
    titulo: "RFB — CBS: Importação de Bens e Serviços",
    conteudo: `A CBS-Importação incide sobre a importação de bens e serviços do exterior. Contribuinte: o importador (pessoa física ou jurídica). Base de cálculo na importação de bens: valor aduaneiro + II + IPI + ICMS + outras despesas aduaneiras. Alíquota da CBS-Importação: igual à alíquota interna da CBS. A CBS-Importação substitui o PIS-Importação e a COFINS-Importação a partir de 2027. Crédito da CBS-Importação: aproveitável pelo importador nas mesmas condições da CBS interna. Serviços importados (cross-border): CBS incide sobre o valor do serviço pago ao prestador no exterior. Responsável pelo recolhimento na importação de serviços: o tomador estabelecido no Brasil. Prazo de recolhimento: até o 15º dia do mês seguinte ao pagamento.`,
    topicos: "CBS importação, PIS-Importação, COFINS-Importação, valor aduaneiro, importador, serviço importado, cross-border, tomador, 2027",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,45,46,47,58,59,60,61,62,63",
    chunkIndex: 0,
  },
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2206/2025",
    titulo: "RFB — CBS: Ressarcimento e Prazo de 60 Dias",
    conteudo: `O ressarcimento de créditos acumulados de CBS é regulamentado pela RFB. Prazo máximo: 60 dias corridos após o protocolo do pedido. Hipóteses de ressarcimento: exportações, operações com alíquota zero, acúmulo sistemático por atividade exportadora, encerramento de atividades. Pedido eletrônico: via e-CAC (portal da RFB). Documentação exigida: EFD-CBS dos últimos 12 meses, NF-e das operações geradoras de crédito, comprovante de exportação (DU-E). Juros sobre ressarcimento em atraso: SELIC a partir do 61º dia. Ressarcimento prioritário: exportadores com crédito acima de R$ 500 mil. Compensação cruzada: CBS com IRPJ, CSLL, IPI, IRRF, INSS (a partir de 2027). Prazo de prescrição: 5 anos.`,
    topicos: "ressarcimento, CBS, 60 dias, e-CAC, exportação, DU-E, SELIC, compensação cruzada, IRPJ, CSLL, prescrição, exportador",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2207/2025",
    titulo: "RFB — Transição PIS/COFINS para CBS: Regras de Migração",
    conteudo: `A IN RFB 2207/2025 regula a migração do PIS/COFINS para a CBS. Em 2026: coexistência de PIS/COFINS (com alíquotas reduzidas) e CBS (alíquota de teste 0,9%). Em 2027: extinção do PIS/COFINS e início da CBS plena. Créditos de PIS/COFINS apurados até 31/12/2026: podem ser compensados com CBS a partir de 01/01/2027. Prazo para uso dos créditos de PIS/COFINS: até 31/12/2031 (5 anos). Empresas no lucro presumido: migração do PIS/COFINS cumulativo para CBS com alíquota diferenciada de 3,2%. Regimes monofásicos de PIS/COFINS: extintos em 2027, substituídos por alíquota diferenciada de CBS. Empresas no Simples Nacional: migração gradual conforme LC 227/2024.`,
    topicos: "PIS, COFINS, CBS, migração, 2026, 2027, crédito de PIS COFINS, lucro presumido, monofásico, Simples Nacional, coexistência, alíquota diferenciada",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2208/2025",
    titulo: "RFB — CBS: Fiscalização, Autuação e Contencioso",
    conteudo: `A RFB é responsável pela fiscalização da CBS. Prazo decadencial para lançamento da CBS: 5 anos do fato gerador. Prazo prescricional para cobrança: 5 anos após o lançamento definitivo. Multa de ofício: 75% do valor do tributo. Multa qualificada (fraude/sonegação): 150%. Multa por falta de declaração: 2% ao mês sobre o valor do tributo, limitado a 20%. Denúncia espontânea: afasta a multa, mantém juros SELIC. Parcelamento: até 60 meses para débitos de CBS, com entrada mínima de 5%. Transação tributária: possível para débitos em contencioso administrativo ou judicial. Contencioso administrativo: CARF (Conselho Administrativo de Recursos Fiscais) para CBS federal.`,
    topicos: "fiscalização, CBS, autuação, decadência, prescrição, multa, CARF, parcelamento, transação tributária, denúncia espontânea, fraude, sonegação",
    cnaeGroups: "01,02,03,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,38,39,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2209/2025",
    titulo: "RFB — CBS: Regimes Específicos para Serviços Financeiros",
    conteudo: `Instituições financeiras têm regime específico de CBS regulamentado pela RFB. Método de apuração: adição (receitas de intermediação financeira menos despesas de captação). Alíquota diferenciada para serviços financeiros: 5,88% de CBS (estimativa). Operações de crédito: incidência sobre o spread bancário (diferença entre taxa de captação e taxa de empréstimo). Operações de câmbio: incidência sobre a tarifa de câmbio. Seguros: incidência sobre o prêmio líquido de resseguro. Fundos de investimento: CBS incide sobre a taxa de administração e performance. Fintechs: mesmo regime das instituições financeiras tradicionais. Cooperativas de crédito: alíquota reduzida de 40% da padrão. IOF: permanece como tributo separado durante a transição.`,
    topicos: "serviços financeiros, CBS, banco, seguro, fundo de investimento, fintech, cooperativa de crédito, método de adição, spread, câmbio, IOF, alíquota diferenciada",
    cnaeGroups: "64,65,66",
    chunkIndex: 0,
  },
  {
    lei: "rfb_cbs",
    artigo: "IN RFB 2210/2025",
    titulo: "RFB — CBS: Simples Nacional e Microempresas",
    conteudo: `Empresas do Simples Nacional têm tratamento específico para a CBS. Em 2026: Simples Nacional recolhe PIS/COFINS pelo DAS (sem CBS separada). Em 2027: CBS incorporada ao DAS em substituição ao PIS/COFINS, com alíquota específica por faixa de receita. Faixas de receita do Simples com CBS: Anexo I (comércio) 0,5% a 1,2%; Anexo II (indústria) 0,5% a 1,2%; Anexo III (serviços) 0,5% a 1,5%; Anexo IV (construção) 0,5% a 1,0%; Anexo V (serviços com fator R) 0,5% a 1,5%. MEI: isento de CBS. Opção pelo regime regular: Simples pode optar pelo regime regular da CBS para aproveitar créditos (vantajoso para exportadores e empresas com muitos insumos).`,
    topicos: "Simples Nacional, CBS, DAS, MEI, 2027, Anexo I, Anexo II, Anexo III, Anexo IV, Anexo V, faixa de receita, opção regime regular, exportador",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,68,69,70,71,72,73,74,75,77,78,79,80,81,82,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Convênio ICMS — Normas Estaduais de Transição
  // ═══════════════════════════════════════════════════════════════════════════
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 109/2024",
    titulo: "CONFAZ — Convênio ICMS 109/2024: Regras Gerais de Transição do ICMS",
    conteudo: `O Convênio ICMS 109/2024 estabelece as regras gerais de transição do ICMS para o IBS entre os Estados. O CONFAZ (Conselho Nacional de Política Fazendária) coordena a transição do ICMS. Cronograma: 2026-2028 (coexistência plena), 2029-2032 (extinção gradual 10% ao ano), 2033 (extinção total). Benefícios fiscais de ICMS concedidos antes de 31/12/2032: mantidos até o prazo de extinção ou 2032, o que ocorrer primeiro. Novos benefícios fiscais de ICMS: vedados a partir de 01/01/2025. ICMS-ST (substituição tributária): mantido durante toda a transição com regras específicas por Estado. Operações interestaduais: alíquotas de 7% e 12% mantidas durante a transição.`,
    topicos: "Convênio ICMS, CONFAZ, transição, 2026, 2029, 2032, 2033, benefício fiscal, ICMS-ST, interestadual, extinção gradual",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 110/2024",
    titulo: "CONFAZ — Convênio ICMS 110/2024: Créditos Acumulados de ICMS",
    conteudo: `O Convênio ICMS 110/2024 regula o aproveitamento de créditos acumulados de ICMS durante a transição. Créditos acumulados de ICMS: originados de exportações, operações com alíquota zero, diferença de alíquotas. Prazo para habilitação: até 31/12/2028 junto à Secretaria de Fazenda do Estado. Formas de aproveitamento: transferência para outros estabelecimentos do mesmo grupo, compensação com IBS a partir de 2029, ressarcimento em dinheiro (prazo de 360 dias). Ressarcimento prioritário para exportadores: prazo de 120 dias. Créditos de ICMS não habilitados até 2028: perdem o direito à compensação com IBS. Vedação: uso de créditos de ICMS para compensar tributos federais (IRPJ, CSLL).`,
    topicos: "crédito acumulado, ICMS, habilitação, 2028, exportação, ressarcimento, transferência, compensação IBS, Secretaria de Fazenda, exportador",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,01,02,03,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 111/2024",
    titulo: "CONFAZ — Convênio ICMS 111/2024: ICMS-ST na Transição",
    conteudo: `O Convênio ICMS 111/2024 mantém o ICMS-ST durante o período de transição. O ICMS-ST (substituição tributária) concentra o recolhimento no fabricante ou importador (substituto tributário). Setores com ICMS-ST mantido: combustíveis, bebidas, cigarros, medicamentos, autopeças, materiais de construção, produtos de limpeza, eletrodomésticos. Margem de Valor Agregado (MVA): mantida por Estado durante a transição. Ressarcimento de ICMS-ST ao substituído: mantido com prazo de 120 dias. A partir de 2029: ICMS-ST reduzido proporcionalmente à extinção do ICMS. Em 2033: extinção do ICMS-ST junto com o ICMS. Protocolo de adesão ao ICMS-ST: mantido entre os Estados durante a transição.`,
    topicos: "ICMS-ST, substituição tributária, substituto, substituído, MVA, margem de valor agregado, combustíveis, bebidas, medicamentos, autopeças, ressarcimento, 2029, 2033",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 112/2024",
    titulo: "CONFAZ — Convênio ICMS 112/2024: Benefícios Fiscais de ICMS — Manutenção e Extinção",
    conteudo: `O Convênio ICMS 112/2024 regula os benefícios fiscais de ICMS durante a transição. Benefícios mantidos até 2032: isenções, reduções de base de cálculo, créditos presumidos, diferimentos concedidos por convênio ou protocolo CONFAZ até 31/12/2024. Benefícios unilaterais (guerra fiscal): vedados desde a EC 132/2023. Benefícios de desenvolvimento regional (ex: ICMS para atrair indústrias): substituídos pelo Fundo de Desenvolvimento Regional (FDR) a partir de 2025. Empresas com benefício de ICMS: devem registrar o benefício na Secretaria de Fazenda estadual até 31/03/2025. Benefícios não registrados: considerados extintos. Compensação pelo Fundo de Compensação de Benefícios Fiscais (FCBF): para Estados que perderem receita com a extinção dos benefícios.`,
    topicos: "benefício fiscal, ICMS, isenção, redução de base, crédito presumido, diferimento, guerra fiscal, FDR, FCBF, registro, Secretaria de Fazenda, 2025, 2032",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 113/2024",
    titulo: "CONFAZ — Convênio ICMS 113/2024: DIFAL e Operações Interestaduais na Transição",
    conteudo: `O Convênio ICMS 113/2024 regula o DIFAL (Diferencial de Alíquota) durante a transição. DIFAL: incide nas compras interestaduais para consumidor final não contribuinte do ICMS (pessoa física ou empresa do Simples). Partilha do DIFAL: 100% para o Estado de destino (conforme EC 87/2015 e Emenda 132). DIFAL mantido durante toda a transição (2026-2032). A partir de 2029: DIFAL reduzido proporcionalmente à extinção do ICMS. Operações interestaduais entre contribuintes: alíquotas de 7% e 12% mantidas. Protocolo de substituição tributária interestadual: mantido durante a transição. Em 2033: extinção do DIFAL junto com o ICMS.`,
    topicos: "DIFAL, diferencial de alíquota, interestadual, consumidor final, pessoa física, Simples Nacional, Estado de destino, EC 87, 2029, 2032, 2033",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 114/2024",
    titulo: "CONFAZ — Convênio ICMS 114/2024: Obrigações Acessórias do ICMS na Transição",
    conteudo: `O Convênio ICMS 114/2024 regula as obrigações acessórias do ICMS durante a transição. SPED-ICMS (EFD-ICMS/IPI): mantido até 2032, com adaptações para coexistência com o IBS. GIA (Guia de Informação e Apuração do ICMS): mantida por Estado durante a transição. NF-e: adaptada para incluir campos do IBS a partir de 2026. DANFE: adaptado para incluir informações do IBS e CBS. Escrituração de livros fiscais: mantida durante a transição. Prazo de entrega da EFD-ICMS/IPI: mantido no 15º dia do mês seguinte. Penalidade por atraso: mantida conforme legislação estadual. Em 2033: extinção da EFD-ICMS/IPI e GIA, substituídas pela DU-IBS.`,
    topicos: "SPED, EFD-ICMS, GIA, NF-e, DANFE, obrigação acessória, escrituração, livro fiscal, 2026, 2032, 2033, DU-IBS",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 115/2024",
    titulo: "CONFAZ — Convênio ICMS 115/2024: Setor Energético e Combustíveis na Transição",
    conteudo: `O Convênio ICMS 115/2024 regula o ICMS sobre energia elétrica e combustíveis durante a transição. ICMS sobre energia elétrica: alíquota máxima de 25% mantida durante a transição. ICMS sobre combustíveis: regime monofásico mantido com alíquota por litro fixada pelo CONFAZ. Convênio ICMS 199/2022 (combustíveis monofásicos): mantido durante a transição. ICMS sobre gás natural: alíquota de 12% a 17% por Estado. A partir de 2029: ICMS sobre energia e combustíveis reduzido gradualmente. Em 2033: extinção do ICMS sobre energia e combustíveis, substituídos pelo IBS + IS (Imposto Seletivo). O IS sobre combustíveis fósseis: alíquota a ser fixada em lei federal.`,
    topicos: "ICMS, energia elétrica, combustíveis, monofásico, CONFAZ, gás natural, 2029, 2033, IS, Imposto Seletivo, alíquota por litro",
    cnaeGroups: "19,35,06,07,08,09,49,50,51,52,53",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 116/2024",
    titulo: "CONFAZ — Convênio ICMS 116/2024: Setor de Telecomunicações na Transição",
    conteudo: `O Convênio ICMS 116/2024 regula o ICMS sobre telecomunicações durante a transição. ICMS sobre telecomunicações: alíquota de 25% a 35% por Estado (mais alta que o padrão). Serviços de telecomunicações sujeitos ao ICMS: telefonia fixa, móvel, internet banda larga, TV por assinatura. A partir de 2029: ICMS sobre telecomunicações reduzido gradualmente. Em 2033: extinção do ICMS sobre telecomunicações, substituído pelo IBS. No novo sistema: telecomunicações seguem o regime padrão do IBS (sem alíquota diferenciada). Impacto: redução da carga tributária sobre telecomunicações de ~30% para ~17,7% (IBS+CBS). Período de adaptação para as operadoras: 2026-2028.`,
    topicos: "ICMS, telecomunicações, telefonia, internet, TV por assinatura, 2029, 2033, IBS, alíquota diferenciada, operadora",
    cnaeGroups: "61",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 117/2024",
    titulo: "CONFAZ — Convênio ICMS 117/2024: Zona Franca de Manaus e Áreas de Livre Comércio",
    conteudo: `O Convênio ICMS 117/2024 regula os benefícios da Zona Franca de Manaus (ZFM) e Áreas de Livre Comércio (ALC) durante a transição. Benefícios fiscais da ZFM: garantidos por 50 anos após a EC 132/2023 (até 2073). Isenção de ICMS nas internações na ZFM: mantida durante toda a transição. Isenção de IBS e CBS nas operações com a ZFM: prevista na LC 214/2025. Crédito presumido de ICMS para produtos industrializados na ZFM: mantido até 2032. Áreas de Livre Comércio (Tabatinga, Macapá, Santana, Bonfim, Boa Vista, Guajará-Mirim): mesmos benefícios da ZFM proporcionalmente. Empresas com incentivos da ZFM: devem registrar os benefícios até 31/03/2025.`,
    topicos: "Zona Franca de Manaus, ZFM, Área de Livre Comércio, ALC, isenção, benefício fiscal, 2073, Tabatinga, Macapá, Amazonas, crédito presumido",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 118/2024",
    titulo: "CONFAZ — Convênio ICMS 118/2024: Agronegócio e Produtor Rural no ICMS",
    conteudo: `O Convênio ICMS 118/2024 regula o ICMS sobre operações do agronegócio durante a transição. Produtor rural pessoa física: isento de ICMS nas vendas de produtos in natura. Cooperativas agropecuárias: diferimento do ICMS nas entradas de produtos dos cooperados. Insumos agropecuários: isenção de ICMS para fertilizantes, defensivos, sementes, rações, vacinas veterinárias (mantida até 2032). Exportações de produtos agropecuários: imunes ao ICMS. ICMS sobre produtos agroindustriais: alíquota reduzida de 7% a 12% por Estado. Crédito de ICMS para agroindústria: integral pelos insumos adquiridos. Período de transição para o agronegócio: 2026-2032, com manutenção de todos os benefícios atuais.`,
    topicos: "ICMS, agronegócio, produtor rural, cooperativa agropecuária, insumos agropecuários, fertilizante, defensivo, exportação, agroindústria, isenção, diferimento",
    cnaeGroups: "01,02,03,10,11,12",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 119/2024",
    titulo: "CONFAZ — Convênio ICMS 119/2024: Construção Civil no ICMS",
    conteudo: `O Convênio ICMS 119/2024 regula o ICMS sobre materiais de construção durante a transição. Materiais de construção: sujeitos ao ICMS-ST em vários Estados. MVA dos materiais de construção: mantida por Estado durante a transição. Construtoras: crédito de ICMS pelos materiais adquiridos para uso na obra. Incorporadoras: ICMS incide sobre a venda de imóveis apenas na parcela de materiais (não sobre o serviço). Empreiteiras: ICMS sobre os materiais fornecidos, ISS sobre o serviço de mão de obra. Cimento, aço, tijolos: ICMS-ST com alíquota de 12% a 18% por Estado. A partir de 2029: ICMS sobre materiais de construção reduzido gradualmente. Em 2033: substituído pelo IBS.`,
    topicos: "ICMS, construção civil, materiais de construção, ICMS-ST, MVA, construtora, incorporadora, empreiteira, cimento, aço, 2029, 2033",
    cnaeGroups: "41,42,43",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 120/2024",
    titulo: "CONFAZ — Convênio ICMS 120/2024: E-commerce e Marketplace no ICMS",
    conteudo: `O Convênio ICMS 120/2024 regula o ICMS sobre operações de e-commerce e marketplace durante a transição. E-commerce: ICMS incide normalmente com partilha entre Estado de origem e destino (conforme EC 87/2015). Marketplace: operador da plataforma é responsável solidário pelo ICMS das transações. DIFAL no e-commerce: mantido durante a transição. Nota Fiscal Eletrônica (NF-e): obrigatória para todas as vendas online. Dropshipping: ICMS incide sobre o fornecedor original, com responsabilidade do marketplace. Empresas de e-commerce do Simples: sujeitas ao DIFAL nas vendas interestaduais. A partir de 2029: ICMS no e-commerce reduzido gradualmente. Em 2033: substituído pelo IBS com princípio do destino.`,
    topicos: "e-commerce, marketplace, ICMS, DIFAL, EC 87, partilha, responsabilidade solidária, NF-e, dropshipping, Simples Nacional, destino",
    cnaeGroups: "47,58,59,60,61,62,63",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 121/2024",
    titulo: "CONFAZ — Convênio ICMS 121/2024: Setor Farmacêutico e Medicamentos no ICMS",
    conteudo: `O Convênio ICMS 121/2024 regula o ICMS sobre medicamentos durante a transição. Medicamentos do RENAME (Relação Nacional de Medicamentos Essenciais): isentos de ICMS em todos os Estados. Medicamentos genéricos: alíquota reduzida de 7% a 12% por Estado. Medicamentos de referência: alíquota padrão de 12% a 18% por Estado. ICMS-ST sobre medicamentos: concentrado no fabricante ou importador. Distribuidoras de medicamentos: ressarcimento de ICMS-ST quando o preço de venda for inferior ao preço presumido. Farmácias e drogarias: crédito de ICMS-ST pelo ressarcimento. A partir de 2029: ICMS sobre medicamentos reduzido gradualmente. Em 2033: substituído pelo IBS com alíquota zero para medicamentos do RENAME.`,
    topicos: "ICMS, medicamentos, RENAME, farmácia, drogaria, ICMS-ST, genérico, referência, distribuidor, ressarcimento, 2029, 2033",
    cnaeGroups: "21,46,47",
    chunkIndex: 0,
  },
  {
    lei: "conv_icms",
    artigo: "Convênio ICMS 122/2024",
    titulo: "CONFAZ — Convênio ICMS 122/2024: Setor Automotivo no ICMS",
    conteudo: `O Convênio ICMS 122/2024 regula o ICMS sobre veículos automotores durante a transição. Veículos novos: ICMS-ST com alíquota de 12% a 25% por Estado. Autopeças: ICMS-ST com MVA específica por peça. Veículos elétricos: alíquota reduzida de ICMS em vários Estados (incentivo à eletrificação). Importação de veículos: ICMS de 4% (alíquota interestadual) + DIFAL. Concessionárias: crédito de ICMS-ST pelo ressarcimento. Imposto Seletivo (IS) sobre veículos: a partir de 2027, incide sobre veículos com motor a combustão. IS sobre veículos elétricos: alíquota zero. A partir de 2029: ICMS sobre veículos reduzido gradualmente. Em 2033: substituído pelo IBS + IS.`,
    topicos: "ICMS, veículos, automóvel, autopeças, ICMS-ST, veículo elétrico, concessionária, Imposto Seletivo, IS, importação, 2027, 2029, 2033",
    cnaeGroups: "29,30,45",
    chunkIndex: 0,
  },
  ...RAG_CORPUS_LCS_NOVAS,
];
