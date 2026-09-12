/**
 * Persistência local do briefing.
 * Dono: AGENTE B. Ver docs/ARQUITETURA_MENTORIA.md §4.
 *
 * Contexto: o formulário roda AO VIVO, no celular dos participantes, em wifi de
 * evento. Perder resposta é inaceitável. Por isso:
 *
 *  - toda operação de storage é try/catch (Safari privado, quota, iOS antigo);
 *  - se o localStorage falhar, degrada para memória e sinaliza storageAvailable:false
 *    (o app continua funcionando e o envio ao n8n continua possível);
 *  - gravação com debounce de 400ms + FLUSH IMEDIATO em 'visibilitychange' (hidden)
 *    e 'pagehide' — no Safari iOS o unload não é confiável, pagehide é;
 *  - migração por schema_version preserva o que for compatível; NUNCA descarta tudo;
 *  - nada é apagado automaticamente: só clearAll() explícito remove dados.
 *
 * Formato gravado:
 *   { schema_version, saved_at, session, identity, answers, nav, submission }
 */

import { CONFIG } from '../config/env.js';

export const STORAGE_KEY = 'reino.mentoria.v1';
/** Cópia de segurança de dados corrompidos/de versão antiga (nunca lida pelo app). */
export const BACKUP_KEY = 'reino.mentoria.v1.backup';
export const DEBOUNCE_MS = 400;

/* ------------------------------------------------------------------ */
/* estado interno                                                      */
/* ------------------------------------------------------------------ */

let storageAvailable = false;
let probed = false;
/** Espelho em memória — sempre atualizado, mesmo sem localStorage. */
let memoryState = null;
let pending = null;
let timer = null;
let listenersInstalled = false;
let writeCount = 0;
let lastError = null;

const subscribers = new Set();

/* ------------------------------------------------------------------ */
/* acesso tolerante ao localStorage                                    */
/* ------------------------------------------------------------------ */

function getLS() {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage || null;
  } catch (_err) {
    // Safari com cookies/armazenamento bloqueado estoura só de acessar.
    return null;
  }
}

function probe() {
  if (probed) return storageAvailable;
  probed = true;
  try {
    const ls = getLS();
    if (!ls) {
      storageAvailable = false;
      return false;
    }
    const k = '__reino_probe__';
    ls.setItem(k, '1');
    ls.removeItem(k);
    storageAvailable = true;
  } catch (_err) {
    storageAvailable = false;
  }
  return storageAvailable;
}

function isQuotaError(err) {
  if (!err) return false;
  const name = err.name || '';
  const code = err.code;
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  );
}

/* ------------------------------------------------------------------ */
/* forma do estado                                                     */
/* ------------------------------------------------------------------ */

export function emptyState() {
  return {
    schema_version: CONFIG.SCHEMA_VERSION,
    saved_at: null,
    session: null,
    identity: { name: '', whatsapp: '', email: '' },
    answers: {},
    nav: { stepIndex: 0, screenIndex: -1, phase: 'welcome' },
    submission: { status: 'idle', error: null, attempts: 0, sent_at: null },
  };
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Garante a forma esperada sem jogar fora nada que já exista. */
function normalize(raw) {
  const base = emptyState();
  if (!isPlainObject(raw)) return base;

  return {
    schema_version: typeof raw.schema_version === 'string' ? raw.schema_version : base.schema_version,
    saved_at: typeof raw.saved_at === 'string' ? raw.saved_at : null,
    session: isPlainObject(raw.session) ? { ...raw.session } : null,
    identity: isPlainObject(raw.identity) ? { ...base.identity, ...raw.identity } : base.identity,
    answers: isPlainObject(raw.answers) ? { ...raw.answers } : {},
    nav: isPlainObject(raw.nav) ? { ...base.nav, ...raw.nav } : base.nav,
    submission: isPlainObject(raw.submission) ? { ...base.submission, ...raw.submission } : base.submission,
  };
}

/**
 * Migração entre versões de schema.
 * Regra: PRESERVAR. Respostas e identidade são o ativo mais valioso; navegação e
 * submissão são descartáveis e voltam ao default se vierem inconsistentes.
 */
export function migrateState(raw) {
  const from = isPlainObject(raw) && typeof raw.schema_version === 'string' ? raw.schema_version : 'desconhecida';
  const state = normalize(raw);

  if (from === CONFIG.SCHEMA_VERSION) {
    return { state, migrated: false, migratedFrom: null };
  }

  // Versão diferente: mantém answers/identity/session e reinicia o que é volátil.
  const migrated = {
    ...state,
    schema_version: CONFIG.SCHEMA_VERSION,
    migrated_from: from,
    // uma submissão de outra versão de schema não pode ser considerada concluída
    submission:
      state.submission && state.submission.status === 'success'
        ? state.submission
        : { status: 'idle', error: null, attempts: 0, sent_at: null },
  };
  return { state: migrated, migrated: true, migratedFrom: from };
}

/* ------------------------------------------------------------------ */
/* leitura                                                             */
/* ------------------------------------------------------------------ */

/**
 * Lê o estado salvo. NUNCA lança.
 * @returns {{ state:object|null, storageAvailable:boolean, migrated:boolean, migratedFrom:string|null, corrupt:boolean }}
 */
export function loadState() {
  probe();
  const result = {
    state: null,
    storageAvailable,
    migrated: false,
    migratedFrom: null,
    corrupt: false,
  };

  // memória tem prioridade: é o dado mais recente desta aba
  if (memoryState) {
    result.state = memoryState;
    return result;
  }

  let raw = null;
  try {
    const ls = getLS();
    raw = ls ? ls.getItem(STORAGE_KEY) : null;
  } catch (err) {
    lastError = err;
    storageAvailable = false;
    result.storageAvailable = false;
    return result;
  }

  if (!raw) return result;

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    lastError = err;
    result.corrupt = true;
    // guarda o original para eventual resgate manual; nunca apaga sem backup
    try {
      const ls = getLS();
      if (ls) ls.setItem(BACKUP_KEY, raw);
    } catch (_e) { /* sem espaço para backup: segue a vida */ }
    return result;
  }

  const { state, migrated, migratedFrom } = migrateState(parsed);
  memoryState = state;
  result.state = state;
  result.migrated = migrated;
  result.migratedFrom = migratedFrom;

  if (migrated) {
    try {
      const ls = getLS();
      if (ls) ls.setItem(BACKUP_KEY, raw);
    } catch (_e) { /* opcional */ }
  }

  return result;
}

/** Existe briefing salvo? (para o "continuar de onde parou" na tela inicial) */
export function hasStoredState() {
  const { state } = loadState();
  if (!state) return false;
  const answered = state.answers ? Object.keys(state.answers).length : 0;
  const identity = state.identity || {};
  return answered > 0 || !!identity.name || !!identity.whatsapp || !!identity.email;
}

/* ------------------------------------------------------------------ */
/* escrita                                                             */
/* ------------------------------------------------------------------ */

function notify(status, extra) {
  const payload = { status, storageAvailable, writeCount, ...(extra || {}) };
  subscribers.forEach((fn) => {
    try {
      fn(payload);
    } catch (_err) { /* assinante quebrado não derruba o save */ }
  });
}

function writeNow(state) {
  probe();
  memoryState = state; // memória primeiro: nunca depende do disco

  const ls = getLS();
  if (!ls) {
    storageAvailable = false;
    notify('memory');
    return false;
  }

  const json = (() => {
    try {
      return JSON.stringify(state);
    } catch (err) {
      lastError = err;
      return null;
    }
  })();

  if (json === null) {
    notify('error', { error: 'serialize' });
    return false;
  }

  try {
    ls.setItem(STORAGE_KEY, json);
    storageAvailable = true;
    writeCount += 1;
    notify('saved');
    return true;
  } catch (err) {
    lastError = err;
    if (isQuotaError(err)) {
      // última tentativa: libera o backup e tenta de novo
      try {
        ls.removeItem(BACKUP_KEY);
        ls.setItem(STORAGE_KEY, json);
        storageAvailable = true;
        writeCount += 1;
        notify('saved');
        return true;
      } catch (_e2) { /* segue para o modo memória */ }
    }
    storageAvailable = false;
    notify('memory', { error: isQuotaError(err) ? 'quota' : 'write' });
    return false;
  }
}

/**
 * Agenda gravação (debounce 400ms). O espelho em memória é atualizado na hora.
 * @param {object} partial pedaços do estado ({ session, identity, answers, nav, submission })
 */
export function saveState(partial) {
  try {
    const base = memoryState || emptyState();
    const next = {
      ...base,
      ...(isPlainObject(partial) ? partial : {}),
      schema_version: CONFIG.SCHEMA_VERSION,
      saved_at: new Date().toISOString(),
    };
    memoryState = next;
    pending = next;
    ensureFlushHandlers();
    notify('saving');

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const toWrite = pending;
      pending = null;
      if (toWrite) writeNow(toWrite);
    }, DEBOUNCE_MS);
  } catch (_err) {
    /* nunca derruba a digitação */
  }
}

/** Grava imediatamente o que estiver pendente (ou o estado dado). */
export function flushNow(state) {
  try {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const toWrite = isPlainObject(state) ? { ...state, schema_version: CONFIG.SCHEMA_VERSION, saved_at: new Date().toISOString() } : pending || memoryState;
    pending = null;
    if (!toWrite) return false;
    return writeNow(toWrite);
  } catch (_err) {
    return false;
  }
}

/** Alias explícito. */
export const flush = flushNow;

/**
 * ÚNICA forma de apagar dados. Chamada só por ação explícita do participante.
 */
export function clearAll() {
  try {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pending = null;
    memoryState = null;
    const ls = getLS();
    if (ls) {
      ls.removeItem(STORAGE_KEY);
      ls.removeItem(BACKUP_KEY);
    }
    notify('cleared');
    return true;
  } catch (_err) {
    memoryState = null;
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* flush em background/fechamento de aba                               */
/* ------------------------------------------------------------------ */

function onHide() {
  try {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;
    flushNow();
  } catch (_err) { /* noop */ }
}

function onPageHide() {
  try {
    flushNow();
  } catch (_err) { /* noop */ }
}

/**
 * Instala os handlers de flush (idempotente).
 * 'visibilitychange' + 'pagehide' cobrem o Safari iOS, onde 'beforeunload'/'unload'
 * não disparam de forma confiável ao trocar de app ou fechar a aba.
 * @returns {() => void} desinstalador
 */
export function ensureFlushHandlers() {
  if (listenersInstalled) return removeFlushHandlers;
  try {
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', onHide);
    }
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pagehide', onPageHide);
      window.addEventListener('beforeunload', onPageHide);
    }
    listenersInstalled = true;
  } catch (_err) { /* noop */ }
  return removeFlushHandlers;
}

export function removeFlushHandlers() {
  try {
    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', onHide);
    }
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    }
  } catch (_err) { /* noop */ }
  listenersInstalled = false;
}

/* ------------------------------------------------------------------ */
/* introspecção                                                        */
/* ------------------------------------------------------------------ */

/** @param {(info:{status:string, storageAvailable:boolean})=>void} fn */
export function subscribe(fn) {
  if (typeof fn !== 'function') return () => {};
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function isStorageAvailable() {
  probe();
  return storageAvailable;
}

export function getStorageStatus() {
  probe();
  return {
    storageAvailable,
    writeCount,
    hasPending: !!pending,
    lastError: lastError ? String(lastError && lastError.name ? lastError.name : lastError) : null,
    key: STORAGE_KEY,
    schema_version: CONFIG.SCHEMA_VERSION,
  };
}

/** Somente para testes: zera o módulo sem tocar no localStorage. */
export function __resetForTests() {
  if (timer) clearTimeout(timer);
  timer = null;
  pending = null;
  memoryState = null;
  probed = false;
  storageAvailable = false;
  writeCount = 0;
  lastError = null;
  listenersInstalled = false;
  subscribers.clear();
}

export default {
  STORAGE_KEY,
  loadState,
  saveState,
  flushNow,
  clearAll,
  subscribe,
  isStorageAvailable,
  getStorageStatus,
  hasStoredState,
  ensureFlushHandlers,
};
