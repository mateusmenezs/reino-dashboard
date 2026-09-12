/**
 * Diagrams.jsx — diagramas conceituais das aberturas de etapa.
 * Dono: AGENTE E.
 *
 * Os textos NUNCA são escritos aqui: vêm de `step.intro.diagram` e
 * `step.intro.flow` no schema (dono: Agente A). Este arquivo só sabe desenhar.
 *
 * Regra de sobrevivência mobile: nada de largura fixa. O encadeado horizontal
 * quebra linha (`flexWrap`) e o ciclo vertical empilha — em 320px nenhum dos
 * dois cria rolagem horizontal.
 */

import React from 'react'
import { color, font, radius, shadow } from '../ui/index.js'

/* ------------------------------------------------------------------ */
/* Encadeado horizontal: PONTO A → SEU MÉTODO → PONTO B                */
/* ------------------------------------------------------------------ */

function ChainNode({ label, emphasis }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: emphasis ? '12px 16px' : '11px 14px',
        borderRadius: radius.pill,
        background: emphasis ? color.navy : color.surface,
        color: emphasis ? color.onDark : color.ink,
        border: `1px solid ${emphasis ? color.navy : color.borderStrong}`,
        boxShadow: emphasis ? shadow.md : shadow.xs,
        fontSize: emphasis ? font.size.base : font.size.sm,
        fontWeight: font.weight.bold,
        letterSpacing: font.tracking.wide,
        lineHeight: 1.2,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function ChainArrow() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        color: color.actionText,
        fontSize: font.size.lg,
        fontWeight: font.weight.bold,
        lineHeight: 1,
      }}
    >
      →
    </span>
  )
}

/**
 * Encadeado A → B → C. O nó do meio é o protagonista.
 * @param {{ items: string[], label?: string }} props
 */
export function FlowChain({ items = [], label, style }) {
  const list = items.filter(Boolean)
  if (list.length === 0) return null
  const middle = Math.floor(list.length / 2)

  return (
    <div
      role="img"
      aria-label={label || list.join(' para ')}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '22px 12px',
        borderRadius: radius.xxl,
        background: color.surfaceMuted,
        border: `1px solid ${color.border}`,
        ...style,
      }}
    >
      {list.map((item, index) => (
        <React.Fragment key={item}>
          {index > 0 ? <ChainArrow /> : null}
          <ChainNode label={item} emphasis={index === middle && list.length > 2} />
        </React.Fragment>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ciclo vertical: BRIEFING → DIAGNÓSTICO → … → FOLLOW-UP              */
/* ------------------------------------------------------------------ */

/**
 * Sequência numerada e empilhada. Em telas estreitas ler de cima para baixo é
 * mais confortável (e mais legível) do que rolar um trilho horizontal.
 * @param {{ items: string[], label?: string }} props
 */
export function FlowSteps({ items = [], label, style }) {
  const list = items.filter(Boolean)
  if (list.length === 0) return null

  return (
    <ol
      aria-label={label || 'Ciclo de acompanhamento'}
      style={{
        listStyle: 'none',
        margin: 0,
        padding: '18px 16px',
        borderRadius: radius.xxl,
        background: color.surfaceMuted,
        border: `1px solid ${color.border}`,
        ...style,
      }}
    >
      {list.map((item, index) => (
        <li
          key={item}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            paddingBottom: index === list.length - 1 ? 0 : '14px',
          }}
        >
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              alignSelf: 'stretch',
              flex: 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: radius.pill,
                background: color.actionTint,
                border: `1px solid ${color.actionTintStrong}`,
                color: color.actionText,
                fontSize: font.size.xs,
                fontWeight: font.weight.bold,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            {index === list.length - 1 ? null : (
              <span
                aria-hidden="true"
                style={{ flex: '1 1 auto', width: 2, minHeight: 14, marginTop: 6, background: color.actionTintStrong }}
              />
            )}
          </span>

          <span
            style={{
              paddingTop: '5px',
              minWidth: 0,
              fontSize: font.size.base,
              fontWeight: font.weight.semibold,
              letterSpacing: font.tracking.snug,
              lineHeight: font.leading.snug,
              color: color.ink,
              wordBreak: 'break-word',
            }}
          >
            {item}
          </span>
        </li>
      ))}
    </ol>
  )
}

export default { FlowChain, FlowSteps }
