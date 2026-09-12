/**
 * FieldRenderer — registry `field.type` → controle.
 *
 * Dono: AGENTE F. Ver docs/ARQUITETURA_MENTORIA.md §3 e §9.
 *
 * É o único ponto do app que sabe traduzir uma entrada de `schema/questions.js`
 * em pixels. Quem usa (AGENTE E) não precisa conhecer tipo de campo nenhum:
 *
 *   <FieldRenderer
 *     field={field}                       // Field do schema
 *     value={answers[field.id]}
 *     answers={answers}                   // para notice/escape/otherOption
 *     error={errors[field.id]}
 *     onChange={(v) => setAnswer(field.id, v)}
 *     onAnswerChange={(id, v) => setAnswer(id, v)}   // escape + "outro"
 *   />
 *
 * Responsabilidades, em ordem:
 * 1. montar o `FieldShell` (label, helper, número da pergunta, marca "opcional");
 * 2. renderizar o controle certo para `field.type`;
 * 3. revelar o input complementar do `field.otherOption`;
 * 4. renderizar `field.notice` quando `notice.visibleIf(answers)` — nota azul
 *    informativa, NUNCA vermelha, NUNCA com role="alert";
 * 5. renderizar `field.escape` via `<EscapeToggle>` e, com ela marcada,
 *    DESABILITAR o campo sem apagar o que já foi digitado.
 *
 * ── FOCO NO PRIMEIRO ERRO ───────────────────────────────────────────────────
 * Todo campo é alcançável por `document.getElementById(field.id).focus()`:
 * - campos de texto/selct/telefone: o próprio input carrega `id={field.id}`
 *   (publicado pelo FieldShell e consumido pelos controles do DS);
 * - grupos (radio, multiselect, públicos, repetidor, cards): o contêiner do
 *   grupo carrega `id={field.id}` + `tabIndex={-1}`.
 * O id nunca é duplicado: quem o carrega depende do tipo, e é sempre um só.
 *
 * ── TEXTO ───────────────────────────────────────────────────────────────────
 * Nenhum texto de pergunta, helper, opção ou aviso nasce aqui: tudo vem do
 * schema. O que existe neste arquivo é microcopy de interface (rótulo do input
 * complementar do "outro"), reunido em `RENDERER_COPY` para revisão editorial.
 */

import React, { useCallback, useMemo } from 'react'
import {
  CheckboxRow,
  FieldShell,
  Icon,
  RadioGroup,
  TextArea,
  TextInput,
  color,
  control,
  font,
  radius,
  shadow,
  srOnly,
  useField,
} from '../ui/index.js'
import { applyExclusive } from '../schema/options.js'
import AudienceCards from './AudienceCards.jsx'
import EscapeToggle from './EscapeToggle.jsx'
import PhoneField from './PhoneField.jsx'
import ProductCards from './ProductCards.jsx'
import Repeater from './Repeater.jsx'

/** Microcopy de interface (texto de conteúdo vem exclusivamente do schema). */
export const RENDERER_COPY = Object.freeze({
  otherLabel: 'Conte em poucas palavras',
  otherPlaceholder: '',
  selectPlaceholder: 'Selecione uma opção',
})

/** Tipos cujo `id` da pergunta fica no CONTÊINER do grupo, não num input. */
const GROUP_TYPES = new Set([
  'radio',
  'multiselect',
  'audience-cards',
  'repeater',
  'steps-repeater',
  'product-cards',
])

const asText = (v) => String(v == null ? '' : v)
const asList = (v) => (Array.isArray(v) ? v : [])

/* ==========================================================================
 * NOTA INFORMATIVA (field.notice)
 * Azul claro, ícone de informação, tom de apoio. Nunca vermelha: "a IA sugerirá
 * nomes" é uma boa notícia, não um erro de preenchimento.
 * ======================================================================= */

function FieldNotice({ id, text }) {
  return (
    <div
      id={id}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        marginTop: '12px',
        padding: '12px 14px',
        borderRadius: radius.lg,
        border: `1px solid ${color.actionTintStrong}`,
        background: color.actionTint,
        color: color.actionText,
        fontFamily: font.family,
        fontSize: font.size.base,
        lineHeight: font.leading.normal,
      }}
    >
      <Icon name="info" size={18} style={{ marginTop: '2px' }} />
      <span>{text}</span>
    </div>
  )
}

/* ==========================================================================
 * SELECT
 * O DS não tem primitiva de select (§8) — e para 7 faixas de renda num celular
 * o seletor nativo é a melhor experiência que existe: roda de escolha do iOS,
 * busca por digitação no Android, zero JS. O `<select>` do dashboard antigo é
 * estilizado por seletor de elemento em src/index.css; estilo inline
 * (especificidade 1,0,0,0) vence sem `!important`.
 * ======================================================================= */

function NativeSelect({ id, value, onChange, options, disabled, describedBy, invalid, placeholder }) {
  const field = useField()
  const selectId = id || field.id
  const isInvalid = invalid != null ? invalid : Boolean(field.invalid)

  return (
    <div style={{ position: 'relative', display: 'block' }}>
      <select
        id={selectId}
        name={selectId}
        value={asText(value)}
        disabled={disabled}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy || field.describedBy}
        onChange={(event) => onChange && onChange(event.target.value, event)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          display: 'block',
          width: '100%',
          height: control.inputHeight,
          minHeight: control.touchMin,
          padding: '0 44px 0 14px',
          borderRadius: radius.md,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: disabled
            ? color.disabledBorder
            : isInvalid
              ? color.danger
              : color.borderStrong,
          background: disabled ? color.disabledBg : color.surface,
          color: disabled ? color.disabledText : asText(value) ? color.ink : color.placeholder,
          /* 16px é o piso: abaixo disso o Safari iOS dá zoom ao focar */
          fontFamily: font.family,
          fontSize: font.size.input,
          fontWeight: font.weight.regular,
          lineHeight: '22px',
          boxShadow: shadow.none,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <option value="" disabled>
          {placeholder || RENDERER_COPY.selectPlaceholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: '14px',
          display: 'flex',
          alignItems: 'center',
          color: disabled ? color.disabledText : color.muted,
          pointerEvents: 'none',
        }}
      >
        <Icon name="chevronRight" size={18} style={{ transform: 'rotate(90deg)' }} />
      </span>
    </div>
  )
}

/* ==========================================================================
 * MULTISELECT com opção exclusiva
 * "Sem suporte entre encontros" e "Ainda não sei" limpam as demais e se anulam
 * entre si — a regra mora em `applyExclusive` (schema/options.js), nunca aqui.
 * ======================================================================= */

function MultiSelect({ id, value, onChange, options, disabled, labelledBy, describedBy, invalid }) {
  const selected = asList(value)

  const toggle = useCallback(
    (optionValue, checked) => {
      if (!onChange) return
      /* a nova marcação vai para o FIM: `applyExclusive` mantém a ÚLTIMA
         exclusiva marcada, então a ordem é semanticamente relevante */
      const raw = checked
        ? [...selected.filter((v) => v !== optionValue), optionValue]
        : selected.filter((v) => v !== optionValue)
      onChange(applyExclusive(options, raw))
    },
    [onChange, options, selected],
  )

  return (
    <div
      id={id}
      tabIndex={-1}
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-disabled={disabled || undefined}
      style={{ display: 'grid', gap: '10px', outline: 'none' }}
    >
      {options.map((option) => (
        <CheckboxRow
          key={option.value}
          id={`${id || 'multi'}-${option.value}`}
          name={`${id || 'multi'}-${option.value}`}
          checked={selected.includes(option.value)}
          disabled={disabled}
          label={option.label}
          description={option.description}
          onChange={(checked) => toggle(option.value, checked)}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
 * INPUT COMPLEMENTAR DO "OUTRO"
 * ======================================================================= */

function OtherInput({ fieldId, otherId, value, onChange, disabled, optionLabel }) {
  return (
    <div style={{ marginTop: '12px' }}>
      <label
        htmlFor={otherId}
        style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: font.size.base,
          fontWeight: font.weight.medium,
          color: color.inkSoft,
        }}
      >
        {RENDERER_COPY.otherLabel}
        {optionLabel ? <span style={srOnly}>{` — ${optionLabel}`}</span> : null}
      </label>
      <TextInput
        id={otherId}
        name={otherId}
        value={asText(value)}
        onChange={(next, event) => onChange && onChange(next, event)}
        disabled={disabled}
        maxLength={160}
        placeholder={RENDERER_COPY.otherPlaceholder}
        /* não herda o `aria-describedby`/erro do campo pai: é outro dado */
        describedBy={undefined}
        invalid={false}
        aria-labelledby={undefined}
        data-other-of={fieldId}
      />
    </div>
  )
}

/* ==========================================================================
 * FIELD RENDERER
 * ======================================================================= */

/**
 * @param {Object} props
 * @param {Object} props.field                   Field normalizado do schema.
 * @param {*} [props.value]                      `answers[field.id]`.
 * @param {Object} [props.answers]               Mapa completo de respostas.
 * @param {string|null} [props.error]            Mensagem já traduzida (validation.js).
 * @param {(value: *, event?: Event) => void} [props.onChange]  Valor primeiro.
 * @param {(fieldId: string, value: *, event?: Event) => void} [props.onAnswerChange]
 *   Setter genérico — usado para a escape e para o complemento do "outro"
 *   quando `onEscapeChange` / `onOtherChange` não forem passados.
 * @param {(checked: boolean, event?: Event) => void} [props.onEscapeChange]
 * @param {(value: string, event?: Event) => void} [props.onOtherChange]
 * @param {boolean} [props.disabled]             Desabilita o campo inteiro.
 * @param {boolean} [props.autoFocus]
 */
export function FieldRenderer(props) {
  /* Guarda ANTES de qualquer hook: um `field` ausente não pode mudar a ordem
     de hooks entre renders (regra dos hooks). */
  if (!props || !props.field || !props.field.id) return null
  return <FieldRendererBody {...props} />
}

function FieldRendererBody({
  field,
  value,
  answers = {},
  error = null,
  onChange,
  onAnswerChange,
  onEscapeChange,
  onOtherChange,
  disabled = false,
  autoFocus = false,
  style,
  ...rest
}) {
  const escape = field.escape || null
  const escaped = Boolean(escape && answers[escape.id] === true)
  /* escape marcada = campo inerte, MAS a resposta continua gravada: nada aqui
     chama onChange, então desmarcar devolve exatamente o que estava escrito. */
  const controlDisabled = disabled || escaped

  const options = Array.isArray(field.options) ? field.options : []
  const otherOption = field.otherOption || null
  const otherId = otherOption ? otherOption.placeholderFieldId : null
  const showOther = Boolean(otherOption) && asText(value) === otherOption.value

  const noticeVisible = Boolean(
    field.notice && typeof field.notice.visibleIf === 'function' && field.notice.visibleIf(answers),
  )

  const ownsId = !GROUP_TYPES.has(field.type)
  const groupId = ownsId ? undefined : field.id

  const handleEscape = useCallback(
    (checked, event) => {
      if (onEscapeChange) onEscapeChange(checked, event)
      else if (onAnswerChange && escape) onAnswerChange(escape.id, checked, event)
    },
    [escape, onAnswerChange, onEscapeChange],
  )

  const handleOther = useCallback(
    (next, event) => {
      if (onOtherChange) onOtherChange(next, event)
      else if (onAnswerChange && otherId) onAnswerChange(otherId, next, event)
    },
    [onAnswerChange, onOtherChange, otherId],
  )

  const shared = useMemo(
    () => ({ disabled: controlDisabled, invalid: Boolean(error) }),
    [controlDisabled, error],
  )

  return (
    <FieldShell
      id={field.id}
      label={field.label}
      helper={field.helper}
      error={error || undefined}
      optional={field.optionalHint === true}
      number={field.number != null ? field.number : null}
      labelAs={ownsId ? 'label' : 'text'}
      style={style}
      {...rest}
    >
      <FieldBody
        field={field}
        groupId={groupId}
        value={value}
        options={options}
        onChange={onChange}
        shared={shared}
        autoFocus={autoFocus}
        escaped={escaped}
      />

      {showOther ? (
        <OtherInput
          fieldId={field.id}
          otherId={otherId}
          value={answers[otherId]}
          onChange={handleOther}
          disabled={controlDisabled}
          optionLabel={(options.find((o) => o.value === otherOption.value) || {}).label}
        />
      ) : null}

      {/* região viva permanente: a nota aparecendo é anunciada sem virar alerta */}
      <div aria-live="polite">
        {noticeVisible ? <FieldNotice id={`${field.id}-notice`} text={field.notice.text} /> : null}
      </div>

      {escape ? (
        <EscapeToggle
          escape={escape}
          checked={escaped}
          onChange={handleEscape}
          disabled={disabled}
        />
      ) : null}
    </FieldShell>
  )
}

/**
 * Envelope do controle: aplica o esmaecimento quando a escape está marcada.
 * O `disabled` real vai em cada input (não só opacidade) e o contêiner ganha
 * `aria-disabled` para o leitor de tela ouvir o mesmo que a tela mostra.
 */
function FieldBody({ field, groupId, value, options, onChange, shared, autoFocus, escaped }) {
  const inner = renderControl({ field, groupId, value, options, onChange, shared, autoFocus })
  if (!escaped) return inner
  return (
    <div
      aria-disabled="true"
      style={{
        opacity: 0.45,
        /* cliques já não passam pelo `disabled` de cada controle; isto só evita
           o cursor de texto e a seleção acidental em cima do bloco inteiro */
        userSelect: 'none',
        transition: 'opacity 180ms cubic-bezier(0.22, 0.61, 0.36, 1)',
      }}
    >
      {inner}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

function renderControl({ field, groupId, value, options, onChange, shared, autoFocus }) {
  const emit = (next, event) => {
    if (onChange) onChange(next, event)
  }

  switch (field.type) {
    case 'textarea':
      return (
        <TextArea
          value={asText(value)}
          onChange={emit}
          rows={field.rows || 4}
          maxLength={field.maxLength > 0 ? field.maxLength : undefined}
          placeholder={field.placeholder}
          autoFocus={autoFocus}
          {...shared}
        />
      )

    case 'text':
      return (
        <TextInput
          value={asText(value)}
          onChange={emit}
          maxLength={field.maxLength > 0 ? field.maxLength : undefined}
          placeholder={field.placeholder}
          autoFocus={autoFocus}
          {...shared}
        />
      )

    case 'email':
      return (
        <TextInput
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={asText(value)}
          onChange={emit}
          maxLength={field.maxLength > 0 ? field.maxLength : 160}
          placeholder={field.placeholder}
          autoFocus={autoFocus}
          {...shared}
        />
      )

    case 'phone':
      return (
        <PhoneField
          value={asText(value)}
          onChange={emit}
          placeholder={field.placeholder || undefined}
          autoFocus={autoFocus}
          {...shared}
        />
      )

    case 'radio':
      return (
        <RadioGroup
          id={groupId}
          value={asText(value)}
          onChange={(next) => emit(next)}
          options={options}
          disabled={shared.disabled}
        />
      )

    case 'select':
      return (
        <NativeSelect
          value={value}
          onChange={emit}
          options={options}
          placeholder={field.placeholder}
          {...shared}
        />
      )

    case 'multiselect':
      return (
        <MultiSelect
          id={groupId}
          value={value}
          onChange={(next) => emit(next)}
          options={options}
          labelledBy={`${field.id}-label`}
          disabled={shared.disabled}
          invalid={shared.invalid}
        />
      )

    case 'audience-cards':
      return (
        <AudienceCards
          id={groupId}
          value={value}
          onChange={(next) => emit(next)}
          audiences={field.audiences || []}
          criteria={field.criteria || []}
          scale={field.scale || undefined}
          requiredAudiences={field.requiredAudiences || ['A']}
          maxLength={field.maxLength > 0 ? field.maxLength : 0}
          placeholder={field.placeholder}
          labelledBy={`${field.id}-label`}
          disabled={shared.disabled}
          invalid={shared.invalid}
        />
      )

    case 'repeater':
    case 'steps-repeater':
      return (
        <Repeater
          id={groupId}
          value={value}
          onChange={(next) => emit(next)}
          itemLabelPrefix={field.itemLabelPrefix || 'ITEM'}
          addLabel={field.addLabel || undefined}
          initialCount={field.initialCount || field.idealMin || field.min || 1}
          min={field.min || 0}
          max={field.max || 0}
          idealMax={field.idealMax || 0}
          itemMaxLength={field.itemMaxLength || 0}
          placeholder={field.placeholder}
          labelledBy={`${field.id}-label`}
          disabled={shared.disabled}
          invalid={shared.invalid}
        />
      )

    case 'product-cards':
      return (
        <ProductCards
          id={groupId}
          value={asText(value)}
          onChange={(next) => emit(next)}
          options={options}
          aiFallback={field.aiFallback}
          labelledBy={`${field.id}-label`}
          disabled={shared.disabled}
          invalid={shared.invalid}
        />
      )

    default:
      /* Tipo novo no schema sem componente aqui: cai num textarea em vez de
         sumir da tela. Falhar visível é melhor do que perder uma resposta. */
      return (
        <TextArea
          value={asText(value)}
          onChange={emit}
          rows={field.rows || 3}
          placeholder={field.placeholder}
          {...shared}
        />
      )
  }
}

export default FieldRenderer
