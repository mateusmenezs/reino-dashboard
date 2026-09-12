import React, { useEffect, useState } from 'react'
import { color, control, duration, easing, font, gradient, layout, radius, shadow } from './tokens.js'
import {
  Icon,
  composeHandlers,
  srOnly,
  tapReset,
  transition,
  useFocusVisible,
  usePressed,
  useReducedMotion,
} from './primitives.jsx'

/* =========================================================================
 * PROGRESS BAR
 * ====================================================================== */

const clampPct = (v) => Math.max(0, Math.min(100, Math.round((Number(v) || 0) * 100)))

/** <ProgressBar value={0..1} label showValue size="sm|md" /> */
export function ProgressBar({
  value = 0,
  label,
  showValue = true,
  size = 'md',
  valueText,
  style,
  ...rest
}) {
  const reduced = useReducedMotion()
  const pct = clampPct(value)
  const height = size === 'sm' ? 6 : 8
  const text = valueText || `${pct}%`

  return (
    <div style={{ fontFamily: font.family, ...style }} {...rest}>
      {label || showValue ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '8px',
          }}
        >
          {label ? (
            <span
              style={{
                fontSize: font.size.sm,
                fontWeight: font.weight.semibold,
                letterSpacing: font.tracking.normal,
                color: color.muted,
              }}
            >
              {label}
            </span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span
              aria-hidden="true"
              style={{
                fontSize: font.size.sm,
                fontWeight: font.weight.semibold,
                fontVariantNumeric: 'tabular-nums',
                color: color.actionText,
              }}
            >
              {text}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={text}
        aria-label={label ? undefined : 'Progresso do preenchimento'}
        style={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: radius.pill,
          background: color.border,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: radius.pill,
            background: gradient.progress,
            transition: reduced ? 'none' : `width ${duration.slow}ms ${easing.out}`,
          }}
        />
      </div>
    </div>
  )
}

/* =========================================================================
 * ICON BUTTON (usado pelo StepHeader — alvo 44×44)
 * ====================================================================== */

export function IconButton({ icon, label, onClick, disabled = false, style, ...rest }) {
  const reduced = useReducedMotion()
  const [focusVisible, focusProps] = useFocusVisible()
  const [pressed, pressProps] = usePressed()
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      {...pressProps}
      onFocus={focusProps.onFocus}
      onBlur={composeHandlers(focusProps.onBlur, pressProps.onPointerUp)}
      style={{
        ...tapReset,
        flex: 'none',
        width: control.iconButton,
        height: control.iconButton,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: disabled ? color.disabledBorder : color.border,
        background: disabled ? color.disabledBg : pressed ? color.surfaceSunken : color.surface,
        color: disabled ? color.disabledText : color.inkSoft,
        boxShadow: focusVisible ? shadow.focus : shadow.xs,
        transform: pressed && !disabled && !reduced ? 'scale(0.96)' : 'none',
        transition: transition('background-color, box-shadow, transform', duration.fast, reduced),
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...rest}
    >
      {typeof icon === 'string' ? <Icon name={icon} size={20} strokeWidth={2.25} /> : icon}
    </button>
  )
}

/* =========================================================================
 * STEP HEADER
 * ====================================================================== */

/** <StepHeader step total title onBack kicker right titleAs="h1" /> */
export function StepHeader({
  step,
  total,
  title,
  kicker,
  onBack,
  backLabel = 'Voltar para a etapa anterior',
  right,
  titleAs = 'h1',
  titleId,
  style,
  ...rest
}) {
  const Tag = titleAs
  const kickerText =
    kicker != null ? kicker : step != null && total != null ? `Etapa ${step} de ${total}` : null

  return (
    <header style={{ fontFamily: font.family, ...style }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: control.touchMin }}>
        {onBack ? <IconButton icon="chevronLeft" label={backLabel} onClick={onBack} /> : null}
        {kickerText ? (
          <p
            style={{
              flex: '1 1 auto',
              margin: 0,
              fontSize: font.size.xs,
              fontWeight: font.weight.semibold,
              letterSpacing: font.tracking.wide,
              textTransform: 'uppercase',
              color: color.actionText,
            }}
          >
            {kickerText}
          </p>
        ) : (
          <span style={{ flex: '1 1 auto' }} />
        )}
        {right}
      </div>
      {title ? (
        <Tag
          id={titleId}
          style={{
            margin: '12px 0 0',
            fontSize: font.size.display,
            fontWeight: font.weight.bold,
            letterSpacing: font.tracking.tight,
            lineHeight: font.leading.tight,
            color: color.ink,
          }}
        >
          {title}
        </Tag>
      ) : null}
    </header>
  )
}

/* =========================================================================
 * STEP DOTS
 * Sem onSelect: decoração com rótulo textual único (leitor de tela ouve
 * "Etapa 3 de 6", não seis pontos). Com onSelect: botões de 44×44.
 * ====================================================================== */

/** <StepDots total current onSelect labels /> */
export function StepDots({ total = 0, current = 1, onSelect, labels, style, ...rest }) {
  const reduced = useReducedMotion()
  const items = []
  for (let i = 1; i <= total; i += 1) items.push(i)

  const dot = (i) => {
    const done = i < current
    const active = i === current
    return {
      width: active ? 24 : 8,
      height: 8,
      borderRadius: radius.pill,
      background: active ? color.action : done ? color.actionSoft : color.borderStrong,
      transition: transition('width, background-color', duration.base, reduced),
      display: 'block',
    }
  }

  if (!onSelect) {
    return (
      <div
        role="img"
        aria-label={`Etapa ${current} de ${total}`}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', ...style }}
        {...rest}
      >
        {items.map((i) => (
          <span key={i} aria-hidden="true" style={dot(i)} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', ...style }} {...rest}>
      {items.map((i) => (
        <DotButton
          key={i}
          index={i}
          current={current}
          total={total}
          label={labels && labels[i - 1]}
          dotStyle={dot(i)}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function DotButton({ index, current, total, label, dotStyle, onSelect }) {
  const [focusVisible, focusProps] = useFocusVisible()
  return (
    <button
      type="button"
      aria-current={index === current ? 'step' : undefined}
      onClick={() => onSelect(index)}
      onFocus={focusProps.onFocus}
      onBlur={focusProps.onBlur}
      style={{
        ...tapReset,
        width: control.touchMin,
        height: control.touchMin,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 0,
        background: 'transparent',
        borderRadius: radius.md,
        boxShadow: focusVisible ? shadow.focus : 'none',
        padding: 0,
      }}
    >
      <span aria-hidden="true" style={dotStyle} />
      <span style={srOnly}>{label || `Ir para a etapa ${index} de ${total}`}</span>
    </button>
  )
}

/* =========================================================================
 * BOTTOM BAR
 *
 * iOS: o teclado NÃO redimensiona o layout viewport, só o visual viewport.
 * Uma barra `position: fixed/sticky; bottom: 0` continua ancorada ao fundo do
 * layout viewport e passa a flutuar sobre o campo em foco enquanto o usuário
 * digita. A solução aqui: detectar o teclado pelo `visualViewport` e devolver a
 * barra ao fluxo (`position: static`) enquanto ele estiver aberto. Ela reaparece
 * grudada assim que o teclado fecha.
 *
 * Recomendação ao Tech Lead: use `sticky` (padrão). Requer que NENHUM ancestral
 * tenha `overflow: hidden/auto` — a página inteira deve rolar no <body>.
 * Se a tela precisar da barra no fim do conteúdo (Sucesso, Erro), passe
 * `sticky={false}`.
 * ====================================================================== */

/** Teclado virtual aberto? Heurística por visualViewport (iOS/Android). */
export function useKeyboardOpen(enabled = true, threshold = 140) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!enabled) {
      setOpen(false)
      return undefined
    }
    if (typeof window === 'undefined' || !window.visualViewport) return undefined
    const vv = window.visualViewport
    let frame = 0
    const check = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const hidden = window.innerHeight - (vv.height + vv.offsetTop)
        setOpen(hidden > threshold)
      })
    }
    vv.addEventListener('resize', check)
    vv.addEventListener('scroll', check)
    check()
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', check)
      vv.removeEventListener('scroll', check)
    }
  }, [enabled, threshold])
  return open
}

/** <BottomBar sticky hideOnKeyboard safeArea>{children}</BottomBar> */
export function BottomBar({
  children,
  sticky = true,
  hideOnKeyboard = true,
  safeArea = true,
  above,
  style,
  ...rest
}) {
  const keyboardOpen = useKeyboardOpen(sticky && hideOnKeyboard)
  const floating = sticky && !keyboardOpen

  return (
    <div
      style={{
        position: floating ? 'sticky' : 'static',
        bottom: floating ? 0 : undefined,
        zIndex: floating ? layout.z.sticky : undefined,
        width: '100%',
        boxSizing: 'border-box',
        background: floating ? 'rgba(255, 255, 255, 0.94)' : color.surface,
        backdropFilter: floating ? 'saturate(1.4) blur(12px)' : undefined,
        WebkitBackdropFilter: floating ? 'saturate(1.4) blur(12px)' : undefined,
        borderTop: `1px solid ${color.border}`,
        boxShadow: floating ? shadow.bar : 'none',
        paddingTop: '12px',
        paddingLeft: layout.gutter,
        paddingRight: layout.gutter,
        /* safe area do iPhone com notch/home indicator */
        paddingBottom: safeArea ? 'max(12px, env(safe-area-inset-bottom))' : '12px',
        fontFamily: font.family,
        ...style,
      }}
      {...rest}
    >
      {above ? <div style={{ marginBottom: '10px' }}>{above}</div> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>{children}</div>
    </div>
  )
}

export default {
  ProgressBar,
  StepHeader,
  StepDots,
  BottomBar,
  IconButton,
  useKeyboardOpen,
}
