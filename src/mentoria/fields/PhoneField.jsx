/**
 * PhoneField — telefone celular brasileiro com máscara progressiva.
 *
 * Dono: AGENTE F. API de máscara/validação: `../state/phone.js` (AGENTE B).
 *
 * O ponto difícil de um campo mascarado é o CURSOR. Quando a máscara insere
 * "(", ")", " " ou "-", o navegador recoloca o caret no fim do valor e editar o
 * meio do número vira um inferno no celular. A solução aqui:
 *
 *   1. no `onChange`, contamos quantos DÍGITOS existem antes do caret;
 *   2. reformatamos a partir dos dígitos;
 *   3. num `useLayoutEffect` (antes da pintura), reposicionamos o caret logo
 *      depois do N-ésimo dígito do valor formatado.
 *
 * Assim o caret acompanha o dígito, não a posição bruta da string.
 *
 * Bônus: apagar um caractere de máscara (ex.: o ")") apaga o dígito anterior,
 * que é o que todo mundo espera de um campo mascarado.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { TextInput } from '../ui/index.js'
import {
  compactPhoneInput,
  formatPhoneBR,
  hasForeignCountryCode,
  onlyDigits,
  toLocalDigits,
} from '../state/phone.js'

/* O app é 100% client-side (Vite), mas `useLayoutEffect` avisa em render de
   servidor. Mesmo padrão já usado pelo design system. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Índice, dentro de `formatted`, logo após o `n`-ésimo dígito. Exportado para teste. */
export function caretIndexAfterDigits(formatted, n) {
  if (n <= 0) {
    const first = formatted.search(/\d/)
    return first < 0 ? formatted.length : first
  }
  let seen = 0
  for (let i = 0; i < formatted.length; i += 1) {
    if (formatted.charCodeAt(i) >= 48 && formatted.charCodeAt(i) <= 57) {
      seen += 1
      if (seen === n) return i + 1
    }
  }
  return formatted.length
}

/**
 * <PhoneField value onChange error />
 *
 * @param {Object} props
 * @param {string} [props.id]         id do input (use o id da pergunta para o foco no 1º erro).
 * @param {string} [props.value]      Valor já formatado, ex.: "(11) 91234-5678".
 * @param {(value: string, event: Event) => void} [props.onChange]
 *   Convenção do DS: valor primeiro. Entrega SEMPRE o valor formatado.
 * @param {string} [props.error]
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]
 * @param {string} [props.describedBy]
 * @param {string} [props.name]
 */
export function PhoneField({
  id,
  value = '',
  onChange,
  error,
  disabled = false,
  placeholder = '(11) 91234-5678',
  describedBy,
  name,
  style,
  ...rest
}) {
  const inputRef = useRef(null)
  /** Quantos dígitos devem ficar ANTES do caret depois do próximo render. */
  const caretDigits = useRef(null)

  const handleChange = useCallback(
    (rawValue, event) => {
      const input = event && event.target ? event.target : null
      const raw = String(rawValue == null ? '' : rawValue)
      const previous = String(value == null ? '' : value)

      /* NÚMERO DE OUTRO PAÍS: decidir ANTES da máscara.
         `toLocalDigits` come o "+", então "+54 9 11 1234-5678" chegava aqui
         como dígitos soltos, `formatPhoneBR` devolvia "" e o campo ficava
         VAZIO — a pessoa via sumir o que acabou de colar e a tela repetia o
         genérico "Precisamos do seu WhatsApp". Devolvendo a entrada compacta,
         ela continua vendo o que colou e a validação explica o motivo certo. */
      if (hasForeignCountryCode(raw)) {
        caretDigits.current = null
        if (onChange) onChange(compactPhoneInput(raw), event)
        return
      }

      const selection = input && typeof input.selectionStart === 'number'
        ? input.selectionStart
        : raw.length

      let digits = toLocalDigits(raw)
      let before = onlyDigits(raw.slice(0, selection)).length

      /* Colagem de "+55 …" / "0 …": `toLocalDigits` descartou prefixo, então a
         contagem do prefixo não vale mais — manda o caret para o fim. */
      if (onlyDigits(raw).length !== digits.length) {
        before = digits.length
      } else if (raw.length < previous.length && digits.length === toLocalDigits(previous).length && before > 0) {
        /* Apagou só um caractere de máscara: remove o dígito imediatamente anterior. */
        digits = digits.slice(0, before - 1) + digits.slice(before)
        before -= 1
      }

      if (before > digits.length) before = digits.length
      if (before < 0) before = 0

      caretDigits.current = before
      const formatted = formatPhoneBR(digits)
      if (onChange) onChange(formatted, event)
    },
    [onChange, value],
  )

  useIsomorphicLayoutEffect(() => {
    const pending = caretDigits.current
    caretDigits.current = null
    const el = inputRef.current
    if (pending == null || !el) return
    /* Só mexe no caret se o campo está realmente em edição. */
    if (typeof document !== 'undefined' && document.activeElement !== el) return
    const pos = caretIndexAfterDigits(String(el.value || ''), pending)
    try {
      el.setSelectionRange(pos, pos)
    } catch (_) {
      /* inputs de tipo não-texto não suportam setSelectionRange — ignorável */
    }
  }, [value])

  return (
    <TextInput
      ref={inputRef}
      id={id}
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value == null ? '' : value}
      onChange={handleChange}
      error={error}
      disabled={disabled}
      placeholder={placeholder}
      describedBy={describedBy}
      /* 16 cortava a colagem: "+55 11 91234-5678" tem 17 caracteres e o último
         dígito era descartado em silêncio — o número virava "(11) 9123-4567",
         plausível na tela e inexistente no WhatsApp. O teto agora só existe
         para conter colagem absurda; quem decide o formato é a normalização. */
      maxLength={24}
      style={style}
      {...rest}
    />
  )
}

export default PhoneField
