/**
 * Review.jsx — antessala do envio.
 * Dono: AGENTE E.
 *
 * Princípio: a revisão NÃO é um formulário gigante despejado numa página.
 * São seis cartões — um por etapa — que levam de volta ao lugar certo, mais um
 * resumo navegável (pergunta → resposta curta → editar) que abre sob demanda.
 *
 * Se faltar alguma resposta obrigatória, o CTA principal não engole o toque nem
 * dispara alert: ele mostra o que falta, diz em que etapa está e oferece um
 * caminho de um toque até o campo, já com a mensagem de erro no lugar.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Icon,
  ProgressBar,
  Reveal,
  SectionTitle,
  color,
  control,
  font,
  radius,
  shadow,
  srOnly,
} from '../ui/index.js'
import {
  STEPS,
  getVisibleScreens,
  getVisibleFields,
  isFieldEscaped,
  isFieldRequired,
  hasAnswer,
} from '../schema/questions.js'
import { labelOf, labelsOf } from '../schema/options.js'
import { validateAll } from '../state/validation.js'
import { useBriefing } from '../state/store.jsx'
import { BarRow, Body, Eyebrow, Note, ScreenShell, focusField, titleCase, wrapCta } from './Layout.jsx'

/* ------------------------------------------------------------------ */
/* Resposta em forma curta                                             */
/* ------------------------------------------------------------------ */

const MAX_PREVIEW = 160

function clamp(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  if (value.length <= MAX_PREVIEW) return value
  return `${value.slice(0, MAX_PREVIEW - 1).trimEnd()}…`
}

function audienceSummary(field, value) {
  if (!value || typeof value !== 'object') return ''
  const criteria = field.criteria || []
  const maxTotal = (field.scale && field.scale.maxTotal) || criteria.length * 5
  const parts = []
  const ids = (field.audiences || []).map((a) => a.value || a.id).filter(Boolean)
  const list = ids.length > 0 ? ids : Object.keys(value)

  list.forEach((id) => {
    const entry = value[id] || {}
    const descricao = String(entry.descricao || '').trim()
    if (!descricao) return
    const score = criteria.reduce((sum, c) => sum + (Number(entry[c.value]) || 0), 0)
    parts.push(score > 0 ? `${id}: ${descricao} (${score}/${maxTotal})` : `${id}: ${descricao}`)
  })
  return parts.join(' · ')
}

/** Resposta legível de um campo, seja qual for o `type`. */
function shortAnswer(field, answers) {
  if (isFieldEscaped(field, answers)) {
    return { text: field.escape.label, tone: field.escape.ai ? 'ai' : 'escape' }
  }

  const value = answers[field.id]
  let text = ''

  switch (field.type) {
    case 'radio':
    case 'select':
    case 'product-cards': {
      text = labelOf(field.options, value) || ''
      if (field.otherOption && value === field.otherOption.value) {
        const extra = String(answers[field.otherOption.placeholderFieldId] || '').trim()
        if (extra) text = `${text} — ${extra}`
      }
      break
    }
    case 'multiselect':
      text = labelsOf(field.options, Array.isArray(value) ? value : []).join(' · ')
      break
    case 'repeater':
    case 'steps-repeater':
      text = (Array.isArray(value) ? value : [])
        .map((item) => String(item == null ? '' : item).trim())
        .filter(Boolean)
        .join(' · ')
      break
    case 'audience-cards':
      text = audienceSummary(field, value)
      break
    default:
      text = String(value == null ? '' : value).trim()
  }

  return { text: clamp(text), tone: 'answer' }
}

/* ------------------------------------------------------------------ */
/* Cartão de etapa                                                     */
/* ------------------------------------------------------------------ */

function StepCard({ step, counts, done, onOpen }) {
  const total = counts ? counts.total : 0
  const answered = counts ? counts.answered : 0
  const statusText = done
    ? 'Concluída'
    : total === 0
      ? 'Sem pendências'
      : `${answered} de ${total}`

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${step.kicker}: ${titleCase(step.title)} — ${statusText}. Abrir para editar.`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        minHeight: control.touchMin + 16,
        margin: 0,
        padding: '14px 14px',
        textAlign: 'left',
        borderRadius: radius.xl,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: done ? color.successBorder : color.border,
        background: done ? color.successBg : color.surface,
        boxShadow: shadow.xs,
        cursor: 'pointer',
        fontFamily: font.family,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          width: 30,
          height: 30,
          borderRadius: radius.pill,
          background: done ? color.success : color.surfaceSunken,
          color: done ? color.onDark : color.muted,
          fontSize: font.size.xs,
          fontWeight: font.weight.bold,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {done ? <Icon name="check" size={17} strokeWidth={2.75} /> : step.index}
      </span>

      <span style={{ flex: '1 1 auto', minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: font.size.base,
            fontWeight: font.weight.semibold,
            letterSpacing: font.tracking.snug,
            color: color.ink,
          }}
        >
          {titleCase(step.title)}
        </span>
        <span
          style={{
            display: 'block',
            marginTop: '2px',
            fontSize: font.size.sm,
            color: done ? color.success : color.muted,
          }}
        >
          {statusText}
        </span>
      </span>

      <Icon name="chevronRight" size={18} color={color.muted} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

export default function Review() {
  const {
    answers,
    identity,
    progress,
    submission,
    submit,
    goTo,
    goToField,
    setErrors,
  } = useBriefing()

  const [detailOpen, setDetailOpen] = useState(false)
  const [pending, setPending] = useState(null)
  const sendingRef = useRef(false)
  const noticeRef = useRef(null)

  const sending = submission.status === 'sending'

  const summary = useMemo(
    () =>
      STEPS.map((step) => ({
        step,
        fields: getVisibleScreens(step, answers).flatMap((screen) =>
          getVisibleFields(screen, answers),
        ),
      })),
    [answers],
  )

  const openStep = useCallback(
    (stepIndex) => {
      goTo({ phase: 'steps', stepIndex, screenIndex: 0 })
    },
    [goTo],
  )

  const goToPending = useCallback(
    (target) => {
      if (!target || !target.firstErrorId) return
      if (target.phase === 'identify') {
        goTo('identify')
      } else {
        goToField(target.firstErrorId)
      }
      if (typeof window !== 'undefined') {
        window.setTimeout(() => focusField(target.firstErrorId, { delay: 0 }), 180)
      }
    },
    [goTo, goToField],
  )

  const handleCreate = useCallback(() => {
    if (sendingRef.current || sending || submission.status === 'success') return

    const res = validateAll(answers, identity)
    if (!res.ok) {
      setErrors(res.errors)
      const missing = Object.keys(res.errors || {}).length
      const step = res.phase === 'identify' ? null : STEPS[res.stepIndex] || null
      const target = {
        firstErrorId: res.firstErrorId,
        phase: res.phase,
        missing,
        where: step ? `${step.kicker} — ${titleCase(step.title)}` : 'nos seus dados de contato',
      }
      // Segundo toque no mesmo pendente: leva direto, sem repetir o aviso.
      if (pending && pending.firstErrorId === target.firstErrorId) {
        goToPending(target)
        return
      }
      setPending(target)
      if (noticeRef.current && typeof noticeRef.current.scrollIntoView === 'function') {
        try {
          noticeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } catch (_e) {
          noticeRef.current.scrollIntoView()
        }
      }
      return
    }

    sendingRef.current = true
    setPending(null)
    Promise.resolve(submit()).finally(() => {
      sendingRef.current = false
    })
  }, [answers, identity, pending, sending, submission.status, setErrors, submit, goToPending])

  const footer = (
    <div>
      <p
        style={{
          margin: '0 0 10px',
          textAlign: 'center',
          fontSize: font.size.sm,
          lineHeight: font.leading.normal,
          color: color.muted,
        }}
      >
        {sending ? 'Enviando seu briefing. Não feche esta tela.' : 'Suas respostas já estão salvas.'}
      </p>
      <BarRow>
        <Button
          variant="primary"
          size="lg"
          full
          onClick={handleCreate}
          loading={sending}
          disabled={sending}
          style={wrapCta}
        >
          {sending ? 'ENVIANDO…' : 'CRIAR MINHA MENTORIA COM IA →'}
        </Button>
      </BarRow>
    </div>
  )

  return (
    <ScreenShell footer={footer} padTop={30} padBottom={34}>
      <Reveal>
        <Eyebrow>Revisão final</Eyebrow>

        <h1
          id="m-screen-title"
          tabIndex={-1}
          style={{
            margin: '14px 0 0',
            fontSize: font.size.displayLg,
            fontWeight: font.weight.bold,
            letterSpacing: font.tracking.tight,
            lineHeight: font.leading.tight,
            color: color.ink,
            outline: 'none',
          }}
        >
          SUA MENTORIA ESTÁ PRONTA PARA SER ESTRUTURADA.
        </h1>

        <ProgressBar
          value={progress.pct / 100}
          label="Progresso do seu briefing"
          style={{ marginTop: '20px' }}
        />
      </Reveal>

      <Reveal delay={60}>
        <div style={{ marginTop: '24px', display: 'grid', gap: '10px' }}>
          {STEPS.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              counts={progress.perStepCounts ? progress.perStepCounts[step.id] : null}
              done={(progress.completedSteps || []).indexOf(step.id) >= 0}
              onOpen={() => openStep(step.index - 1)}
            />
          ))}
        </div>
      </Reveal>

      <Reveal delay={90}>
        <Body style={{ marginTop: '24px' }}>
          Revise suas respostas se quiser ou deixe nossa IA conectar os pontos.
        </Body>

        <div ref={noticeRef} style={{ marginTop: pending ? '16px' : 0 }}>
          {pending ? (
            <Note tone="warning" icon={<Icon name="alert" size={18} />}>
              <span style={{ display: 'block', fontWeight: font.weight.semibold }}>
                {pending.missing > 1
                  ? `Faltam ${pending.missing} respostas para a IA montar seu Blueprint.`
                  : 'Falta uma resposta para a IA montar seu Blueprint.'}
              </span>
              <span style={{ display: 'block', marginTop: '4px' }}>
                {pending.phase === 'identify'
                  ? 'A primeira está nos seus dados de contato.'
                  : `A primeira está em ${pending.where}.`}
              </span>
              <Button
                variant="secondary"
                onClick={() => goToPending(pending)}
                style={{ marginTop: '12px' }}
              >
                Ir para a pergunta →
              </Button>
            </Note>
          ) : null}
        </div>

        <Button
          variant="secondary"
          full
          onClick={() => setDetailOpen((open) => !open)}
          aria-expanded={detailOpen}
          aria-controls="m-review-detail"
          style={{ marginTop: '16px' }}
        >
          {detailOpen ? 'FECHAR RESUMO' : 'REVISAR RESPOSTAS'}
        </Button>
      </Reveal>

      <div id="m-review-detail" hidden={!detailOpen}>
        {detailOpen ? (
          <div style={{ marginTop: '24px', display: 'grid', gap: '18px' }}>
            {summary.map(({ step, fields }) => (
              <Card key={step.id} padded={false} style={{ overflow: 'visible' }}>
                <div
                  style={{
                    padding: '16px 16px 12px',
                    borderBottom: `1px solid ${color.border}`,
                  }}
                >
                  <SectionTitle level={2} kicker={step.kicker} title={titleCase(step.title)} />
                </div>

                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {fields.map((field, index) => {
                    const { text, tone } = shortAnswer(field, answers)
                    const missing = !hasAnswer(field, answers)
                    const required = isFieldRequired(field, answers)
                    return (
                      <li
                        key={field.id}
                        style={{
                          padding: '14px 16px',
                          borderBottom:
                            index === fields.length - 1 ? 'none' : `1px solid ${color.border}`,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: font.size.sm,
                            fontWeight: font.weight.semibold,
                            lineHeight: font.leading.snug,
                            color: color.inkSoft,
                          }}
                        >
                          {field.number ? (
                            <span style={{ color: color.actionText }}>{field.number}. </span>
                          ) : null}
                          {field.label}
                        </p>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '12px',
                            marginTop: '6px',
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              flex: '1 1 auto',
                              minWidth: 0,
                              fontSize: font.size.base,
                              lineHeight: font.leading.normal,
                              color: missing ? color.muted : color.ink,
                              wordBreak: 'break-word',
                            }}
                          >
                            {missing ? (
                              <Badge tone={required ? 'warning' : 'neutral'}>
                                {required ? 'Ainda sem resposta' : 'Deixado em branco'}
                              </Badge>
                            ) : tone !== 'answer' ? (
                              <span
                                style={{
                                  color: color.actionText,
                                  fontWeight: font.weight.medium,
                                }}
                              >
                                {text}
                              </span>
                            ) : (
                              text
                            )}
                          </p>

                          <Button
                            variant="ghost"
                            onClick={() => {
                              goToField(field.id)
                              if (typeof window !== 'undefined') {
                                window.setTimeout(
                                  () => focusField(field.id, { delay: 0 }),
                                  180,
                                )
                              }
                            }}
                            style={{ flex: 'none', padding: '0 10px' }}
                          >
                            editar
                            <span style={srOnly}> a resposta de: {field.label}</span>
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </ScreenShell>
  )
}
