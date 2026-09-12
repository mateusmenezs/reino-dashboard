/**
 * options.js — Listas de opções do Construtor de Mentoria com IA (Reino Treinamentos).
 *
 * FONTE ÚNICA de todo enum do formulário.
 *
 * Contrato:
 * - `value` é snake_case, ESTÁVEL e IMUTÁVEL: é o que a IA do n8n lê no payload.
 *   Nunca renomeie um `value` depois do evento (renomear = quebrar dados históricos).
 * - `label` é o texto humano exibido na tela e enviado como `*_label` no payload.
 * - `description` (opcional) é a linha de apoio usada em cards selecionáveis.
 * - `exclusive: true` marca opções de multiselect que se anulam com as demais
 *   (selecionar uma limpa todas as outras — e as outras exclusivas entre si).
 * - `isOther: true` marca a opção que abre um campo de texto livre complementar.
 *
 * @typedef {Object} Option
 * @property {string} value        Valor estável (snake_case) gravado na resposta e no payload.
 * @property {string} label        Rótulo humano.
 * @property {string} [description] Texto de apoio (cards).
 * @property {boolean} [exclusive] Multiselect: limpa as demais seleções.
 * @property {boolean} [isOther]   Abre campo de texto livre complementar.
 */

/** Tipo de cliente da persona (Q14). @type {Option[]} */
export const TIPO_CLIENTE = [
  { value: 'pf', label: 'Pessoa Física' },
  { value: 'pj', label: 'Empresa' },
  { value: 'ambos', label: 'Pode ser ambos' },
  { value: 'nao_sei', label: 'Não sei' },
]

/** Faixa de renda mensal — persona Pessoa Física (Q16). @type {Option[]} */
export const FAIXA_RENDA_PF = [
  { value: 'ate_2_mil', label: 'Até R$ 2.000 por mês' },
  { value: 'de_2_a_5_mil', label: 'De R$ 2.000 a R$ 5.000 por mês' },
  { value: 'de_5_a_10_mil', label: 'De R$ 5.000 a R$ 10.000 por mês' },
  { value: 'de_10_a_20_mil', label: 'De R$ 10.000 a R$ 20.000 por mês' },
  { value: 'de_20_a_50_mil', label: 'De R$ 20.000 a R$ 50.000 por mês' },
  { value: 'acima_de_50_mil', label: 'Acima de R$ 50.000 por mês' },
  { value: 'outro', label: 'Outro / Não sei', isOther: true },
]

/** Faturamento mensal aproximado — persona Empresa (Q16b). @type {Option[]} */
export const FAIXA_FATURAMENTO_PJ = [
  { value: 'ate_10_mil', label: 'Até R$ 10 mil por mês' },
  { value: 'de_10_a_50_mil', label: 'De R$ 10 mil a R$ 50 mil por mês' },
  { value: 'de_50_a_100_mil', label: 'De R$ 50 mil a R$ 100 mil por mês' },
  { value: 'de_100_a_300_mil', label: 'De R$ 100 mil a R$ 300 mil por mês' },
  { value: 'de_300_mil_a_1_milhao', label: 'De R$ 300 mil a R$ 1 milhão por mês' },
  { value: 'acima_de_1_milhao', label: 'Acima de R$ 1 milhão por mês' },
  { value: 'outro', label: 'Outro / Não sei', isOther: true },
]

/** Prazo realista da transformação (Q23). @type {Option[]} */
export const PRAZO_TRANSFORMACAO = [
  { value: 'ate_4_semanas', label: 'Até 4 semanas' },
  { value: 'de_1_a_2_meses', label: '1 a 2 meses' },
  { value: 'tres_meses', label: '3 meses' },
  { value: 'de_4_a_6_meses', label: '4 a 6 meses' },
  { value: 'de_6_a_12_meses', label: '6 a 12 meses' },
  { value: 'mais_de_12_meses', label: 'Mais de 12 meses' },
  { value: 'nao_sei', label: 'Ainda não sei' },
]

/** Duração do acompanhamento da mentoria (Q30). @type {Option[]} */
export const DURACAO_ACOMPANHAMENTO = [
  { value: 'quatro_semanas', label: '4 semanas' },
  { value: 'oito_semanas', label: '8 semanas' },
  { value: 'tres_meses', label: '3 meses' },
  { value: 'quatro_meses', label: '4 meses' },
  { value: 'seis_meses', label: '6 meses' },
  { value: 'doze_meses', label: '12 meses' },
  { value: 'nao_sei', label: 'Ainda não sei' },
]

/** Carga horária semanal dedicada à entrega (Q31). @type {Option[]} */
export const CARGA_HORARIA_SEMANAL = [
  { value: 'ate_1h', label: 'Até 1 hora por semana' },
  { value: 'de_1_a_2h', label: '1 a 2 horas por semana' },
  { value: 'de_2_a_4h', label: '2 a 4 horas por semana' },
  { value: 'de_4_a_8h', label: '4 a 8 horas por semana' },
  { value: 'mais_de_8h', label: 'Mais de 8 horas por semana' },
  { value: 'nao_sei', label: 'Ainda não sei' },
]

/** Modelo de produto — cards da Etapa 5 (Q29). @type {Option[]} */
export const MODELO_PRODUTO = [
  {
    value: 'ensino',
    label: 'EU ENSINO, VOCÊ FAZ',
    description: 'Mais escalável. Exemplos: curso, evento, mentoria, imersão.',
  },
  {
    value: 'faco_com',
    label: 'EU FAÇO COM VOCÊ',
    description: 'Mais implementação e proximidade. Exemplos: consultoria e acompanhamento.',
  },
  {
    value: 'faco_por',
    label: 'EU FAÇO POR VOCÊ',
    description: 'Maior nível de execução. Exemplos: assessoria e operação.',
  },
  {
    value: 'nao_sei',
    label: 'Ainda não sei / quero recomendação',
    description: 'A IA recomenda o modelo mais adequado ao seu método.',
  },
]

/** Frequência do Hot Seat (Q35). @type {Option[]} */
export const FREQUENCIA_HOT_SEAT = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'recomendacao_ia', label: 'Quero recomendação' },
]

/**
 * Suporte entre os encontros (Q36 — multiselect).
 * `sem_suporte` e `nao_sei` são exclusivas: marcar uma limpa todas as outras.
 * @type {Option[]}
 */
export const SUPORTE_ENTRE_ENCONTROS = [
  { value: 'whatsapp_individual', label: 'WhatsApp individual' },
  { value: 'grupo_whatsapp', label: 'Grupo de WhatsApp' },
  { value: 'comunidade', label: 'Comunidade' },
  { value: 'email', label: 'E-mail' },
  { value: 'suporte_equipe', label: 'Suporte da equipe' },
  { value: 'sem_suporte', label: 'Sem suporte entre encontros', exclusive: true },
  { value: 'nao_sei', label: 'Ainda não sei', exclusive: true },
]

/** Sim / Não (Q28). @type {Option[]} */
export const SIM_NAO = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
]

/** Sim / Não / Ainda não sei (Q34). @type {Option[]} */
export const SIM_NAO_NAO_SEI = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
  { value: 'nao_sei', label: 'Ainda não sei' },
]

/** Os três públicos avaliados na Etapa 2 (Q12/Q13). @type {Option[]} */
export const PUBLICOS = [
  { value: 'A', label: 'PÚBLICO A' },
  { value: 'B', label: 'PÚBLICO B' },
  { value: 'C', label: 'PÚBLICO C' },
]

/** Ids dos públicos, na ordem de exibição e de desempate de score. @type {string[]} */
export const PUBLICO_IDS = PUBLICOS.map((p) => p.value)

/**
 * Critérios de nota (1–5) aplicados a cada público preenchido (Q12).
 * `value` é a chave gravada em `persona.publicos[].scores`.
 * @type {Array<Option & { question: string }>}
 */
export const CRITERIOS_PUBLICO = [
  {
    value: 'capacidade_financeira',
    label: 'Capacidade financeira',
    question: 'Esse público possui dinheiro para investir na solução?',
  },
  {
    value: 'velocidade_resultado',
    label: 'Velocidade de resultado',
    question: 'Esse público conseguiria perceber resultados relativamente rápido?',
  },
  {
    value: 'prazer_atender',
    label: 'Prazer em atender',
    question: 'Você gostaria de trabalhar frequentemente com esse tipo de cliente?',
  },
]

/** Escala das notas de público: 1 a 5 por critério, máximo 15 no total. */
export const ESCALA_PUBLICO = Object.freeze({
  min: 1,
  max: 5,
  maxTotal: CRITERIOS_PUBLICO.length * 5,
  selo: 'Maior potencial',
})

/** Todas as listas indexadas por nome — útil para debug e para o painel de revisão. */
export const OPTION_LISTS = Object.freeze({
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
})

/**
 * Rótulo humano de um valor dentro de uma lista de opções.
 * @param {Option[]} options Lista de opções.
 * @param {string} value Valor procurado.
 * @returns {string} Rótulo correspondente, ou '' se não encontrado/vazio.
 */
export function labelOf(options, value) {
  if (!Array.isArray(options) || !value) return ''
  const found = options.find((o) => o.value === value)
  return found ? found.label : ''
}

/**
 * Rótulos humanos de uma lista de valores (multiselect), na ordem da lista de opções.
 * @param {Option[]} options Lista de opções.
 * @param {string[]} values Valores selecionados.
 * @returns {string[]} Rótulos correspondentes (sem nulos).
 */
export function labelsOf(options, values) {
  if (!Array.isArray(options) || !Array.isArray(values)) return []
  return options.filter((o) => values.includes(o.value)).map((o) => o.label)
}

/**
 * Indica se um valor de multiselect é exclusivo (anula as demais seleções).
 * @param {Option[]} options Lista de opções.
 * @param {string} value Valor a testar.
 * @returns {boolean}
 */
export function isExclusiveOption(options, value) {
  if (!Array.isArray(options) || !value) return false
  const found = options.find((o) => o.value === value)
  return Boolean(found && found.exclusive)
}

/**
 * Aplica a regra de exclusividade de um multiselect.
 * Se a seleção contiver alguma opção `exclusive`, mantém apenas a última exclusiva marcada.
 * Caso contrário, devolve os valores válidos na ordem da lista de opções.
 * @param {Option[]} options Lista de opções.
 * @param {string[]} values Valores brutos selecionados.
 * @returns {string[]} Valores saneados.
 */
export function applyExclusive(options, values) {
  if (!Array.isArray(options) || !Array.isArray(values)) return []
  const valid = values.filter((v) => options.some((o) => o.value === v))
  const exclusives = valid.filter((v) => isExclusiveOption(options, v))
  if (exclusives.length > 0) return [exclusives[exclusives.length - 1]]
  return options.filter((o) => valid.includes(o.value)).map((o) => o.value)
}

/**
 * Valor da opção "Outro" de uma lista (a que abre campo de texto livre).
 * @param {Option[]} options Lista de opções.
 * @returns {string} Valor da opção "Outro", ou '' se a lista não tiver uma.
 */
export function otherValueOf(options) {
  if (!Array.isArray(options)) return ''
  const found = options.find((o) => o.isOther)
  return found ? found.value : ''
}
