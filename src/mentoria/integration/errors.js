/**
 * Classificação de erro do envio do briefing.
 *
 * Contrato: todo erro vira um CÓDIGO ESTÁVEL (string) + uma MENSAGEM HUMANA em pt-BR.
 * A UI nunca deve montar texto de erro por conta própria — ela lê daqui.
 * O código é estável porque também vai para analytics (`submission_error`).
 *
 * Dono: AGENTE C (integração). Ver docs/WEBHOOK_N8N.md.
 */

/** @typedef {'config_missing'|'offline'|'network'|'timeout'|'http_4xx'|'http_5xx'|'invalid_response'|'canceled'|'unknown'} ErrorCode */

export const ERROR_CODES = Object.freeze({
  /** Nenhuma URL de webhook configurada (VITE_N8N_WEBHOOK_URL vazia). */
  CONFIG_MISSING: 'config_missing',
  /**
   * O APARELHO está sem conexão (`navigator.onLine === false`).
   * Culpa do wi-fi/dados do participante — ele consegue resolver sozinho.
   */
  OFFLINE: 'offline',
  /**
   * O aparelho tem conexão, mas a requisição não chegou ao destino:
   * DNS, TLS, CORS bloqueado ou servidor fora do ar.
   * NÃO é problema de internet do participante — é nosso.
   */
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
  [ERROR_CODES.OFFLINE]: {
    title: 'Seu aparelho está sem internet',
    message: 'Não encontramos conexão neste aparelho. Suas respostas estão salvas aqui. Reative o wi-fi ou os dados móveis e toque em enviar novamente.',
    retryable: true,
  },
  [ERROR_CODES.NETWORK]: {
    title: 'Nosso sistema não respondeu',
    message: 'Sua internet está funcionando, mas não conseguimos falar com o nosso sistema. Suas respostas estão salvas neste aparelho — avise a equipe do evento e tente novamente.',
    retryable: true,
  },
  [ERROR_CODES.TIMEOUT]: {
    title: 'Nosso sistema demorou para responder',
    message: 'O envio passou do tempo de espera. Ele pode ter chegado mesmo assim — avise a equipe do evento. Suas respostas estão salvas: tentar de novo não cria briefing duplicado.',
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

/**
 * `navigator.onLine === false` é uma certeza de que o APARELHO está offline.
 * `true` não garante internet — por isso só usamos o caso negativo.
 */
export function isOffline() {
  try {
    return typeof navigator !== 'undefined' && navigator.onLine === false
  } catch {
    return false
  }
}

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
  // Só é "sem internet" se o próprio aparelho declarar que está offline;
  // caso contrário o problema é do outro lado do fio (nosso servidor).
  if (name === 'TypeError') return isOffline() ? ERROR_CODES.OFFLINE : ERROR_CODES.NETWORK
  if (err instanceof Error) return isOffline() ? ERROR_CODES.OFFLINE : ERROR_CODES.NETWORK
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
  // Rede: a requisição não chegou a ser aceita por ninguém. Repetir é seguro.
  if (code === ERROR_CODES.NETWORK) return true
  // 5xx/429/408: o servidor respondeu dizendo "não deu, tente de novo".
  if (code === ERROR_CODES.HTTP_5XX) return true
  if (code === ERROR_CODES.HTTP_4XX) return RETRYABLE_4XX.has(status)
  // TIMEOUT nunca repete sozinho: num timeout o servidor PROVAVELMENTE já
  // recebeu o briefing e só demorou para responder. Repetir automaticamente é
  // apostar que o n8n está deduplicando — e ainda dobra a espera do
  // participante (2 × timeout antes de qualquer feedback). O botão "tentar
  // novamente" continua disponível: aí a decisão é de quem está na tela.
  if (code === ERROR_CODES.TIMEOUT) return false
  // OFFLINE: o aparelho já disse que não tem rede. Repetir em 1,2s é inútil.
  if (code === ERROR_CODES.OFFLINE) return false
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
