/**
 * Classificação de erro do envio do briefing.
 *
 * Contrato: todo erro vira um CÓDIGO ESTÁVEL (string) + uma MENSAGEM HUMANA em pt-BR.
 * A UI nunca deve montar texto de erro por conta própria — ela lê daqui.
 * O código é estável porque também vai para analytics (`submission_error`).
 *
 * Dono: AGENTE C (integração). Ver docs/WEBHOOK_N8N.md.
 */

/** @typedef {'config_missing'|'network'|'timeout'|'http_4xx'|'http_5xx'|'invalid_response'|'canceled'|'unknown'} ErrorCode */

export const ERROR_CODES = Object.freeze({
  /** Nenhuma URL de webhook configurada (VITE_N8N_WEBHOOK_URL vazia). */
  CONFIG_MISSING: 'config_missing',
  /** Falha de conexão, DNS, CORS bloqueado ou aparelho offline. */
  NETWORK: 'network',
  /** O servidor não respondeu dentro de CONFIG.WEBHOOK_TIMEOUT_MS. */
  TIMEOUT: 'timeout',
  /** O n8n respondeu 4xx. Não se repete sozinho (exceto 408/429). */
  HTTP_4XX: 'http_4xx',
  /** O n8n respondeu 5xx. Vale uma nova tentativa. */
  HTTP_5XX: 'http_5xx',
  /** Resposta 2xx recebida, mas o corpo não pôde ser lido. */
  INVALID_RESPONSE: 'invalid_response',
  /** O próprio app cancelou (usuário saiu da tela / componente desmontou). */
  CANCELED: 'canceled',
  /** Rede de segurança: nada acima se aplica. Nunca deveria aparecer. */
  UNKNOWN: 'unknown',
})

/**
 * Mensagens de UI. Tom premium: explica o que aconteceu, diz que os dados estão
 * a salvo e indica o próximo passo. Sem jargão técnico, sem código de erro na tela.
 *
 * `retryable` = faz sentido oferecer "Tentar novamente" (manual) ao participante.
 * `autoRetry` = o webhook.js pode repetir sozinho 1x (ver shouldAutoRetry).
 */
export const ERROR_MESSAGES = Object.freeze({
  [ERROR_CODES.CONFIG_MISSING]: {
    title: 'Envio ainda não liberado',
    message: 'O canal de envio ainda não foi configurado para este evento. Suas respostas estão salvas neste aparelho — avise a equipe e tente de novo em seguida.',
    retryable: true,
  },
  [ERROR_CODES.NETWORK]: {
    title: 'Sem conexão no momento',
    message: 'Não conseguimos enviar agora. Suas respostas estão salvas. Confira sua internet e toque em enviar novamente.',
    retryable: true,
  },
  [ERROR_CODES.TIMEOUT]: {
    title: 'A conexão demorou demais',
    message: 'O envio passou do tempo e foi interrompido. Suas respostas estão salvas. Tente novamente em alguns segundos.',
    retryable: true,
  },
  [ERROR_CODES.HTTP_4XX]: {
    title: 'Não conseguimos concluir o envio',
    message: 'Algo neste envio não foi aceito pelo nosso sistema. Suas respostas estão salvas — avise a equipe do evento para destravar.',
    retryable: false,
  },
  [ERROR_CODES.HTTP_5XX]: {
    title: 'Nosso sistema está instável',
    message: 'O servidor não respondeu como esperado. Suas respostas estão salvas. Tente novamente em alguns segundos.',
    retryable: true,
  },
  [ERROR_CODES.INVALID_RESPONSE]: {
    title: 'Resposta inesperada',
    message: 'Recebemos uma resposta que não conseguimos interpretar. Suas respostas estão salvas — confirme com a equipe antes de enviar de novo.',
    retryable: false,
  },
  [ERROR_CODES.CANCELED]: {
    title: 'Envio interrompido',
    message: 'O envio foi interrompido antes de terminar. Suas respostas estão salvas.',
    retryable: true,
  },
  [ERROR_CODES.UNKNOWN]: {
    title: 'Algo saiu do previsto',
    message: 'Não conseguimos enviar agora. Suas respostas estão salvas. Tente novamente em alguns segundos.',
    retryable: true,
  },
})

/** Status HTTP que são 4xx mas indicam "tente de novo", não "está errado". */
const RETRYABLE_4XX = new Set([408, 425, 429])

/**
 * Traduz um status HTTP em código de erro.
 * @param {number} status
 * @returns {ErrorCode}
 */
export function classifyHttpStatus(status) {
  if (status >= 500) return ERROR_CODES.HTTP_5XX
  if (status >= 400) return ERROR_CODES.HTTP_4XX
  return ERROR_CODES.INVALID_RESPONSE // 1xx/3xx inesperados num webhook
}

/**
 * Traduz uma exceção de `fetch` em código de erro.
 * `AbortError` é ambíguo: pode ser timeout nosso ou cancelamento do app — por isso
 * quem chama informa `abortReason`.
 * @param {unknown} err
 * @param {'timeout'|'external'|null} abortReason
 * @returns {ErrorCode}
 */
export function classifyThrown(err, abortReason = null) {
  const name = err && typeof err === 'object' ? String(err.name || '') : ''
  if (name === 'AbortError' || name === 'TimeoutError') {
    if (abortReason === 'external') return ERROR_CODES.CANCELED
    return ERROR_CODES.TIMEOUT
  }
  // fetch rejeita com TypeError para falha de rede, DNS, TLS e CORS bloqueado.
  if (name === 'TypeError') return ERROR_CODES.NETWORK
  if (err instanceof Error) return ERROR_CODES.NETWORK
  return ERROR_CODES.UNKNOWN
}

/**
 * Pode o webhook.js repetir sozinho? No máximo 1 vez, e só quando o pedido
 * provavelmente NÃO chegou a ser processado.
 *
 * A retentativa reenvia o MESMO submission_id. A garantia real de "não processar
 * duas vezes" é do n8n, via header X-Idempotency-Key — ver docs/WEBHOOK_N8N.md §4.
 *
 * @param {ErrorCode} code
 * @param {number} [status]
 * @returns {boolean}
 */
export function shouldAutoRetry(code, status = 0) {
  if (code === ERROR_CODES.NETWORK) return true
  if (code === ERROR_CODES.TIMEOUT) return true
  if (code === ERROR_CODES.HTTP_5XX) return true
  if (code === ERROR_CODES.HTTP_4XX) return RETRYABLE_4XX.has(status)
  return false
}

/**
 * Objeto pronto para a UI. Sempre devolve algo — nunca undefined.
 * @param {ErrorCode} code
 * @param {{ status?: number }} [extra]
 */
export function getErrorInfo(code, extra = {}) {
  const preset = ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN]
  return {
    code: ERROR_MESSAGES[code] ? code : ERROR_CODES.UNKNOWN,
    title: preset.title,
    message: preset.message,
    retryable: preset.retryable,
    status: extra.status ?? 0,
  }
}

/** Atalho: só o texto para a tela de erro. */
export function errorMessage(code) {
  return getErrorInfo(code).message
}
