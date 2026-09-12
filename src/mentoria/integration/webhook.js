/**
 * Envio do briefing para o webhook do n8n.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * AVISO DE SEGURANÇA — leia antes de mexer.
 *
 * Tudo que começa com `VITE_` é embutido no bundle em build time e fica
 * PÚBLICO no navegador de quem abrir a página. Qualquer participante consegue
 * ler no DevTools. Portanto:
 *
 *   • O que pode ficar aqui: a URL do webhook e, no máximo, um token de baixo
 *     valor que só serve para filtrar ruído (e que você pode rotacionar depois
 *     do evento).
 *   • O que NUNCA pode ficar aqui: chave da Evolution API / WhatsApp, chave da
 *     OpenAI / Anthropic / Gemini, credencial de banco, token de CRM. Essas
 *     credenciais vivem exclusivamente DENTRO do n8n, onde o browser não chega.
 *
 * O desenho da integração é justamente esse: o browser só entrega o briefing;
 * quem fala com IA e com WhatsApp é o n8n, autenticado do lado do servidor.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Dono: AGENTE C. Ver docs/WEBHOOK_N8N.md para configurar o n8n.
 */

import { CONFIG } from '../config/env.js'
import {
  ERROR_CODES,
  classifyHttpStatus,
  classifyThrown,
  shouldAutoRetry,
  getErrorInfo,
} from './errors.js'

/** Timeout padrão se nada for informado (contrato §6). */
const DEFAULT_TIMEOUT_MS = 15000

/** Backoff curto antes da única retentativa automática. */
const RETRY_BASE_DELAY_MS = 1200
const RETRY_JITTER_MS = 400

/** Teto para respeitar um `Retry-After` do servidor sem travar o participante. */
const RETRY_AFTER_CAP_MS = 5000

/** No máximo UMA retentativa automática. Contrato §6. */
const MAX_AUTO_RETRIES = 1

/**
 * @typedef {Object} SendResult
 * @property {boolean} ok            true somente em HTTP 2xx com corpo legível
 * @property {number}  status        status HTTP (0 quando nem chegou a responder)
 * @property {*}       body          objeto (JSON), string (texto) ou null (vazio)
 * @property {string|null} errorCode código estável de errors.js, null em sucesso
 * @property {{code:string,title:string,message:string,retryable:boolean,status:number}|null} error
 * @property {number}  attempts      quantas requisições saíram de fato (1 ou 2)
 * @property {boolean} retried       houve retentativa automática?
 * @property {number}  durationMs    tempo total gasto
 * @property {string}  submissionId  id reenviado idêntico em toda tentativa
 */

/**
 * Envia o briefing. Nunca lança: todo caminho devolve um SendResult.
 *
 * Sucesso = o n8n confirmou o RECEBIMENTO (2xx). O app não espera a IA
 * terminar — o webhook do n8n deve estar em "Respond immediately".
 *
 * @param {object} payload             saída de schema/payload.js `buildPayload()`
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]  cancelamento externo (desmontar tela, sair)
 * @param {number} [opts.timeoutMs]    sobrescreve CONFIG.WEBHOOK_TIMEOUT_MS
 * @returns {Promise<SendResult>}
 */
export async function sendBriefing(payload, { signal, timeoutMs } = {}) {
  const startedAt = now()
  const submissionId = readMeta(payload, 'submission_id')
  const sessionId = readMeta(payload, 'session_id')

  const finish = (partial) => ({
    ok: false,
    status: 0,
    body: null,
    errorCode: null,
    error: null,
    attempts: 0,
    retried: false,
    submissionId,
    ...partial,
    durationMs: now() - startedAt,
  })

  const fail = (code, extra = {}) =>
    finish({ errorCode: code, error: getErrorInfo(code, { status: extra.status || 0 }), ...extra })

  // 1. Configuração ------------------------------------------------------
  const url = String(CONFIG?.WEBHOOK_URL || '').trim()
  if (!url) {
    debug('sem VITE_N8N_WEBHOOK_URL configurada — envio abortado antes de sair')
    return fail(ERROR_CODES.CONFIG_MISSING)
  }

  // 2. Payload serializável ---------------------------------------------
  let bodyText
  try {
    bodyText = JSON.stringify(payload)
  } catch (err) {
    debug('payload não serializável', err)
    return fail(ERROR_CODES.UNKNOWN)
  }
  if (!bodyText || bodyText === 'null' || bodyText === 'undefined') {
    debug('payload vazio')
    return fail(ERROR_CODES.UNKNOWN)
  }
  if (!submissionId) {
    // Não bloqueia o envio: um briefing sem id ainda vale mais do que nenhum.
    // Mas sem ele o n8n perde a defesa contra duplicata em caso de retentativa.
    debug('payload.meta.submission_id ausente — idempotência ficará sem chave')
  }

  // 3. Cancelamento externo já disparado ---------------------------------
  if (signal?.aborted) return fail(ERROR_CODES.CANCELED)

  // 4. Offline declarado pelo próprio navegador --------------------------
  // Barato e evita um erro de rede feio + a espera do backoff.
  if (isOffline()) {
    debug('navigator.onLine === false — nem tentamos')
    return fail(ERROR_CODES.NETWORK)
  }

  const headers = buildHeaders({ submissionId, sessionId })
  const budget = resolveTimeout(timeoutMs)

  let attempts = 0
  let last = null

  for (let round = 0; round <= MAX_AUTO_RETRIES; round += 1) {
    attempts += 1
    last = await attemptOnce({ url, headers, bodyText, timeoutMs: budget, signal })

    if (last.ok) {
      return finish({
        ok: true,
        status: last.status,
        body: last.body,
        attempts,
        retried: attempts > 1,
      })
    }

    const canRetry =
      round < MAX_AUTO_RETRIES &&
      shouldAutoRetry(last.errorCode, last.status) &&
      !signal?.aborted

    if (!canRetry) break

    // Backoff curto com jitter: se 20 participantes falharem no mesmo segundo,
    // eles não voltam todos juntos em cima do n8n.
    const wait = retryDelay(last.retryAfterMs)
    debug(`tentativa ${attempts} falhou (${last.errorCode}/${last.status}) — repetindo em ${wait}ms com o MESMO submission_id`)
    const slept = await sleep(wait, signal)
    if (!slept) return fail(ERROR_CODES.CANCELED, { attempts })
    if (isOffline()) return fail(ERROR_CODES.NETWORK, { attempts })
  }

  return finish({
    ok: false,
    status: last.status,
    body: last.body,
    errorCode: last.errorCode,
    error: getErrorInfo(last.errorCode, { status: last.status }),
    attempts,
    retried: attempts > 1,
  })
}

/* ───────────────────────── uma tentativa ───────────────────────── */

/**
 * Uma requisição só. Não decide sobre retentativa — apenas reporta o que houve.
 * @returns {{ok:boolean,status:number,body:*,errorCode:string|null,retryAfterMs:number}}
 */
async function attemptOnce({ url, headers, bodyText, timeoutMs, signal }) {
  const controller = new AbortController()
  /** @type {'timeout'|'external'|null} */
  let abortReason = null

  const timer = setTimeout(() => {
    abortReason = 'timeout'
    controller.abort()
  }, timeoutMs)

  const onExternalAbort = () => {
    abortReason = 'external'
    controller.abort()
  }
  // Compõe os dois sinais na mão (AbortSignal.any ainda não é universal no
  // Safari iOS) e SEMPRE remove o listener no finally — sem vazamento.
  if (signal) signal.addEventListener('abort', onExternalAbort, { once: true })

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: bodyText,
      signal: controller.signal,
      // Sem cookies: o n8n é outra origem e não precisa de sessão do browser.
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
      keepalive: false,
    })

    const status = Number(res.status) || 0
    const retryAfterMs = parseRetryAfter(res.headers)

    let body = null
    try {
      body = await readBody(res)
    } catch (err) {
      // 2xx cuja leitura do corpo falhou: o n8n provavelmente RECEBEU.
      // Não repetir — repetir aqui é o caminho mais curto para duplicar.
      debug('corpo da resposta ilegível', err)
      if (status >= 200 && status < 300) {
        return { ok: false, status, body: null, errorCode: ERROR_CODES.INVALID_RESPONSE, retryAfterMs }
      }
    }

    if (status >= 200 && status < 300) {
      return { ok: true, status, body, errorCode: null, retryAfterMs }
    }

    return { ok: false, status, body, errorCode: classifyHttpStatus(status), retryAfterMs }
  } catch (err) {
    const code = classifyThrown(err, abortReason)
    debug(`falha de transporte (${code})`, err)
    return { ok: false, status: 0, body: null, errorCode: code, retryAfterMs: 0 }
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onExternalAbort)
  }
}

/* ───────────────────────── auxiliares ───────────────────────── */

/**
 * O n8n pode responder qualquer coisa: JSON, texto solto, ou nada.
 * Nenhuma dessas possibilidades pode quebrar o envio.
 */
async function readBody(res) {
  const text = await res.text()
  if (!text) return null
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

function buildHeaders({ submissionId, sessionId }) {
  const headers = { 'Content-Type': 'application/json' }
  // Chave de idempotência: o n8n usa isto para reconhecer uma retentativa do
  // MESMO briefing e não processar duas vezes. Ver docs/WEBHOOK_N8N.md §4.
  if (submissionId) headers['X-Idempotency-Key'] = submissionId
  if (sessionId) headers['X-Session-Id'] = sessionId
  // Só existe se o Mateus configurar. Lembrete: é PÚBLICO no bundle.
  const token = String(CONFIG?.WEBHOOK_TOKEN || '').trim()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function resolveTimeout(explicit) {
  const candidates = [explicit, CONFIG?.WEBHOOK_TIMEOUT_MS, DEFAULT_TIMEOUT_MS]
  for (const value of candidates) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return n
  }
  return DEFAULT_TIMEOUT_MS
}

function retryDelay(retryAfterMs) {
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return Math.min(retryAfterMs, RETRY_AFTER_CAP_MS)
  }
  return RETRY_BASE_DELAY_MS + Math.floor(Math.random() * RETRY_JITTER_MS)
}

/** Aceita `Retry-After` em segundos (o formato que o n8n/proxies costumam mandar). */
function parseRetryAfter(headers) {
  try {
    const raw = headers?.get?.('Retry-After')
    if (!raw) return 0
    const seconds = Number(raw)
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
    const when = Date.parse(raw)
    if (Number.isFinite(when)) return Math.max(0, when - Date.now())
  } catch {
    /* header ausente ou exótico: ignora */
  }
  return 0
}

/** Espera cancelável. Devolve false se o cancelamento externo chegou antes. */
function sleep(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(false)
    const done = (value) => {
      clearTimeout(timer)
      if (signal) signal.removeEventListener('abort', onAbort)
      resolve(value)
    }
    const onAbort = () => done(false)
    const timer = setTimeout(() => done(true), ms)
    if (signal) signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * `navigator.onLine === false` é uma certeza de que estamos offline.
 * `true` não garante internet — por isso só usamos o caso negativo.
 */
function isOffline() {
  try {
    return typeof navigator !== 'undefined' && navigator.onLine === false
  } catch {
    return false
  }
}

function readMeta(payload, key) {
  const value = payload && payload.meta ? payload.meta[key] : ''
  return typeof value === 'string' ? value.trim() : ''
}

function now() {
  return typeof performance !== 'undefined' && performance.now
    ? Math.round(performance.now())
    : Date.now()
}

function debug(...args) {
  if (CONFIG?.DEBUG) console.warn('[mentoria/webhook]', ...args)
}

export { ERROR_CODES } from './errors.js'
export { getErrorInfo, errorMessage } from './errors.js'
