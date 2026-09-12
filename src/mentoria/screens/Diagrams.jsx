/**
 * Diagrams.jsx — diagramas conceituais das aberturas de etapa.
 * Dono: AGENTE E (nesta rodada, mantido pelo agente do Design System).
 *
 * Os textos NUNCA são escritos aqui: vêm de `step.intro.diagram` e
 * `step.intro.flow` no schema (dono: Agente A). Este arquivo só sabe desenhar.
 *
 * ── POR QUE O ENCADEADO MUDOU ───────────────────────────────────────────────
 * A versão anterior punha nós e setas como IRMÃOS num `flex-wrap`. Em 390px a
 * linha quebrava no meio: a seta terminava a linha apontando para o vazio e
 * "PONTO B" caía órfão embaixo; em 320px viravam três pílulas soltas e duas
 * setas apontando para nada — logo na peça conceitual da Etapa 3, que é a
 * primeira coisa que a pessoa vê.
 *
 * Agora o padrão é a COLUNA (nó, seta para baixo, nó, seta para baixo, nó),
 * com nó+seta agrupados num item indivisível. A linha horizontal só aparece a
 * partir de 660px, onde a coluna de 640px cabe inteira sem quebrar. O layout
 * mora em `mentoria.css` (`.m-chain`) porque depende de media query; as cores
 * continuam vindo dos tokens.
 *
 * ── POR QUE MARINHO ─────────────────────────────────────────────────────────
 * A abertura da Etapa 3 é o único lugar em que o diagrama É o título da tela.
 * Ele vira a superfície escura da jornada: marinho profundo, nós contornados
 * em branco e o nó do meio — o método da pessoa — em branco sólido.
 */

import React from 'react'
import { color, font, radius, shadow, type } from '../ui/index.js'

/* ------------------------------------------------------------------ */
/* Encadeado: PONTO A → SEU MÉTODO → PONTO B                           */
/* ------------------------------------------------------------------ */

/**
 * Nó do diagrama. Não pode ler como botão: sem sombra, sem gradiente, sem
 * cara de alvo clicável. É uma etiqueta dentro de um desenho.
 */
function ChainNode({ label, emphasis }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
        padding: emphasis ? '14px 16px' : '12px 16px',
        borderRadius: radius.pill,
        background: emphasis ? color.onDark : 'rgba(255, 255, 255, 0.06)',
        color: emphasis ? color.navy : color.onDarkMuted,
        border: `1px solid ${emphasis ? color.onDark : 'rgba(255, 255, 255, 0.24)'}`,
        boxShadow: shadow.none,
        fontSize: emphasis ? font.size.base : font.size.sm,
        fontWeight: font.weight.bold,
        letterSpacing: font.tracking.wide,
        lineHeight: 1.35,
        textTransform: 'uppercase',
        textAlign: 'center',
        wordBreak: 'break-word',
      }}
    >
      {label}
    </span>
  )
}

/** Seta desenhada apontando para BAIXO (a horizontal é a rotação, em CSS). */
function ChainArrow() {
  return (
    <span className="m-chain__arrow" aria-hidden="true" style={{ color: color.actionSoft }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        <line x1="12" y1="4" x2="12" y2="20" />
        <polyline points="6 14 12 20 18 14" />
      </svg>
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
      className="m-chain"
      style={{
        padding: '20px 16px',
        borderRadius: radius.xl,
        /* superfície marinho: é o momento de autoridade da Etapa 3 */
        background: `linear-gradient(160deg, ${color.navyRaised} 0%, ${color.navy} 100%)`,
        border: `1px solid ${color.navyLine}`,
        boxShadow: shadow.navy,
        ...style,
      }}
    >
      {list.map((item, index) => (
        /* nó + seta são UM item: a quebra nunca separa a seta do seu nó */
        <span className="m-chain__item" key={item}>
          <ChainNode label={item} emphasis={index === middle && list.length > 2} />
          {index < list.length - 1 ? <ChainArrow /> : null}
        </span>
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
 * Aqui a superfície continua clara: um bloco escuro por tela basta.
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
        padding: '20px 16px',
        /* mesma família de raio do cartão: são superfícies do mesmo tamanho */
        borderRadius: radius.xl,
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
            paddingBottom: index === list.length - 1 ? 0 : '16px',
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
                /* o número é marinho: a mesma tinta de autoridade do CTA */
                background: color.navy,
                border: `1px solid ${color.navy}`,
                color: color.onDark,
                ...type.numeric,
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            {index === list.length - 1 ? null : (
              <span
                aria-hidden="true"
                style={{ flex: '1 1 auto', width: 2, minHeight: 16, marginTop: 8, background: color.borderStrong }}
              />
            )}
          </span>

          <span
            style={{
              paddingTop: '4px',
              minWidth: 0,
              ...type.bodyStrong,
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
