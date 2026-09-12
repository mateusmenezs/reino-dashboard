/**
 * Analytics do Construtor de Mentoria.
 * Dono: AGENTE B. Ver docs/ARQUITETURA_MENTORIA.md §4.
 *
 * Princípio: analytics NUNCA pode derrubar o formulário. Toda operação é
 * envolvida em try/catch e qualquer sink externo que estourar é isolado
 * (e desligado se estourar repetidamente).
 *
 * Eventos previstos:
 *   form_started, step_started, step_completed, autosave,
 *   review_opened, submission_started, submission_success, submission_error
 */

import { CONFIG } from '../config/env.js';

/** Limite da fila em memória (evita crescer sem fim numa sessão longa). */
const MAX_EVENTS = 400;

/** @type {Array<{event:string, props:object, t:number, iso:string, seq:number}>} */
const queue = [];

let seq = 0;
let sink = null;
let sinkFailures = 0;
const SINK_FAILURE_LIMIT = 3;

/** Chaves já emitidas via trackOnce (protege contra StrictMode/duplo efeito). */
const onceKeys = new Set();

/** Expõe a fila para inspeção no console durante o evento. */
function exposeQueue() {
  try {
    if (typeof window !== 'undefined') {
      window.__mentoriaEvents = queue;
    }
  } catch (_err) {
    /* ambiente sem window (SSR/teste): ignora */
  }
}
exposeQueue();

/**
 * Registra um evento.
 * @param {string} event nome do evento (snake_case)
 * @param {object} [props] propriedades serializáveis
 * @returns {object|null} o registro criado (ou null se algo falhou)
 */
export function track(event, props) {
  try {
    if (!event || typeof event !== 'string') return null;

    const now = Date.now();
    const record = {
      seq: ++seq,
      event,
      props: safeProps(props),
      t: now,
      iso: new Date(now).toISOString(),
    };

    queue.push(record);
    if (queue.length > MAX_EVENTS) queue.splice(0, queue.length - MAX_EVENTS);
    exposeQueue();

    if (CONFIG.DEBUG) {
      try {
        console.debug('[mentoria]', record.event, record.props);
      } catch (_err) {
        /* console indisponível */
      }
    }

    emitToSink(record);
    return record;
  } catch (_err) {
    return null;
  }
}

/**
 * Igual a track(), mas só dispara uma vez por chave.
 * Usado para eventos idempotentes (form_started, review_opened, step_started)
 * porque React 18 StrictMode roda efeitos duas vezes em dev.
 * @param {string} key chave de deduplicação
 * @param {string} event
 * @param {object} [props]
 * @returns {boolean} true se disparou agora, false se já havia disparado
 */
export function trackOnce(key, event, props) {
  try {
    const k = String(key);
    if (onceKeys.has(k)) return false;
    onceKeys.add(k);
    track(event, props);
    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * Ponto de extensão único: plugar GA4 / Meta Pixel / n8n depois.
 * O sink recebe cada evento novo ({ event, props, iso, seq }).
 * Passe null para desligar.
 *
 * Ex.: setAnalyticsSink(({ event, props }) => window.gtag?.('event', event, props))
 *
 * @param {((record:object)=>void)|null} fn
 * @param {{ replayQueue?: boolean }} [opts] replayQueue: reenvia o histórico já acumulado
 */
export function setAnalyticsSink(fn, opts) {
  sink = typeof fn === 'function' ? fn : null;
  sinkFailures = 0;
  if (sink && opts && opts.replayQueue) {
    for (let i = 0; i < queue.length; i += 1) emitToSink(queue[i]);
  }
}

function emitToSink(record) {
  if (!sink) return;
  try {
    sink(record);
  } catch (err) {
    sinkFailures += 1;
    if (CONFIG.DEBUG) {
      try {
        console.debug('[mentoria] sink de analytics falhou:', err);
      } catch (_e) { /* noop */ }
    }
    if (sinkFailures >= SINK_FAILURE_LIMIT) {
      sink = null; // desliga o sink defeituoso: o formulário é mais importante
    }
  }
}

/** Copia rasa e segura das props (sem funções, sem ciclos, sem valores gigantes). */
function safeProps(props) {
  if (!props || typeof props !== 'object') return {};
  const out = {};
  try {
    const keys = Object.keys(props);
    for (let i = 0; i < keys.length && i < 40; i += 1) {
      const k = keys[i];
      const v = props[k];
      const t = typeof v;
      if (v === null || t === 'string' || t === 'number' || t === 'boolean') {
        out[k] = t === 'string' && v.length > 300 ? `${v.slice(0, 300)}…` : v;
      } else if (Array.isArray(v)) {
        out[k] = v.slice(0, 30).map((item) => (typeof item === 'object' ? '[obj]' : item));
      } else if (t === 'object') {
        out[k] = '[obj]';
      }
    }
  } catch (_err) {
    return out;
  }
  return out;
}

/** Snapshot (cópia) da fila — para telas de debug. */
export function getEvents() {
  return queue.slice();
}

/** Limpa a fila em memória (não afeta respostas do participante). */
export function clearEvents() {
  queue.length = 0;
  onceKeys.clear();
  exposeQueue();
}

export default track;
