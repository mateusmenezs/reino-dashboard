/**
 * Estado do briefing: <BriefingProvider> + useBriefing().
 * Dono: AGENTE B. Ver docs/ARQUITETURA_MENTORIA.md §4.
 *
 * Contexto de operação: evento AO VIVO, ~20 pessoas no celular, wifi instável.
 * Regras que valem mais que qualquer elegância de código:
 *   1. nenhuma resposta pode se perder (autosave + flush ao esconder a aba);
 *   2. voltar de etapa NUNCA apaga resposta;
 *   3. reabrir a página restaura no ponto exato (fase, etapa, sub-tela);
 *   4. dois cliques no botão de enviar = UMA requisição (guarda síncrona);
 *   5. retry reaproveita o MESMO submission_id (idempotência no n8n);
 *   6. React 18 StrictMode roda efeitos 2x em dev: nada pode duplicar.
 *
 * Convenção de navegação (nav):
 *   phase       'welcome' | 'identify' | 'steps' | 'review' | 'success' | 'error'
 *   stepIndex   índice 0-based dentro de STEPS (etapa 1 = 0)
 *   screenIndex -1 = tela de abertura (StepIntro)
 *                0..n-1 = sub-telas VISÍVEIS da etapa
 *                n = tela de fechamento (StepOutro)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as Schema from '../schema/questions.js';
import * as Payload from '../schema/payload.js';
import * as Webhook from '../integration/webhook.js';
import * as Storage from './storage.js';
import * as Validation from './validation.js';
import { CONFIG, useEventStep } from '../config/env.js';
import { track, trackOnce } from '../analytics/track.js';
import { ERROR_CODES, getErrorInfo } from '../integration/errors.js';

/* ------------------------------------------------------------------ */
/* acesso tolerante aos módulos de outros donos                        */
/* ------------------------------------------------------------------ */

const STEPS = Schema.STEPS || [];

function getVisibleScreens(step, answers) {
  try {
    if (Schema.getVisibleScreens) return Schema.getVisibleScreens(step, answers) || [];
  } catch (_e) { /* cai no fallback */ }
  return step && Array.isArray(step.screens) ? step.screens : [];
}

function computeProgress(answers, startedAt) {
  let base = null;
  try {
    if (Payload.computeCompletion) base = Payload.computeCompletion(answers);
  } catch (_e) { base = null; }
  if (!base) {
    try {
      base = Validation.computeCompletion(answers);
    } catch (_e) {
      base = { pct: 0, answered: 0, total: 0, perStep: {}, completedSteps: [] };
    }
  }
  let delegations = [];
  try {
    delegations = (Payload.listAiDelegations ? Payload.listAiDelegations(answers) : base.ai_delegations) || [];
  } catch (_e) { delegations = []; }

  return { ...base, ai_delegations: delegations, started_at: startedAt || '' };
}

function buildPayloadSafe(input) {
  try {
    if (Payload.buildPayload) return Payload.buildPayload(input);
  } catch (err) {
    warn('buildPayload falhou; enviando payload de emergência', err);
  }
  // Fallback: briefing cru é infinitamente melhor do que briefing perdido.
  const { answers, identity, session, progress } = input;
  return {
    meta: {
      session_id: session.session_id,
      submission_id: session.submission_id,
      submitted_at: new Date().toISOString(),
      version: CONFIG.SCHEMA_VERSION,
      event_mode: CONFIG.EVENT_MODE,
      fallback_payload: true,
      client: { user_agent: session.user_agent || '', locale: session.locale || '', timezone: session.timezone || '', viewport: session.viewport || '' },
    },
    participant: { name: identity.name || '', whatsapp: identity.whatsapp || '', whatsapp_display: '', email: identity.email || '' },
    answers_raw: answers,
    progress: {
      completion_pct: progress.pct || 0,
      answered_questions: progress.answered || 0,
      total_questions: progress.total || 0,
      started_at: session.started_at || '',
      duration_seconds: 0,
      ai_delegations: progress.ai_delegations || [],
    },
  };
}

async function sendBriefingSafe(payload) {
  if (!Webhook.sendBriefing) {
    return {
      ok: false,
      status: 0,
      errorCode: 'CONFIG_MISSING',
      error: {
        code: 'CONFIG_MISSING',
        title: 'Envio indisponível',
        message: 'O canal de envio não está configurado. Avise a organização do evento.',
        retryable: false,
        status: 0,
      },
    };
  }
  try {
    return await Webhook.sendBriefing(payload, { timeoutMs: CONFIG.WEBHOOK_TIMEOUT_MS });
  } catch (err) {
    // sendBriefing promete nunca lançar; ainda assim, cinto e suspensório.
    return {
      ok: false,
      status: 0,
      errorCode: 'UNKNOWN',
      error: {
        code: 'UNKNOWN',
        title: 'Não conseguimos enviar',
        message: 'Algo deu errado no envio. Toque em tentar de novo — suas respostas estão salvas.',
        retryable: true,
        status: 0,
      },
      thrown: String(err && err.message ? err.message : err),
    };
  }
}

function warn(...args) {
  if (!CONFIG.DEBUG) return;
  try {
    console.warn('[mentoria/store]', ...args);
  } catch (_e) { /* noop */ }
}

/* ------------------------------------------------------------------ */
/* sessão                                                              */
/* ------------------------------------------------------------------ */

function createId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (_e) { /* iOS antigo / contexto não seguro */ }
  const rnd = Math.random().toString(36).slice(2, 10);
  const rnd2 = Math.random().toString(36).slice(2, 6);
  return `${Date.now().toString(36)}-${rnd}-${rnd2}`;
}

function createSession() {
  const nav = typeof navigator === 'undefined' ? null : navigator;
  const win = typeof window === 'undefined' ? null : window;
  let timezone = '';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch (_e) { timezone = ''; }

  return {
    session_id: createId(),
    submission_id: createId(),
    started_at: new Date().toISOString(),
    user_agent: nav ? String(nav.userAgent || '') : '',
    locale: nav ? String(nav.language || '') : '',
    timezone,
    viewport: win && win.innerWidth ? `${win.innerWidth}x${win.innerHeight}` : '',
    version: CONFIG.SCHEMA_VERSION,
    event_mode: CONFIG.EVENT_MODE,
  };
}

/**
 * Bootstrap em cache de MÓDULO.
 * StrictMode monta/desmonta/remonta o provider em dev e o inicializador de
 * useState pode rodar duas vezes: sem este cache, nasceriam dois session_id.
 */
/**
 * O status 'sending' é gravado em disco ANTES da requisição sair, para garantir
 * que o briefing sobreviva à queda da aba. O efeito colateral é que uma aba
 * recarregada no meio do envio restaurava 'sending' e o botão ficava
 * desabilitado para sempre, sem requisição em voo para resgatá-lo.
 *
 * Uma página recém-carregada nunca tem requisição em voo: rebaixamos 'sending'
 * para um erro retentável, preservando as tentativas já contabilizadas (o
 * submission_id não muda, então o n8n continua deduplicando).
 */
function reviveSubmission(saved) {
  const base = { status: 'idle', error: null, errorMessage: null, attempts: 0, sent_at: null };
  if (!saved || typeof saved !== 'object') return base;
  if (saved.status !== 'sending') return { ...base, ...saved };
  const info = getErrorInfo(ERROR_CODES.CANCELED);
  return {
    ...base,
    ...saved,
    status: 'error',
    error: info,
    errorMessage: info.message,
  };
}

let cachedBootstrap = null;

function bootstrap() {
  if (cachedBootstrap) return cachedBootstrap;

  let loaded = { state: null, storageAvailable: false, migrated: false };
  try {
    loaded = Storage.loadState();
  } catch (err) {
    warn('falha ao restaurar; começando limpo', err);
  }

  const saved = loaded.state || Storage.emptyState();
  const hasSession = saved.session && saved.session.session_id && saved.session.submission_id;
  const session = hasSession
    ? { ...createSession(), ...saved.session, version: CONFIG.SCHEMA_VERSION, event_mode: CONFIG.EVENT_MODE }
    : createSession();

  cachedBootstrap = {
    answers: saved.answers || {},
    identity: saved.identity || { name: '', whatsapp: '', email: '' },
    nav: saved.nav || { stepIndex: 0, screenIndex: -1, phase: 'welcome' },
    submission: reviveSubmission(saved.submission),
    session,
    restored: !!loaded.state,
    storageAvailable: !!loaded.storageAvailable,
    migrated: !!loaded.migrated,
  };
  return cachedBootstrap;
}

/* ------------------------------------------------------------------ */
/* navegação                                                           */
/* ------------------------------------------------------------------ */

const PHASES = ['welcome', 'identify', 'steps', 'review', 'success', 'error'];

function clampNav(nav, answers) {
  const phase = PHASES.indexOf(nav && nav.phase) >= 0 ? nav.phase : 'welcome';
  let stepIndex = Number(nav && nav.stepIndex);
  if (!Number.isInteger(stepIndex) || stepIndex < 0) stepIndex = 0;
  if (stepIndex > STEPS.length - 1) stepIndex = Math.max(0, STEPS.length - 1);

  const screens = getVisibleScreens(STEPS[stepIndex], answers);
  let screenIndex = Number(nav && nav.screenIndex);
  if (!Number.isInteger(screenIndex)) screenIndex = -1;
  if (screenIndex < -1) screenIndex = -1;
  if (screenIndex > screens.length) screenIndex = screens.length;

  return { phase, stepIndex, screenIndex };
}

/* ------------------------------------------------------------------ */
/* contexto                                                            */
/* ------------------------------------------------------------------ */

const BriefingContext = createContext(null);

export function BriefingProvider({ children }) {
  const boot = useRef(null);
  if (boot.current === null) boot.current = bootstrap();
  const initial = boot.current;

  const [answers, setAnswersState] = useState(initial.answers);
  const [identity, setIdentityState] = useState(initial.identity);
  const [session, setSession] = useState(initial.session);
  const [nav, setNav] = useState(() => clampNav(initial.nav, initial.answers));
  const [submission, setSubmission] = useState(initial.submission);
  const [errors, setErrors] = useState({});
  const [saveState, setSaveState] = useState('idle');
  const [storageAvailable, setStorageAvailable] = useState(initial.storageAvailable);

  const eventStep = useEventStep();

  /* ---------------- refs espelho (leitura síncrona em callbacks) ---- */
  const answersRef = useRef(answers);
  const identityRef = useRef(identity);
  const navRef = useRef(nav);
  const sessionRef = useRef(session);
  const submissionRef = useRef(submission);
  const submitLockRef = useRef(false);
  const hydratedRef = useRef(false);
  const lastAutosaveTrackRef = useRef(0);

  answersRef.current = answers;
  identityRef.current = identity;
  navRef.current = nav;
  sessionRef.current = session;
  submissionRef.current = submission;

  /* ---------------- progresso ------------------------------------- */
  const progress = useMemo(
    () => computeProgress(answers, session.started_at),
    [answers, session.started_at],
  );
  const progressRef = useRef(progress);
  progressRef.current = progress;

  /* ---------------- derivados de navegação ------------------------- */
  const currentStep = STEPS[nav.stepIndex] || null;
  const visibleScreens = useMemo(
    () => getVisibleScreens(currentStep, answers),
    [currentStep, answers],
  );
  const screenPhase =
    nav.screenIndex < 0 ? 'intro' : nav.screenIndex >= visibleScreens.length ? 'outro' : 'screen';
  const currentScreen = screenPhase === 'screen' ? visibleScreens[nav.screenIndex] : null;

  /* ---------------- persistência ---------------------------------- */
  useEffect(() => {
    const unsubscribe = Storage.subscribe((info) => {
      if (info.status === 'saving') {
        setSaveState('saving');
      } else if (info.status === 'saved' || info.status === 'memory') {
        setSaveState('saved');
        setStorageAvailable(info.status === 'saved' && info.storageAvailable !== false);
        const now = Date.now();
        if (now - lastAutosaveTrackRef.current > 5000) {
          lastAutosaveTrackRef.current = now;
          track('autosave', {
            answered: progressRef.current.answered,
            pct: progressRef.current.pct,
            storage: info.status,
          });
        }
      } else if (info.status === 'cleared') {
        setSaveState('idle');
      }
    });
    Storage.ensureFlushHandlers();
    return unsubscribe;
  }, []);

  useEffect(() => {
    // não grava na hidratação inicial: nada mudou ainda
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    Storage.saveState({ answers, identity, nav, submission, session });
  }, [answers, identity, nav, submission, session]);

  /* ---------------- analytics de entrada --------------------------- */
  useEffect(() => {
    trackOnce(`form_started:${initial.session.session_id}`, 'form_started', {
      restored: initial.restored,
      migrated: initial.migrated,
      storage: initial.storageAvailable ? 'local' : 'memoria',
      answered: progressRef.current.answered,
      event_mode: CONFIG.EVENT_MODE,
    });
  }, [initial]);

  useEffect(() => {
    if (nav.phase !== 'steps' || !currentStep) return;
    trackOnce(`step_started:${session.session_id}:${currentStep.id}`, 'step_started', {
      step: currentStep.id,
      step_index: currentStep.index || nav.stepIndex + 1,
    });
  }, [nav.phase, nav.stepIndex, currentStep, session.session_id]);

  useEffect(() => {
    if (nav.phase !== 'review') return;
    trackOnce(`review_opened:${session.session_id}`, 'review_opened', {
      pct: progressRef.current.pct,
      answered: progressRef.current.answered,
      total: progressRef.current.total,
    });
  }, [nav.phase, session.session_id]);

  /* ---------------- respostas -------------------------------------- */
  const setAnswer = useCallback((id, value) => {
    if (!id) return;
    setAnswersState((prev) => {
      if (prev[id] === value) return prev;
      return { ...prev, [id]: value };
    });
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setAnswers = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return;
    setAnswersState((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const keys = Object.keys(patch);
      let changed = false;
      const next = { ...prev };
      keys.forEach((k) => {
        if (next[k]) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  const setIdentity = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return;
    setIdentityState((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const keys = Object.keys(patch);
      let changed = false;
      const next = { ...prev };
      keys.forEach((k) => {
        if (next[k]) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  /* ---------------- navegação -------------------------------------- */
  const applyNav = useCallback((updater) => {
    setNav((prev) => {
      const raw = typeof updater === 'function' ? updater(prev) : updater;
      return clampNav({ ...prev, ...raw }, answersRef.current);
    });
  }, []);

  const goTo = useCallback(
    (target, maybeScreenIndex) => {
      if (typeof target === 'string') {
        applyNav({ phase: target });
        return;
      }
      if (typeof target === 'number') {
        applyNav({
          phase: 'steps',
          stepIndex: target,
          screenIndex: typeof maybeScreenIndex === 'number' ? maybeScreenIndex : -1,
        });
        return;
      }
      if (target && typeof target === 'object') applyNav(target);
    },
    [applyNav],
  );

  /** Leva direto ao campo (usado pelo "editar" da revisão e pelo foco em erro). */
  const goToField = useCallback(
    (fieldId) => {
      if (!fieldId) return false;
      const currentAnswers = answersRef.current;
      for (let s = 0; s < STEPS.length; s += 1) {
        const screens = getVisibleScreens(STEPS[s], currentAnswers);
        for (let c = 0; c < screens.length; c += 1) {
          const fields = screens[c].fields || [];
          if (fields.some((f) => f.id === fieldId)) {
            applyNav({ phase: 'steps', stepIndex: s, screenIndex: c });
            return true;
          }
        }
      }
      return false;
    },
    [applyNav],
  );

  const next = useCallback(() => {
    const current = navRef.current;
    const currentAnswers = answersRef.current;

    if (current.phase === 'welcome') {
      applyNav({ phase: 'identify' });
      return;
    }
    if (current.phase === 'identify') {
      applyNav({ phase: 'steps', stepIndex: 0, screenIndex: -1 });
      return;
    }
    if (current.phase === 'steps') {
      const step = STEPS[current.stepIndex];
      const screens = getVisibleScreens(step, currentAnswers);

      if (current.screenIndex < screens.length) {
        applyNav({ screenIndex: current.screenIndex + 1 });
        return;
      }
      // estava no outro: fecha a etapa
      if (step) {
        track('step_completed', {
          step: step.id,
          step_index: step.index || current.stepIndex + 1,
          pct: progressRef.current.pct,
          step_pct: Math.round((progressRef.current.perStep[step.id] || 0) * 100),
        });
      }
      if (current.stepIndex >= STEPS.length - 1) {
        applyNav({ phase: 'review' });
      } else {
        applyNav({ stepIndex: current.stepIndex + 1, screenIndex: -1 });
      }
      return;
    }
    if (current.phase === 'review') {
      // avanço a partir da revisão é o envio (submit), nunca navegação cega
    }
  }, [applyNav]);

  const back = useCallback(() => {
    const current = navRef.current;
    const currentAnswers = answersRef.current;

    if (current.phase === 'identify') {
      applyNav({ phase: 'welcome' });
      return;
    }
    if (current.phase === 'steps') {
      if (current.screenIndex > -1) {
        applyNav({ screenIndex: current.screenIndex - 1 });
        return;
      }
      if (current.stepIndex === 0) {
        applyNav({ phase: 'identify' });
        return;
      }
      const prevStep = STEPS[current.stepIndex - 1];
      const screens = getVisibleScreens(prevStep, currentAnswers);
      applyNav({ stepIndex: current.stepIndex - 1, screenIndex: screens.length });
      return;
    }
    if (current.phase === 'review') {
      const lastIndex = Math.max(0, STEPS.length - 1);
      const screens = getVisibleScreens(STEPS[lastIndex], currentAnswers);
      applyNav({ phase: 'steps', stepIndex: lastIndex, screenIndex: screens.length });
      return;
    }
    if (current.phase === 'error') {
      applyNav({ phase: 'review' });
    }
  }, [applyNav]);

  /* ---------------- validação -------------------------------------- */
  const validateCurrentScreen = useCallback(() => {
    const current = navRef.current;
    const currentAnswers = answersRef.current;

    if (current.phase === 'identify') {
      const res = Validation.validateIdentity(identityRef.current);
      setErrors(res.errors);
      return res;
    }
    if (current.phase === 'steps') {
      const screens = getVisibleScreens(STEPS[current.stepIndex], currentAnswers);
      const screen = screens[current.screenIndex];
      if (!screen) return { ok: true, errors: {}, firstErrorId: null };
      const res = Validation.validateScreen(screen, currentAnswers);
      setErrors(res.errors);
      return res;
    }
    return { ok: true, errors: {}, firstErrorId: null };
  }, []);

  /** Valida e só então avança. Devolve o resultado para a UI focar o 1º erro. */
  const tryNext = useCallback(() => {
    const res = validateCurrentScreen();
    if (res.ok) {
      setErrors({});
      next();
    }
    return res;
  }, [validateCurrentScreen, next]);

  const clearErrors = useCallback(() => setErrors({}), []);

  /* ---------------- envio ------------------------------------------ */
  const submit = useCallback(async () => {
    // GUARDA SÍNCRONA: roda antes de qualquer await. Dois cliques no mesmo
    // instante caem aqui e só o primeiro passa.
    if (submitLockRef.current) {
      warn('submit ignorado: já existe um envio em andamento');
      return { ok: false, skipped: 'locked' };
    }
    const currentStatus = submissionRef.current.status;
    if (currentStatus === 'sending') return { ok: false, skipped: 'sending' };
    if (currentStatus === 'success') return { ok: true, skipped: 'already_sent' };
    submitLockRef.current = true;

    const startedAt = Date.now();
    const sessionNow = sessionRef.current;
    const answersNow = answersRef.current;
    const identityNow = identityRef.current;
    const progressNow = progressRef.current;
    const attempt = (submissionRef.current.attempts || 0) + 1;

    setSubmission((prev) => ({ ...prev, status: 'sending', error: null, errorMessage: null, attempts: attempt }));

    track('submission_started', {
      attempt,
      submission_id: sessionNow.submission_id,
      pct: progressNow.pct,
      answered: progressNow.answered,
      total: progressNow.total,
    });

    // garante que o briefing está em disco ANTES de sair pela rede
    try {
      Storage.flushNow({ answers: answersNow, identity: identityNow, nav: navRef.current, session: sessionNow, submission: { ...submissionRef.current, status: 'sending', attempts: attempt } });
    } catch (_e) { /* memória já está atualizada */ }

    let result;
    try {
      const payload = buildPayloadSafe({
        answers: answersNow,
        identity: identityNow,
        session: { ...sessionNow, submitted_at: new Date().toISOString() },
        progress: progressNow,
      });
      result = await sendBriefingSafe(payload);
    } catch (err) {
      result = {
        ok: false,
        status: 0,
        errorCode: 'UNKNOWN',
        error: { code: 'UNKNOWN', title: 'Não conseguimos enviar', message: 'Algo deu errado no envio. Suas respostas estão salvas — tente de novo.', retryable: true, status: 0 },
      };
      warn('exceção inesperada no submit', err);
    } finally {
      submitLockRef.current = false;
    }

    const durationMs = Date.now() - startedAt;

    if (result && result.ok) {
      const sentAt = new Date().toISOString();
      setSubmission({ status: 'success', error: null, errorMessage: null, attempts: attempt, sent_at: sentAt, status_code: result.status || 200 });
      applyNav({ phase: 'success' });
      track('submission_success', {
        attempt,
        submission_id: sessionNow.submission_id,
        status: result.status || 200,
        duration_ms: durationMs,
        retried: !!result.retried,
      });
      try {
        Storage.flushNow({
          answers: answersNow,
          identity: identityNow,
          nav: { ...navRef.current, phase: 'success' },
          session: sessionNow,
          submission: { status: 'success', error: null, attempts: attempt, sent_at: sentAt },
        });
      } catch (_e) { /* noop */ }
      return { ok: true, result };
    }

    const info =
      (result && result.error) || {
        code: (result && result.errorCode) || 'UNKNOWN',
        title: 'Não conseguimos enviar',
        message: 'Algo deu errado no envio. Suas respostas estão salvas — tente de novo.',
        retryable: true,
        status: (result && result.status) || 0,
      };

    setSubmission((prev) => ({
      ...prev,
      status: 'error',
      error: info,
      errorMessage: info.message,
      attempts: attempt,
    }));
    applyNav({ phase: 'error' });
    track('submission_error', {
      attempt,
      submission_id: sessionNow.submission_id,
      code: info.code,
      status: info.status || 0,
      duration_ms: durationMs,
      retryable: info.retryable !== false,
    });
    return { ok: false, result };
  }, [applyNav]);

  /** Retentativa manual: MESMO submission_id (idempotência garantida no n8n). */
  const retry = useCallback(() => submit(), [submit]);

  /* ---------------- recomeçar -------------------------------------- */
  const resetAll = useCallback(() => {
    try {
      Storage.clearAll();
    } catch (_e) { /* noop */ }
    cachedBootstrap = null;

    const fresh = createSession();
    boot.current = {
      answers: {},
      identity: { name: '', whatsapp: '', email: '' },
      nav: { stepIndex: 0, screenIndex: -1, phase: 'welcome' },
      submission: { status: 'idle', error: null, attempts: 0, sent_at: null },
      session: fresh,
      restored: false,
      storageAvailable: Storage.isStorageAvailable(),
      migrated: false,
    };
    cachedBootstrap = boot.current;

    submitLockRef.current = false;
    setAnswersState({});
    setIdentityState({ name: '', whatsapp: '', email: '' });
    setSession(fresh);
    setNav({ stepIndex: 0, screenIndex: -1, phase: 'welcome' });
    setSubmission({ status: 'idle', error: null, attempts: 0, sent_at: null });
    setErrors({});
    setSaveState('idle');
    trackOnce(`form_started:${fresh.session_id}`, 'form_started', { restarted: true });
  }, []);

  /* ---------------- valor do contexto ------------------------------ */
  const value = useMemo(
    () => ({
      // dados
      answers,
      setAnswer,
      setAnswers,
      identity,
      setIdentity,
      session,
      progress,
      // navegação
      nav,
      goTo,
      goToField,
      next,
      back,
      tryNext,
      currentStep,
      currentScreen,
      visibleScreens,
      screenPhase,
      steps: STEPS,
      // validação
      errors,
      setErrors,
      clearErrors,
      validateCurrentScreen,
      // envio
      submission,
      submit,
      retry,
      // manutenção
      resetAll,
      saveState,
      storageAvailable,
      restored: initial.restored,
      eventStep,
    }),
    [
      answers, setAnswer, setAnswers, identity, setIdentity, session, progress,
      nav, goTo, goToField, next, back, tryNext, currentStep, currentScreen,
      visibleScreens, screenPhase, errors, clearErrors, validateCurrentScreen,
      submission, submit, retry, resetAll, saveState, storageAvailable,
      initial.restored, eventStep,
    ],
  );

  return <BriefingContext.Provider value={value}>{children}</BriefingContext.Provider>;
}

/** Hook de acesso ao estado do briefing. */
export function useBriefing() {
  const ctx = useContext(BriefingContext);
  if (!ctx) {
    throw new Error('useBriefing() precisa estar dentro de <BriefingProvider>.');
  }
  return ctx;
}

export { BriefingContext };

/**
 * Somente para testes: esquece o bootstrap em cache para simular
 * "o participante recarregou a página" sem recarregar o módulo.
 * Não tem efeito em produção — nada do app chama isto.
 */
export function __resetBootstrapForTests() {
  cachedBootstrap = null;
}

export default BriefingProvider;
