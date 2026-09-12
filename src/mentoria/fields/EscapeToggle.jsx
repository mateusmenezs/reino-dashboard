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
import { Badge, CheckboxRow, color, font } from '../ui/index.js'

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

  /**
   * UMA superfície por bloco. Antes: um contêiner tintado (borda + fundo +
   * raio 16) envolvia a linha do checkbox (borda + raio 14) e deixava o texto
   * de apoio solto entre os dois — dois retângulos concêntricos que liam como
   * erro de renderização. Agora a saída é separada das opções reais por um
   * fio de 1px (o mesmo recurso que `ProductCards` usa para a opção de menor
   * peso) e o texto de apoio entra DENTRO da linha, como `description`.
   */
  return (
    <div style={{ marginTop: '18px', fontFamily: font.family, ...style }} {...rest}>
      <div aria-hidden="true" style={{ height: '1px', background: color.border, margin: '0 0 14px' }} />

      {isAi ? (
        <div style={{ marginBottom: '10px' }}>
          <Badge tone="accent">{ESCAPE_COPY.aiBadge}</Badge>
        </div>
      ) : null}

      <CheckboxRow
        id={escape.id}
        name={escape.id}
        checked={checked === true}
        disabled={disabled}
        label={escape.label}
        description={isAi ? ESCAPE_COPY.ai : ESCAPE_COPY.plain}
        onChange={(next, event) => {
          if (onChange) onChange(next === true, event)
        }}
        describedBy={describedBy || undefined}
      />
    </div>
  )
}

export default EscapeToggle
