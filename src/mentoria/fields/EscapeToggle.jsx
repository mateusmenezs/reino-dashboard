/**
 * EscapeToggle — a "saída legítima" de uma pergunta.
 *
 * Dono: AGENTE F. Ver docs/ARQUITETURA_MENTORIA.md §3 e §9.
 *
 * Três variações reais no schema (todas vêm de `field.escape`, nada é hardcodado):
 *   - "Ainda não gerei resultados para terceiros."                 (escape.ai = false)
 *   - "Ainda não sei organizar meu processo. Quero que a IA…"      (escape.ai = true)
 *   - "Quero que a IA avalie e recomende"                          (escape.ai = true)
 *
 * Regras de produto:
 * - Marcar a escape NÃO é desistir: quando `escape.ai === true` é uma escolha
 *   estratégica (delegação), e o visual carrega o tom azul da ação para dizer isso.
 * - Marcar NUNCA apaga a resposta já digitada — quem apaga seria o store, e ele
 *   não é chamado aqui. Este componente só liga/desliga o booleano da escape.
 * - A linha inteira é alvo de toque (CheckboxRow estica o <input> nativo sobre
 *   todo o rótulo, com altura mínima de 56px).
 *
 * @typedef {{ id: string, label: string, ai?: boolean }} Escape
 */

import React from 'react'
import { Badge, CheckboxRow, color, font, radius } from '../ui/index.js'

/**
 * Microcopy de APOIO (não é texto de pergunta — texto de pergunta vem só do schema).
 * Fica aqui, num único lugar, para revisão editorial rápida.
 */
export const ESCAPE_COPY = Object.freeze({
  ai: 'A IA usa o restante do seu briefing como contexto e devolve uma proposta para você ajustar.',
  plain: 'Sem problema — isso não trava o seu avanço.',
  aiBadge: 'Feito com a IA',
})

/**
 * <EscapeToggle escape={field.escape} checked onChange />
 *
 * @param {Object} props
 * @param {Escape} props.escape        Objeto `escape` do campo (obrigatório).
 * @param {boolean} [props.checked]    Estado atual (`answers[escape.id] === true`).
 * @param {(checked: boolean, event: Event) => void} [props.onChange]
 *   Convenção do DS: valor primeiro.
 * @param {boolean} [props.disabled]
 * @param {string} [props.describedBy] id extra para `aria-describedby`.
 * @param {Object} [props.style]
 */
export function EscapeToggle({
  escape,
  checked = false,
  onChange,
  disabled = false,
  describedBy,
  style,
  ...rest
}) {
  if (!escape || !escape.id) return null

  const isAi = escape.ai === true
  const hintId = `${escape.id}-hint`

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '4px 12px 10px',
        borderRadius: radius.lg,
        border: `1px solid ${isAi ? color.actionTintStrong : color.border}`,
        background: isAi ? color.actionTint : color.surfaceMuted,
        fontFamily: font.family,
        ...style,
      }}
      {...rest}
    >
      {isAi ? (
        <div style={{ paddingTop: '10px' }}>
          <Badge tone="accent">{ESCAPE_COPY.aiBadge}</Badge>
        </div>
      ) : null}

      <CheckboxRow
        id={escape.id}
        name={escape.id}
        checked={checked === true}
        disabled={disabled}
        label={escape.label}
        onChange={(next, event) => {
          if (onChange) onChange(next === true, event)
        }}
        describedBy={[hintId, describedBy].filter(Boolean).join(' ') || undefined}
        style={{
          /* o próprio OptionRow já desenha fundo/borda: aqui só tiramos o
             respiro duplicado para a linha encostar na moldura tintada */
          margin: '0 -4px',
        }}
      />

      <p
        id={hintId}
        style={{
          margin: '8px 4px 0',
          fontSize: font.size.sm,
          lineHeight: font.leading.normal,
          color: isAi ? color.actionText : color.muted,
        }}
      >
        {isAi ? ESCAPE_COPY.ai : ESCAPE_COPY.plain}
      </p>
    </div>
  )
}

export default EscapeToggle
