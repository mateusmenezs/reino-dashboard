/**
 * payload.js — Contrato de dados enviado ao webhook do n8n.
 *
 * ============================ LEIA ANTES DE CONSUMIR ============================
 * Este arquivo produz o JSON único que a IA do n8n recebe para construir a mentoria.
 * O formato é ESTÁVEL e previsível. Regras que valem para TODO o payload:
 *
 * 1. Nunca existe `null` ou `undefined`. Texto ausente = "" (string vazia).
 *    Lista ausente = [] (array vazio). Booleano ausente = false.
 * 2. Todo texto vem com `trim()` aplicado. Não há HTML, markdown ou rótulo visual
 *    misturado ao conteúdo.
 * 3. Escolhas fechadas viajam em DOIS campos: o enum estável em snake_case
 *    (ex.: `"prazo_estimado": "tres_meses"`) e o rótulo humano
 *    (ex.: `"prazo_estimado_label": "3 meses"`). Use o enum para lógica,
 *    o label para redigir texto.
 * 4. Campos de ramificação não respondidos vêm vazios: se `persona.tipo_cliente`
 *    é `"pj"`, todo o bloco `persona.pf` vem com strings vazias (e vice-versa).
 *    Se `tipo_cliente` é `"ambos"`, os dois blocos vêm preenchidos.
 * 5. "Escapes" são confissões de ausência, não erro de preenchimento:
 *    - `lastro.melhor_resultado_terceiros_ausente: true` -> ainda não gerou
 *      resultado para terceiros; o texto correspondente virá "".
 *    - `lastro.narrativa.repeticao_ausente: true` -> ainda não repetiu o processo.
 *    - `metodo.passos_delegados_ia: true` -> o participante pediu que a IA
 *      organize os passos; `metodo.passos` virá [].
 * 6. `progress.ai_delegations` é a lista de pontos onde o participante pediu
 *    explicitamente recomendação da IA (ou declarou "ainda não sei"). É o mapa
 *    do que a IA precisa PROPOR em vez de apenas organizar. Valores possíveis:
 *    "persona.escolha", "persona.tipo_cliente", "transformacao.prazo",
 *    "metodo.passos", "metodo.nome", "produto.modelo", "produto.duracao",
 *    "produto.carga_horaria", "entrega.niveis", "entrega.hot_seat",
 *    "entrega.suporte".
 * 7. `persona.publicos` traz apenas os públicos com algum conteúdo. Cada um tem
 *    3 notas de 1 a 5 e `score_total` (0..15). `persona.maior_score` é o id do
 *    público com maior `score_total` — é um indicador de potencial, NÃO
 *    necessariamente a persona escolhida (essa é `persona.publico_escolhido`).
 * 8. `progress.total_questions` é o total de perguntas QUE SE APLICAVAM a este
 *    participante: obrigatórias visíveis + opcionais que ele respondeu.
 *    O formulário tem 37 perguntas numeradas, mas a ramificação PF/PJ, os
 *    campos condicionais e as opcionais em branco alteram o total efetivo.
 *    `answered_questions` nunca excede `total_questions`, e
 *    `completion_pct === 100` significa briefing pronto para envio.
 * 9. O payload NUNCA contém preço, ticket, faturamento esperado da mentoria ou
 *    consequência financeira da transformação — essas perguntas não existem.
 * ==============================================================================
 */

import {
  ALL_FIELDS,
  FIELD_BY_ID,
  STEPS,
  hasAnswer,
  isFieldRequired,
  isFieldVisible,
} from './questions.js'

import {
  CRITERIOS_PUBLICO,
  PUBLICO_IDS,
  ESCALA_PUBLICO,
  SUPORTE_ENTRE_ENCONTROS,
  TIPO_CLIENTE,
  FAIXA_RENDA_PF,
  FAIXA_FATURAMENTO_PJ,
  PRAZO_TRANSFORMACAO,
  DURACAO_ACOMPANHAMENTO,
  CARGA_HORARIA_SEMANAL,
  MODELO_PRODUTO,
  FREQUENCIA_HOT_SEAT,
  applyExclusive,
  labelOf,
  labelsOf,
} from './options.js'

/** Versão do contrato de payload. Suba ao mudar o formato de forma incompatível. */
export const PAYLOAD_VERSION = '1.0'

/* ------------------------------------------------------------------ */
/* Normalizadores primitivos                                           */
/* ------------------------------------------------------------------ */

/** @param {*} v @returns {string} String com trim; '' para ausência. */
function str(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v).trim()
}

/** @param {*} v @returns {boolean} */
function bool(v) {
  return v === true
}

/** @param {*} v @returns {number} Inteiro entre min e max; 0 quando inválido. */
function score(v, min = 0, max = ESCALA_PUBLICO.max) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  const rounded = Math.round(n)
  if (rounded < min) return 0
  return Math.min(rounded, max)
}

/** @param {*} v @returns {string[]} Lista de strings com trim, sem vazios. */
function strList(v) {
  if (!Array.isArray(v)) return []
  return v.map(str).filter((s) => s !== '')
}

/* ------------------------------------------------------------------ */
/* Leitura respeitando visibilidade condicional                        */
/* ------------------------------------------------------------------ */

/**
 * Lê o valor bruto de um campo do schema, devolvendo `undefined` quando o campo
 * não está visível para essas respostas (ramificação não escolhida).
 */
function raw(answers, id) {
  const field = FIELD_BY_ID[id]
  if (field && !isFieldVisible(field, answers)) return undefined
  return answers[id]
}

/** Texto de um campo do schema, já saneado e respeitando visibilidade. */
function text(answers, id) {
  return str(raw(answers, id))
}

/** Enum de um campo do schema (string estável), respeitando visibilidade. */
function enumOf(answers, id) {
  return str(raw(answers, id))
}

/* ------------------------------------------------------------------ */
/* Telefone BR                                                         */
/* ------------------------------------------------------------------ */

/**
 * Normaliza um telefone brasileiro para E.164 (+5511912345678).
 * @param {string} value Telefone digitado, com ou sem máscara.
 * @returns {string} Telefone em E.164, ou '' quando não há dígitos suficientes.
 */
export function normalizePhoneBR(value) {
  const digits = str(value).replace(/\D/g, '')
  if (!digits) return ''
  const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits
  if (local.length !== 10 && local.length !== 11) return ''
  return `+55${local}`
}

/**
 * Formata um telefone brasileiro para exibição: (11) 91234-5678.
 * @param {string} value Telefone digitado ou em E.164.
 * @returns {string} Telefone formatado, ou '' quando inválido.
 */
export function formatPhoneBR(value) {
  const e164 = normalizePhoneBR(value)
  if (!e164) return ''
  const local = e164.slice(3)
  const ddd = local.slice(0, 2)
  const rest = local.slice(2)
  const head = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4)
  const tail = rest.length === 9 ? rest.slice(5) : rest.slice(4)
  return `(${ddd}) ${head}-${tail}`
}

/* ------------------------------------------------------------------ */
/* Delegações à IA                                                     */
/* ------------------------------------------------------------------ */

/**
 * Regras que definem `progress.ai_delegations`.
 * Ordem fixa e determinística — a IA pode confiar na ordem de leitura.
 * @type {ReadonlyArray<{ key: string, when: (answers: Object) => boolean }>}
 */
export const AI_DELEGATION_RULES = Object.freeze([
  { key: 'persona.escolha', when: (a) => bool(a.persona_escolha_delegada_ia) },
  { key: 'persona.tipo_cliente', when: (a) => a.persona_tipo_cliente === 'nao_sei' },
  { key: 'transformacao.prazo', when: (a) => a.transformacao_prazo_estimado === 'nao_sei' },
  { key: 'metodo.passos', when: (a) => bool(a.metodo_passos_delegados_ia) },
  { key: 'metodo.nome', when: (a) => a.metodo_tem_nome === 'nao' },
  { key: 'produto.modelo', when: (a) => a.produto_modelo === 'nao_sei' },
  { key: 'produto.duracao', when: (a) => a.produto_duracao_acompanhamento === 'nao_sei' },
  { key: 'produto.carga_horaria', when: (a) => a.produto_carga_horaria_semanal === 'nao_sei' },
  {
    key: 'entrega.niveis',
    when: (a) => a.entrega_tem_niveis === 'nao' || a.entrega_tem_niveis === 'nao_sei',
  },
  { key: 'entrega.hot_seat', when: (a) => a.entrega_frequencia_hot_seat === 'recomendacao_ia' },
  {
    key: 'entrega.suporte',
    when: (a) => Array.isArray(a.entrega_suporte_entre_encontros)
      && a.entrega_suporte_entre_encontros.includes('nao_sei'),
  },
])

/**
 * Pontos em que o participante pediu recomendação da IA (ou declarou não saber).
 * @param {Object} [answers] Mapa `{ [fieldId]: value }`.
 * @returns {string[]} Ex.: ['persona.escolha', 'metodo.passos'].
 */
export function listAiDelegations(answers = {}) {
  return AI_DELEGATION_RULES.filter((rule) => rule.when(answers)).map((rule) => rule.key)
}

/* ------------------------------------------------------------------ */
/* Progresso (funções puras usadas pelo store)                         */
/* ------------------------------------------------------------------ */

/**
 * Campos que contam para o progresso deste participante:
 * visíveis, marcados como `countable` e que (a) sejam obrigatórios de fato
 * ou (b) sejam opcionais JÁ respondidos.
 * Consequência desejada: a barra chega a 100% exatamente quando o briefing
 * está pronto para envio — opcional em branco não segura o progresso.
 */
function countableFields(answers) {
  return ALL_FIELDS.filter(
    (f) => f.countable
      && isFieldVisible(f, answers)
      && (isFieldRequired(f, answers) || hasAnswer(f, answers)),
  )
}

/**
 * Quantidade de perguntas contáveis já respondidas (escape marcada conta como
 * respondida — é uma resposta válida, não uma lacuna).
 * @param {Object} [answers] Mapa `{ [fieldId]: value }`.
 * @returns {number}
 */
export function countAnswered(answers = {}) {
  return countableFields(answers).filter((f) => hasAnswer(f, answers)).length
}

/**
 * Progresso completo do briefing. Função PURA, sem React e sem efeitos.
 * @param {Object} [answers] Mapa `{ [fieldId]: value }`.
 * @returns {{ pct: number, answered: number, total: number,
 *            perStep: Record<string, number>, completedSteps: string[] }}
 *   `pct` 0..100 (inteiro); `perStep` 0..1 por etapa; `completedSteps` = ids das
 *   etapas com todos os campos obrigatórios visíveis preenchidos.
 */
export function computeCompletion(answers = {}) {
  const countable = countableFields(answers)
  const perStep = {}
  const completedSteps = []
  let answered = 0
  let total = 0

  for (const step of STEPS) {
    const ids = new Set(
      step.screens.flatMap((screen) => screen.fields).map((field) => field.id),
    )
    const stepFields = countable.filter((f) => ids.has(f.id))
    const stepAnswered = stepFields.filter((f) => hasAnswer(f, answers)).length

    answered += stepAnswered
    total += stepFields.length
    perStep[step.id] = stepFields.length === 0 ? 0 : stepAnswered / stepFields.length

    const requiredOk = step.screens
      .flatMap((screen) => screen.fields)
      .filter((f) => isFieldRequired(f, answers))
      .every((f) => hasAnswer(f, answers))
    if (requiredOk) completedSteps.push(step.id)
  }

  return {
    pct: total === 0 ? 0 : Math.round((answered / total) * 100),
    answered,
    total,
    perStep,
    completedSteps,
  }
}

/* ------------------------------------------------------------------ */
/* Blocos do payload                                                   */
/* ------------------------------------------------------------------ */

function buildClient(session) {
  const nav = typeof navigator === 'undefined' ? null : navigator
  const win = typeof window === 'undefined' ? null : window
  let timezone = str(session.timezone)
  if (!timezone) {
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    } catch {
      timezone = ''
    }
  }
  let viewport = str(session.viewport)
  if (!viewport && win && win.innerWidth) viewport = `${win.innerWidth}x${win.innerHeight}`
  return {
    user_agent: str(session.user_agent) || (nav ? str(nav.userAgent) : ''),
    locale: str(session.locale) || (nav ? str(nav.language) : ''),
    timezone,
    viewport,
  }
}

function buildLastro(answers) {
  return {
    forca: text(answers, 'lastro_forca'),
    maior_resultado_proprio: text(answers, 'lastro_maior_resultado_proprio'),
    melhor_resultado_terceiros: text(answers, 'lastro_melhor_resultado_terceiros'),
    melhor_resultado_terceiros_ausente: bool(answers.lastro_terceiros_ausente),
    narrativa: {
      antes: text(answers, 'lastro_narrativa_antes'),
      dificuldade: text(answers, 'lastro_narrativa_dificuldade'),
      tentativas_falhas: text(answers, 'lastro_narrativa_tentativas_falhas'),
      virada: text(answers, 'lastro_narrativa_virada'),
      novas_acoes: text(answers, 'lastro_narrativa_novas_acoes'),
      resultado_gerado: text(answers, 'lastro_narrativa_resultado_gerado'),
      repeticao: text(answers, 'lastro_narrativa_repeticao'),
      repeticao_ausente: bool(answers.lastro_repeticao_ausente),
    },
  }
}

/**
 * Normaliza os até 3 públicos avaliados na Etapa 2.
 * @returns {{ publicos: Array<Object>, maiorScore: string, byId: Record<string, Object> }}
 */
function buildPublicos(answers) {
  const source = answers.persona_publicos && typeof answers.persona_publicos === 'object'
    ? answers.persona_publicos
    : {}

  const publicos = []
  const byId = {}

  for (const id of PUBLICO_IDS) {
    const entry = source[id] && typeof source[id] === 'object' ? source[id] : {}
    const descricao = str(entry.descricao)
    const scores = {}
    let total = 0
    for (const criterio of CRITERIOS_PUBLICO) {
      const value = score(entry[criterio.value])
      scores[criterio.value] = value
      total += value
    }
    const item = {
      id,
      descricao,
      scores,
      score_total: total,
      preenchido: descricao !== '' && total > 0,
    }
    byId[id] = item
    if (descricao !== '' || total > 0) publicos.push(item)
  }

  let maiorScore = ''
  let best = 0
  for (const item of publicos) {
    if (item.score_total > best) {
      best = item.score_total
      maiorScore = item.id
    }
  }

  return { publicos, maiorScore, byId }
}

function buildPersona(answers) {
  const { publicos, maiorScore, byId } = buildPublicos(answers)
  const delegado = bool(answers.persona_escolha_delegada_ia)
  const escolhido = delegado ? '' : enumOf(answers, 'persona_publico_escolhido')
  const tipoCliente = enumOf(answers, 'persona_tipo_cliente')

  return {
    quem_deseja_resultado: text(answers, 'persona_quem_deseja_resultado'),
    publicos,
    publico_escolhido: escolhido,
    publico_escolhido_descricao: escolhido && byId[escolhido] ? byId[escolhido].descricao : '',
    delegar_escolha_ia: delegado,
    maior_score: maiorScore,
    tipo_cliente: tipoCliente,
    tipo_cliente_label: labelOf(TIPO_CLIENTE, tipoCliente),
    pf: {
      perfil: text(answers, 'persona_pf_perfil'),
      faixa_renda: enumOf(answers, 'persona_pf_faixa_renda'),
      faixa_renda_label: labelOf(FAIXA_RENDA_PF, enumOf(answers, 'persona_pf_faixa_renda')),
      faixa_renda_outro: isFieldVisible(FIELD_BY_ID.persona_pf_faixa_renda, answers)
        ? str(answers.persona_pf_faixa_renda_outro)
        : '',
    },
    pj: {
      segmento: text(answers, 'persona_pj_segmento'),
      faixa_faturamento: enumOf(answers, 'persona_pj_faixa_faturamento'),
      faixa_faturamento_label: labelOf(
        FAIXA_FATURAMENTO_PJ,
        enumOf(answers, 'persona_pj_faixa_faturamento'),
      ),
      faixa_faturamento_outro: isFieldVisible(FIELD_BY_ID.persona_pj_faixa_faturamento, answers)
        ? str(answers.persona_pj_faixa_faturamento_outro)
        : '',
    },
    dor_principal: text(answers, 'persona_dor_principal'),
    desejo_principal: text(answers, 'persona_desejo_principal'),
    tentativas_anteriores: text(answers, 'persona_tentativas_anteriores'),
    por_que_falham: text(answers, 'persona_por_que_falham'),
  }
}

function buildTransformacao(answers) {
  const prazo = enumOf(answers, 'transformacao_prazo_estimado')
  return {
    ponto_a: text(answers, 'transformacao_ponto_a'),
    ponto_b: text(answers, 'transformacao_ponto_b'),
    prazo_estimado: prazo,
    prazo_estimado_label: labelOf(PRAZO_TRANSFORMACAO, prazo),
    evidencias_resultado: text(answers, 'transformacao_evidencias_resultado'),
  }
}

function buildMetodo(answers) {
  const passosDelegados = bool(answers.metodo_passos_delegados_ia)
  const temNome = enumOf(answers, 'metodo_tem_nome')
  return {
    erros_comuns: strList(raw(answers, 'metodo_erros_comuns')),
    por_que_falham: text(answers, 'metodo_por_que_falham'),
    o_que_precisa_ser_diferente: text(answers, 'metodo_o_que_precisa_ser_diferente'),
    passos: passosDelegados ? [] : strList(raw(answers, 'metodo_passos')),
    passos_delegados_ia: passosDelegados,
    tem_nome: temNome === 'sim',
    nome: temNome === 'sim' ? text(answers, 'metodo_nome') : '',
  }
}

function buildProduto(answers) {
  const modelo = enumOf(answers, 'produto_modelo')
  const duracao = enumOf(answers, 'produto_duracao_acompanhamento')
  const carga = enumOf(answers, 'produto_carga_horaria_semanal')
  return {
    modelo,
    modelo_label: labelOf(MODELO_PRODUTO, modelo),
    duracao_acompanhamento: duracao,
    duracao_acompanhamento_label: labelOf(DURACAO_ACOMPANHAMENTO, duracao),
    carga_horaria_semanal: carga,
    carga_horaria_semanal_label: labelOf(CARGA_HORARIA_SEMANAL, carga),
    entregas_indispensaveis: text(answers, 'produto_entregas_indispensaveis'),
  }
}

function buildEntrega(answers) {
  const temNiveis = enumOf(answers, 'entrega_tem_niveis')
  const frequencia = enumOf(answers, 'entrega_frequencia_hot_seat')
  const suporte = applyExclusive(
    SUPORTE_ENTRE_ENCONTROS,
    Array.isArray(raw(answers, 'entrega_suporte_entre_encontros'))
      ? answers.entrega_suporte_entre_encontros
      : [],
  )
  return {
    briefing_necessario: text(answers, 'entrega_briefing_necessario'),
    tem_niveis: temNiveis,
    niveis_descricao: temNiveis === 'sim' ? text(answers, 'entrega_niveis_descricao') : '',
    frequencia_hot_seat: frequencia,
    frequencia_hot_seat_label: labelOf(FREQUENCIA_HOT_SEAT, frequencia),
    suporte_entre_encontros: suporte,
    suporte_entre_encontros_labels: labelsOf(SUPORTE_ENTRE_ENCONTROS, suporte),
    contexto_adicional: text(answers, 'entrega_contexto_adicional'),
  }
}

/* ------------------------------------------------------------------ */
/* Payload                                                             */
/* ------------------------------------------------------------------ */

/**
 * Monta o JSON completo enviado ao webhook do n8n.
 * Função PURA em relação ao app (só consulta `navigator`/`window`/relógio como
 * fallback quando `session` não traz os dados de cliente).
 *
 * @param {Object} input
 * @param {Object} [input.answers]  Mapa `{ [fieldId]: value }` do store.
 * @param {{ name?: string, whatsapp?: string, email?: string }} [input.identity]
 * @param {{ session_id?: string, submission_id?: string, started_at?: string,
 *           user_agent?: string, locale?: string, timezone?: string,
 *           viewport?: string, event_mode?: boolean, version?: string,
 *           submitted_at?: string }} [input.session]
 * @param {{ started_at?: string }} [input.progress] Progresso do store (usado só
 *   como fallback de `started_at`; os números vêm de `computeCompletion`).
 * @returns {Object} Payload no formato da seção 7 do contrato de arquitetura.
 */
export function buildPayload({ answers = {}, identity = {}, session = {}, progress = {} } = {}) {
  const submittedAt = str(session.submitted_at) || new Date().toISOString()
  const startedAt = str(session.started_at) || str(progress.started_at)
  const completion = computeCompletion(answers)

  let durationSeconds = 0
  if (startedAt) {
    const delta = new Date(submittedAt).getTime() - new Date(startedAt).getTime()
    if (Number.isFinite(delta) && delta > 0) durationSeconds = Math.round(delta / 1000)
  }

  const whatsapp = normalizePhoneBR(identity.whatsapp)

  return {
    meta: {
      session_id: str(session.session_id),
      submission_id: str(session.submission_id),
      submitted_at: submittedAt,
      version: str(session.version) || PAYLOAD_VERSION,
      event_mode: bool(session.event_mode),
      client: buildClient(session),
    },
    participant: {
      name: str(identity.name),
      whatsapp,
      whatsapp_display: whatsapp ? formatPhoneBR(whatsapp) : '',
      email: str(identity.email).toLowerCase(),
    },
    lastro: buildLastro(answers),
    persona: buildPersona(answers),
    transformacao: buildTransformacao(answers),
    metodo: buildMetodo(answers),
    produto: buildProduto(answers),
    entrega: buildEntrega(answers),
    progress: {
      completion_pct: completion.pct,
      answered_questions: completion.answered,
      total_questions: completion.total,
      started_at: startedAt,
      duration_seconds: durationSeconds,
      ai_delegations: listAiDelegations(answers),
    },
  }
}

export default buildPayload
