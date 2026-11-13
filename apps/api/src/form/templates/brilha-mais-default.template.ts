import { FormFieldType } from '@prisma/client';

export interface FormTemplateDefinition {
  key: string;
  title: string;
  slug: string;
  description: string;
  confirmationTitle: string;
  confirmationMessage: string;
  sections: {
    title: string;
    description?: string;
    order: number;
    condition?: { fieldKey: string; operator: 'EQUALS' | 'NOT_EQUALS' | 'INCLUDES'; value: string } | null;
    fields: {
      key: string;
      type: FormFieldType;
      label: string;
      description?: string;
      placeholder?: string;
      order: number;
      required: boolean;
      allowOther?: boolean;
      semanticKey?: string;
      options?: string[];
      condition?: { fieldKey: string; operator: 'EQUALS' | 'NOT_EQUALS' | 'INCLUDES'; value: string } | null;
      validation?: { layout?: 'half' | 'full'; [key: string]: any } | null;
    }[];
  }[];
}

export const BRILHA_MAIS_2027_TEMPLATE: FormTemplateDefinition = {
  key: 'brilha-mais-2027',
  title: 'Cadastro para 1ºTurma Brilha Mais 2027',
  slug: 'cadastro-1-turma-brilha-mais-2027',
  description:
    '*“Mais do que a preparação para o primeiro emprego, aqui tratamos de relação e vínculos de amizade entre os jovens, com atenção a formação moral, ética, conduta e comportamento adequado para um bom testemunho de Cristo na vida cotidiana, buscando um equilíbrio para a vida espiritual e material.”*\n\nOs dados informados abaixo são exclusivamente para o processo de triagem e seleção vocacional para o projeto, pois as vagas são limitadas. **Estes dados NÃO serão compartilhados.**',
  confirmationTitle: 'Inscrição enviada com sucesso!',
  confirmationMessage:
    'Recebemos seus dados para o processo de triagem e seleção vocacional do projeto **Brilha Mais**. Nossa coordenação entrará em contato em breve pelos canais informados.',
  sections: [
    {
      title: 'Dados Pessoais e Contato',
      description: 'Preencha seus dados pessoais e canais de contato com atenção.',
      order: 0,
      condition: null,
      fields: [
        {
          key: 'nome_completo',
          type: FormFieldType.SHORT_TEXT,
          label: 'Nome Completo',
          placeholder: 'Digite seu nome completo',
          order: 0,
          required: true,
          semanticKey: 'NAME',
          validation: { layout: 'full' },
        },
        {
          key: 'data_nascimento',
          type: FormFieldType.DATE,
          label: 'Data de nascimento',
          order: 1,
          required: true,
          semanticKey: 'BIRTH_DATE',
          validation: { layout: 'full' },
        },
        {
          key: 'estado_civil',
          type: FormFieldType.SINGLE_CHOICE,
          label: 'Estado Civil',
          order: 2,
          required: true,
          options: ['Solteiro', 'Casado', 'Outro'],
          validation: { layout: 'full' },
        },
        {
          key: 'telefone',
          type: FormFieldType.PHONE,
          label: 'Telefone / WhatsApp',
          description: 'Informe um telefone de contato com DDD',
          placeholder: '(11) 99999-9999',
          order: 3,
          required: true,
          semanticKey: 'PHONE',
          validation: { layout: 'half' },
        },
        {
          key: 'email',
          type: FormFieldType.EMAIL,
          label: 'E-mail',
          placeholder: 'seuemail@exemplo.com',
          order: 4,
          required: true,
          semanticKey: 'EMAIL',
          validation: { layout: 'half' },
        },
        {
          key: 'cidade',
          type: FormFieldType.SINGLE_CHOICE,
          label: 'Cidade',
          description: 'Selecione a cidade onde mora',
          order: 5,
          required: true,
          allowOther: true,
          semanticKey: 'CITY',
          options: ['São Paulo'],
          validation: { layout: 'full' },
        },
        {
          key: 'comum_congregacao',
          type: FormFieldType.SINGLE_CHOICE,
          label: 'Comum Congregação',
          order: 6,
          required: true,
          allowOther: true,
          options: [
            'Água Rasa',
            'Jardim Iva',
            'Parque Sevilha',
            'Vila Ema',
            'Vila Rio Branco',
          ],
          validation: { layout: 'full' },
        },
      ],
    },
    {
      title: 'Infraestrutura e Vivência',
      description: 'Conte-nos sobre seus recursos de acesso e um pouco da sua trajetória.',
      order: 1,
      condition: null,
      fields: [
        {
          key: 'possui_computador',
          type: FormFieldType.MULTIPLE_CHOICE,
          label: 'Possui computador?',
          description: 'Marque somente se possui algum computador pessoal',
          order: 0,
          required: false,
          options: ['Computador de mesa (Desktop)', 'Notebook (Laptop)'],
          validation: { layout: 'full' },
        },
        {
          key: 'possui_smartphone',
          type: FormFieldType.SINGLE_CHOICE,
          label: 'Possui Smartphone?',
          order: 1,
          required: true,
          options: [
            'Sim, sempre comigo',
            'Sim, porém compartilhado',
            'Não possuo',
          ],
          validation: { layout: 'full' },
        },
        {
          key: 'acesso_internet',
          type: FormFieldType.SINGLE_CHOICE,
          label: 'Tem acesso à Internet?',
          description: 'Informe se possui acesso à Internet de casa',
          order: 2,
          required: true,
          options: ['Sim', 'Não'],
          validation: { layout: 'full' },
        },
        {
          key: 'conte_sua_historia',
          type: FormFieldType.LONG_TEXT,
          label: 'Conte sua história',
          description:
            'Onde você nasceu, com quem mora, como foi sua vida até aqui, o que gosta de fazer, o que te faz feliz, o que foi difícil? Pode escrever ou contar como se estivesse falando com alguém que quer muito te entender.',
          placeholder: 'Escreva aqui um pouco sobre você e sua trajetória...',
          order: 3,
          required: true,
          validation: { layout: 'full' },
        },
      ],
    },
    {
      title: 'Experiência Profissional',
      order: 2,
      condition: null,
      fields: [
        {
          key: 'atua_profissionalmente',
          type: FormFieldType.SINGLE_CHOICE,
          label: 'Atua ou já atuou profissionalmente?',
          order: 0,
          required: true,
          options: ['Sim', 'Não'],
          condition: null,
          validation: { layout: 'full' },
        },
        {
          key: 'ultimas_experiencias',
          type: FormFieldType.LONG_TEXT,
          label: 'Descreva suas últimas experiências profissionais',
          placeholder: 'Conte brevemente onde trabalhou ou quais atividades exerceu...',
          order: 1,
          required: false,
          condition: {
            fieldKey: 'atua_profissionalmente',
            operator: 'EQUALS',
            value: 'Sim',
          },
          validation: { layout: 'full' },
        },
      ],
    },
    {
      title: 'Considerações Finais',
      description: 'Para concluir sua ficha, compartilhe sua motivação para participar do projeto.',
      order: 3,
      condition: null,
      fields: [
        {
          key: 'por_que_brilha_mais',
          type: FormFieldType.LONG_TEXT,
          label: 'Por que o Brilha Mais?',
          description:
            'O que te motiva? Por que estes cursos são importantes para você agora? O que você espera aprender e o que quer fazer com isso no futuro?',
          placeholder: 'Compartilhe seus objetivos e expectativas...',
          order: 0,
          required: true,
          validation: { layout: 'full' },
        },
        {
          key: 'estagio',
          type: FormFieldType.SINGLE_CHOICE,
          label: 'Estágio e Oportunidades',
          description:
            'Após o curso, gostaria de fazer um estágio ou participar de oportunidades e entrevistas de emprego?',
          order: 1,
          required: true,
          options: ['Sim', 'Não', 'Talvez'],
          validation: { layout: 'full' },
        },
      ],
    },
  ],
};
