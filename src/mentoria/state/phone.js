/**
 * Telefone celular brasileiro: máscara, validação e normalização.
 * Dono: AGENTE B. Ver docs/ARQUITETURA_MENTORIA.md §5.
 *
 * Formato de exibição: (11) 91234-5678
 * Formato normalizado (payload): +5511912345678  (E.164)
 * Formato mascarado (tela de sucesso): (11) 9****-5678
 *
 * Aceita colagem em qualquer formato humano: "+55 (11) 91234-5678",
 * "55 11 91234 5678", "011.91234.5678", "11912345678".
 */

/** DDDs realmente em uso no Brasil (Anatel). */
export const VALID_DDDS = Object.freeze([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

const DDD_SET = new Set(VALID_DDDS.map(String));

/** Códigos de motivo devolvidos por checkPhoneBR (consumidos por validation.js). */
export const PHONE_REASON = Object.freeze({
  OK: 'ok',
  EMPTY: 'empty',
  SHORT: 'short',
  LONG: 'long',
  DDD: 'ddd',
  MOBILE: 'mobile',
  REPEATED: 'repeated',
});

/** Só os dígitos de uma entrada qualquer. */
export function onlyDigits(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D+/g, '');
}

/**
 * Reduz qualquer entrada ao número local brasileiro (10 ou 11 dígitos),
 * removendo +55, 0055, 0 de operadora e o "0" de tronco.
 * @param {string} value
 * @returns {string} até 11 dígitos
 */
export function toLocalDigits(value) {
  let d = onlyDigits(value);
  if (!d) return '';

  // 00 55 ... (discagem internacional colada)
  if (d.length > 12 && d.startsWith('0055')) d = d.slice(4);
  // +55 ... (DDD 55 local tem 11 dígitos e por isso nunca é cortado aqui)
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  // 0 de tronco / operadora: 011 91234-5678 (nenhum DDD válido começa com 0)
  while (d.length > 10 && d.startsWith('0')) d = d.slice(1);

  return d.slice(0, 11);
}

/**
 * Máscara progressiva para uso em onChange (digitação e colagem).
 * @param {string} value
 * @returns {string} ex.: "(11) 91234-5678"
 */
export function formatPhoneBR(value) {
  const d = toLocalDigits(value);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

/** Alias semântico para o campo de input. */
export const maskPhoneBR = formatPhoneBR;

/**
 * Diagnóstico completo do número.
 * @param {string} value
 * @returns {{ ok:boolean, reason:string, digits:string, ddd:string, isMobile:boolean }}
 */
export function checkPhoneBR(value) {
  const digits = toLocalDigits(value);
  const base = { ok: false, reason: PHONE_REASON.EMPTY, digits, ddd: digits.slice(0, 2), isMobile: false };

  if (!digits) return base;
  if (digits.length < 10) return { ...base, reason: PHONE_REASON.SHORT };
  if (digits.length > 11) return { ...base, reason: PHONE_REASON.LONG };
  if (/^(\d)\1+$/.test(digits)) return { ...base, reason: PHONE_REASON.REPEATED };
  if (!DDD_SET.has(digits.slice(0, 2))) return { ...base, reason: PHONE_REASON.DDD };

  const subscriber = digits.slice(2);

  if (digits.length === 11) {
    // Celular: primeiro dígito do assinante tem que ser 9.
    if (subscriber[0] !== '9') return { ...base, reason: PHONE_REASON.MOBILE };
    return { ok: true, reason: PHONE_REASON.OK, digits, ddd: digits.slice(0, 2), isMobile: true };
  }

  // 10 dígitos: fixo (2..5). Começando com 6..9 é celular sem o 9 na frente.
  if (subscriber[0] >= '2' && subscriber[0] <= '5') {
    return { ok: true, reason: PHONE_REASON.OK, digits, ddd: digits.slice(0, 2), isMobile: false };
  }
  return { ...base, reason: PHONE_REASON.SHORT };
}

/** @returns {boolean} */
export function isValidPhoneBR(value) {
  return checkPhoneBR(value).ok;
}

/**
 * Normaliza para E.164: "+5511912345678".
 * @param {string} value
 * @returns {string} '' se inválido
 */
export function normalizePhoneBR(value) {
  const res = checkPhoneBR(value);
  return res.ok ? `+55${res.digits}` : '';
}

/** Alias explícito para o payload. */
export const toE164 = normalizePhoneBR;

/**
 * Versão exibível a partir de qualquer formato (inclusive E.164).
 * @returns {string} "(11) 91234-5678"
 */
export function toDisplayPhoneBR(value) {
  return formatPhoneBR(value);
}

/**
 * Máscara de privacidade para a tela de sucesso.
 * "+5511912345678" -> "(11) 9****-5678"
 * "+551133334444"  -> "(11) ****-4444"
 * @param {string} value
 * @returns {string} '' se não der para mascarar
 */
export function maskForDisplay(value) {
  const d = toLocalDigits(value);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d[2]}****-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ****-${d.slice(6)}`;
  if (d.length >= 4) return `****-${d.slice(-4)}`;
  return '';
}

export default {
  VALID_DDDS,
  PHONE_REASON,
  onlyDigits,
  toLocalDigits,
  formatPhoneBR,
  maskPhoneBR,
  checkPhoneBR,
  isValidPhoneBR,
  normalizePhoneBR,
  toE164,
  toDisplayPhoneBR,
  maskForDisplay,
};
