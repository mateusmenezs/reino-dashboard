import React, { useCallback, useEffect, useRef, useState } from 'react'
import { color, control, duration, easing, font, gradient, motion, radius, shadow } from './tokens.js'

/* =========================================================================
 * HOOKS E HELPERS COMPARTILHADOS
 * Ficam aqui porque `inputs.jsx` e `navigation.jsx` importam deste módulo.
 * ====================================================================== */

/** Junta handlers opcionais sem perder o do consumidor. */
export function composeHandlers(...fns) {
  return (event) => {
    for (const fn of fns) if (typeof fn === 'function') fn(event)
  }
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

function readReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia(REDUCED_QUERY).matches
  } catch (_) {
    return false
  }
}

/**
 * `prefers-reduced-motion` resolvido em JS — não dependemos de CSS externo
 * para suprimir animação. Toda transição/animação do DS passa por aqui.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(readReducedMotion)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    let mql
    try {
      mql = window.matchMedia(REDUCED_QUERY)
    } catch (_) {
      return undefined
    }
    const onChange = (e) => setReduced(e.matches)
    setReduced(mql.matches)
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else if (mql.addListener) mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else if (mql.removeListener) mql.removeListener(onChange)
    }
  }, [])
  return reduced
}

/**
 * Foco visível sem depender de CSS.
 * O CSS global do dashboard aplica `input, select { outline: none }`; em vez de
 * brigar por especificidade com pseudo-classes, checamos `:focus-visible` no
 * próprio evento e desenhamos o anel via estilo inline (que sempre vence).
 * Se o navegador não suportar `:focus-visible`, o anel aparece em todo foco —
 * degradação segura (mais anel, nunca menos).
 */
export function useFocusVisible() {
  const [focusVisible, setFocusVisible] = useState(false)
  const onFocus = useCallback((event) => {
    let visible = true
    try {
      const node = event && event.target
      if (node && typeof node.matches === 'function') visible = node.matches(':focus-visible')
    } catch (_) {
      visible = true
    }
    setFocusVisible(visible)
  }, [])
  const onBlur = useCallback(() => setFocusVisible(false), [])
  return [focusVisible, { onFocus, onBlur }]
}

/** Estado de pressão (:active) em JS — feedback tátil garantido no toque. */
export function usePressed() {
  const [pressed, setPressed] = useState(false)
  const on = useCallback(() => setPressed(true), [])
  const off = useCallback(() => setPressed(false), [])
  return [
    pressed,
    {
      onPointerDown: on,
      onPointerUp: off,
      onPointerCancel: off,
      onPointerLeave: off,
      onTouchEnd: off,
    },
    off,
  ]
}

/** Base de qualquer elemento clicável: sem highlight cinza do iOS, sem seleção. */
export const tapReset = {
  WebkitTapHighlightColor: 'transparent',
  WebkitTouchCallout: 'none',
  touchAction: 'manipulation',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  fontFamily: font.family,
  cursor: 'pointer',
  /* Contorno transparente: invisível no tema normal, mas o Windows High
     Contrast Mode o repinta — garante foco visível também lá. */
  outline: '2px solid transparent',
  outlineOffset: '2px',
}

/** Esconde visualmente mantendo no fluxo de acessibilidade. */
export const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
}

/**
 * Input nativo esticado sobre o rótulo inteiro: mantém semântica e navegação
 * por setas do grupo de radios, e faz do alvo de toque a linha toda (≥44px).
 */
export const hiddenControl = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  margin: 0,
  padding: 0,
  opacity: 0,
  /* 16px também aqui: o Safari iOS usa o font-size do controle focado para
     decidir se dá zoom. Radio/checkbox nunca devem disparar isso. */
  fontSize: '16px',
  appearance: 'none',
  WebkitAppearance: 'none',
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  zIndex: 1,
}

/** Anel de foco padrão, com variante de erro. */
export function focusRing(active, invalid) {
  if (!active) return null
  return invalid ? shadow.focusDanger : shadow.focus
}

export function transition(props, ms, reduced) {
  if (reduced) return 'none'
  return motion.transition(props, ms)
}

/* =========================================================================
 * ÍCONES (inline, sem dependência)
 * ====================================================================== */

export function Icon({ name, size = 20, strokeWidth = 2, color: stroke = 'currentColor', style, ...rest }) {
  const paths = {
    check: <polyline points="20 6 9 17 4 12" />,
    chevronLeft: <polyline points="15 18 9 12 15 6" />,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    plus: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    minus: <line x1="5" y1="12" x2="19" y2="12" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="13" />
        <line x1="12" y1="16.5" x2="12" y2="16.6" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="11" x2="12" y2="16" />
        <line x1="12" y1="7.5" x2="12" y2="7.6" />
      </>
    ),
    cloud: <path d="M7 18a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17.5 9.5 3.75 3.75 0 0 1 17 18H7z" />,
  }
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: 'none', ...style }}
      {...rest}
    >
      {paths[name] || null}
    </svg>
  )
}

/* =========================================================================
 * SPINNER
 * Animação por SMIL (<animateTransform>) em vez de @keyframes: o DS não pode
 * criar CSS, e SMIL de rotação é suportado em Safari iOS e Chrome Android.
 * Com `prefers-reduced-motion` vira um arco estático.
 * ====================================================================== */

export function Spinner({ size = 18, label, strokeWidth = 2.5, style, ...rest }) {
  const reduced = useReducedMotion()
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flex: 'none', ...style }}
      {...rest}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.22" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      >
        {!reduced && (
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="0.8s"
            repeatCount="indefinite"
          />
        )}
      </path>
    </svg>
  )
  if (!label) return svg
  return (
    <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      {svg}
      <span style={srOnly}>{label}</span>
    </span>
  )
}

/* =========================================================================
 * BUTTON
 * ====================================================================== */

const BUTTON_SIZES = {
  md: { height: control.heightMd, padding: '0 20px', fontSize: font.size.md, gap: '8px' },
  lg: { height: control.heightLg, padding: '0 24px', fontSize: font.size.lg, gap: '10px' },
}

function buttonSkin(variant, { pressed, disabled }) {
  if (disabled) {
    return {
      background: color.disabledBg,
      color: color.disabledText,
      borderColor: color.disabledBorder,
      boxShadow: shadow.none,
    }
  }
  if (variant === 'secondary') {
    return {
      background: pressed ? color.surfaceSunken : color.surface,
      color: color.ink,
      borderColor: color.borderStrong,
      boxShadow: pressed ? shadow.none : shadow.xs,
    }
  }
  if (variant === 'ghost') {
    return {
      background: pressed ? color.actionTint : 'transparent',
      color: color.actionText,
      borderColor: 'transparent',
      boxShadow: shadow.none,
    }
  }
  if (variant === 'danger') {
    return {
      background: pressed ? color.dangerDeep : color.danger,
      color: color.onDark,
      borderColor: 'transparent',
      boxShadow: pressed ? shadow.none : shadow.xs,
    }
  }
  return {
    background: pressed ? gradient.actionPressed : gradient.action,
    color: color.onDark,
    borderColor: 'transparent',
    boxShadow: pressed ? shadow.none : shadow.sm,
  }
}

/**
 * <Button variant="primary|secondary|ghost|danger" size="md|lg" full loading disabled onClick />
 * Altura mínima 48px (md) / 56px (lg) — sempre acima do alvo de 44px.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  children,
  leading,
  trailing,
  style,
  onFocus,
  onBlur,
  ...rest
}) {
  const reduced = useReducedMotion()
  const [focusVisible, focusProps] = useFocusVisible()
  const [pressed, pressProps, clearPressed] = usePressed()
  const isDisabled = disabled || loading
  const dims = BUTTON_SIZES[size] || BUTTON_SIZES.md
  const skin = buttonSkin(variant, { pressed: pressed && !isDisabled, disabled: isDisabled })

  useEffect(() => {
    if (isDisabled) clearPressed()
  }, [isDisabled, clearPressed])

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onClick={isDisabled ? undefined : onClick}
      {...pressProps}
      onFocus={composeHandlers(focusProps.onFocus, onFocus)}
      onBlur={composeHandlers(focusProps.onBlur, pressProps.onPointerUp, onBlur)}
      style={{
        ...tapReset,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: dims.gap,
        width: full ? '100%' : undefined,
        minWidth: control.touchMin,
        minHeight: dims.height,
        height: dims.height,
        padding: dims.padding,
        borderRadius: radius.lg,
        borderWidth: '1px',
        borderStyle: 'solid',
        fontSize: dims.fontSize,
        fontWeight: font.weight.semibold,
        letterSpacing: font.tracking.snug,
        lineHeight: 1,
        textAlign: 'center',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transform: pressed && !isDisabled && !reduced ? motion.press : 'none',
        transition: transition('background-color, box-shadow, transform, border-color, color', duration.fast, reduced),
        ...skin,
        boxShadow: focusVisible ? `${skin.boxShadow === shadow.none ? '' : skin.boxShadow + ', '}${shadow.focus}` : skin.boxShadow,
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 20 : 18} /> : leading || null}
      <span style={{ display: 'inline-block' }}>{children}</span>
      {!loading && trailing ? trailing : null}
    </button>
  )
}

/* =========================================================================
 * CARD
 * ====================================================================== */

export function Card({ padded = true, elevated = false, as: Tag = 'div', children, style, ...rest }) {
  return (
    <Tag
      style={{
        background: color.surface,
        border: `1px solid ${color.border}`,
        borderRadius: radius.xl,
        padding: padded ? '20px' : 0,
        boxShadow: elevated ? shadow.md : shadow.xs,
        color: color.ink,
        fontFamily: font.family,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* =========================================================================
 * SELECTABLE CARD
 * `role` aceita 'button' (aria-pressed), 'radio' ou 'checkbox' (aria-checked).
 * A borda permanece 1px em todos os estados e a seleção usa `inset box-shadow`
 * — assim nada "pula" 1px quando o usuário seleciona.
 * ====================================================================== */

export function SelectableCard({
  selected = false,
  onSelect,
  title,
  description,
  badge,
  disabled = false,
  role = 'button',
  children,
  style,
  onFocus,
  onBlur,
  ...rest
}) {
  const reduced = useReducedMotion()
  const [focusVisible, focusProps] = useFocusVisible()
  const [pressed, pressProps] = usePressed()

  const ariaState =
    role === 'button' ? { 'aria-pressed': selected } : { 'aria-checked': selected, role }

  const rings = []
  if (selected) rings.push(shadow.insetSelected)
  if (focusVisible) rings.push(shadow.focus)
  if (!selected && !pressed) rings.push(shadow.xs)

  return (
    <button
      type="button"
      {...(role === 'button' ? { ...ariaState } : ariaState)}
      disabled={disabled}
      onClick={disabled ? undefined : onSelect}
      {...pressProps}
      onFocus={composeHandlers(focusProps.onFocus, onFocus)}
      onBlur={composeHandlers(focusProps.onBlur, pressProps.onPointerUp, onBlur)}
      style={{
        ...tapReset,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        width: '100%',
        minHeight: 64,
        padding: '16px',
        textAlign: 'left',
        borderRadius: radius.xl,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: disabled ? color.disabledBorder : selected ? color.action : color.borderStrong,
        background: disabled ? color.disabledBg : selected ? color.selectedBg : color.surface,
        color: disabled ? color.disabledText : color.ink,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: rings.length ? rings.join(', ') : shadow.none,
        transform: pressed && !disabled && !reduced ? motion.press : 'none',
        transition: transition('background-color, border-color, box-shadow, transform', duration.fast, reduced),
        ...style,
      }}
      {...rest}
    >
      <span style={{ flex: '1 1 auto', minWidth: 0 }}>
        {badge ? (
          <span style={{ display: 'block', marginBottom: '8px' }}>
            <Badge tone={selected ? 'accent' : 'neutral'}>{badge}</Badge>
          </span>
        ) : null}
        {title ? (
          <span
            style={{
              display: 'block',
              fontSize: font.size.lg,
              fontWeight: font.weight.semibold,
              letterSpacing: font.tracking.snug,
              lineHeight: font.leading.snug,
              color: disabled ? color.disabledText : color.ink,
            }}
          >
            {title}
          </span>
        ) : null}
        {description ? (
          <span
            style={{
              display: 'block',
              marginTop: '6px',
              fontSize: font.size.base,
              lineHeight: font.leading.normal,
              fontWeight: font.weight.regular,
              color: disabled ? color.disabledText : color.muted,
            }}
          >
            {description}
          </span>
        ) : null}
        {children}
      </span>
      <Indicator selected={selected} shape={role === 'checkbox' ? 'square' : 'circle'} disabled={disabled} />
    </button>
  )
}

/** Marca de seleção — affordance permanente, não depende de :hover. */
export function Indicator({ selected, shape = 'circle', disabled = false, size = 24 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: 'none',
        width: size,
        height: size,
        marginTop: '2px',
        borderRadius: shape === 'square' ? radius.xs : radius.pill,
        borderWidth: selected ? 0 : '2px',
        borderStyle: 'solid',
        borderColor: disabled ? color.disabledBorder : color.borderStrong,
        background: selected ? (disabled ? color.disabledText : color.action) : color.surface,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color.onDark,
      }}
    >
      {selected ? <Icon name="check" size={size - 8} strokeWidth={3} /> : null}
    </span>
  )
}

/* =========================================================================
 * BADGE
 * ====================================================================== */

const BADGE_TONES = {
  success: { bg: color.successBg, fg: color.success, bd: color.successBorder },
  neutral: { bg: color.surfaceSunken, fg: color.inkSoft, bd: color.border },
  accent: { bg: color.actionTint, fg: color.actionText, bd: color.actionTintStrong },
  warning: { bg: color.warningBg, fg: color.warning, bd: color.warningBorder },
  danger: { bg: color.dangerBg, fg: color.danger, bd: color.dangerBorder },
}

export function Badge({ tone = 'neutral', children, leading, style, ...rest }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.neutral
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 10px',
        borderRadius: radius.pill,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        fontFamily: font.family,
        fontSize: font.size.xs,
        fontWeight: font.weight.semibold,
        letterSpacing: font.tracking.normal,
        lineHeight: 1.35,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {leading}
      {children}
    </span>
  )
}

/* =========================================================================
 * REVEAL — fade + slide de 8px, suprimido em prefers-reduced-motion
 * ====================================================================== */

export function Reveal({
  delay = 0,
  distance = motion.revealDistance,
  as: Tag = 'div',
  children,
  style,
  ...rest
}) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(() => readReducedMotion())
  const frame = useRef(0)

  useEffect(() => {
    if (reduced) {
      setShown(true)
      return undefined
    }
    let timer = 0
    frame.current = requestAnimationFrame(() => {
      timer = setTimeout(() => setShown(true), delay)
    })
    return () => {
      cancelAnimationFrame(frame.current)
      if (timer) clearTimeout(timer)
    }
  }, [delay, reduced])

  if (reduced) {
    return (
      <Tag style={style} {...rest}>
        {children}
      </Tag>
    )
  }

  return (
    <Tag
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translate3d(0, ${distance}px, 0)`,
        transition: `opacity ${duration.slow}ms ${easing.out}, transform ${duration.slow}ms ${easing.out}`,
        willChange: shown ? 'auto' : 'opacity, transform',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* =========================================================================
 * SAVE INDICATOR
 * ====================================================================== */

export function SaveIndicator({
  state = 'idle',
  labels = { saving: 'Salvando…', saved: 'Salvo', idle: '' },
  style,
  ...rest
}) {
  const reduced = useReducedMotion()
  const isSaving = state === 'saving'
  const isSaved = state === 'saved'
  const text = isSaving ? labels.saving : isSaved ? labels.saved : labels.idle

  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        /* altura fixa: evita o cabeçalho "pular" quando o estado muda */
        minHeight: 20,
        minWidth: 72,
        fontFamily: font.family,
        fontSize: font.size.sm,
        fontWeight: font.weight.medium,
        color: isSaved ? color.success : color.muted,
        opacity: state === 'idle' ? 0 : 1,
        transition: transition('opacity, color', duration.base, reduced),
        ...style,
      }}
      {...rest}
    >
      {isSaving ? <Spinner size={14} /> : null}
      {isSaved ? <Icon name="check" size={15} strokeWidth={2.5} /> : null}
      {text}
    </span>
  )
}

/* =========================================================================
 * DIVIDER / SECTION TITLE
 * ====================================================================== */

export function Divider({ label, spacing = 20, style, ...rest }) {
  if (!label) {
    return (
      <hr
        style={{
          border: 0,
          borderTop: `1px solid ${color.border}`,
          margin: `${spacing}px 0`,
          ...style,
        }}
        {...rest}
      />
    )
  }
  return (
    <div
      role="separator"
      aria-label={typeof label === 'string' ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: `${spacing}px 0`,
        fontFamily: font.family,
        ...style,
      }}
      {...rest}
    >
      <span style={{ flex: 1, height: '1px', background: color.border }} />
      <span
        style={{
          fontSize: font.size.xs,
          fontWeight: font.weight.semibold,
          letterSpacing: font.tracking.wide,
          textTransform: 'uppercase',
          color: color.muted,
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, height: '1px', background: color.border }} />
    </div>
  )
}

export function SectionTitle({
  title,
  children,
  kicker,
  description,
  level = 2,
  id,
  style,
  ...rest
}) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}`
  const heading = title || children
  return (
    <div style={{ fontFamily: font.family, ...style }} {...rest}>
      {kicker ? (
        <p
          style={{
            margin: '0 0 6px',
            fontSize: font.size.xs,
            fontWeight: font.weight.semibold,
            letterSpacing: font.tracking.wide,
            textTransform: 'uppercase',
            color: color.actionText,
          }}
        >
          {kicker}
        </p>
      ) : null}
      <Tag
        id={id}
        style={{
          margin: 0,
          fontSize: level <= 1 ? font.size.displayLg : font.size.xl,
          fontWeight: level <= 1 ? font.weight.bold : font.weight.semibold,
          letterSpacing: font.tracking.tight,
          lineHeight: font.leading.tight,
          color: color.ink,
        }}
      >
        {heading}
      </Tag>
      {description ? (
        <p
          style={{
            margin: '8px 0 0',
            fontSize: font.size.base,
            lineHeight: font.leading.relaxed,
            color: color.muted,
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}

/* =========================================================================
 * TOAST
 * Citado no contrato (§8). Aviso não-bloqueante, ancorado no topo para não
 * brigar com a BottomBar nem com o teclado. `tone="danger"` usa role="alert"
 * (interrompe o leitor de tela); os demais usam role="status" (educado).
 * ====================================================================== */

export function Toast({
  open = true,
  message,
  children,
  tone = 'neutral',
  onDismiss,
  dismissLabel = 'Fechar aviso',
  style,
  ...rest
}) {
  const reduced = useReducedMotion()
  const t = BADGE_TONES[tone] || BADGE_TONES.neutral
  if (!open) return null
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      style={{
        position: 'fixed',
        top: 'max(12px, env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        width: 'calc(100% - 32px)',
        maxWidth: '420px',
        boxSizing: 'border-box',
        padding: '14px 14px 14px 16px',
        borderRadius: radius.lg,
        border: `1px solid ${t.bd}`,
        background: t.bg,
        color: t.fg,
        boxShadow: shadow.lifted,
        fontFamily: font.family,
        fontSize: font.size.base,
        fontWeight: font.weight.medium,
        lineHeight: font.leading.normal,
        opacity: 1,
        transition: transition('opacity', duration.base, reduced),
        ...style,
      }}
      {...rest}
    >
      <Icon name={tone === 'danger' ? 'alert' : 'info'} size={18} style={{ marginTop: '2px' }} />
      <span style={{ flex: '1 1 auto', minWidth: 0 }}>{message || children}</span>
      {onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          style={{
            ...tapReset,
            flex: 'none',
            width: control.touchMin,
            height: control.touchMin,
            margin: '-11px -8px -11px 0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 0,
            background: 'transparent',
            color: 'inherit',
            borderRadius: radius.md,
          }}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

/* Reexport utilitário para telas que queiram medir o mesmo espaçamento. */
export const uiInternals = { readReducedMotion }

export default {
  Button,
  Card,
  SelectableCard,
  Badge,
  Toast,
  Spinner,
  Reveal,
  SaveIndicator,
  Divider,
  SectionTitle,
  Icon,
  Indicator,
}
