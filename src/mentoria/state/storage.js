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
 *  - gravação com debounce de 400ms, TETO de 2s (maxWait) para quem digita sem
 *    pausar, + FLUSH IMEDIATO em 'visibilitychange' (hidden) e 'pagehide' — no
 *    Safari iOS o unload não é confiável, pagehide é;
 *  - DUAS ABAS DO MESMO PARTICIPANTE NÃO SE SOBRESCREVEM: toda gravação relê o
 *    disco e faz união (merge). Um valor VAZIO desta aba nunca apaga um valor
 *    PREENCHIDO que está no disco. E um listener de 'storage' adota, em tempo
 *    real, o que a outra aba gravou (ver §"convivência entre abas");
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
/**
 * Teto do debounce. Sem ele, quem digita sem NENHUMA pausa de 400ms (o caso
 * real: 85 caracteres seguidos) só gravaria no 'pagehide'. Com o teto, o disco
 * recebe no máximo a cada 2s mesmo com digitação ininterrupta.
 */
export const MAX_WAIT_MS = 2000;

/* ------------------------------------------------------------------ */
/* estado interno                                                      */
/* ------------------------------------------------------------------ */

let storageAvailable = false;
let probed = false;
/** Espelho em memória — sempre atualizado, mesmo sem localStorage. */
let memoryState = null;
let pending = null;
let timer = null;
/** Timer do teto de 2s: só existe enquanto houver escrita pendente. */
let maxTimer = null;
let listenersInstalled = false;
let crossTabInstalled = false;
/**
 * Foto do que ESTA aba gravou (ou leu) por último — respostas e identidade.
 * É o que permite distinguir "a outra aba escreveu isto agora" de "eu mesmo
 * apaguei este campo de propósito". Sem essa referência, todo merge viraria
 * ressuscitar texto que o participante acabou de apagar.
 */
let baseline = null;
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
/* convivência entre abas (merge)                                      */
/* ------------------------------------------------------------------ */

/**
 * "Vazio" = ausência de resposta. Número 0 e booleano false SÃO respostas
 * válidas e nunca podem ser tratados como ausência.
 */
function isEmptyValue(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function sameValue(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (_err) {
    return false;
  }
}

/** Foto de respostas+identidade para servir de referência no próximo merge. */
function snapshotBaseline(state) {
  if (!isPlainObject(state)) return null;
  return {
    answers: { ...(state.answers || {}) },
    identity: { ...(state.identity || {}) },
  };
}

/**
 * Uma chave do disco é NOVIDADE DE OUTRA ABA quando o valor que está lá difere
 * do que esta aba viu por último. Se for igual ao que nós mesmos gravamos, e
 * agora está vazio aqui, foi o participante que apagou — e apagar precisa valer.
 */
function isForeign(key, diskValue, baseBucket) {
  if (!baseBucket) return true;
  if (!(key in baseBucket)) return true;
  return !sameValue(diskValue, baseBucket[key]);
}

/**
 * Une um mapa de respostas (ou de identidade) do disco no mapa desta aba.
 * REGRA DE OURO: um valor vazio daqui NUNCA apaga um valor preenchido de lá.
 */
function unionMap(mine, other, baseBucket, adoptedOut) {
  const out = { ...(mine || {}) };
  const from = other || {};
  let changed = false;

  Object.keys(from).forEach((key) => {
    const theirs = from[key];
    if (isEmptyValue(theirs)) return; // o outro lado não tem nada a ensinar
    if (!isEmptyValue(out[key])) return; // o que ESTA aba preencheu manda
    if (!isForeign(key, theirs, baseBucket)) return; // apagado aqui de propósito
    out[key] = theirs;
    if (adoptedOut) adoptedOut[key] = theirs;
    changed = true;
  });

  return { map: out, changed };
}

/**
 * Duas abas com sessões DIFERENTES (acontece quando a segunda abriu antes de a
 * primeira ter gravado qualquer coisa) precisam convergir: senão o mesmo
 * briefing chega ao n8n com dois submission_id e vira dois Blueprints.
 * Vence a sessão mais ANTIGA — critério determinístico, idêntico nas duas abas.
 * Envio em voo (ou já concluído) congela a sessão: id não se troca no meio.
 */
function mergeSession(mine, theirs, submission) {
  if (!isPlainObject(theirs) || !theirs.session_id) return mine;
  if (!isPlainObject(mine) || !mine.session_id) return { ...theirs };
  if (mine.session_id === theirs.session_id) return mine;

  const status = submission && submission.status;
  if (status === 'sending' || status === 'success') return mine;

  const a = Date.parse(mine.started_at || '') || 0;
  const b = Date.parse(theirs.started_at || '') || 0;
  if (b && (!a || b < a)) return { ...mine, ...theirs };
  if (a === b && String(theirs.session_id) < String(mine.session_id)) return { ...mine, ...theirs };
  return mine;
}

/** Um envio concluído no disco vale mais do que um 'idle' desta aba. */
/**
 * O 'success' do disco vence o 'idle' local — é o que impede uma aba obsoleta
 * de reabilitar o botão de envio depois que outra aba já enviou.
 *
 * Mas sucesso pertence a UM envio, não à sessão inteira: quando o participante
 * reabre o briefing para corrigir, ele recebe um submission_id novo, e o
 * sucesso antigo não pode mais mandar nele. Sem esta checagem, a reabertura
 * era revertida pela própria gravação seguinte.
 */
function mergeSubmission(mine, theirs, mySession, theirSession) {
  const m = isPlainObject(mine) ? mine : { status: 'idle' };
  const t = isPlainObject(theirs) ? theirs : null;
  if (!t) return m;
  if (t.status !== 'success' || m.status === 'success') return m;

  const meuId = isPlainObject(mySession) ? mySession.submission_id : null;
  const outroId = isPlainObject(theirSession) ? theirSession.submission_id : null;
  // Envio novo (id diferente do que teve sucesso): o sucesso antigo não se aplica.
  if (meuId && outroId && meuId !== outroId) return m;

  return { ...m, ...t };
}

/**
 * União de dois estados. `base` é a referência do que esta aba já conhecia.
 * `nav` NUNCA se mistura: navegação é de cada aba, e roubar a tela de alguém no
 * meio do evento seria pior do que o problema que estamos resolvendo.
 *
 * @returns {{ merged: object, adopted: null | { answers?:object, identity?:object, session?:object } }}
 */
function unionState(mine, other, base) {
  if (!isPlainObject(other)) return { merged: mine, adopted: null };

  const adoptedAnswers = {};
  const adoptedIdentity = {};
  const answers = unionMap(mine.answers, other.answers, base && base.answers, adoptedAnswers);
  const identity = unionMap(mine.identity, other.identity, base && base.identity, adoptedIdentity);

  const submission = mergeSubmission(mine.submission, other.submission, mine.session, other.session);
  const session = mergeSession(mine.session, other.session, submission);
  const sessionChanged = !!session && !!mine.session && session.session_id !== mine.session.session_id;

  const merged = {
    ...mine,
    answers: answers.map,
    identity: identity.map,
    session: session || mine.session,
    submission,
  };

  if (!answers.changed && !identity.changed && !sessionChanged) {
    return { merged, adopted: null };
  }

  const adopted = {};
  if (answers.changed) adopted.answers = adoptedAnswers;
  if (identity.changed) adopted.identity = adoptedIdentity;
  if (sessionChanged) adopted.session = session;
  return { merged, adopted };
}

/** Lê e normaliza o disco AGORA, sem tocar no espelho de memória. */
function readDisk() {
  try {
    const ls = getLS();
    const raw = ls ? ls.getItem(STORAGE_KEY) : null;
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch (_err) {
    // disco ilegível/corrompido: loadState() já fez backup; aqui só não há merge
    return null;
  }
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
  baseline = snapshotBaseline(state);
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

  // MERGE NA ESCRITA: relê o disco e une. É isto que impede uma aba parada no
  // boas-vindas de apagar as respostas que a outra aba acabou de gravar.
  let adopted = null;
  try {
    const disk = readDisk();
    if (disk) {
      const union = unionState(state, disk, baseline);
      state = union.merged;
      adopted = union.adopted;
      memoryState = state;
    }
  } catch (_err) { /* sem merge possível: grava o que temos, nunca menos */ }

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
    baseline = snapshotBaseline(state);
    notify('saved');
    if (adopted) notify('external', { patch: adopted, source: 'merge' });
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
        baseline = snapshotBaseline(state);
        notify('saved');
        if (adopted) notify('external', { patch: adopted, source: 'merge' });
        return true;
      } catch (_e2) { /* segue para o modo memória */ }
    }
    storageAvailable = false;
    notify('memory', { error: isQuotaError(err) ? 'quota' : 'write' });
    return false;
  }
}

/** Executa a gravação pendente e desarma os dois relógios. */
function runPendingWrite() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (maxTimer) {
    clearTimeout(maxTimer);
    maxTimer = null;
  }
  const toWrite = pending;
  pending = null;
  if (toWrite) writeNow(toWrite);
}

/**
 * Agenda gravação (debounce 400ms, TETO de 2s). O espelho em memória é
 * atualizado na hora.
 *
 * Por que o teto: o debounce puro reinicia a cada tecla. Quem digita 85
 * caracteres sem nenhuma pausa de 400ms só gravaria ao esconder a aba — e se a
 * bateria acabar antes disso, o texto se perde. O relógio do teto é armado na
 * PRIMEIRA gravação pendente e não é reiniciado pelas teclas seguintes.
 *
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
    timer = setTimeout(runPendingWrite, DEBOUNCE_MS);
    if (!maxTimer) maxTimer = setTimeout(runPendingWrite, MAX_WAIT_MS);
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
    if (maxTimer) {
      clearTimeout(maxTimer);
      maxTimer = null;
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
    if (maxTimer) {
      clearTimeout(maxTimer);
      maxTimer = null;
    }
    pending = null;
    memoryState = null;
    baseline = null;
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
 * Outra aba gravou na nossa chave.
 *
 * O evento 'storage' NÃO dispara na aba que escreveu — por isso não existe eco:
 * adotamos o que chegou, gravamos (se houver algo nosso que a outra aba não
 * tem) e o ciclo morre em no máximo uma volta, porque só notificamos quando há
 * NOVIDADE de verdade.
 *
 * O que adotamos: apenas chaves que estão VAZIAS aqui. O texto que o
 * participante está digitando neste instante nunca é trocado — ele não está
 * vazio. Navegação (nav) jamais é adotada: a tela desta aba é dela.
 */
function onExternalStorage(event) {
  try {
    if (!event || event.key !== STORAGE_KEY) return; // key null = clear() geral
    if (!event.newValue) return; // outra aba limpou: não apagamos nada por tabela
    const incoming = normalize(JSON.parse(event.newValue));
    const mine = memoryState || emptyState();
    const { merged, adopted } = unionState(mine, incoming, baseline);
    // Passamos a conhecer o disco: o que não adotamos agora não vira "novidade"
    // de novo mais tarde (senão apagar um campo aqui seria desfeito na volta).
    baseline = snapshotBaseline(incoming);
    if (!adopted) return;
    memoryState = merged;
    if (pending) pending = merged;
    notify('external', { patch: adopted, source: 'tab' });
  } catch (_err) {
    /* evento exótico não pode derrubar a digitação */
  }
}

/** Instala o listener de outras abas (idempotente). */
export function ensureCrossTabSync() {
  if (crossTabInstalled) return removeCrossTabSync;
  try {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', onExternalStorage);
      crossTabInstalled = true;
    }
  } catch (_err) { /* noop */ }
  return removeCrossTabSync;
}

export function removeCrossTabSync() {
  try {
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('storage', onExternalStorage);
    }
  } catch (_err) { /* noop */ }
  crossTabInstalled = false;
}

/**
 * Instala os handlers de flush (idempotente).
 * 'visibilitychange' + 'pagehide' cobrem o Safari iOS, onde 'beforeunload'/'unload'
 * não disparam de forma confiável ao trocar de app ou fechar a aba.
 * @returns {() => void} desinstalador
 */
export function ensureFlushHandlers() {
  ensureCrossTabSync();
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
  if (maxTimer) clearTimeout(maxTimer);
  timer = null;
  maxTimer = null;
  pending = null;
  memoryState = null;
  baseline = null;
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
  ensureCrossTabSync,
};
