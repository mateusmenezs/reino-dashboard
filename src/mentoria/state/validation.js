/**
 * Validação do briefing.
 * Dono: AGENTE B (consumida por E/F). Ver docs/ARQUITETURA_MENTORIA.md §5.
 *
 * Princípios de microcopy:
 *  - fala de gente, nunca de formulário: nada de "campo obrigatório" / "input inválido";
 *  - explica POR QUE precisamos da resposta;
 *  - mensagem específica por tipo de campo;
 *  - escape marcada (inclusive delegação à IA) NUNCA bloqueia o avanço.
 */

import * as Schema from '../schema/questions.js';
import { checkPhoneBR } from './phone.js';

/* ------------------------------------------------------------------ */
/* acesso tolerante ao schema (AGENTE A é o dono)                      */
/* ------------------------------------------------------------------ */

const STEPS = Schema.STEPS || [];

const getVisibleFields =
  Schema.getVisibleFields ||
  ((screen, answers) =>
    screen && Array.isArray(screen.fields)
      ? screen.fields.filter((f) => (typeof f.visibleIf === 'function' ? f.visibleIf(answers) : true))
      : []);

const getVisibleScreens =
  Schema.getVisibleScreens ||
  ((step, answers) =>
    step && Array.isArray(step.screens)
      ? step.screens.filter((s) => getVisibleFields(s, answers).length > 0)
      : []);

const isFieldVisible =
  Schema.isFieldVisible || ((field, answers) => (typeof field.visibleIf === 'function' ? field.visibleIf(answers) : true));

const isFieldEscaped =
  Schema.isFieldEscaped || ((field, answers) => !!(field && field.escape && answers[field.escape.id] === true));

const isFieldRequired =
  Schema.isFieldRequired ||
  ((field, answers) => {
    if (!field || !isFieldVisible(field, answers) || isFieldEscaped(field, answers)) return false;
    if (typeof field.requiredIf === 'function') return field.requiredIf(answers);
    return field.required !== false;
  });

const hasAnswer = Schema.hasAnswer || ((field, answers) => String(answers[field.id] ?? '').trim() !== '');

/* ------------------------------------------------------------------ */
/* microcopy                                                           */
/* ------------------------------------------------------------------ */

export const MESSAGES = Object.freeze({
  required: {
    text: 'Precisamos dessa resposta para continuar.',
    textarea: 'Precisamos dessa informação para construir sua transformação.',
    choice: 'Escolhe uma das opções para seguir.',
    multiselect: 'Marca pelo menos uma opção — pode ser mais de uma.',
    product: 'Escolhe o modelo que mais tem a ver com o que você quer construir.',
    repeater: 'Adiciona pelo menos um item aqui.',
    steps: 'Descreve pelo menos um passo do seu processo.',
    audience: 'Descreve o Público A para a gente conseguir comparar.',
  },
  short: {
    text: 'Escreve um pouco mais para a gente entender.',
    textarea: 'Conta um pouco mais pra gente — duas ou três frases já ajudam.',
    item: 'Detalha um pouco mais esse item.',
    audience: 'Descreve esse público com um pouco mais de detalhe.',
  },
  long: 'Ficou um pouco longo. Resume nos pontos principais.',
  other: 'Conta qual é, em poucas palavras.',
  scores: 'Falta dar as notas de 1 a 5 desse público.',
  min: {
    multiselect: 'Marca pelo menos duas opções.',
    repeater: 'Lista pelo menos dois itens — a IA precisa de mais de um para achar o padrão.',
  },
  max: {
    multiselect: 'Escolhe as mais importantes, não todas.',
    repeater: 'Já são itens demais. Mantém os mais importantes.',
  },
  phone: {
    empty: 'Precisamos do seu WhatsApp para te enviar sua mentoria pronta.',
    ddd: 'Esse DDD não existe. Confere o começo do número?',
    short: 'Confere esse número? Ele precisa ter DDD e 9 dígitos.',
    long: 'Esse número ficou com dígitos demais. Confere pra gente?',
    mobile: 'Confere esse número? Celular tem o 9 logo depois do DDD.',
    repeated: 'Esse número não parece real. Confere pra gente?',
    generic: 'Confere esse número? Ele precisa ter DDD.',
  },
  email: {
    empty: 'Precisamos do seu e-mail para enviar sua mentoria pronta.',
    invalid: 'Esse e-mail parece incompleto.',
  },
  name: {
    empty: 'Como podemos te chamar?',
    short: 'Escreve seu nome como você gosta de ser chamado.',
  },
});

/** Domínios digitados errado com frequência (dica suave, nunca bloqueia). */
const EMAIL_TYPOS = Object.freeze({
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'yahoo.con': 'yahoo.com',
  'icloud.con': 'icloud.com',
  'uol.com': 'uol.com.br',
});

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

const str = (v) => (v === null || v === undefined ? '' : String(v).trim());
const err = (message, code, fieldId) => ({ message, code: code || 'invalid', fieldId: fieldId || null });

function isTextType(type) {
  return type === 'text' || type === 'textarea';
}

function requiredMessageFor(field) {
  if (field.requiredMessage) return field.requiredMessage;
  switch (field.type) {
    case 'text':
      return MESSAGES.required.text;
    case 'textarea':
      return MESSAGES.required.textarea;
    case 'radio':
    case 'select':
      return MESSAGES.required.choice;
    case 'product-cards':
      return MESSAGES.required.product;
    case 'multiselect':
      return MESSAGES.required.multiselect;
    case 'repeater':
      return MESSAGES.required.repeater;
    case 'steps-repeater':
      return MESSAGES.required.steps;
    case 'audience-cards':
      return MESSAGES.required.audience;
    case 'phone':
      return MESSAGES.phone.empty;
    case 'email':
      return MESSAGES.email.empty;
    default:
      return MESSAGES.required.text;
  }
}

/** E-mail: validação pragmática (não RFC). */
export function isValidEmail(value) {
  const v = str(value);
  if (!v || v.length > 254) return false;
  if (/\s/.test(v)) return false;
  if (v.split('@').length !== 2) return false;
  const [local, domain] = v.split('@');
  if (!local || local.length > 64) return false;
  if (!domain || domain.indexOf('.') === -1) return false;
  if (/\.\./.test(v) || domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-')) return false;
  return /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(v) && /\.[a-z]{2,}$/i.test(domain);
}

/**
 * Dica não bloqueante para domínio com erro de digitação.
 * @returns {{ message:string, suggestion:string }|null}
 */
export function getEmailWarning(value) {
  const v = str(value).toLowerCase();
  if (!isValidEmail(v)) return null;
  const domain = v.split('@')[1];
  const fix = EMAIL_TYPOS[domain];
  if (!fix) return null;
  const suggestion = `${v.split('@')[0]}@${fix}`;
  return { message: `Você quis dizer ${suggestion}?`, suggestion };
}

/* ------------------------------------------------------------------ */
/* validação por tipo                                                  */
/* ------------------------------------------------------------------ */

function validateTextLike(field, value, required) {
  const v = str(value);
  if (!v) return required ? err(requiredMessageFor(field), 'empty', field.id) : null;

  const min = Number(field.minLength || 0);
  if (min > 0 && v.length < min) {
    return err(field.type === 'textarea' ? MESSAGES.short.textarea : MESSAGES.short.text, 'short', field.id);
  }
  const max = Number(field.maxLength || 0);
  if (max > 0 && v.length > max) {
    return err(`${MESSAGES.long} (máximo ${max} caracteres)`, 'long', field.id);
  }
  return null;
}

function validateChoice(field, value, required, answers) {
  const v = str(value);
  if (!v) return required ? err(requiredMessageFor(field), 'empty', field.id) : null;

  if (field.otherOption && v === field.otherOption.value) {
    const otherId = field.otherOption.placeholderFieldId;
    const otherField = Schema.FIELD_BY_ID ? Schema.FIELD_BY_ID[otherId] : null;
    // Só cobramos o complemento se ele não for um campo próprio da tela
    // (nesse caso ele se valida sozinho) ou se estiver vazio.
    if (otherId && !otherField && !str(answers[otherId])) {
      return err(MESSAGES.other, 'other', otherId);
    }
  }
  return null;
}

function validateMultiselect(field, value, required) {
  const list = Array.isArray(value) ? value.filter((v) => str(v) !== '') : [];
  if (list.length === 0) return required ? err(requiredMessageFor(field), 'empty', field.id) : null;

  const min = Number(field.min || 0);
  if (min > 1 && list.length < min) {
    return err(`Marca pelo menos ${min} opções para a gente entender melhor.`, 'min', field.id);
  }
  const max = Number(field.max || 0);
  if (max > 0 && list.length > max) {
    return err(`${MESSAGES.max.multiselect} (até ${max})`, 'max', field.id);
  }
  return null;
}

function validateRepeater(field, value, required) {
  const items = Array.isArray(value) ? value.map((item) => str(item)) : [];
  const filled = items.filter((item) => item !== '');
  const isSteps = field.type === 'steps-repeater';

  if (filled.length === 0) return required ? err(requiredMessageFor(field), 'empty', field.id) : null;

  const min = Number(field.min || 0);
  if (required && min > 1 && filled.length < min) {
    return err(
      isSteps
        ? `Descreve pelo menos ${min} passos — é o que dá forma ao seu método.`
        : `Lista pelo menos ${min} itens — com mais de um a IA enxerga o padrão.`,
      'min',
      field.id,
    );
  }
  const max = Number(field.max || 0);
  if (max > 0 && filled.length > max) {
    return err(`${MESSAGES.max.repeater} (até ${max})`, 'max', field.id);
  }

  const itemMin = Number(field.itemMinLength || 0);
  if (itemMin > 0) {
    for (let i = 0; i < items.length; i += 1) {
      if (items[i] !== '' && items[i].length < itemMin) {
        const prefix = field.itemLabelPrefix ? `${field.itemLabelPrefix} ${i + 1}` : `Item ${i + 1}`;
        return err(`${prefix}: ${MESSAGES.short.item}`, 'item-short', field.id);
      }
    }
  }
  const itemMax = Number(field.itemMaxLength || 0);
  if (itemMax > 0) {
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].length > itemMax) {
        const prefix = field.itemLabelPrefix ? `${field.itemLabelPrefix} ${i + 1}` : `Item ${i + 1}`;
        return err(`${prefix}: ${MESSAGES.long} (máximo ${itemMax} caracteres)`, 'item-long', field.id);
      }
    }
  }
  return null;
}

function validateAudienceCards(field, value, required) {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const requiredIds = Array.isArray(field.requiredAudiences) ? field.requiredAudiences : ['A'];
  const criteria = Array.isArray(field.criteria) ? field.criteria : [];
  const scale = field.scale || { min: 1, max: 5 };
  const minLength = Number(field.minLength || 0);
  const labelOf = (id) => {
    const found = (field.audiences || []).find((a) => a.value === id);
    return found ? found.label : `Público ${id}`;
  };

  for (let i = 0; i < requiredIds.length; i += 1) {
    const id = requiredIds[i];
    const descricao = str((data[id] || {}).descricao);
    if (!descricao) {
      if (!required) break;
      return err(`Descreve o ${labelOf(id)} para a gente conseguir comparar.`, 'empty', field.id);
    }
    if (minLength > 0 && descricao.length < minLength) {
      return err(`${labelOf(id)}: ${MESSAGES.short.audience}`, 'short', field.id);
    }
  }

  // Todo público descrito precisa de nota, senão a comparação não fecha.
  const ids = Object.keys(data);
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const entry = data[id] || {};
    if (!str(entry.descricao)) continue;
    const scores = entry.scores || {};
    const faltando = criteria.filter((c) => {
      const n = Number(scores[c.value]);
      return !Number.isFinite(n) || n < (scale.min || 1) || n > (scale.max || 5);
    });
    if (faltando.length > 0) {
      return err(`${labelOf(id)}: ${MESSAGES.scores}`, 'scores', field.id);
    }
  }
  return null;
}

function validatePhoneField(field, value, required) {
  const v = str(value);
  if (!v) return required ? err(MESSAGES.phone.empty, 'empty', field.id) : null;
  const res = checkPhoneBR(v);
  if (res.ok) return null;
  return err(MESSAGES.phone[res.reason] || MESSAGES.phone.generic, res.reason, field.id);
}

function validateEmailField(field, value, required) {
  const v = str(value);
  if (!v) return required ? err(MESSAGES.email.empty, 'empty', field.id) : null;
  if (!isValidEmail(v)) return err(MESSAGES.email.invalid, 'invalid', field.id);
  return null;
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

/**
 * Valida um campo.
 * @param {object} field
 * @param {object} answers
 * @returns {null | { message:string, code:string, fieldId:string }}
 */
export function validateField(field, answers = {}) {
  try {
    if (!field) return null;
    if (!isFieldVisible(field, answers)) return null;
    // escape marcada (inclusive delegação à IA) libera o campo por completo
    if (isFieldEscaped(field, answers)) return null;

    const required = isFieldRequired(field, answers);
    const value = answers[field.id];

    switch (field.type) {
      case 'phone':
        return validatePhoneField(field, value, required);
      case 'email':
        return validateEmailField(field, value, required);
      case 'multiselect':
        return validateMultiselect(field, value, required);
      case 'repeater':
      case 'steps-repeater':
        return validateRepeater(field, value, required);
      case 'audience-cards':
        return validateAudienceCards(field, value, required);
      case 'radio':
      case 'select':
      case 'product-cards':
        return validateChoice(field, value, required, answers);
      default:
        if (isTextType(field.type)) return validateTextLike(field, value, required);
        // tipo desconhecido: só cobra presença, nunca inventa regra
        return required && !hasAnswer(field, answers) ? err(requiredMessageFor(field), 'empty', field.id) : null;
    }
  } catch (_e) {
    // validação nunca pode travar o participante
    return null;
  }
}

/**
 * Valida uma sub-tela inteira.
 * @returns {{ ok:boolean, errors:Record<string,string>, firstErrorId:string|null }}
 */
export function validateScreen(screen, answers = {}) {
  const errors = {};
  let firstErrorId = null;
  const fields = getVisibleFields(screen, answers);

  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    const res = validateField(field, answers);
    if (res) {
      const key = res.fieldId || field.id;
      if (!errors[key]) errors[key] = res.message;
      if (!firstErrorId) firstErrorId = key;
    }
  }
  return { ok: firstErrorId === null, errors, firstErrorId };
}

/**
 * Valida a identidade (tela Identify).
 * @param {{name?:string, whatsapp?:string, email?:string}} identity
 * @param {{ requireEmail?:boolean, requireWhatsapp?:boolean }} [opts]
 * @returns {{ ok:boolean, errors:Record<string,string>, firstErrorId:string|null }}
 */
export function validateIdentity(identity = {}, opts = {}) {
  const requireEmail = opts.requireEmail !== false;
  const requireWhatsapp = opts.requireWhatsapp !== false;
  const errors = {};
  let firstErrorId = null;
  const fail = (id, message) => {
    errors[id] = message;
    if (!firstErrorId) firstErrorId = id;
  };

  const name = str(identity.name);
  if (!name) fail('name', MESSAGES.name.empty);
  else if (name.length < 2) fail('name', MESSAGES.name.short);

  const phone = str(identity.whatsapp);
  if (!phone) {
    if (requireWhatsapp) fail('whatsapp', MESSAGES.phone.empty);
  } else {
    const res = checkPhoneBR(phone);
    if (!res.ok) fail('whatsapp', MESSAGES.phone[res.reason] || MESSAGES.phone.generic);
  }

  const email = str(identity.email);
  if (!email) {
    if (requireEmail) fail('email', MESSAGES.email.empty);
  } else if (!isValidEmail(email)) {
    fail('email', MESSAGES.email.invalid);
  }

  return { ok: firstErrorId === null, errors, firstErrorId };
}

/**
 * Valida o briefing inteiro (usado antes de enviar, na tela de revisão).
 * @param {object} answers
 * @param {object} identity
 * @returns {{ ok:boolean, errors:Record<string,string>, firstErrorId:string|null,
 *            stepIndex:number, screenIndex:number, stepId:string|null, screenId:string|null,
 *            phase:'identify'|'steps'|null, count:number }}
 */
export function validateAll(answers = {}, identity = {}) {
  const errors = {};
  let firstErrorId = null;
  let stepIndex = -1;
  let screenIndex = -1;
  let stepId = null;
  let screenId = null;
  let phase = null;

  const id = validateIdentity(identity);
  if (!id.ok) {
    Object.assign(errors, id.errors);
    firstErrorId = id.firstErrorId;
    phase = 'identify';
  }

  for (let s = 0; s < STEPS.length; s += 1) {
    const step = STEPS[s];
    const screens = getVisibleScreens(step, answers);
    for (let c = 0; c < screens.length; c += 1) {
      const res = validateScreen(screens[c], answers);
      if (!res.ok) {
        Object.assign(errors, res.errors);
        if (!firstErrorId || phase === 'identify') {
          // identidade tem prioridade de foco; guardamos a 1ª etapa com erro mesmo assim
          if (!firstErrorId) firstErrorId = res.firstErrorId;
        }
        if (stepIndex === -1) {
          stepIndex = s;
          screenIndex = c;
          stepId = step.id;
          screenId = screens[c].id;
          if (!phase) phase = 'steps';
        }
      }
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    firstErrorId,
    stepIndex,
    screenIndex,
    stepId,
    screenId,
    phase,
    count: Object.keys(errors).length,
  };
}

/* ------------------------------------------------------------------ */
/* progresso (consumido pelo store e pelo payload)                     */
/* ------------------------------------------------------------------ */

/** O campo conta como respondido? (escape/delegação à IA contam como SIM) */
export function isAnswered(field, answers = {}) {
  try {
    return !!hasAnswer(field, answers);
  } catch (_e) {
    return false;
  }
}

/**
 * Conta respostas considerando somente campos VISÍVEIS e OBRIGATÓRIOS.
 * @returns {{ answered:number, total:number }}
 */
export function countAnswered(answers = {}) {
  let answered = 0;
  let total = 0;
  for (let s = 0; s < STEPS.length; s += 1) {
    const screens = getVisibleScreens(STEPS[s], answers);
    for (let c = 0; c < screens.length; c += 1) {
      const fields = getVisibleFields(screens[c], answers);
      for (let f = 0; f < fields.length; f += 1) {
        const field = fields[f];
        const escaped = isFieldEscaped(field, answers);
        if (!escaped && !isFieldRequired(field, answers)) continue;
        total += 1;
        if (escaped || isAnswered(field, answers)) answered += 1;
      }
    }
  }
  return { answered, total };
}

/**
 * Progresso global e por etapa.
 * @returns {{ pct:number, answered:number, total:number,
 *             perStep:Record<string,number>, perStepCounts:Record<string,{answered:number,total:number}>,
 *             completedSteps:string[], ai_delegations:string[] }}
 */
export function computeCompletion(answers = {}) {
  const perStep = {};
  const perStepCounts = {};
  const completedSteps = [];
  const aiDelegations = [];
  let answered = 0;
  let total = 0;

  for (let s = 0; s < STEPS.length; s += 1) {
    const step = STEPS[s];
    let stepAnswered = 0;
    let stepTotal = 0;
    const screens = getVisibleScreens(step, answers);

    for (let c = 0; c < screens.length; c += 1) {
      const fields = getVisibleFields(screens[c], answers);
      for (let f = 0; f < fields.length; f += 1) {
        const field = fields[f];
        const escaped = isFieldEscaped(field, answers);
        if (escaped && field.escape && field.escape.ai) {
          aiDelegations.push(field.payloadPath || field.id);
        }
        if (!escaped && !isFieldRequired(field, answers)) continue;
        stepTotal += 1;
        if (escaped || isAnswered(field, answers)) stepAnswered += 1;
      }
    }

    perStepCounts[step.id] = { answered: stepAnswered, total: stepTotal };
    perStep[step.id] = stepTotal === 0 ? 1 : stepAnswered / stepTotal;
    if (perStep[step.id] >= 1) completedSteps.push(step.id);
    answered += stepAnswered;
    total += stepTotal;
  }

  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  return { pct, answered, total, perStep, perStepCounts, completedSteps, ai_delegations: aiDelegations };
}

export default {
  MESSAGES,
  validateField,
  validateScreen,
  validateIdentity,
  validateAll,
  isValidEmail,
  getEmailWarning,
  isAnswered,
  countAnswered,
  computeCompletion,
};
