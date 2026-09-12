/**
 * ProductCards — pergunta 29 (Etapa 5): qual modelo de produto construir.
 *
 * Dono: AGENTE F. Títulos, descrições e exemplos vêm de `MODELO_PRODUTO`
 * (schema/options.js) via `field.options`. Nada é hardcodado aqui.
 *
 * Hierarquia visual proposital:
 * - EU ENSINO, VOCÊ FAZ / EU FAÇO COM VOCÊ / EU FAÇO POR VOCÊ são três cards
 *   grandes, de mesmo peso — são as três escolhas reais.
 * - "Ainda não sei / quero recomendação" é uma SAÍDA LEGÍTIMA, não um quarto
 *   modelo: fica abaixo de um separador, mais compacta e sem a mesma presença.
 *   A opção é identificada pelo `field.aiFallback` do schema, não por valor fixo.
 *
 * Acessibilidade: `role="radiogroup"` com `role="radio"` em cada card, tabindex
 * rotativo (só o selecionado, ou o primeiro, entra na ordem de Tab) e navegação
 * por setas/Home/End, como manda o padrão APG de radiogroup composto.
 *
 * Valor produzido: a string `option.value` (ex.: 'faco_com') — exatamente o que
 * `buildPayload` lê em `produto.modelo` e rotula com `labelOf(MODELO_PRODUTO, …)`.
 */

import React, { useCallback, useRef } from 'react'
import { SelectableCard, color, font, radius } from '../ui/index.js'

const ARROWS_NEXT = ['ArrowRight', 'ArrowDown']
const ARROWS_PREV = ['ArrowLeft', 'ArrowUp']

/**
 * <ProductCards value onChange options aiFallback />
 *
 * @param {Object} props
 * @param {string} [props.id]         id do contêiner — alvo do foco no 1º erro.
 * @param {string} [props.value]      Valor selecionado (`option.value`).
 * @param {(value: string) => void} [props.onChange] Convenção do DS: valor primeiro.
 * @param {Array<{value:string,label:string,description?:string}>} props.options
 * @param {string} [props.aiFallback] Rótulo da opção de menor peso (vem do schema).
 * @param {boolean} [props.disabled]
 * @param {string} [props.labelledBy]
 * @param {string} [props.describedBy]
 * @param {boolean} [props.invalid]
 */
export function ProductCards({
  id,
  value,
  onChange,
  options = [],
  aiFallback = '',
  disabled = false,
  labelledBy,
  describedBy,
  invalid = false,
  style,
  ...rest
}) {
  const containerRef = useRef(null)

  const fallback = aiFallback ? options.find((o) => o.label === aiFallback) || null : null
  const primary = fallback ? options.filter((o) => o.value !== fallback.value) : options
  const ordered = fallback ? [...primary, fallback] : primary

  const select = useCallback(
    (next) => {
      if (disabled) return
      if (onChange) onChange(next)
    },
    [disabled, onChange],
  )

  /** Setas/Home/End movem o foco E a seleção, como num radiogroup nativo. */
  const handleKeyDown = useCallback(
    (event) => {
      if (disabled) return
      const isNext = ARROWS_NEXT.includes(event.key)
      const isPrev = ARROWS_PREV.includes(event.key)
      const isHome = event.key === 'Home'
      const isEnd = event.key === 'End'
      if (!isNext && !isPrev && !isHome && !isEnd) return

      const nodes = containerRef.current
        ? Array.from(containerRef.current.querySelectorAll('[role="radio"]:not([disabled])'))
        : []
      if (nodes.length === 0) return

      const current = nodes.indexOf(event.target)
      let index
      if (isHome) index = 0
      else if (isEnd) index = nodes.length - 1
      else if (current < 0) index = 0
      else index = (current + (isNext ? 1 : -1) + nodes.length) % nodes.length

      event.preventDefault()
      const node = nodes[index]
      if (node) {
        node.focus()
        const next = node.getAttribute('data-value')
        if (next != null) select(next)
      }
    },
    [disabled, select],
  )

  const selectedIndex = ordered.findIndex((o) => o.value === value)
  const rovingIndex = selectedIndex >= 0 ? selectedIndex : 0

  return (
    <div
      id={id}
      ref={containerRef}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={{ fontFamily: font.family, outline: 'none', ...style }}
      {...rest}
    >
      <div style={{ display: 'grid', gap: '12px' }}>
        {primary.map((option) => {
          const position = ordered.indexOf(option)
          return (
            <SelectableCard
              key={option.value}
              role="radio"
              data-value={option.value}
              tabIndex={position === rovingIndex ? 0 : -1}
              selected={value === option.value}
              disabled={disabled}
              title={option.label}
              description={option.description}
              onSelect={() => select(option.value)}
              style={{ minHeight: 92, alignItems: 'center' }}
            />
          )
        })}
      </div>

      {fallback ? (
        <div style={{ marginTop: '18px' }}>
          <div
            aria-hidden="true"
            style={{ height: '1px', background: color.border, margin: '0 0 12px' }}
          />
          <SelectableCard
            role="radio"
            data-value={fallback.value}
            tabIndex={ordered.indexOf(fallback) === rovingIndex ? 0 : -1}
            selected={value === fallback.value}
            disabled={disabled}
            onSelect={() => select(fallback.value)}
            style={{
              minHeight: 56,
              padding: '12px 14px',
              borderRadius: radius.lg,
              background: value === fallback.value ? color.selectedBg : color.surfaceMuted,
            }}
          >
            {/* peso visual menor: o rótulo não usa o tamanho de título dos cards */}
            <span
              style={{
                display: 'block',
                fontSize: font.size.base,
                fontWeight: font.weight.semibold,
                color: color.inkSoft,
                lineHeight: font.leading.snug,
              }}
            >
              {fallback.label}
            </span>
            {fallback.description ? (
              <span
                style={{
                  display: 'block',
                  marginTop: '4px',
                  fontSize: font.size.sm,
                  fontWeight: font.weight.regular,
                  lineHeight: font.leading.normal,
                  color: color.muted,
                }}
              >
                {fallback.description}
              </span>
            ) : null}
          </SelectableCard>
        </div>
      ) : null}
    </div>
  )
}

export default ProductCards
