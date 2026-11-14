export interface PortfolioAllocationItem {
  id: string;
  label: string;
  percentage: number;
  color: string;
  category: string;
  examples: string;
  rationale: string;
  liquidity: string;
  minSuggestedAmount?: number;
}

export interface DefaultPortfolioSeed {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  riskLevel: string;
  recommendedHorizon: string;
  expectedAnnualPct: number;
  benchmarkNote: string;
  order: number;
  allocations: PortfolioAllocationItem[];
}

export const DEFAULT_INVESTMENT_PORTFOLIOS: DefaultPortfolioSeed[] = [
  {
    slug: 'reserva',
    title: 'Primeiros Passos',
    subtitle: 'Reserva de Emergência e liquidez imediata',
    description:
      'Ideal para quem está começando a guardar os primeiros R$ 50, R$ 100 ou R$ 500 e ainda está formando sua Reserva de Emergência. O foco é segurança total e liberdade para sacar a qualquer momento se surgir um imprevisto familiar.',
    riskLevel: 'Conservador',
    recommendedHorizon: 'Resgate imediato a 12 meses',
    expectedAnnualPct: 11.15,
    benchmarkNote:
      'Referência didática de mercado: CDI ~11,15% a.a. • Selic ~11,25% a.a. • IPCA ~4,5% a.a.',
    order: 0,
    allocations: [
      {
        id: 'reserva-liquida',
        label: 'Reserva Líquida (Selic / CDI)',
        percentage: 70,
        color: '#F19B0A',
        category: 'Renda Fixa • Liquidez',
        examples:
          'Tesouro Selic ou CDB 100% do CDI com liquidez diária em instituição sólida',
        rationale:
          'É o alicerce da vida financeira: rende todos os dias úteis acima da poupança e fica disponível para qualquer imprevisto em casa.',
        liquidity: 'Diária (D+0 / D+1)',
        minSuggestedAmount: 1,
      },
      {
        id: 'metas-curto-prazo',
        label: 'Metas de Curto Prazo',
        percentage: 20,
        color: '#0EA5E9',
        category: 'Renda Fixa • Pós-fixado',
        examples:
          'CDB 100% a 105% do CDI ou LCI/LCA isenta de Imposto de Renda',
        rationale:
          'Separa o dinheiro de objetivos próximos (cursos, material de estudo, documentação) para não misturar com a reserva de emergência.',
        liquidity: 'Diária ou vencimento curto',
        minSuggestedAmount: 10,
      },
      {
        id: 'protecao-inflacao-reserva',
        label: 'Proteção da Inflação (IPCA+)',
        percentage: 10,
        color: '#10B981',
        category: 'Renda Fixa • Inflação',
        examples: 'Tesouro IPCA+ (frações a partir de ~R$ 35) ou CDB IPCA+',
        rationale:
          'Primeiro contato com o longo prazo: garante que seu poder de compra cresça sempre acima do aumento dos preços.',
        liquidity: 'Ideal levar até o vencimento',
        minSuggestedAmount: 35,
      },
    ],
  },
  {
    slug: 'equilibrada',
    title: 'Construção',
    subtitle: 'Equilíbrio entre segurança e primeiros dividendos',
    description:
      'Para quem já iniciou seu colchão de segurança e quer dar o próximo passo: combinar a proteção da Renda Fixa com os primeiros aluguéis mensais isentos de IR em Fundos Imobiliários e ETFs.',
    riskLevel: 'Moderado',
    recommendedHorizon: '2 a 4 anos',
    expectedAnnualPct: 12.0,
    benchmarkNote:
      'Referência didática de mercado: CDI ~11,15% a.a. • Tesouro IPCA+ ~IPCA + 6,5% a.a. • IFIX',
    order: 1,
    allocations: [
      {
        id: 'caixa-seguranca',
        label: 'Caixa & Segurança (Selic / CDI)',
        percentage: 45,
        color: '#F19B0A',
        category: 'Renda Fixa • Liquidez',
        examples: 'Tesouro Selic e CDB 100% do CDI com liquidez diária',
        rationale:
          'Mantém quase metade do patrimônio protegido, rendendo juros elevados com tranquilidade.',
        liquidity: 'Diária',
        minSuggestedAmount: 1,
      },
      {
        id: 'juro-real-ipca',
        label: 'Juro Real (Tesouro IPCA+)',
        percentage: 25,
        color: '#10B981',
        category: 'Renda Fixa • Inflação',
        examples: 'Tesouro IPCA+ 2029/2035 ou LCI/LCA atrelada ao IPCA',
        rationale:
          'Trava um ganho real acima da inflação brasileira para proteger seu esforço no médio prazo.',
        liquidity: 'Médio/Longo prazo',
        minSuggestedAmount: 35,
      },
      {
        id: 'fiis-equilibrada',
        label: 'Fundos Imobiliários (FIIs)',
        percentage: 20,
        color: '#6366F1',
        category: 'Renda Variável • Dividendos',
        examples:
          'FIIs diversificados de logística, shoppings e recebíveis (cotas base 10, ~R$ 10)',
        rationale:
          'Gera aluguéis mensais isentos de IR na conta da corretora, ensinando o reinvestimento de dividendos.',
        liquidity: 'D+2 na Bolsa (B3)',
        minSuggestedAmount: 10,
      },
      {
        id: 'etfs-acoes-equilibrada',
        label: 'ETFs & Ações Sólidas',
        percentage: 10,
        color: '#EC4899',
        category: 'Renda Variável • Bolsa',
        examples:
          'ETFs amplos (BOVA11, DIVO11) ou ações de setores perenes (energia, bancos, saneamento)',
        rationale:
          'Pequena exposição para aprender a ser sócio de grandes empresas sem comprometer sua estabilidade.',
        liquidity: 'D+2 na Bolsa (B3)',
        minSuggestedAmount: 20,
      },
    ],
  },
  {
    slug: 'longo-prazo',
    title: 'Longo Prazo',
    subtitle: 'Multiplicação patrimonial e diversificação global',
    description:
      'Para quem já tem Reserva de Emergência formada e investe pensando lá na frente (faculdade, casa própria, independência financeira), unindo renda fixa longa, imóveis, ações e moeda forte.',
    riskLevel: 'Crescimento',
    recommendedHorizon: '5 anos ou mais',
    expectedAnnualPct: 12.8,
    benchmarkNote:
      'Referência didática de mercado: Juros compostos + Dividendos + Exposição Cambial',
    order: 2,
    allocations: [
      {
        id: 'liquidez-oportunidade',
        label: 'Liquidez & Oportunidade (CDI)',
        percentage: 25,
        color: '#F19B0A',
        category: 'Renda Fixa • Liquidez',
        examples: 'Tesouro Selic / CDB Liquidez Diária',
        rationale:
          'Reserva estratégica para manter tranquilidade e aproveitar bons preços no mercado.',
        liquidity: 'Diária',
        minSuggestedAmount: 1,
      },
      {
        id: 'ipca-longo',
        label: 'Tesouro IPCA+ Longo',
        percentage: 25,
        color: '#10B981',
        category: 'Renda Fixa • Inflação',
        examples: 'Tesouro IPCA+ 2035 / 2045',
        rationale:
          'Garante crescimento real acima da inflação por muitos anos com juros compostos.',
        liquidity: 'Longo prazo',
        minSuggestedAmount: 35,
      },
      {
        id: 'fiis-longo',
        label: 'Fundos Imobiliários (FIIs)',
        percentage: 25,
        color: '#6366F1',
        category: 'Renda Variável • Imóveis',
        examples: 'Carteira balanceada de FIIs de tijolo e papel',
        rationale:
          'Fluxo recorrente de proventos mensais isentos de IR para realimentar os aportes.',
        liquidity: 'D+2 na Bolsa (B3)',
        minSuggestedAmount: 10,
      },
      {
        id: 'acoes-brasil',
        label: 'Ações Brasil',
        percentage: 15,
        color: '#EC4899',
        category: 'Renda Variável • Ações',
        examples: 'Empresas lucrativas com histórico sólido ou ETFs de dividendos',
        rationale:
          'Participação no crescimento e nos lucros das maiores companhias do país.',
        liquidity: 'D+2 na Bolsa (B3)',
        minSuggestedAmount: 15,
      },
      {
        id: 'exterior-global',
        label: 'Exterior (Dólar / Global)',
        percentage: 10,
        color: '#8B5CF6',
        category: 'Internacional • Moeda Forte',
        examples: 'ETFs globais negociados na B3 em reais (IVVB11, WRDL11)',
        rationale:
          'Protege parte do patrimônio em dólar e conecta você às maiores empresas de tecnologia e consumo do mundo.',
        liquidity: 'D+2 na Bolsa (B3)',
        minSuggestedAmount: 30,
      },
    ],
  },
];
