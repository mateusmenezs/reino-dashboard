import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { color, control, duration, font, radius, shadow } from './tokens.js'
import {
  Badge,
  Icon,
  Indicator,
  composeHandlers,
  focusRing,
  hiddenControl,
  srOnly,
  tapReset,
  transition,
  useFocusVisible,
  usePressed,
  useReducedMotion,
} from './primitives.jsx'

/**
 * Classe utilitária Tailwind v4 (valor explícito) usada só para colorir o
 * `::placeholder` — pseudo-elemento não é alcançável por estilo inline, e a cor
 * padrão do agente (cinza claro) reprova contraste. #667790 = 4.56:1 no branco.
 * Se o Tailwind não gerar a classe, o placeholder ainda aparece legível.
 */
const PLACEHOLDER_CLASS = 'placeholder:text-[#667790]'

/* =========================================================================
 * CONTEXTO DE CAMPO
 * FieldShell publica id/aria-describedby/estado de erro; os controles abaixo
 * consomem como default. Assim o agente F não precisa repetir ids à mão —
 * e um campo customizado dele pode chamar `useField()` e ficar acessível igual.
 * ====================================================================== */

const FieldContext = createContext(null)

export function useField() {
  return useContext(FieldContext) || {}
}

/**
 * <FieldShell id label helper error optional number labelAs="label|text">
 * `labelAs="text"` para grupos (RadioGroup / RatingScale / ChipGroup):
 * o rótulo vira um <span> com id e o grupo o referencia por aria-labelledby,
 * porque <label for> não se aplica a um role="radiogroup".
 */
export function FieldShell({
  id,
  label,
  helper,
  error,
  optional = false,
  number = null,
  labelAs = 'label',
  children,
  style,
  ...rest
}) {
  const auto = useId()
  const fieldId = id || `campo-${auto.replace(/:/g, '')}`
  const helperId = helper ? `${fieldId}-helper` : null
  const errorId = error ? `${fieldId}-error` : null
  const labelId = `${fieldId}-label`
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined

  const ctx = {
    id: fieldId,
    labelId,
    helperId,
    errorId,
    describedBy,
    invalid: Boolean(error),
    error: error || null,
  }

  const LabelTag = labelAs === 'label' ? 'label' : 'span'
  const labelProps = labelAs === 'label' ? { htmlFor: fieldId } : {}

  return (
    <FieldContext.Provider value={ctx}>
      <div style={{ fontFamily: font.family, ...style }} {...rest}>
        {label ? (
          <LabelTag
            id={labelId}
            {...labelProps}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              marginBottom: helper ? '6px' : '10px',
              fontSize: font.size.lg,
              fontWeight: font.weight.semibold,
              letterSpacing: font.tracking.snug,
              lineHeight: font.leading.snug,
              color: color.ink,
              /* rótulo é alvo de toque do input: sem highlight cinza do iOS */
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {number != null ? (
              <span
                aria-hidden="true"
                style={{
                  flex: 'none',
                  minWidth: '26px',
                  height: '26px',
                  padding: '0 6px',
                  borderRadius: radius.xs,
                  background: color.actionTint,
                  color: color.actionText,
                  fontSize: font.size.xs,
                  fontWeight: font.weight.bold,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'translateY(2px)',
                }}
              >
                {number}
              </span>
            ) : null}
            <span style={{ flex: '1 1 auto' }}>
              {label}
              {optional ? (
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: font.size.sm,
                    fontWeight: font.weight.medium,
                    color: color.muted,
                    letterSpacing: font.tracking.normal,
                  }}
                >
                  opcional
                </span>
              ) : null}
            </span>
          </LabelTag>
        ) : null}

        {helper ? (
          <p
            id={helperId}
            style={{
              margin: '0 0 10px',
              fontSize: font.size.base,
              lineHeight: font.leading.relaxed,
              color: color.muted,
            }}
          >
            {helper}
          </p>
        ) : null}

        {children}

        {error ? (
          <p
            id={errorId}
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              margin: '8px 0 0',
              fontSize: font.size.base,
              lineHeight: font.leading.normal,
              fontWeight: font.weight.medium,
              color: color.danger,
            }}
          >
            <Icon name="alert" size={17} style={{ marginTop: '2px' }} />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}

/* =========================================================================
 * BASE VISUAL DOS CAMPOS DE TEXTO
 * ====================================================================== */

function textFieldStyle({ focused, invalid, disabled, reduced }) {
  const borderColor = invalid
    ? color.danger
    : focused
      ? color.action
      : disabled
        ? color.disabledBorder
        : color.borderStrong
  return {
    boxSizing: 'border-box',
    display: 'block',
    width: '100%',
    margin: 0,
    fontFamily: font.family,
    /* 16px é obrigatório: abaixo disso o Safari iOS dá zoom ao focar. */
    fontSize: font.size.input,
    fontWeight: font.weight.regular,
    color: disabled ? color.disabledText : color.ink,
    background: disabled ? color.disabledBg : color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor,
    borderRadius: radius.lg,
    boxShadow: focusRing(focused, invalid) || 'none',
    /* substitui o `outline: none` global do dashboard sem apagar o foco:
       o anel é o box-shadow acima; o contorno transparente serve ao
       Windows High Contrast Mode. */
    outline: '2px solid transparent',
    outlineOffset: '2px',
    appearance: 'none',
    WebkitAppearance: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: transition('border-color, box-shadow, background-color', duration.fast, reduced),
  }
}

/* useLayoutEffect só existe no cliente; no servidor cai para useEffect. */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function mergeRefs(...refs) {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') ref(node)
      else {
        try {
          ref.current = node
        } catch (_) {
          /* ref somente leitura — ignorar */
        }
      }
    }
  }
}

/* =========================================================================
 * TEXT INPUT
 * ====================================================================== */

/** <TextInput id value onChange error placeholder inputMode autoComplete /> */
export const TextInput = forwardRef(function TextInput(
  {
    id,
    value = '',
    onChange,
    error,
    placeholder,
    inputMode,
    autoComplete,
    type = 'text',
    name,
    maxLength,
    disabled = false,
    readOnly = false,
    describedBy,
    invalid,
    leading,
    trailing,
    style,
    className = '',
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const field = useField()
  const reduced = useReducedMotion()
  const [focused, focusProps] = useFocusVisible()
  const inputId = id || field.id
  const isInvalid = invalid != null ? invalid : Boolean(error) || Boolean(field.invalid)
  const described = describedBy || field.describedBy

  const handleChange = useCallback(
    (event) => {
      if (onChange) onChange(event.target.value, event)
    },
    [onChange],
  )

  const inputStyle = {
    ...textFieldStyle({ focused, invalid: isInvalid, disabled, reduced }),
    height: control.inputHeight,
    minHeight: control.touchMin,
    lineHeight: '22px',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: leading ? '44px' : '14px',
    paddingRight: trailing ? '44px' : '14px',
    ...style,
  }

  const input = (
    <input
      ref={ref}
      id={inputId}
      name={name || inputId}
      type={type}
      value={value == null ? '' : value}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode={inputMode}
      autoComplete={autoComplete}
      maxLength={maxLength}
      disabled={disabled}
      readOnly={readOnly}
      aria-invalid={isInvalid || undefined}
      aria-describedby={described}
      className={`${PLACEHOLDER_CLASS} ${className}`.trim()}
      onFocus={composeHandlers(focusProps.onFocus, onFocus)}
      onBlur={composeHandlers(focusProps.onBlur, onBlur)}
      style={inputStyle}
      {...rest}
    />
  )

  if (!leading && !trailing) return input

  return (
    <span style={{ position: 'relative', display: 'block' }}>
      {leading ? <Affix side="left">{leading}</Affix> : null}
      {input}
      {trailing ? <Affix side="right">{trailing}</Affix> : null}
    </span>
  )
})

function Affix({ side, children }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side]: '14px',
        display: 'flex',
        alignItems: 'center',
        color: color.muted,
        fontSize: font.size.md,
        pointerEvents: 'none',
      }}
    >
      {children}
    </span>
  )
}

/* =========================================================================
 * TEXTAREA
 * ====================================================================== */

/** <TextArea id value onChange error rows maxLength autoGrow /> */
export const TextArea = forwardRef(function TextArea(
  {
    id,
    value = '',
    onChange,
    error,
    placeholder,
    rows = 4,
    maxLength,
    autoGrow = false,
    disabled = false,
    readOnly = false,
    describedBy,
    invalid,
    name,
    counterLabel,
    style,
    className = '',
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const field = useField()
  const reduced = useReducedMotion()
  const [focused, focusProps] = useFocusVisible()
  const innerRef = useRef(null)
  const inputId = id || field.id
  const isInvalid = invalid != null ? invalid : Boolean(error) || Boolean(field.invalid)
  const described = describedBy || field.describedBy
  const text = value == null ? '' : String(value)

  /* Altura confortável por padrão: 4 linhas de 26px + respiro = 132px. */
  const minHeight = Math.max(rows * control.textareaLineHeight + 28, 108)

  useIsomorphicLayoutEffect(() => {
    if (!autoGrow) return
    const el = innerRef.current
    if (!el) return
    /* Duas passadas evitam "jank": zera, mede, aplica. */
    el.style.height = 'auto'
    const next = Math.max(el.scrollHeight, minHeight)
    el.style.height = `${next}px`
  }, [autoGrow, text, minHeight])

  const handleChange = useCallback(
    (event) => {
      if (onChange) onChange(event.target.value, event)
    },
    [onChange],
  )

  const near = maxLength ? text.length >= maxLength * 0.9 : false

  return (
    <div style={{ display: 'block' }}>
      <textarea
        ref={mergeRefs(ref, innerRef)}
        id={inputId}
        name={name || inputId}
        rows={rows}
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={isInvalid || undefined}
        aria-describedby={described}
        className={`${PLACEHOLDER_CLASS} ${className}`.trim()}
        onFocus={composeHandlers(focusProps.onFocus, onFocus)}
        onBlur={composeHandlers(focusProps.onBlur, onBlur)}
        style={{
          ...textFieldStyle({ focused, invalid: isInvalid, disabled, reduced }),
          minHeight,
          padding: '14px',
          lineHeight: `${control.textareaLineHeight}px`,
          resize: autoGrow ? 'none' : 'vertical',
          overflow: autoGrow ? 'hidden' : 'auto',
          ...style,
        }}
        {...rest}
      />
      {maxLength ? (
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '6px',
            fontFamily: font.family,
            fontSize: font.size.xs,
            fontWeight: font.weight.medium,
            color: near ? color.warning : color.muted,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {counterLabel ? `${counterLabel} ` : ''}
          {text.length}/{maxLength}
        </div>
      ) : null}
    </div>
  )
})

/* =========================================================================
 * LINHA SELECIONÁVEL (base de RadioGroup / CheckboxRow / ChipGroup)
 * O <input> nativo é esticado por cima do rótulo inteiro: mantém semântica,
 * navegação por setas entre radios e clique nativo — e faz do alvo de toque
 * a linha toda (mínimo 56px de altura).
 * ====================================================================== */

function OptionRow({
  type,
  name,
  optionId,
  checked,
  disabled,
  onChange,
  label,
  description,
  badge,
  describedBy,
  ariaLabel,
  focusedRef,
  onFocusState,
  compact = false,
}) {
  const reduced = useReducedMotion()
  const [focusVisible, setFocusVisible] = useState(false)
  const [pressed, pressProps] = usePressed()

  const handleFocus = (event) => {
    let visible = true
    try {
      if (event.target && typeof event.target.matches === 'function') {
        visible = event.target.matches(':focus-visible')
      }
    } catch (_) {
      visible = true
    }
    setFocusVisible(visible)
    if (onFocusState) onFocusState(true)
  }
  const handleBlur = () => {
    setFocusVisible(false)
    if (onFocusState) onFocusState(false)
  }

  const rings = []
  if (focusVisible) rings.push(shadow.focus)
  if (!checked && !pressed) rings.push(shadow.xs)

  return (
    <label
      htmlFor={optionId}
      style={{
        ...tapReset,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        minHeight: compact ? control.heightSm : 56,
        padding: compact ? '10px 14px' : '14px 16px',
        borderRadius: radius.lg,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: disabled ? color.disabledBorder : checked ? color.action : color.borderStrong,
        background: disabled ? color.disabledBg : checked ? color.selectedBg : color.surface,
        color: disabled ? color.disabledText : color.ink,
        boxShadow: [checked ? shadow.insetSelected : null, ...rings].filter(Boolean).join(', ') || 'none',
        transform: pressed && !disabled && !reduced ? 'scale(0.99)' : 'none',
        transition: transition('background-color, border-color, box-shadow, transform', duration.fast, reduced),
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      {...pressProps}
    >
      <input
        ref={focusedRef}
        id={optionId}
        type={type}
        name={name}
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        onFocus={handleFocus}
        onBlur={composeHandlers(handleBlur, pressProps.onPointerUp)}
        style={hiddenControl}
      />
      <Indicator selected={checked} shape={type === 'checkbox' ? 'square' : 'circle'} disabled={disabled} size={24} />
      <span style={{ flex: '1 1 auto', minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: font.size.md,
            fontWeight: checked ? font.weight.semibold : font.weight.medium,
            lineHeight: font.leading.snug,
            letterSpacing: font.tracking.snug,
            color: disabled ? color.disabledText : color.ink,
          }}
        >
          {label}
        </span>
        {description ? (
          <span
            style={{
              display: 'block',
              marginTop: '4px',
              fontSize: font.size.base,
              fontWeight: font.weight.regular,
              lineHeight: font.leading.normal,
              color: disabled ? color.disabledText : color.muted,
            }}
          >
            {description}
          </span>
        ) : null}
      </span>
      {badge ? <Badge tone={checked ? 'accent' : 'neutral'}>{badge}</Badge> : null}
    </label>
  )
}

/* =========================================================================
 * RADIO GROUP
 * ====================================================================== */

/** <RadioGroup name value onChange options={[{value,label,description,badge}]} columns /> */
export function RadioGroup({
  name,
  value,
  onChange,
  options = [],
  columns = 1,
  disabled = false,
  labelledBy,
  describedBy,
  ariaLabel,
  id,
  style,
  ...rest
}) {
  const field = useField()
  const auto = useId()
  const groupName = name || field.id || `radio-${auto.replace(/:/g, '')}`
  const groupId = id || field.id
  const cols = Math.max(1, Number(columns) || 1)

  return (
    <div
      id={groupId}
      tabIndex={-1}
      role="radiogroup"
      aria-labelledby={labelledBy || field.labelId}
      aria-label={labelledBy || field.labelId ? undefined : ariaLabel}
      aria-describedby={describedBy || field.describedBy}
      aria-invalid={field.invalid || undefined}
      style={{
        display: 'grid',
        gap: '10px',
        gridTemplateColumns: cols > 1 ? `repeat(${cols}, minmax(0, 1fr))` : '1fr',
        ...style,
      }}
      {...rest}
    >
      {options.map((opt, index) => (
        <OptionRow
          key={String(opt.value)}
          type="radio"
          name={groupName}
          optionId={`${groupName}-${index}`}
          checked={value === opt.value}
          disabled={disabled || opt.disabled}
          label={opt.label}
          description={opt.description}
          badge={opt.badge}
          onChange={() => onChange && onChange(opt.value)}
        />
      ))}
    </div>
  )
}

/* =========================================================================
 * CHECKBOX ROW
 * ====================================================================== */

/** <CheckboxRow checked onChange label description /> */
export function CheckboxRow({
  checked = false,
  onChange,
  label,
  description,
  id,
  name,
  disabled = false,
  describedBy,
  style,
  ...rest
}) {
  const field = useField()
  const auto = useId()
  const boxId = id || `check-${auto.replace(/:/g, '')}`
  return (
    <div style={style} {...rest}>
      <OptionRow
        type="checkbox"
        name={name || boxId}
        optionId={boxId}
        checked={checked}
        disabled={disabled}
        label={label}
        description={description}
        describedBy={describedBy || field.describedBy}
        onChange={(event) => onChange && onChange(event.target.checked, event)}
      />
    </div>
  )
}

/* =========================================================================
 * RATING SCALE (1–5)
 * Radios nativos = navegação por setas e leitura correta em VoiceOver.
 * Cada nota ocupa no mínimo 48×52px.
 * ====================================================================== */

/** <RatingScale value onChange min={1} max={5} label lowLabel highLabel /> */
export function RatingScale({
  value,
  onChange,
  min = 1,
  max = 5,
  label,
  lowLabel,
  highLabel,
  name,
  id,
  disabled = false,
  labelledBy,
  describedBy,
  style,
  ...rest
}) {
  const field = useField()
  const auto = useId()
  const reduced = useReducedMotion()
  const groupName = name || field.id || `nota-${auto.replace(/:/g, '')}`
  const items = []
  for (let n = min; n <= max; n += 1) items.push(n)

  return (
    <div style={{ fontFamily: font.family, ...style }} {...rest}>
      {label ? (
        <span
          id={`${groupName}-label`}
          style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: font.size.base,
            fontWeight: font.weight.medium,
            color: color.inkSoft,
          }}
        >
          {label}
        </span>
      ) : null}
      <div
        id={id || undefined}
        tabIndex={-1}
        role="radiogroup"
        aria-labelledby={labelledBy || (label ? `${groupName}-label` : field.labelId)}
        aria-describedby={describedBy || field.describedBy}
        aria-invalid={field.invalid || undefined}
        style={{ display: 'flex', gap: '8px' }}
      >
        {items.map((n) => (
          <RatingItem
            key={n}
            name={groupName}
            id={`${groupName}-${n}`}
            n={n}
            max={max}
            checked={Number(value) === n}
            disabled={disabled}
            reduced={reduced}
            ariaLabel={
              n === min && lowLabel
                ? `${n} — ${lowLabel}`
                : n === max && highLabel
                  ? `${n} — ${highLabel}`
                  : `${n} de ${max}`
            }
            onChange={() => onChange && onChange(n)}
          />
        ))}
      </div>
      {lowLabel || highLabel ? (
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '8px',
            fontSize: font.size.sm,
            lineHeight: font.leading.snug,
            color: color.muted,
          }}
        >
          <span>{lowLabel}</span>
          <span style={{ textAlign: 'right' }}>{highLabel}</span>
        </div>
      ) : null}
    </div>
  )
}

function RatingItem({ name, id, n, max, checked, disabled, onChange, ariaLabel, reduced }) {
  const [focusVisible, setFocusVisible] = useState(false)
  const [pressed, pressProps] = usePressed()

  const handleFocus = (event) => {
    let visible = true
    try {
      if (event.target && typeof event.target.matches === 'function') {
        visible = event.target.matches(':focus-visible')
      }
    } catch (_) {
      visible = true
    }
    setFocusVisible(visible)
  }

  return (
    <label
      htmlFor={id}
      style={{
        ...tapReset,
        position: 'relative',
        flex: '1 1 0',
        /* 44px é o piso do alvo de toque; usamos 52 de altura e 44 de largura. */
        minWidth: control.touchMin,
        minHeight: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: disabled ? color.disabledBorder : checked ? color.actionStrong : color.borderStrong,
        background: disabled ? color.disabledBg : checked ? color.actionStrong : color.surface,
        color: disabled ? color.disabledText : checked ? color.onDark : color.inkSoft,
        fontSize: font.size.lg,
        fontWeight: font.weight.semibold,
        fontVariantNumeric: 'tabular-nums',
        boxShadow: [focusVisible ? shadow.focus : null, !checked && !pressed ? shadow.xs : null]
          .filter(Boolean)
          .join(', ') || 'none',
        transform: pressed && !disabled && !reduced ? 'scale(0.97)' : 'none',
        transition: transition('background-color, border-color, box-shadow, transform, color', duration.fast, reduced),
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      {...pressProps}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
        onFocus={handleFocus}
        onBlur={composeHandlers(() => setFocusVisible(false), pressProps.onPointerUp)}
        style={hiddenControl}
      />
      <span aria-hidden="true">{n}</span>
      <span style={srOnly}>de {max}</span>
    </label>
  )
}

/* =========================================================================
 * CHIP / CHIP GROUP
 * ====================================================================== */

/** <Chip selected onSelect label /> — botão pílula isolado, alvo ≥44px. */
export function Chip({ label, children, selected = false, onSelect, disabled = false, style, ...rest }) {
  const reduced = useReducedMotion()
  const [focusVisible, focusProps] = useFocusVisible()
  const [pressed, pressProps] = usePressed()
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={disabled ? undefined : onSelect}
      {...pressProps}
      onFocus={focusProps.onFocus}
      onBlur={composeHandlers(focusProps.onBlur, pressProps.onPointerUp)}
      style={{
        ...tapReset,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        minHeight: control.touchMin,
        padding: '0 16px',
        borderRadius: radius.pill,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: disabled ? color.disabledBorder : selected ? color.action : color.borderStrong,
        background: disabled ? color.disabledBg : selected ? color.actionTint : color.surface,
        color: disabled ? color.disabledText : selected ? color.actionText : color.inkSoft,
        fontSize: font.size.base,
        fontWeight: selected ? font.weight.semibold : font.weight.medium,
        boxShadow: [selected ? shadow.insetSelected : null, focusVisible ? shadow.focus : null]
          .filter(Boolean)
          .join(', ') || 'none',
        transform: pressed && !disabled && !reduced ? 'scale(0.97)' : 'none',
        transition: transition('background-color, border-color, box-shadow, transform, color', duration.fast, reduced),
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...rest}
    >
      {selected ? <Icon name="check" size={16} strokeWidth={3} /> : null}
      {label || children}
    </button>
  )
}

/**
 * <ChipGroup value onChange options multiple />
 * `multiple` → value é array e o grupo usa checkboxes (role="group").
 * simples  → value é escalar e o grupo usa radios (role="radiogroup", setas).
 */
export function ChipGroup({
  value,
  onChange,
  options = [],
  multiple = false,
  name,
  disabled = false,
  labelledBy,
  describedBy,
  id,
  style,
  ...rest
}) {
  const field = useField()
  const auto = useId()
  const groupName = name || field.id || `chips-${auto.replace(/:/g, '')}`
  const selectedList = multiple ? (Array.isArray(value) ? value : []) : []

  const isChecked = (v) => (multiple ? selectedList.indexOf(v) !== -1 : value === v)

  const toggle = (v) => {
    if (!onChange) return
    if (!multiple) {
      onChange(v)
      return
    }
    const next = selectedList.indexOf(v) !== -1 ? selectedList.filter((x) => x !== v) : [...selectedList, v]
    onChange(next)
  }

  return (
    <div
      id={id || field.id}
      tabIndex={-1}
      role={multiple ? 'group' : 'radiogroup'}
      aria-labelledby={labelledBy || field.labelId}
      aria-describedby={describedBy || field.describedBy}
      aria-invalid={field.invalid || undefined}
      style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', ...style }}
      {...rest}
    >
      {options.map((opt, index) => (
        <ChipOption
          key={String(opt.value)}
          id={`${groupName}-${index}`}
          name={groupName}
          type={multiple ? 'checkbox' : 'radio'}
          checked={isChecked(opt.value)}
          disabled={disabled || opt.disabled}
          label={opt.label}
          onChange={() => toggle(opt.value)}
        />
      ))}
    </div>
  )
}

function ChipOption({ id, name, type, checked, disabled, label, onChange }) {
  const reduced = useReducedMotion()
  const [focusVisible, setFocusVisible] = useState(false)
  const [pressed, pressProps] = usePressed()
  const handleFocus = (event) => {
    let visible = true
    try {
      if (event.target && typeof event.target.matches === 'function') {
        visible = event.target.matches(':focus-visible')
      }
    } catch (_) {
      visible = true
    }
    setFocusVisible(visible)
  }
  return (
    <label
      htmlFor={id}
      style={{
        ...tapReset,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        minHeight: control.touchMin,
        padding: '0 16px',
        borderRadius: radius.pill,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: disabled ? color.disabledBorder : checked ? color.action : color.borderStrong,
        background: disabled ? color.disabledBg : checked ? color.actionTint : color.surface,
        color: disabled ? color.disabledText : checked ? color.actionText : color.inkSoft,
        fontSize: font.size.base,
        fontWeight: checked ? font.weight.semibold : font.weight.medium,
        boxShadow: [checked ? shadow.insetSelected : null, focusVisible ? shadow.focus : null]
          .filter(Boolean)
          .join(', ') || 'none',
        transform: pressed && !disabled && !reduced ? 'scale(0.97)' : 'none',
        transition: transition('background-color, border-color, box-shadow, transform, color', duration.fast, reduced),
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      {...pressProps}
    >
      <input
        id={id}
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={composeHandlers(() => setFocusVisible(false), pressProps.onPointerUp)}
        style={hiddenControl}
      />
      {checked ? <Icon name="check" size={16} strokeWidth={3} /> : null}
      <span>{label}</span>
    </label>
  )
}

/* =========================================================================
 * STEPPER (+ / −)
 * Sem <input type="number">: evita o teclado numérico abrindo sem necessidade
 * e o spinner nativo. O valor é um role="spinbutton" navegável por teclado.
 * ====================================================================== */

/** <Stepper value onChange min max step label unit /> */
export function Stepper({
  value = 0,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  unit,
  disabled = false,
  decrementLabel = 'Diminuir',
  incrementLabel = 'Aumentar',
  labelledBy,
  describedBy,
  id,
  style,
  ...rest
}) {
  const field = useField()
  const auto = useId()
  const groupId = id || field.id || `stepper-${auto.replace(/:/g, '')}`
  const current = Number.isFinite(Number(value)) ? Number(value) : min

  const clamp = (n) => Math.min(max, Math.max(min, n))
  const set = (n) => {
    const next = clamp(n)
    if (next !== current && onChange) onChange(next)
  }

  const onKeyDown = (event) => {
    const map = {
      ArrowUp: current + step,
      ArrowRight: current + step,
      ArrowDown: current - step,
      ArrowLeft: current - step,
      Home: min,
      End: max,
      PageUp: current + step * 5,
      PageDown: current - step * 5,
    }
    if (event.key in map) {
      event.preventDefault()
      set(map[event.key])
    }
  }

  const valueText = unit ? `${current} ${unit}` : String(current)

  return (
    <div
      role="group"
      aria-labelledby={labelledBy || field.labelId}
      aria-describedby={describedBy || field.describedBy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px',
        borderRadius: radius.lg,
        border: `1px solid ${color.borderStrong}`,
        background: color.surface,
        boxShadow: shadow.xs,
        fontFamily: font.family,
        ...style,
      }}
      {...rest}
    >
      <StepperButton
        icon="minus"
        ariaLabel={label ? `${decrementLabel} ${label}` : decrementLabel}
        disabled={disabled || current <= min}
        onPress={() => set(current - step)}
      />
      <span
        id={groupId}
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-valuenow={current}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={valueText}
        aria-label={label}
        aria-disabled={disabled || undefined}
        onKeyDown={disabled ? undefined : onKeyDown}
        style={{
          minWidth: '56px',
          minHeight: control.touchMin,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.sm,
          fontSize: font.size.lg,
          fontWeight: font.weight.semibold,
          fontVariantNumeric: 'tabular-nums',
          color: disabled ? color.disabledText : color.ink,
          outline: '2px solid transparent',
          outlineOffset: '2px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {valueText}
      </span>
      <StepperButton
        icon="plus"
        ariaLabel={label ? `${incrementLabel} ${label}` : incrementLabel}
        disabled={disabled || current >= max}
        onPress={() => set(current + step)}
      />
    </div>
  )
}

function StepperButton({ icon, ariaLabel, disabled, onPress }) {
  const reduced = useReducedMotion()
  const [focusVisible, focusProps] = useFocusVisible()
  const [pressed, pressProps] = usePressed()
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={disabled ? undefined : onPress}
      {...pressProps}
      onFocus={focusProps.onFocus}
      onBlur={composeHandlers(focusProps.onBlur, pressProps.onPointerUp)}
      style={{
        ...tapReset,
        width: control.touchMin,
        height: control.touchMin,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: disabled ? color.disabledBorder : color.border,
        background: disabled ? color.disabledBg : pressed ? color.surfaceSunken : color.surfaceMuted,
        color: disabled ? color.disabledText : color.actionText,
        boxShadow: focusVisible ? shadow.focus : 'none',
        transform: pressed && !disabled && !reduced ? 'scale(0.96)' : 'none',
        transition: transition('background-color, box-shadow, transform', duration.fast, reduced),
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <Icon name={icon} size={20} strokeWidth={2.5} />
    </button>
  )
}

export default {
  FieldShell,
  TextInput,
  TextArea,
  RadioGroup,
  CheckboxRow,
  RatingScale,
  Chip,
  ChipGroup,
  Stepper,
  useField,
}
