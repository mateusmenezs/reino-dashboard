/**
 * Repeater — lista de itens curtos com numeração visível.
 *
 * Dono: AGENTE F. Atende os dois tipos do schema:
 *   - `repeater`       → erros comuns do público  ("ERRO 1", "+ Adicionar erro")
 *   - `steps-repeater` → passos do método         ("PASSO 1", "+ Adicionar passo")
 *
 * Decisões técnicas que importam:
 *
 * 1. CHAVE ESTÁVEL POR LINHA. O estado interno é `[{ key, text }]` com `key`
 *    gerado por contador. Nunca `key={index}`: remover a linha 2 com índice
 *    como chave faria o React reaproveitar o DOM errado e o texto "andaria"
 *    de uma linha para a outra.
 *
 * 2. RASCUNHO LOCAL × VALOR EMITIDO. A tela mostra linhas vazias (a pessoa
 *    precisa de espaço para pensar), mas o valor emitido é sempre
 *    `string[]` limpo — sem vazios, com `trim`, na ordem da tela — que é
 *    exatamente o que `buildPayload` consome via `strList`. O rascunho fica
 *    aqui; o store recebe só o resultado.
 *
 * 3. RESSINCRONIZAÇÃO. Se o valor externo divergir do rascunho (restauração do
 *    localStorage, "recomeçar do zero"), o rascunho é refeito a partir dele.
 *    Quando a divergência é só o "eco" do que acabamos de emitir, nada acontece.
 *
 * 4. FOCO APÓS REMOVER. O foco vai para o input anterior (ou o primeiro que
 *    sobrou, ou o botão de adicionar). Nunca cai no <body>.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Icon,
  IconButton,
  TextInput,
  color,
  font,
  radius,
  shadow,
} from '../ui/index.js'

/** Microcopy de apoio (texto de pergunta vem sempre do schema). */
export const REPEATER_COPY = Object.freeze({
  remove: (prefix, n) => `Remover ${String(prefix || 'item').toLowerCase()} ${n}`,
  add: 'Adicionar item',
  limit: (max) => `Limite de ${max} itens.`,
  counter: (filled, ideal) => (ideal ? `${filled} de ${ideal} preenchidos` : `${filled} preenchidos`),
})

/* Client-only app: alinha com o design system e evita o aviso de SSR. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const clean = (rows) => rows.map((r) => String(r.text || '').trim()).filter((t) => t !== '')

const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])

/**
 * Monta as linhas iniciais: o que já existe + linhas vazias até `initialCount`.
 * @returns {Array<{key: string, text: string}>}
 */
function seedRows(value, initialCount, max, nextKey) {
  const texts = Array.isArray(value) ? value.map((v) => String(v == null ? '' : v)) : []
  const target = Math.max(1, Math.min(max || Infinity, Math.max(texts.length, initialCount || 1)))
  const rows = []
  for (let i = 0; i < target; i += 1) rows.push({ key: nextKey(), text: texts[i] || '' })
  return rows
}

/**
 * <Repeater value onChange itemLabelPrefix addLabel min max initialCount />
 *
 * @param {Object} props
 * @param {string} [props.id]              id do contêiner — alvo do foco no 1º erro.
 * @param {string[]} [props.value]         Valor atual (array limpo de strings).
 * @param {(value: string[]) => void} [props.onChange] Convenção do DS: valor primeiro.
 * @param {string} [props.itemLabelPrefix] 'ERRO' | 'PASSO'.
 * @param {string} [props.addLabel]        Texto do botão de adicionar (vem do schema).
 * @param {number} [props.initialCount]    Linhas abertas ao entrar na tela.
 * @param {number} [props.max]             Máximo de linhas.
 * @param {number} [props.idealMax]        Faixa sugerida (só orientação de UI).
 * @param {number} [props.itemMaxLength]   Tamanho máximo de cada item.
 * @param {string} [props.placeholder]
 * @param {boolean} [props.disabled]
 * @param {string} [props.labelledBy]      id do rótulo do FieldShell.
 * @param {string} [props.describedBy]
 * @param {boolean} [props.invalid]
 */
export function Repeater({
  id,
  value,
  onChange,
  itemLabelPrefix = 'ITEM',
  addLabel = REPEATER_COPY.add,
  initialCount,
  min = 0,
  max = 0,
  idealMax = 0,
  itemMaxLength = 0,
  placeholder = '',
  disabled = false,
  labelledBy,
  describedBy,
  invalid = false,
  style,
  ...rest
}) {
  const limit = max > 0 ? max : Infinity
  const startCount = Math.max(1, initialCount || Math.max(min, 1))

  const keySeed = useRef(0)
  const nextKey = useCallback(() => {
    keySeed.current += 1
    return `r${keySeed.current}`
  }, [])

  const [rows, setRows] = useState(() => seedRows(value, startCount, limit, nextKey))

  /* refs vivos: o efeito de sincronização não pode depender de `rows`, senão
     re-dispara a cada tecla digitada. */
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const inputsRef = useRef(new Map())
  const addRef = useRef(null)
  const pendingFocus = useRef(null)

  /* ---------------------------------------------------------------- sync */
  useEffect(() => {
    const incoming = Array.isArray(value)
      ? value.map((v) => String(v == null ? '' : v).trim()).filter((t) => t !== '')
      : []
    if (sameList(incoming, clean(rowsRef.current))) return
    setRows(seedRows(incoming, startCount, limit, nextKey))
  }, [value, startCount, limit, nextKey])

  /* --------------------------------------------------------------- foco */
  useIsomorphicLayoutEffect(() => {
    const target = pendingFocus.current
    pendingFocus.current = null
    if (!target) return
    const el = target === '__add__'
      ? (addRef.current && addRef.current.querySelector('button'))
      : inputsRef.current.get(target)
    if (el && typeof el.focus === 'function') el.focus()
  }, [rows])

  const emit = useCallback(
    (nextRows) => {
      setRows(nextRows)
      if (onChange) onChange(clean(nextRows))
    },
    [onChange],
  )

  const setText = useCallback(
    (key, text) => {
      emit(rowsRef.current.map((row) => (row.key === key ? { ...row, text } : row)))
    },
    [emit],
  )

  const addRow = useCallback(() => {
    const current = rowsRef.current
    if (current.length >= limit) return
    const created = { key: nextKey(), text: '' }
    pendingFocus.current = created.key
    emit([...current, created])
  }, [emit, limit, nextKey])

  const removeRow = useCallback(
    (key) => {
      const current = rowsRef.current
      if (current.length <= 1) {
        /* nunca some com a última linha: só esvazia, o campo continua utilizável */
        pendingFocus.current = current[0] ? current[0].key : null
        emit(current.map((row) => ({ ...row, text: '' })))
        return
      }
      const index = current.findIndex((row) => row.key === key)
      const next = current.filter((row) => row.key !== key)
      inputsRef.current.delete(key)
      const neighbour = next[Math.max(0, index - 1)]
      pendingFocus.current = neighbour ? neighbour.key : '__add__'
      emit(next)
    },
    [emit],
  )

  const filled = useMemo(() => clean(rows).length, [rows])
  const atLimit = rows.length >= limit
  const statusId = id ? `${id}-status` : undefined

  return (
    <div
      id={id}
      tabIndex={-1}
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={[describedBy, statusId].filter(Boolean).join(' ') || undefined}
      aria-invalid={invalid || undefined}
      aria-disabled={disabled || undefined}
      style={{ fontFamily: font.family, outline: 'none', ...style }}
      {...rest}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
        {rows.map((row, index) => {
          const inputId = `${id || 'repeater'}-${row.key}`
          const numberLabel = `${itemLabelPrefix} ${index + 1}`
          return (
            <li key={row.key} style={{ margin: 0 }}>
              <div
                style={{
                  padding: '10px 12px 12px',
                  borderRadius: radius.lg,
                  border: `1px solid ${color.border}`,
                  background: color.surface,
                  boxShadow: shadow.xs,
                }}
              >
                <label
                  htmlFor={inputId}
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: font.size.xs,
                    fontWeight: font.weight.bold,
                    letterSpacing: font.tracking.wide,
                    color: color.actionText,
                    textTransform: 'uppercase',
                  }}
                >
                  {numberLabel}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <TextInput
                      id={inputId}
                      name={inputId}
                      ref={(el) => {
                        if (el) inputsRef.current.set(row.key, el)
                        else inputsRef.current.delete(row.key)
                      }}
                      value={row.text}
                      onChange={(next) => setText(row.key, next)}
                      placeholder={placeholder}
                      maxLength={itemMaxLength > 0 ? itemMaxLength : undefined}
                      disabled={disabled}
                      describedBy={describedBy}
                      invalid={false}
                    />
                  </div>
                  <IconButton
                    icon="minus"
                    label={REPEATER_COPY.remove(itemLabelPrefix, index + 1)}
                    disabled={disabled}
                    onClick={() => removeRow(row.key)}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginTop: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span ref={addRef} style={{ display: 'inline-flex' }}>
          <Button
            variant="secondary"
            onClick={addRow}
            disabled={disabled || atLimit}
            leading={<Icon name="plus" size={18} strokeWidth={2.25} />}
          >
            {addLabel}
          </Button>
        </span>

        <span
          id={statusId}
          aria-live="polite"
          style={{
            fontSize: font.size.sm,
            color: atLimit ? color.warning : color.muted,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {atLimit ? REPEATER_COPY.limit(limit) : REPEATER_COPY.counter(filled, idealMax)}
        </span>
      </div>
    </div>
  )
}

export default Repeater
