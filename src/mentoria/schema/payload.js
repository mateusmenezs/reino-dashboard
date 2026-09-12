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
 * 5. "Escapes" são confissões de ausência, não erro de preenchimento. Com a
 *    escape marcada, o TEXTO CORRESPONDENTE VAI SEMPRE VAZIO — mesmo que a
 *    pessoa tivesse escrito algo antes de marcar (o texto continua guardado no
 *    aparelho dela para não se perder, mas não viaja: "ainda não gerei
 *    resultado para terceiros" + depoimento ao lado seria contradição).
 *    - `lastro.melhor_resultado_terceiros_ausente: true`
 *      -> `lastro.melhor_resultado_terceiros` = "".
 *    - `lastro.narrativa.repeticao_ausente: true`
 *      -> `lastro.narrativa.repeticao` = "".
 *    - `metodo.passos_delegados_ia: true` -> `metodo.passos` = [].
 *    - `metodo.tem_nome: false` -> `metodo.nome` = "".
 *    - `entrega.tem_niveis` != "sim" -> `entrega.niveis_descricao` = "".
 * 6. `progress.ai_delegations` é a lista de pontos onde o participante pediu
 *    explicitamente recomendação da IA (ou declarou "ainda não sei"). É o mapa
 *    do que a IA precisa PROPOR em vez de apenas organizar. Valores possíveis:
 *    "persona.escolha", "persona.tipo_cliente", "persona.faixa_renda",
 *    "persona.faixa_faturamento", "transformacao.prazo", "metodo.passos",
 *    "metodo.nome", "produto.modelo", "produto.duracao",
 *    "produto.carga_horaria", "entrega.niveis", "entrega.hot_seat",
 *    "entrega.suporte".
 * 7. `persona.publicos` traz apenas os públicos com algum conteúdo. Cada um tem
 *    3 notas de 1 a 5, `score_total` (0..15) e `preenchido` (descrição + notas).
 *    - `persona.maior_score` é o id do público PREENCHIDO com maior
 *      `score_total` — indicador de potencial, NÃO necessariamente a persona
 *      escolhida (essa é `persona.publico_escolhido`). Público sem descrição
 *      nunca ganha esse selo, mesmo com notas altas.
 *    - `persona.maior_score_empate` lista TODOS os ids empatados no topo quando
 *      há empate (ex.: ["A","B","C"]); vem [] quando existe um líder único.
 *      Com empate, `maior_score` traz o primeiro na ordem A > B > C só para não
 *      quebrar quem já lê o campo — a decisão real é da IA.
 * 8. A escolha do público é SEMPRE coerente com o que foi descrito:
 *    - `persona.publico_escolhido` só pode ser um id com descrição, ou "".
 *    - `persona.publico_escolhido` === "" <=> `persona.delegar_escolha_ia` ===
 *      true <=> "persona.escolha" está em `ai_delegations`. Três formas de ler
 *      a mesma coisa: a IA é quem escolhe o público.
 *    - `persona.publico_escolhido_origem` conta COMO se chegou lá:
 *      "participante"            -> ele escolheu, e o público tem descrição;
 *      "unico_publico_descrito"  -> só descreveu um público, a escolha é trivial;
 *      "delegado_ia"             -> pediu a recomendação da IA;
 *      "descartado_sem_descricao"-> escolheu um público que ficou sem descrição;
 *                                   a escolha foi descartada e vira delegação;
 *      "indefinido"              -> nenhum público descrito (briefing incompleto).
 *    - `persona.publicos_descritos` lista os ids que têm descrição.
 * 9. `progress.total_questions` é o total de perguntas QUE SE APLICAVAM a este
 *    participante: obrigatórias visíveis + opcionais que ele respondeu.
 *    O formulário tem 37 perguntas NUMERADAS na tela, mas esse total é outro
 *    número: a ramificação PF/PJ, os campos condicionais e as opcionais em
 *    branco mudam quantas perguntas de fato existiram para ele.
 *    `answered_questions` nunca excede `total_questions`, e
 *    `completion_pct === 100` significa briefing pronto para envio.
 * 10. Todo texto tem teto: o `maxLength` do campo, e nunca mais que
 *    `MAX_TEXT_LENGTH` (4000) caracteres. Texto acima disso é cortado. A tela já
 *    impede passar do limite; o teto aqui é defesa contra estado restaurado de
 *    versão antiga ou adulterado no `localStorage` — a IA nunca recebe um campo
 *    gigante capaz de estourar o prompt.
 * 11. `participant.whatsapp` é E.164 brasileiro (`+55` + DDD válido + número) ou
 *    "". Número de outro país não é "convertido" para BR: vira "".
 * 12. O payload NUNCA contém preço, ticket, faturamento esperado da mentoria ou
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

/**
 * Teto ABSOLUTO de qualquer texto do payload, em caracteres.
 * A tela já limita cada campo pelo `maxLength` do schema; este teto é a defesa
 * contra estado restaurado de uma versão antiga, colado de fora ou adulterado
 * no localStorage — nada pode estourar o prompt da IA.
 */
export const MAX_TEXT_LENGTH = 4000

/**
 * Teto da descrição de cada público (Q12). O card da tela não impõe limite
 * próprio hoje (`maxLength: 0`), então aqui vale o teto absoluto — cortar uma
 * descrição legítima seria pior do que deixá-la longa.
 */
const AUDIENCE_MAX_LENGTH = FIELD_BY_ID.persona_publicos && FIELD_BY_ID.persona_publicos.maxLength > 0
  ? FIELD_BY_ID.persona_publicos.maxLength
  : MAX_TEXT_LENGTH

/** Teto do complemento de "Outro" (o input da tela também usa 160). */
const OTHER_MAX_LENGTH = 160

/** Teto do nome e do e-mail do participante (não são campos do schema). */
const NAME_MAX_LENGTH = 160
const EMAIL_MAX_LENGTH = 254

/**
 * Texto cortado no menor limite entre o do campo e `MAX_TEXT_LENGTH`.
 * @param {*} v Valor bruto.
 * @param {number} [max] Limite do campo (0/ausente = só o teto absoluto).
 * @returns {string}
 */
function clamp(v, max) {
  const value = str(v)
  const limit = Number.isFinite(max) && max > 0 ? Math.min(max, MAX_TEXT_LENGTH) : MAX_TEXT_LENGTH
  if (value.length <= limit) return value
  return value.slice(0, limit).trim()
}

/**
 * @param {*} v Valor bruto.
 * @param {number} [max] Limite de cada item.
 * @returns {string[]} Lista de strings com trim e teto, sem vazios.
 */
function strList(v, max) {
  if (!Array.isArray(v)) return []
  return v.map((item) => clamp(item, max)).filter((s) => s !== '')
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

/**
 * Texto de um campo do schema, saneado, respeitando visibilidade e com o teto
 * de tamanho do próprio campo (ver `MAX_TEXT_LENGTH`).
 */
function text(answers, id) {
  const field = FIELD_BY_ID[id]
  return clamp(raw(answers, id), field ? field.maxLength : 0)
}

/** Enum de um campo do schema (string estável), respeitando visibilidade. */
function enumOf(answers, id) {
  return str(raw(answers, id))
}

/* ------------------------------------------------------------------ */
/* Telefone BR                                                         */
/* ------------------------------------------------------------------ */

/**
 * DDDs realmente em uso no Brasil (Anatel).
 * Espelho consciente da lista de `state/phone.js`: o contrato de dados não pode
 * depender de um módulo de interface. Se a Anatel liberar um DDD novo, os dois
 * arquivos mudam juntos.
 */
const DDD_VALIDOS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
])

/**
 * Normaliza um telefone BRASILEIRO para E.164 (+5511912345678).
 *
 * Número de OUTRO PAÍS não é convertido, é recusado: "+1 415 555 0100" devolve
 * '' em vez de virar "+5514155550100" (um número de Bauru que não existe, para
 * onde o WhatsApp do participante nunca chegaria).
 * Também recusa DDD inexistente, celular sem o 9, fixo fora da faixa 2–5 e
 * sequência de dígito repetido.
 *
 * @param {string} value Telefone digitado, com ou sem máscara.
 * @returns {string} Telefone em E.164, ou '' quando não é um número BR válido.
 */
export function normalizePhoneBR(value) {
  const original = str(value)
  if (!original) return ''

  // Código de país DECLARADO com "+": só +55 segue adiante. Sem o "+" o número
  // estrangeiro cai nas regras de DDD/celular abaixo e é recusado do mesmo jeito.
  const compacto = original.replace(/[\s().\-–—/]/g, '')
  if (compacto.startsWith('+') && !compacto.startsWith('+55')) return ''

  // Daqui para baixo é o MESMO desmonte de `state/phone.js` (toLocalDigits):
  // o que a tela aceita, o payload aceita — nunca o contrário.
  let digits = original.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length > 12 && digits.startsWith('0055')) digits = digits.slice(4)
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2)
  // "0" de tronco/operadora: 011 91234-5678. Nenhum DDD válido começa com 0.
  while (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1)
  digits = digits.slice(0, 11)

  if (digits.length !== 10 && digits.length !== 11) return ''
  if (/^(\d)\1+$/.test(digits)) return ''
  if (!DDD_VALIDOS.has(digits.slice(0, 2))) return ''

  const assinante = digits.slice(2)
  // Celular tem 11 dígitos e começa com 9; fixo tem 10 e começa entre 2 e 5.
  if (digits.length === 11 && assinante[0] !== '9') return ''
  if (digits.length === 10 && (assinante[0] < '2' || assinante[0] > '5')) return ''

  return `+55${digits}`
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
  /* Vale tanto para quem pediu ("quero que a IA avalie") quanto para quem ficou
     sem escolha válida — ver `resolvePublicoEscolhido`. Nos dois casos quem
     escolhe o público é a IA, e `persona.publico_escolhido` vem "". */
  { key: 'persona.escolha', when: (a) => resolvePublicoEscolhido(a).delegar },
  { key: 'persona.tipo_cliente', when: (a) => a.persona_tipo_cliente === 'nao_sei' },
  /* "Outro / Não sei" das faixas é um não-sei como qualquer outro. O complemento
     (`persona.pf.faixa_renda_outro` / `persona.pj.faixa_faturamento_outro`) diz
     qual dos dois é: com texto, foi "Outro" e está descrito ali; vazio, é
     "não sei" de verdade e a IA estima a faixa pelo resto do briefing. */
  {
    key: 'persona.faixa_renda',
    when: (a) => a.persona_pf_faixa_renda === 'outro'
      && isFieldVisible(FIELD_BY_ID.persona_pf_faixa_renda, a),
  },
  {
    key: 'persona.faixa_faturamento',
    when: (a) => a.persona_pj_faixa_faturamento === 'outro'
      && isFieldVisible(FIELD_BY_ID.persona_pj_faixa_faturamento, a),
  },
  { key: 'transformacao.prazo', when: (a) => a.transformacao_prazo_estimado === 'nao_sei' },
  { key: 'metodo.passos', when: (a) => bool(a.metodo_passos_delegados_ia) },
  { key: 'metodo.nome', when: (a) => a.metodo_tem_nome === 'nao' },
  { key: 'produto.modelo', when: (a) => a.produto_modelo === 'nao_sei' },
  { key: 'produto.duracao', when: (a) => a.produto_duracao_acompanhamento === 'nao_sei' },
  { key: 'produto.carga_horaria', when: (a) => a.produto_carga_horaria_semanal === 'nao_sei' },
  /* "nao" e "nao_sei" geram a MESMA delegação de propósito: nos dois casos a IA
     precisa propor os níveis. O que muda é o tom, e isso se lê em
     `entrega.tem_niveis`: "nao" = ele afirma que não existem níveis (proponha
     com parcimônia, ou nenhum); "nao_sei" = ele não sabe (proponha e explique). */
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
  /* Escape marcada = confissão de ausência. O texto que a pessoa tinha escrito
     ANTES de marcar continua guardado no aparelho dela (desmarcar devolve tudo),
     mas não viaja: "ainda não gerei resultado para terceiros" chegando junto de
     um depoimento é contradição que a IA repassaria no WhatsApp. Mesma regra já
     aplicada em `metodo.passos`, `metodo.nome` e `entrega.niveis_descricao`. */
  const terceirosAusente = bool(answers.lastro_terceiros_ausente)
  const repeticaoAusente = bool(answers.lastro_repeticao_ausente)

  return {
    forca: text(answers, 'lastro_forca'),
    maior_resultado_proprio: text(answers, 'lastro_maior_resultado_proprio'),
    melhor_resultado_terceiros: terceirosAusente
      ? ''
      : text(answers, 'lastro_melhor_resultado_terceiros'),
    melhor_resultado_terceiros_ausente: terceirosAusente,
    narrativa: {
      antes: text(answers, 'lastro_narrativa_antes'),
      dificuldade: text(answers, 'lastro_narrativa_dificuldade'),
      tentativas_falhas: text(answers, 'lastro_narrativa_tentativas_falhas'),
      virada: text(answers, 'lastro_narrativa_virada'),
      novas_acoes: text(answers, 'lastro_narrativa_novas_acoes'),
      resultado_gerado: text(answers, 'lastro_narrativa_resultado_gerado'),
      repeticao: repeticaoAusente ? '' : text(answers, 'lastro_narrativa_repeticao'),
      repeticao_ausente: repeticaoAusente,
    },
  }
}

/**
 * Normaliza os até 3 públicos avaliados na Etapa 2.
 * @returns {{ publicos: Array<Object>, descritos: string[], maiorScore: string,
 *            maiorScoreEmpate: string[], maiorScoreTotal: number,
 *            byId: Record<string, Object> }}
 */
function buildPublicos(answers) {
  const source = answers.persona_publicos && typeof answers.persona_publicos === 'object'
    ? answers.persona_publicos
    : {}

  const publicos = []
  const byId = {}

  for (const id of PUBLICO_IDS) {
    const entry = source[id] && typeof source[id] === 'object' ? source[id] : {}
    const descricao = clamp(entry.descricao, AUDIENCE_MAX_LENGTH)
    const scores = {}
    let total = 0
    for (const criterio of CRITERIOS_PUBLICO) {
      // Mesma tolerância da validação: achatada tem precedência, aninhada é fallback.
      const nested = entry.scores && typeof entry.scores === 'object' ? entry.scores : {}
      const raw = entry[criterio.value] !== undefined ? entry[criterio.value] : nested[criterio.value]
      const value = score(raw)
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

  /* "Maior potencial" é selo de público PREENCHIDO. Um público com notas altas
     e sem uma linha de descrição não é potencial nenhum: a IA não sabe quem é.
     Sem o filtro, o payload apontava um público que a tela nem exibia. */
  const elegiveis = publicos.filter((item) => item.preenchido)
  const maiorScoreTotal = elegiveis.reduce((max, item) => Math.max(max, item.score_total), 0)
  const maiorScoreEmpate = maiorScoreTotal > 0
    ? elegiveis.filter((item) => item.score_total === maiorScoreTotal).map((item) => item.id)
    : []
  /* Com empate, `maior_score` continua trazendo o primeiro na ordem A > B > C
     (quem já lê o campo não quebra) e `maior_score_empate` conta a verdade:
     houve empate, a decisão é da IA. Sem empate, a lista vem []. */
  const maiorScore = maiorScoreEmpate.length > 0 ? maiorScoreEmpate[0] : ''

  return {
    publicos,
    descritos: publicos.filter((item) => item.descricao !== '').map((item) => item.id),
    maiorScore,
    maiorScoreEmpate: maiorScoreEmpate.length > 1 ? maiorScoreEmpate : [],
    maiorScoreTotal,
    byId,
  }
}

/**
 * Resolve a escolha de público de forma coerente com o que foi DESCRITO.
 *
 * Regra de ouro: `publico_escolhido` só pode ser um público com descrição, ou ''.
 * Quando fica '', a escolha passa para a IA (`delegar_escolha_ia: true` e
 * "persona.escolha" em `ai_delegations`) — é melhor a IA escolher com o que
 * existe do que receber "construa para o PÚBLICO C" sem uma linha sobre o C.
 *
 * @param {Object} [answers] Mapa `{ [fieldId]: value }`.
 * @returns {{ id: string, descricao: string, origem: string, delegar: boolean }}
 *   `origem`: 'participante' | 'unico_publico_descrito' | 'delegado_ia'
 *           | 'descartado_sem_descricao' | 'indefinido'.
 */
export function resolvePublicoEscolhido(answers = {}) {
  const { descritos, byId } = buildPublicos(answers)
  const descricaoDe = (id) => (byId[id] ? byId[id].descricao : '')

  if (bool(answers.persona_escolha_delegada_ia)) {
    return { id: '', descricao: '', origem: 'delegado_ia', delegar: true }
  }

  const escolhido = enumOf(answers, 'persona_publico_escolhido')
  if (escolhido && descritos.includes(escolhido)) {
    return { id: escolhido, descricao: descricaoDe(escolhido), origem: 'participante', delegar: false }
  }

  // Um público descrito só: não há escolha a fazer (a Q13 nem aparece na tela).
  if (descritos.length === 1) {
    return {
      id: descritos[0],
      descricao: descricaoDe(descritos[0]),
      origem: 'unico_publico_descrito',
      delegar: false,
    }
  }

  return {
    id: '',
    descricao: '',
    origem: escolhido ? 'descartado_sem_descricao' : 'indefinido',
    delegar: true,
  }
}

function buildPersona(answers) {
  const { publicos, descritos, maiorScore, maiorScoreEmpate, maiorScoreTotal } = buildPublicos(answers)
  const escolha = resolvePublicoEscolhido(answers)
  const tipoCliente = enumOf(answers, 'persona_tipo_cliente')

  return {
    quem_deseja_resultado: text(answers, 'persona_quem_deseja_resultado'),
    publicos,
    publicos_descritos: descritos,
    publico_escolhido: escolha.id,
    publico_escolhido_descricao: escolha.descricao,
    publico_escolhido_origem: escolha.origem,
    delegar_escolha_ia: escolha.delegar,
    maior_score: maiorScore,
    maior_score_total: maiorScoreTotal,
    maior_score_empate: maiorScoreEmpate,
    tipo_cliente: tipoCliente,
    tipo_cliente_label: labelOf(TIPO_CLIENTE, tipoCliente),
    pf: {
      perfil: text(answers, 'persona_pf_perfil'),
      faixa_renda: enumOf(answers, 'persona_pf_faixa_renda'),
      faixa_renda_label: labelOf(FAIXA_RENDA_PF, enumOf(answers, 'persona_pf_faixa_renda')),
      faixa_renda_outro: isFieldVisible(FIELD_BY_ID.persona_pf_faixa_renda, answers)
        ? clamp(answers.persona_pf_faixa_renda_outro, OTHER_MAX_LENGTH)
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
        ? clamp(answers.persona_pj_faixa_faturamento_outro, OTHER_MAX_LENGTH)
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
    erros_comuns: strList(
      raw(answers, 'metodo_erros_comuns'),
      FIELD_BY_ID.metodo_erros_comuns.itemMaxLength,
    ),
    por_que_falham: text(answers, 'metodo_por_que_falham'),
    o_que_precisa_ser_diferente: text(answers, 'metodo_o_que_precisa_ser_diferente'),
    passos: passosDelegados
      ? []
      : strList(raw(answers, 'metodo_passos'), FIELD_BY_ID.metodo_passos.itemMaxLength),
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
      name: clamp(identity.name, NAME_MAX_LENGTH),
      whatsapp,
      whatsapp_display: whatsapp ? formatPhoneBR(whatsapp) : '',
      email: clamp(identity.email, EMAIL_MAX_LENGTH).toLowerCase(),
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
