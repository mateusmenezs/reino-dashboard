/**
 * questions.js — Estrutura central do Construtor de Mentoria com IA (Reino Treinamentos).
 *
 * ESTE ARQUIVO É A ÚNICA FONTE DE VERDADE DO FORMULÁRIO.
 * Nenhum componente pode hardcodar texto de pergunta, helper, opção ou obrigatoriedade.
 * Mudar um texto, um helper, uma opção ou a obrigatoriedade = editar UMA linha aqui.
 *
 * Hierarquia: STEPS (6 etapas) -> screens (sub-telas, máx. 3–4 perguntas) -> fields (perguntas).
 *
 * Regras de negócio implementadas aqui:
 * - `escape` marcada desabilita a obrigatoriedade do campo e grava `true` na chave `escape.id`.
 * - `escape.ai === true` significa "delegar à IA" (entra em `progress.ai_delegations` no payload).
 * - `visibleIf(answers)` e `requiredIf(answers)` são funções PURAS, sem efeitos colaterais.
 * - `id` é imutável: é a chave de resposta e o que a IA do n8n lê. Nunca renomear.
 * - `number` é o número EXIBIDO (1..37). Ramificações alternativas compartilham número
 *   (ex.: Q15 Pessoa Física e Q15b Empresa são ambas o número 15), por isso
 *   TOTAL_QUESTIONS (37) < ALL_FIELDS.length.
 *
 * @typedef {'text'|'textarea'|'radio'|'select'|'multiselect'|'audience-cards'|'repeater'|'steps-repeater'|'product-cards'|'phone'|'email'} FieldType
 *
 * @typedef {Object} Escape
 * @property {string} id    Chave de resposta booleana gravada quando marcada.
 * @property {string} label Texto do checkbox.
 * @property {boolean} [ai] true = delegação explícita à IA.
 *
 * @typedef {Object} Field
 * @property {string} id
 * @property {number|null} number
 * @property {FieldType} type
 * @property {string} label
 * @property {string} helper
 * @property {string} placeholder
 * @property {boolean} required
 * @property {boolean} optionalHint   true = exibir a marca "opcional" ao lado do label.
 * @property {number} minLength
 * @property {number} maxLength
 * @property {number} rows
 * @property {import('./options.js').Option[]|null} options
 * @property {((answers: Object) => import('./options.js').Option[])|null} optionsIf
 *   Opções DINÂMICAS: quando presente, é a lista que vale para estas respostas
 *   (ex.: Q13 só oferece os públicos que foram descritos). Use sempre
 *   `getFieldOptions(field, answers)` para ler — ele cai em `options` sozinho.
 *   `options` continua sendo a lista COMPLETA, para traduzir valor -> rótulo
 *   em telas de revisão (`labelOf`).
 * @property {{ value: string, placeholderFieldId: string }|null} otherOption
 * @property {Escape|null} escape
 * @property {string} aiFallback      Texto da opção de delegar à IA ('' quando não há).
 * @property {(answers: Object) => boolean} visibleIf
 * @property {((answers: Object) => boolean)|null} requiredIf
 * @property {string} payloadPath     Caminho do valor no JSON enviado ao n8n.
 * @property {{ text: string, visibleIf: (answers: Object) => boolean }|null} notice
 *   Aviso informativo exibido sob o campo quando `notice.visibleIf(answers)`.
 * @property {boolean} countable      Entra na contagem de progresso.
 *
 * Chaves extras por `type` (presentes só onde fazem sentido):
 * - `repeater` / `steps-repeater`:
 *   `addLabel` (texto do botão), `itemLabelPrefix` ('ERRO' | 'PASSO'),
 *   `min` / `max` (itens preenchidos exigidos/permitidos),
 *   `idealMin` / `idealMax` (faixa sugerida, só orientação de UI),
 *   `initialCount` (linhas abertas ao entrar na tela),
 *   `itemMinLength` / `itemMaxLength` (tamanho de cada item).
 *   Valor da resposta: `string[]`.
 * - `audience-cards`: `audiences` (PÚBLICO A/B/C), `criteria` (3 notas 1–5),
 *   `scale` ({ min, max, maxTotal, selo }), `requiredAudiences` (['A']).
 *   Valor da resposta:
 *   `{ A: { descricao, capacidade_financeira, velocidade_resultado, prazer_atender }, B: {…}, C: {…} }`.
 * - `multiselect`: `min` (seleções exigidas). Valor da resposta: `string[]`.
 *   Opções com `exclusive: true` limpam as demais (ver `applyExclusive` em options.js).
 * - `select` com `otherOption`: o texto livre é gravado na chave
 *   `otherOption.placeholderFieldId`, fora do campo principal.
 *
 * @typedef {Object} Screen
 * @property {string} id
 * @property {string} label
 * @property {string|null} sectionTitle
 * @property {string|null} sectionBody
 * @property {string|null} note        Nota informativa (não é pergunta).
 * @property {Field[]} fields
 * @property {(answers: Object) => boolean} visibleIf
 *
 * @typedef {Object} Step
 * @property {'lastro'|'persona'|'transformacao'|'metodo'|'produto'|'entrega'} id
 * @property {number} index
 * @property {string} title
 * @property {string} kicker
 * @property {{ title: string, body: string, diagram?: string[], flow?: string[] }} intro
 * @property {{ badge: string, body: string }} outro
 * @property {Screen[]} screens
 */

import {
  TIPO_CLIENTE,
  FAIXA_RENDA_PF,
  FAIXA_FATURAMENTO_PJ,
  PRAZO_TRANSFORMACAO,
  DURACAO_ACOMPANHAMENTO,
  CARGA_HORARIA_SEMANAL,
  MODELO_PRODUTO,
  FREQUENCIA_HOT_SEAT,
  SUPORTE_ENTRE_ENCONTROS,
  SIM_NAO,
  SIM_NAO_NAO_SEI,
  PUBLICOS,
  CRITERIOS_PUBLICO,
  ESCALA_PUBLICO,
} from './options.js'

/* ------------------------------------------------------------------ */
/* Predicados de visibilidade (puros, reutilizáveis)                   */
/* ------------------------------------------------------------------ */

const isPF = (a) => a.persona_tipo_cliente === 'pf' || a.persona_tipo_cliente === 'ambos'
const isPJ = (a) => a.persona_tipo_cliente === 'pj' || a.persona_tipo_cliente === 'ambos'

/**
 * Descrição de um público (A/B/C) dentro da resposta de Q12.
 * Tolerante a estado restaurado torto: qualquer coisa que não seja objeto vira ''.
 * @param {Object} answers Respostas atuais.
 * @param {string} id 'A' | 'B' | 'C'.
 * @returns {string} Descrição com trim, ou ''.
 */
function descricaoDoPublico(answers, id) {
  const fonte = answers && typeof answers.persona_publicos === 'object' && answers.persona_publicos
    ? answers.persona_publicos
    : {}
  const entry = fonte[id] && typeof fonte[id] === 'object' ? fonte[id] : {}
  return String(entry.descricao === undefined || entry.descricao === null ? '' : entry.descricao).trim()
}

/**
 * Públicos que o participante REALMENTE descreveu na Q12.
 * É o único conjunto sobre o qual a escolha da Q13 faz sentido: escolher um
 * público sem descrição manda a IA construir para alguém que ninguém descreveu.
 * @param {Object} [answers] Respostas atuais.
 * @returns {string[]} Ex.: ['A', 'C'] — sempre na ordem A, B, C.
 */
export function getPublicosDescritos(answers = {}) {
  return PUBLICOS.filter((p) => descricaoDoPublico(answers, p.value) !== '').map((p) => p.value)
}

/* ------------------------------------------------------------------ */
/* Definição das 6 etapas / 37 perguntas                               */
/* ------------------------------------------------------------------ */

const RAW_STEPS = [
  /* ================================ ETAPA 1 ================================ */
  {
    id: 'lastro',
    index: 1,
    title: 'SEU LASTRO',
    kicker: 'Etapa 1 de 6',
    intro: {
      title: 'Todo grande método começa com uma história.',
      body: 'Antes de criar sua mentoria, precisamos descobrir qual conhecimento, experiência ou resultado você possui que outras pessoas gostariam de conquistar.',
    },
    outro: {
      badge: 'Lastro identificado',
      body: 'Agora temos matéria-prima para encontrar o método escondido na sua história.',
    },
    screens: [
      {
        id: 'lastro-conhecimento',
        label: 'Seu conhecimento',
        fields: [
          {
            id: 'lastro_forca',
            number: 1,
            type: 'textarea',
            label: 'No que você é realmente bom?',
            helper: 'Pense em algo que você sabe fazer bem e que outras pessoas costumam pedir sua ajuda.',
            minLength: 20,
            payloadPath: 'lastro.forca',
          },
          {
            id: 'lastro_maior_resultado_proprio',
            number: 2,
            type: 'textarea',
            label: 'Qual foi o maior resultado que você já conquistou nessa área?',
            helper: 'Conte fatos. Sempre que possível, use números, prazos, resultados ou mudanças concretas.',
            minLength: 25,
            payloadPath: 'lastro.maior_resultado_proprio',
          },
          {
            id: 'lastro_melhor_resultado_terceiros',
            number: 3,
            type: 'textarea',
            label: 'Qual foi o melhor resultado que você já ajudou outra pessoa ou empresa a conquistar?',
            minLength: 20,
            escape: {
              id: 'lastro_terceiros_ausente',
              label: 'Ainda não gerei resultados para terceiros.',
            },
            payloadPath: 'lastro.melhor_resultado_terceiros',
          },
        ],
      },
      {
        id: 'lastro-historia',
        label: 'Sua história',
        sectionTitle: 'Vamos descobrir sua Narrativa Causal',
        sectionBody: 'Seu método normalmente nasce de uma sequência de acontecimentos. Queremos entender o que aconteceu antes, durante e depois da sua virada.',
        fields: [
          {
            id: 'lastro_narrativa_antes',
            number: 4,
            type: 'textarea',
            label: 'Antes de conquistar esse resultado, como estava sua situação?',
            helper: 'Conte onde você estava antes da mudança acontecer.',
            minLength: 20,
            payloadPath: 'lastro.narrativa.antes',
          },
          {
            id: 'lastro_narrativa_dificuldade',
            number: 5,
            type: 'textarea',
            label: 'Qual era a principal dificuldade, problema ou frustração daquele momento?',
            minLength: 15,
            payloadPath: 'lastro.narrativa.dificuldade',
          },
          {
            id: 'lastro_narrativa_tentativas_falhas',
            number: 6,
            type: 'textarea',
            label: 'O que você tentou fazer antes e não funcionou?',
            minLength: 15,
            payloadPath: 'lastro.narrativa.tentativas_falhas',
          },
        ],
      },
      {
        id: 'lastro-virada',
        label: 'Sua virada',
        fields: [
          {
            id: 'lastro_narrativa_virada',
            number: 7,
            type: 'textarea',
            label: 'Qual foi sua grande virada de chave?',
            helper: 'Pode ter sido uma decisão, descoberta, necessidade, experiência, estratégia ou mudança na forma de pensar.',
            minLength: 20,
            rows: 3,
            payloadPath: 'lastro.narrativa.virada',
          },
          {
            id: 'lastro_narrativa_novas_acoes',
            number: 8,
            type: 'textarea',
            label: 'O que você passou a fazer diferente depois dessa virada?',
            minLength: 20,
            rows: 3,
            payloadPath: 'lastro.narrativa.novas_acoes',
          },
          {
            id: 'lastro_narrativa_resultado_gerado',
            number: 9,
            type: 'textarea',
            label: 'Qual resultado essa nova forma de agir produziu?',
            minLength: 15,
            rows: 3,
            payloadPath: 'lastro.narrativa.resultado_gerado',
          },
          {
            id: 'lastro_narrativa_repeticao',
            number: 10,
            type: 'textarea',
            label: 'Você conseguiu repetir esse processo ou aplicar os mesmos princípios novamente?',
            helper: 'Pode ter sido com você ou ajudando outras pessoas.',
            minLength: 15,
            rows: 3,
            escape: {
              id: 'lastro_repeticao_ausente',
              label: 'Ainda não consegui repetir.',
            },
            payloadPath: 'lastro.narrativa.repeticao',
          },
        ],
      },
    ],
  },

  /* ================================ ETAPA 2 ================================ */
  {
    id: 'persona',
    index: 2,
    title: 'SUA PERSONA',
    kicker: 'Etapa 2 de 6',
    intro: {
      title: 'Quem deveria pagar para aprender o que você sabe?',
      body: 'Uma boa persona não é apenas alguém que precisa de você. É alguém que pode obter resultado, possui capacidade de investimento e que você gostaria de atender.',
    },
    outro: {
      badge: 'Persona mapeada',
      body: 'Sabendo para quem você fala, cada decisão da sua mentoria fica mais simples.',
    },
    screens: [
      {
        id: 'persona-quem',
        label: 'Quem quer o seu resultado',
        fields: [
          {
            id: 'persona_quem_deseja_resultado',
            number: 11,
            type: 'textarea',
            label: 'Quem gostaria de conquistar o resultado que você conquistou?',
            minLength: 15,
            payloadPath: 'persona.quem_deseja_resultado',
          },
        ],
      },
      {
        id: 'persona-publicos',
        label: 'Seus três públicos',
        fields: [
          {
            id: 'persona_publicos',
            number: 12,
            type: 'audience-cards',
            label: 'Quais são até 3 públicos que você acredita que poderia ajudar?',
            helper: 'Preencha o PÚBLICO A. B e C são opcionais — quanto mais você comparar, melhor a recomendação.',
            minLength: 10,
            audiences: PUBLICOS,
            criteria: CRITERIOS_PUBLICO,
            scale: ESCALA_PUBLICO,
            requiredAudiences: ['A'],
            payloadPath: 'persona.publicos',
          },
        ],
      },
      {
        id: 'persona-escolha',
        label: 'O público desta mentoria',
        fields: [
          {
            id: 'persona_publico_escolhido',
            number: 13,
            type: 'radio',
            label: 'Qual público você deseja usar para construir sua mentoria hoje?',
            /* Lista COMPLETA: é o que traduz valor -> rótulo na revisão. */
            options: PUBLICOS,
            /* Lista QUE VALE: só os públicos descritos na Q12. Escolher um
               público em branco faria a IA construir para um desconhecido. */
            optionsIf: (a) => {
              const descritos = getPublicosDescritos(a)
              return PUBLICOS.filter((p) => descritos.includes(p.value))
            },
            /* Com um público só descrito não existe escolha a fazer: a pergunta
               some e o payload assume esse público (`publico_escolhido_origem`
               = "unico_publico_descrito"). Quem quiser comparar volta na Q12 e
               descreve o B/C. */
            visibleIf: (a) => getPublicosDescritos(a).length > 1,
            aiFallback: 'Quero que a IA avalie e recomende',
            escape: {
              id: 'persona_escolha_delegada_ia',
              label: 'Quero que a IA avalie e recomende',
              ai: true,
            },
            notice: {
              text: 'Esse público ainda não foi descrito na pergunta anterior. Volte e descreva, ou peça a recomendação da IA — sem a descrição não há o que construir para ele.',
              visibleIf: (a) => {
                const escolhido = typeof a.persona_publico_escolhido === 'string'
                  ? a.persona_publico_escolhido
                  : ''
                return escolhido !== '' && !getPublicosDescritos(a).includes(escolhido)
              },
            },
            payloadPath: 'persona.publico_escolhido',
          },
          {
            id: 'persona_tipo_cliente',
            number: 14,
            type: 'radio',
            label: 'Esse cliente é principalmente:',
            options: TIPO_CLIENTE,
            payloadPath: 'persona.tipo_cliente',
          },
        ],
      },
      {
        id: 'persona-pf',
        label: 'Perfil da pessoa',
        visibleIf: isPF,
        fields: [
          {
            id: 'persona_pf_perfil',
            number: 15,
            type: 'text',
            label: 'Qual profissão, ocupação ou perfil dessa pessoa?',
            minLength: 4,
            maxLength: 160,
            visibleIf: isPF,
            payloadPath: 'persona.pf.perfil',
          },
          {
            id: 'persona_pf_faixa_renda',
            number: 16,
            type: 'select',
            label: 'Qual a faixa aproximada de renda mensal?',
            options: FAIXA_RENDA_PF,
            otherOption: { value: 'outro', placeholderFieldId: 'persona_pf_faixa_renda_outro' },
            visibleIf: isPF,
            payloadPath: 'persona.pf.faixa_renda',
          },
        ],
      },
      {
        id: 'persona-pj',
        label: 'Perfil da empresa',
        visibleIf: isPJ,
        fields: [
          {
            id: 'persona_pj_segmento',
            number: 15,
            type: 'text',
            label: 'Qual segmento ou tipo de empresa?',
            minLength: 4,
            maxLength: 160,
            visibleIf: isPJ,
            payloadPath: 'persona.pj.segmento',
          },
          {
            id: 'persona_pj_faixa_faturamento',
            number: 16,
            type: 'select',
            label: 'Qual o faturamento mensal aproximado?',
            options: FAIXA_FATURAMENTO_PJ,
            otherOption: { value: 'outro', placeholderFieldId: 'persona_pj_faixa_faturamento_outro' },
            visibleIf: isPJ,
            payloadPath: 'persona.pj.faixa_faturamento',
          },
        ],
      },
      {
        id: 'persona-dor',
        label: 'Dor e desejo',
        fields: [
          {
            id: 'persona_dor_principal',
            number: 17,
            type: 'textarea',
            label: 'Qual é a principal dor dessa pessoa hoje?',
            minLength: 20,
            payloadPath: 'persona.dor_principal',
          },
          {
            id: 'persona_desejo_principal',
            number: 18,
            type: 'textarea',
            label: 'O que ela mais deseja conquistar?',
            minLength: 20,
            payloadPath: 'persona.desejo_principal',
          },
        ],
      },
      {
        id: 'persona-tentativas',
        label: 'O que ela já tentou',
        fields: [
          {
            id: 'persona_tentativas_anteriores',
            number: 19,
            type: 'textarea',
            label: 'O que ela provavelmente já tentou fazer para resolver esse problema?',
            minLength: 15,
            payloadPath: 'persona.tentativas_anteriores',
          },
          {
            id: 'persona_por_que_falham',
            number: 20,
            type: 'textarea',
            label: 'Por que essas tentativas normalmente não funcionam?',
            minLength: 15,
            payloadPath: 'persona.por_que_falham',
          },
        ],
      },
    ],
  },

  /* ================================ ETAPA 3 ================================ */
  {
    id: 'transformacao',
    index: 3,
    title: 'SUA TRANSFORMAÇÃO',
    kicker: 'Etapa 3 de 6',
    intro: {
      title: 'PONTO A → SEU MÉTODO → PONTO B',
      body: 'Sua mentoria existe para conduzir uma pessoa de uma situação atual até uma situação desejada.',
      diagram: ['PONTO A', 'SEU MÉTODO', 'PONTO B'],
    },
    outro: {
      badge: 'Transformação definida',
      body: 'Com o começo e o fim definidos, o caminho entre os dois fica visível.',
    },
    screens: [
      {
        id: 'transformacao-pontos',
        label: 'Ponto A e Ponto B',
        fields: [
          {
            id: 'transformacao_ponto_a',
            number: 21,
            type: 'textarea',
            label: 'PONTO A — Como essa pessoa normalmente chega até você?',
            helper: 'Descreva sua situação, dificuldades e estágio atual.',
            minLength: 25,
            payloadPath: 'transformacao.ponto_a',
          },
          {
            id: 'transformacao_ponto_b',
            number: 22,
            type: 'textarea',
            label: 'PONTO B — Como você gostaria que ela estivesse depois de passar pelo seu método?',
            helper: 'Descreva o resultado final de maneira concreta.',
            minLength: 25,
            payloadPath: 'transformacao.ponto_b',
          },
        ],
      },
      {
        id: 'transformacao-prazo',
        label: 'Prazo e evidências',
        fields: [
          {
            id: 'transformacao_prazo_estimado',
            number: 23,
            type: 'radio',
            label: 'Em quanto tempo você acredita que essa transformação pode começar a acontecer de forma realista?',
            options: PRAZO_TRANSFORMACAO,
            payloadPath: 'transformacao.prazo_estimado',
          },
          {
            id: 'transformacao_evidencias_resultado',
            number: 24,
            type: 'textarea',
            label: 'Como saberemos que essa pessoa teve resultado?',
            helper: 'Quais fatos, números, comportamentos ou mudanças demonstrariam que ela avançou?',
            minLength: 20,
            payloadPath: 'transformacao.evidencias_resultado',
          },
        ],
      },
    ],
  },

  /* ================================ ETAPA 4 ================================ */
  {
    id: 'metodo',
    index: 4,
    title: 'SEU MÉTODO',
    kicker: 'Etapa 4 de 6',
    intro: {
      title: 'Agora vamos encontrar o caminho entre o Ponto A e o Ponto B.',
      body: 'Seu método já existe dentro da sua experiência. Vamos apenas organizá-lo em etapas que outra pessoa consiga seguir.',
    },
    outro: {
      badge: 'Método mapeado',
      body: 'O caminho que você percorreu agora tem forma de processo.',
    },
    screens: [
      {
        id: 'metodo-erros',
        label: 'Erros do seu público',
        fields: [
          {
            id: 'metodo_erros_comuns',
            number: 25,
            type: 'repeater',
            label: 'Quais são os principais erros que seu público comete tentando resolver esse problema?',
            helper: 'O ideal é listar de 3 a 5 erros.',
            addLabel: '+ Adicionar erro',
            itemLabelPrefix: 'ERRO',
            min: 2,
            max: 6,
            idealMin: 3,
            idealMax: 5,
            itemMinLength: 10,
            itemMaxLength: 300,
            payloadPath: 'metodo.erros_comuns',
          },
        ],
      },
      {
        id: 'metodo-diagnostico',
        label: 'A virada do método',
        fields: [
          {
            id: 'metodo_por_que_falham',
            number: 26,
            type: 'textarea',
            label: 'Por que esses caminhos costumam falhar?',
            minLength: 15,
            payloadPath: 'metodo.por_que_falham',
          },
          {
            id: 'metodo_o_que_precisa_ser_diferente',
            number: 27,
            type: 'textarea',
            label: 'O que você acredita que precisa ser feito de forma diferente?',
            minLength: 20,
            payloadPath: 'metodo.o_que_precisa_ser_diferente',
          },
        ],
      },
      {
        id: 'metodo-passos',
        label: 'Os passos do seu método',
        fields: [
          {
            id: 'metodo_passos',
            number: null,
            type: 'steps-repeater',
            label: 'Imagine que uma pessoa chegou no Ponto A hoje. Se você tivesse que conduzi-la até o Ponto B, quais seriam as etapas?',
            helper: 'Nenhum passo é obrigatório individualmente. Escreva o que já estiver claro.',
            addLabel: '+ Adicionar passo',
            itemLabelPrefix: 'PASSO',
            initialCount: 5,
            min: 1,
            max: 8,
            itemMinLength: 0,
            itemMaxLength: 300,
            escape: {
              id: 'metodo_passos_delegados_ia',
              label: 'Ainda não sei organizar meu processo. Quero que a IA faça isso comigo.',
              ai: true,
            },
            aiFallback: 'Ainda não sei organizar meu processo. Quero que a IA faça isso comigo.',
            payloadPath: 'metodo.passos',
          },
        ],
      },
      {
        id: 'metodo-nome',
        label: 'Nome do método',
        fields: [
          {
            id: 'metodo_tem_nome',
            number: 28,
            type: 'radio',
            label: 'Seu método já possui um nome?',
            options: SIM_NAO,
            notice: {
              text: 'Tudo bem. A IA analisará sua história, mecanismo e transformação e sugerirá nomes.',
              visibleIf: (a) => a.metodo_tem_nome === 'nao',
            },
            payloadPath: 'metodo.tem_nome',
          },
          {
            id: 'metodo_nome',
            number: null,
            type: 'text',
            label: 'Qual é o nome?',
            minLength: 2,
            maxLength: 120,
            visibleIf: (a) => a.metodo_tem_nome === 'sim',
            requiredIf: (a) => a.metodo_tem_nome === 'sim',
            payloadPath: 'metodo.nome',
          },
        ],
      },
    ],
  },

  /* ================================ ETAPA 5 ================================ */
  {
    id: 'produto',
    index: 5,
    title: 'SEU PRODUTO',
    kicker: 'Etapa 5 de 6',
    intro: {
      title: 'Como você quer transformar seu método em produto?',
      body: 'Existem três formas clássicas de entregar conhecimento. Cada uma muda o nível de escala e de proximidade.',
    },
    outro: {
      badge: 'Produto mapeado',
      body: 'Seu método agora tem formato, duração e ritmo de entrega.',
    },
    screens: [
      {
        id: 'produto-modelo',
        label: 'Modelo de entrega',
        note: 'Neste evento, nosso foco principal será estruturar uma Mentoria Hot Seat escalável. A IA poderá recomendar adaptações caso seu caso exija.',
        fields: [
          {
            id: 'produto_modelo',
            number: 29,
            type: 'product-cards',
            label: 'Qual modelo mais representa o produto que você gostaria de construir?',
            options: MODELO_PRODUTO,
            aiFallback: 'Ainda não sei / quero recomendação',
            payloadPath: 'produto.modelo',
          },
        ],
      },
      {
        id: 'produto-ritmo',
        label: 'Tempo e dedicação',
        fields: [
          {
            id: 'produto_duracao_acompanhamento',
            number: 30,
            type: 'radio',
            label: 'Por quanto tempo você imagina acompanhar seus mentorados?',
            options: DURACAO_ACOMPANHAMENTO,
            payloadPath: 'produto.duracao_acompanhamento',
          },
          {
            id: 'produto_carga_horaria_semanal',
            number: 31,
            type: 'radio',
            label: 'Quanto tempo por semana você deseja dedicar à entrega dessa mentoria?',
            options: CARGA_HORARIA_SEMANAL,
            payloadPath: 'produto.carga_horaria_semanal',
          },
          {
            id: 'produto_entregas_indispensaveis',
            number: 32,
            type: 'textarea',
            label: 'Existe alguma entrega que você considera indispensável?',
            helper: 'Ex.: encontro individual, comunidade, WhatsApp, materiais, aulas, análises, templates.',
            required: false,
            optionalHint: true,
            minLength: 0,
            rows: 3,
            payloadPath: 'produto.entregas_indispensaveis',
          },
        ],
      },
    ],
  },

  /* ================================ ETAPA 6 ================================ */
  {
    id: 'entrega',
    index: 6,
    title: 'SUA ENTREGA',
    kicker: 'Etapa 6 de 6',
    intro: {
      title: 'Agora vamos construir a máquina de acompanhamento.',
      body: 'É esse ciclo que transforma o seu método em resultado repetível para cada mentorado.',
      flow: ['BRIEFING', 'DIAGNÓSTICO', 'PLANO DE AÇÃO', 'HOT SEAT', 'FOLLOW-UP'],
    },
    outro: {
      badge: 'Entrega mapeada',
      body: 'Sua mentoria já tem método, público, transformação e máquina de acompanhamento.',
    },
    screens: [
      {
        id: 'entrega-briefing',
        label: 'Briefing e diagnóstico',
        fields: [
          {
            id: 'entrega_briefing_necessario',
            number: 33,
            type: 'textarea',
            label: 'O que você precisaria saber sobre um novo cliente antes de dizer o que ele deve fazer?',
            helper: 'Quais informações mudariam sua recomendação?',
            minLength: 20,
            payloadPath: 'entrega.briefing_necessario',
          },
          {
            id: 'entrega_tem_niveis',
            number: 34,
            type: 'radio',
            label: 'Existem diferentes níveis ou estágios entre seus clientes?',
            options: SIM_NAO_NAO_SEI,
            notice: {
              text: 'A IA poderá criar uma classificação personalizada com base no seu método.',
              visibleIf: (a) => a.entrega_tem_niveis === 'nao' || a.entrega_tem_niveis === 'nao_sei',
            },
            payloadPath: 'entrega.tem_niveis',
          },
          {
            id: 'entrega_niveis_descricao',
            number: null,
            type: 'textarea',
            label: 'Descreva os níveis que você já identifica.',
            minLength: 15,
            rows: 3,
            visibleIf: (a) => a.entrega_tem_niveis === 'sim',
            requiredIf: (a) => a.entrega_tem_niveis === 'sim',
            payloadPath: 'entrega.niveis_descricao',
          },
        ],
      },
      {
        id: 'entrega-hot-seat',
        label: 'Hot Seat e suporte',
        fields: [
          {
            id: 'entrega_frequencia_hot_seat',
            number: 35,
            type: 'radio',
            label: 'Qual frequência de Hot Seat você prefere?',
            options: FREQUENCIA_HOT_SEAT,
            aiFallback: 'Quero recomendação',
            payloadPath: 'entrega.frequencia_hot_seat',
          },
          {
            id: 'entrega_suporte_entre_encontros',
            number: 36,
            type: 'multiselect',
            label: 'Como você gostaria de oferecer suporte entre os encontros?',
            helper: 'Pode marcar mais de uma opção.',
            options: SUPORTE_ENTRE_ENCONTROS,
            min: 1,
            payloadPath: 'entrega.suporte_entre_encontros',
          },
        ],
      },
      {
        id: 'entrega-contexto',
        label: 'Contexto final',
        fields: [
          {
            id: 'entrega_contexto_adicional',
            number: 37,
            type: 'textarea',
            label: 'Existe alguma informação importante sobre você, seu método ou seus clientes que ainda não perguntamos?',
            helper: 'Use este espaço para qualquer contexto que possa melhorar a recomendação da IA.',
            required: false,
            optionalHint: true,
            minLength: 0,
            payloadPath: 'entrega.contexto_adicional',
          },
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Normalização: garante que todo Field tenha a forma completa          */
/* ------------------------------------------------------------------ */

const ALWAYS_VISIBLE = () => true

const DEFAULT_MAX_LENGTH = { textarea: 1200, text: 200 }
const DEFAULT_ROWS = { textarea: 4 }

function normalizeField(raw) {
  const type = raw.type || 'textarea'
  const field = {
    number: null,
    helper: '',
    placeholder: '',
    required: true,
    optionalHint: false,
    minLength: 0,
    maxLength: DEFAULT_MAX_LENGTH[type] || 0,
    rows: DEFAULT_ROWS[type] || 0,
    options: null,
    optionsIf: null,
    otherOption: null,
    escape: null,
    aiFallback: '',
    notice: null,
    requiredIf: null,
    countable: true,
    ...raw,
    type,
    visibleIf: typeof raw.visibleIf === 'function' ? raw.visibleIf : ALWAYS_VISIBLE,
  }
  return Object.freeze(field)
}

function normalizeScreen(raw, step) {
  const screen = {
    sectionTitle: null,
    sectionBody: null,
    note: null,
    ...raw,
    stepId: step.id,
    stepIndex: step.index,
    visibleIf: typeof raw.visibleIf === 'function' ? raw.visibleIf : ALWAYS_VISIBLE,
    fields: Object.freeze(raw.fields.map(normalizeField)),
  }
  return Object.freeze(screen)
}

function normalizeStep(raw) {
  const step = { ...raw }
  step.screens = Object.freeze(raw.screens.map((s) => normalizeScreen(s, raw)))
  return Object.freeze(step)
}

/**
 * As 6 etapas do briefing, já normalizadas e congeladas.
 * @type {Step[]}
 */
export const STEPS = Object.freeze(RAW_STEPS.map(normalizeStep))

/**
 * Todos os campos de todas as etapas, achatados na ordem de exibição.
 * @type {Field[]}
 */
export const ALL_FIELDS = Object.freeze(
  STEPS.flatMap((step) => step.screens.flatMap((screen) => screen.fields)),
)

/**
 * Índice `id -> Field`.
 * @type {Record<string, Field>}
 */
export const FIELD_BY_ID = Object.freeze(
  ALL_FIELDS.reduce((acc, field) => {
    acc[field.id] = field
    return acc
  }, {}),
)

/**
 * Total de perguntas NUMERADAS exibidas ao participante (37).
 * Ramificações alternativas (PF/PJ) compartilham o mesmo número, por isso
 * este total é menor que `ALL_FIELDS.length`.
 * @type {number}
 */
export const TOTAL_QUESTIONS = new Set(
  ALL_FIELDS.map((f) => f.number).filter((n) => typeof n === 'number'),
).size

/**
 * Índice `stepId -> Step`.
 * @type {Record<string, Step>}
 */
export const STEP_BY_ID = Object.freeze(
  STEPS.reduce((acc, step) => {
    acc[step.id] = step
    return acc
  }, {}),
)

/** Ids das etapas na ordem oficial. @type {string[]} */
export const STEP_IDS = Object.freeze(STEPS.map((s) => s.id))

/** Chaves booleanas de escape/delegação, na ordem em que aparecem. @type {string[]} */
export const ESCAPE_IDS = Object.freeze(
  ALL_FIELDS.filter((f) => f.escape).map((f) => f.escape.id),
)

/* ------------------------------------------------------------------ */
/* Consultas puras                                                     */
/* ------------------------------------------------------------------ */

/**
 * Campos visíveis de uma sub-tela para o conjunto de respostas atual.
 * @param {Screen|null|undefined} screen Sub-tela.
 * @param {Object} [answers] Mapa `{ [fieldId]: value }`.
 * @returns {Field[]} Campos visíveis, na ordem de exibição.
 */
export function getVisibleFields(screen, answers = {}) {
  if (!screen || !Array.isArray(screen.fields)) return []
  return screen.fields.filter((field) => field.visibleIf(answers))
}

/**
 * Sub-telas visíveis de uma etapa (descarta telas sem nenhum campo visível).
 * @param {Step|null|undefined} step Etapa.
 * @param {Object} [answers] Mapa `{ [fieldId]: value }`.
 * @returns {Screen[]} Sub-telas visíveis, na ordem de exibição.
 */
export function getVisibleScreens(step, answers = {}) {
  if (!step || !Array.isArray(step.screens)) return []
  return step.screens.filter(
    (screen) => screen.visibleIf(answers) && getVisibleFields(screen, answers).length > 0,
  )
}

/**
 * Posição humana de uma sub-tela dentro da etapa, considerando condicionais.
 * @param {Step} step Etapa.
 * @param {Screen} screen Sub-tela.
 * @param {Object} [answers] Respostas atuais.
 * @returns {{ index: number, total: number, counter: string, label: string }}
 *   `counter` = "1/3"; `label` = "1/3 — Seu conhecimento".
 */
export function getScreenPosition(step, screen, answers = {}) {
  const visible = getVisibleScreens(step, answers)
  const index = visible.findIndex((s) => s.id === screen.id) + 1
  const total = visible.length
  const counter = index > 0 && total > 0 ? `${index}/${total}` : ''
  return {
    index,
    total,
    counter,
    label: counter ? `${counter} — ${screen.label}` : screen.label,
  }
}

/**
 * Todos os campos visíveis de uma etapa.
 * @param {Step} step Etapa.
 * @param {Object} [answers] Respostas atuais.
 * @returns {Field[]}
 */
export function getVisibleFieldsOfStep(step, answers = {}) {
  return getVisibleScreens(step, answers).flatMap((screen) => getVisibleFields(screen, answers))
}

/**
 * Opções que valem para ESTAS respostas.
 * Campos com `optionsIf` (hoje só a Q13) têm lista dinâmica; todos os outros
 * devolvem `field.options`. Quem renderiza um campo de escolha deve ler as
 * opções por aqui, nunca direto de `field.options` — senão oferece alternativa
 * que o participante não pode escolher.
 * @param {Field|string} field Campo ou id do campo.
 * @param {Object} [answers] Respostas atuais.
 * @returns {import('./options.js').Option[]} Lista de opções (nunca null).
 */
export function getFieldOptions(field, answers = {}) {
  const f = typeof field === 'string' ? FIELD_BY_ID[field] : field
  if (!f) return []
  if (typeof f.optionsIf === 'function') {
    const dynamic = f.optionsIf(answers)
    if (Array.isArray(dynamic)) return dynamic
  }
  return Array.isArray(f.options) ? f.options : []
}

/**
 * O campo está visível para estas respostas?
 * @param {Field|string} field Campo ou id do campo.
 * @param {Object} [answers] Respostas atuais.
 * @returns {boolean} false também quando o id não existe no schema.
 */
export function isFieldVisible(field, answers = {}) {
  const f = typeof field === 'string' ? FIELD_BY_ID[field] : field
  if (!f) return false
  return f.visibleIf(answers)
}

/**
 * A escape (ou delegação à IA) do campo está marcada?
 * @param {Field|string} field Campo ou id do campo.
 * @param {Object} [answers] Respostas atuais.
 * @returns {boolean}
 */
export function isFieldEscaped(field, answers = {}) {
  const f = typeof field === 'string' ? FIELD_BY_ID[field] : field
  if (!f || !f.escape) return false
  return answers[f.escape.id] === true
}

/**
 * Obrigatoriedade efetiva: respeita `requiredIf`, `visibleIf` e escapes marcadas.
 * @param {Field|string} field Campo ou id do campo.
 * @param {Object} [answers] Respostas atuais.
 * @returns {boolean}
 */
export function isFieldRequired(field, answers = {}) {
  const f = typeof field === 'string' ? FIELD_BY_ID[field] : field
  if (!f) return false
  if (!f.visibleIf(answers)) return false
  if (isFieldEscaped(f, answers)) return false
  if (typeof f.requiredIf === 'function') return f.requiredIf(answers)
  return f.required
}

/**
 * O campo tem conteúdo preenchido (independente de validação de tamanho)?
 * Considera a forma de valor de cada `type`, inclusive escapes marcadas.
 * @param {Field|string} field Campo ou id do campo.
 * @param {Object} [answers] Respostas atuais.
 * @returns {boolean}
 */
export function hasAnswer(field, answers = {}) {
  const f = typeof field === 'string' ? FIELD_BY_ID[field] : field
  if (!f) return false
  if (isFieldEscaped(f, answers)) return true
  const value = answers[f.id]
  if (value === null || value === undefined) return false

  if (f.type === 'multiselect') return Array.isArray(value) && value.length > 0
  if (f.type === 'repeater' || f.type === 'steps-repeater') {
    return Array.isArray(value) && value.some((item) => String(item ?? '').trim() !== '')
  }
  if (f.type === 'audience-cards') {
    if (typeof value !== 'object') return false
    return (f.requiredAudiences || ['A']).every(
      (id) => String((value[id] || {}).descricao ?? '').trim() !== '',
    )
  }
  if (typeof value === 'boolean') return true
  if (typeof value === 'number') return true
  return String(value).trim() !== ''
}
