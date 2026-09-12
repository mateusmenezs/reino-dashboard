/**
 * Layout.jsx — chassi compartilhado das telas do Construtor de Mentoria.
 * Dono: AGENTE E (telas & fluxo). Ver docs/ARQUITETURA_MENTORIA.md §10.
 *
 * Três responsabilidades, e só três:
 *   1. <ScreenShell>: coluna única, largura máxima 640px, CTA em <BottomBar>
 *      sticky. NENHUM elemento aqui tem `overflow: hidden/auto` — a página
 *      inteira rola no <body>, que é a condição para o sticky funcionar e para
 *      o teclado do iOS empurrar (e não cobrir) o botão.
 *      `center` equilibra verticalmente as telas curtas (abertura, fechamento,
 *      sucesso, erro): elas tinham ~800px de vazio embaixo e o conteúdo colado
 *      no topo. Quando o conteúdo é mais alto que a viewport, a coluna volta a
 *      crescer normalmente — nada é cortado.
 *   2. `focusField`: rolar até o campo inválido + devolver o foco a ele.
 *   3. `findResumePoint`: onde o participante parou, para a retomada.
 *   4. <ResumeNotice>: a linha de reconhecimento de quem reabriu o app e caiu
 *      direto na sub-tela certa.
 */

import React from 'react'
import { BottomBar, color, control, font, layout, radius } from '../ui/index.js'
import {
  STEPS,
  getVisibleScreens,
  getVisibleFields,
  isFieldRequired,
  hasAnswer,
} from '../schema/questions.js'

/* ------------------------------------------------------------------ */
/* Chassi visual                                                       */
/* ------------------------------------------------------------------ */

/**
 * Envelope de uma tela.
 * @param {object} props
 * @param {React.ReactNode} props.children Conteúdo rolável.
 * @param {React.ReactNode} [props.footer] Conteúdo da barra inferior (já centralizado).
 * @param {boolean} [props.sticky] false = barra no fim do conteúdo (Sucesso/Erro).
 */
export function ScreenShell({
  children,
  footer = null,
  sticky = true,
  center = false,
  padTop = 24,
  padBottom = 32,
}) {
  return (
    <React.Fragment>
      <div
        style={{
          flex: '1 1 auto',
          width: '100%',
          ...(center
            ? { display: 'flex', flexDirection: 'column', justifyContent: 'center' }
            : null),
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: layout.maxWidth,
            margin: '0 auto',
            padding: `${padTop}px ${layout.gutter} ${padBottom}px`,
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
      </div>

      {footer ? (
        <BottomBar sticky={sticky}>
          <div style={{ width: '100%', maxWidth: layout.maxWidth, margin: '0 auto' }}>{footer}</div>
        </BottomBar>
      ) : null}
    </React.Fragment>
  )
}

/**
 * Override para CTAs longos ("CRIAR MINHA MENTORIA COM IA →").
 * O <Button> do DS tem altura fixa e `line-height: 1`; em 320px um rótulo
 * longo estouraria a caixa. Aqui a altura passa a ser mínima e o texto pode
 * quebrar em duas linhas — sem nunca criar rolagem horizontal.
 */
export const wrapCta = {
  height: 'auto',
  minHeight: control.heightLg,
  padding: '14px 16px',
  fontSize: font.size.md,
  lineHeight: 1.25,
  whiteSpace: 'normal',
}

/** Linha de botões da BottomBar: Voltar (fixo) + ação principal (elástica). */
export function BarRow({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
      {children}
    </div>
  )
}

/** Texto de apoio acima dos botões (dica, aviso de armazenamento, erro). */
export function BarHint({ tone = 'muted', children }) {
  if (!children) return null
  return (
    <p
      style={{
        margin: '0 0 10px',
        fontSize: font.size.sm,
        lineHeight: font.leading.normal,
        color: tone === 'danger' ? color.danger : tone === 'warning' ? color.warning : color.muted,
        textAlign: 'center',
      }}
    >
      {children}
    </p>
  )
}

/** Kicker discreto (linha em caixa alta acima do título). */
export function Eyebrow({ children, tone = 'action', style }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: font.size.xs,
        fontWeight: font.weight.semibold,
        letterSpacing: font.tracking.wide,
        textTransform: 'uppercase',
        color: tone === 'muted' ? color.muted : color.actionText,
        ...style,
      }}
    >
      {children}
    </p>
  )
}

/** Parágrafo padrão de corpo de tela. */
export function Body({ children, size = 'base', style }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: size === 'lg' ? font.size.lg : font.size.base,
        lineHeight: font.leading.relaxed,
        color: size === 'lg' ? color.inkSoft : color.muted,
        ...style,
      }}
    >
      {children}
    </p>
  )
}

/** Aviso informativo (nota da etapa 5, motivo do WhatsApp, storage indisponível). */
export function Note({ tone = 'info', children, icon = null, style }) {
  const skin =
    tone === 'warning'
      ? { bg: color.warningBg, bd: color.warningBorder, fg: color.warning }
      : tone === 'success'
        ? { bg: color.successBg, bd: color.successBorder, fg: color.success }
        : { bg: color.actionTint, bd: color.actionTintStrong, fg: color.inkSoft }
  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        padding: '14px 16px',
        borderRadius: radius.lg,
        background: skin.bg,
        border: `1px solid ${skin.bd}`,
        color: skin.fg,
        fontSize: font.size.sm,
        lineHeight: font.leading.relaxed,
        ...style,
      }}
    >
      {icon}
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Reconhecimento da retomada                                          */
/* ------------------------------------------------------------------ */

/**
 * O app restaura a pessoa na sub-tela exata em que ela parou — mas fazia isso
 * em silêncio: quem reabria caía no meio de uma pergunta sem entender por quê.
 * A boa copy de `Welcome` só aparecia para quem voltava ao início à mão.
 *
 * Esta linha resolve isso sem atrapalhar: aparece UMA vez, na primeira tela
 * mostrada depois de uma restauração, e some na navegação seguinte. Não é um
 * aviso (não usa `Note`, não tem `role="alert"`), não pede ação e não tem
 * botão de fechar — é uma frase discreta acima do conteúdo.
 */
let resumeClaimed = false

/** Reabre o reconhecimento (usado só por teste manual e pelo reset do store). */
export function resetResumeNotice() {
  resumeClaimed = false
}

export function ResumeNotice({ restored, where, style }) {
  const [mine] = React.useState(() => {
    if (!restored || resumeClaimed) return false
    resumeClaimed = true
    return true
  })
  if (!mine || !where) return null
  return (
    <p
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: 0,
        fontSize: font.size.sm,
        lineHeight: font.leading.normal,
        color: color.muted,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: 'none',
          width: '6px',
          height: '6px',
          borderRadius: radius.pill,
          background: color.success,
        }}
      />
      <span style={{ minWidth: 0 }}>{where}</span>
    </p>
  )
}

/* ------------------------------------------------------------------ */
/* Foco e rolagem até o erro                                           */
/* ------------------------------------------------------------------ */

/** `prefers-reduced-motion` lido sob demanda (sem hook, usável em callback). */
export function prefersReducedMotion() {
  try {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (_e) {
    return false
  }
}

/** Âncora `[data-field-anchor="<id>"]` — sem depender de CSS.escape. */
export function fieldAnchor(id) {
  if (!id || typeof document === 'undefined') return null
  const nodes = document.querySelectorAll('[data-field-anchor]')
  for (let i = 0; i < nodes.length; i += 1) {
    if (nodes[i].getAttribute('data-field-anchor') === id) return nodes[i]
  }
  return null
}

/**
 * Rola até o campo e devolve o foco a ele.
 * Sem alert, sem lista de erros no topo: o erro aparece onde ele nasceu.
 */
export function focusField(id, options) {
  if (!id || typeof document === 'undefined') return false
  const reduced = prefersReducedMotion()
  const delay = options && typeof options.delay === 'number' ? options.delay : reduced ? 0 : 260

  const anchor = fieldAnchor(id) || document.getElementById(id)
  if (anchor && typeof anchor.scrollIntoView === 'function') {
    try {
      anchor.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
    } catch (_e) {
      anchor.scrollIntoView()
    }
  }

  const apply = () => {
    const el = document.getElementById(id)
    if (!el || typeof el.focus !== 'function') return
    try {
      el.focus({ preventScroll: true })
    } catch (_e) {
      el.focus()
    }
  }

  if (delay <= 0) apply()
  else if (typeof window !== 'undefined') window.setTimeout(apply, delay)
  return true
}

/* ------------------------------------------------------------------ */
/* Retomada                                                            */
/* ------------------------------------------------------------------ */

/**
 * Primeira sub-tela com pergunta obrigatória ainda sem resposta.
 * @param {object} answers
 * @returns {{ phase:'steps'|'review', stepIndex:number, screenIndex:number,
 *             step:object|null, screen:object|null, position:number, total:number }}
 */
export function findResumePoint(answers = {}) {
  for (let s = 0; s < STEPS.length; s += 1) {
    const screens = getVisibleScreens(STEPS[s], answers)
    for (let c = 0; c < screens.length; c += 1) {
      const fields = getVisibleFields(screens[c], answers)
      const pending = fields.some((f) => isFieldRequired(f, answers) && !hasAnswer(f, answers))
      if (pending) {
        return {
          phase: 'steps',
          stepIndex: s,
          screenIndex: c,
          step: STEPS[s],
          screen: screens[c],
          position: c + 1,
          total: screens.length,
        }
      }
    }
  }
  return {
    phase: 'review',
    stepIndex: Math.max(0, STEPS.length - 1),
    screenIndex: 0,
    step: null,
    screen: null,
    position: 0,
    total: 0,
  }
}

/** "SEU LASTRO" -> "Seu Lastro" (o schema guarda os títulos em caixa alta). */
export function titleCase(value) {
  return String(value || '')
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|\s)([a-zà-ú])/g, (_m, sep, chr) => sep + chr.toLocaleUpperCase('pt-BR'))
}

export default ScreenShell
