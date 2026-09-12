/**
 * Review.jsx — antessala do envio.
 * Dono: AGENTE E.
 *
 * Princípio: a revisão NÃO é um formulário gigante despejado numa página.
 * São seis linhas — uma por etapa — e cada uma ABRE E FECHA SOZINHA.
 *
 * ── O QUE MUDOU E POR QUÊ ───────────────────────────────────────────────────
 * 1. Era tudo-ou-nada: um botão abria as 37 perguntas de uma vez, ~9.700px de
 *    texto corrido em 320px (11 telas numa rolagem só). O cliente proibiu
 *    "excesso de texto simultâneo na tela". Agora cada etapa é um acordeão:
 *    abre 5–8 perguntas, não 37.
 * 2. A resposta pesava MAIS que a pergunta (16px/400 navy contra 13px cinza).
 *    Invertido: a pergunta é o rótulo (âncora da leitura) e a resposta vem em
 *    tom secundário.
 * 3. Havia 37 botões "editar" ocupando ~25% da largura e espremendo a resposta
 *    numa coluna estreita. Sumiram: a LINHA INTEIRA é o alvo de toque, com o
 *    mesmo destino e o mesmo foco programático de antes.
 * 4. Fechada, a tela mostrava seis cartões menta idênticos dizendo só
 *    "Concluída" — e chegava a dizer "Sem pendências" com o briefing vazio,
 *    porque lia `progress.perStepCounts`, que o store não publica. A contagem
 *    agora é feita aqui, a partir do schema, e a linha diz o que realmente
 *    existe: respostas, delegações à IA e o que falta.
 *
 * Se faltar alguma resposta obrigatória, o CTA principal não engole o toque nem
 * dispara alert: ele mostra o que falta, diz em que etapa está e oferece um
 * caminho de um toque até o campo, já com a mensagem de erro no lugar.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Icon,
  ProgressBar,
  Reveal,
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
/* Contagem real por etapa                                             */
/* ------------------------------------------------------------------ */

/**
 * O que esta etapa tem, de verdade, agora.
 *
 * O store não publica `perStepCounts` — a tela lia essa chave inexistente e
 * caía no ramo `total === 0`, que dizia "Sem pendências" mesmo com o briefing
 * inteiro em branco. Aqui a conta é feita sobre os campos VISÍVEIS para estas
 * respostas, que é a mesma base usada pela validação e pela navegação.
 *
 * @returns {{fields: object[], answered: number, total: number,
 *            delegated: number, pending: number, done: boolean}}
 */
function countStep(step, answers) {
  const fields = getVisibleScreens(step, answers).flatMap((screen) =>
    getVisibleFields(screen, answers),
  )
  let answered = 0
  let delegated = 0
  let pending = 0
  for (const field of fields) {
    const escaped = isFieldEscaped(field, answers)
    if (escaped) {
      delegated += 1
      answered += 1
      continue
    }
    if (hasAnswer(field, answers)) answered += 1
    else if (isFieldRequired(field, answers)) pending += 1
  }
  return { fields, answered, total: fields.length, delegated, pending, done: pending === 0 }
}

/** Linha de status da etapa. Nunca diz "sem pendências" com pergunta em aberto. */
function statusOf(counts) {
  if (counts.pending > 0) {
    return {
      text:
        counts.pending === 1
          ? `${counts.answered} de ${counts.total} · falta 1`
          : `${counts.answered} de ${counts.total} · faltam ${counts.pending}`,
      tone: 'pending',
    }
  }
  const respostas = counts.answered === 1 ? '1 resposta' : `${counts.answered} respostas`
  if (counts.delegated > 0) {
    const ia = counts.delegated === 1 ? '1 delegada à IA' : `${counts.delegated} delegadas à IA`
    return { text: `${respostas} · ${ia}`, tone: 'done' }
  }
  return { text: respostas, tone: 'done' }
}

/* ------------------------------------------------------------------ */
/* Acordeão de etapa                                                   */
/* ------------------------------------------------------------------ */

function StepAccordion({ step, counts, open, onToggle, onOpenStep, answers, onEdit }) {
  const status = statusOf(counts)
  const panelId = `m-rev-${step.id}`
  const headId = `m-rev-${step.id}-head`

  return (
    <section
      style={{
        borderRadius: radius.xl,
        border: `1px solid ${color.border}`,
        background: color.surface,
        boxShadow: shadow.xs,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        id={headId}
        data-step-accordion={step.id}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          minHeight: control.touchMin + 16,
          margin: 0,
          padding: '14px',
          textAlign: 'left',
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: font.family,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* superfície neutra + marca de conclusão discreta: o número vira um
            visto quando a etapa fecha, sem pintar o cartão inteiro de menta */}
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
            border: `1px solid ${counts.done ? color.successBorder : color.border}`,
            background: counts.done ? color.successBg : color.surfaceSunken,
            color: counts.done ? color.success : color.muted,
            fontSize: font.size.xs,
            fontWeight: font.weight.bold,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {counts.done ? <Icon name="check" size={16} strokeWidth={2.75} /> : step.index}
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
              fontVariantNumeric: 'tabular-nums',
              color: status.tone === 'pending' ? color.warning : color.muted,
            }}
          >
            {status.text}
          </span>
        </span>

        <Icon
          name="chevronRight"
          size={18}
          color={color.muted}
          style={{ flex: 'none', transform: open ? 'rotate(90deg)' : 'none' }}
        />
      </button>

      <div id={panelId} role="region" aria-labelledby={headId} hidden={!open}>
        {open ? (
          <React.Fragment>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {counts.fields.map((field) => (
                <AnswerRow key={field.id} field={field} answers={answers} onEdit={onEdit} />
              ))}
            </ul>
            <div style={{ padding: '10px 8px 12px', borderTop: `1px solid ${color.border}` }}>
              <Button variant="ghost" onClick={onOpenStep} style={{ padding: '0 12px' }}>
                Abrir a etapa inteira →
              </Button>
            </div>
          </React.Fragment>
        ) : null}
      </div>
    </section>
  )
}

/**
 * Uma pergunta e a resposta dela.
 * A linha INTEIRA é o botão de editar — era isso ou 37 botõezinhos "editar"
 * comendo um quarto da largura. A pergunta é o rótulo; a resposta vem em tom
 * secundário, logo abaixo, com a largura toda para ela.
 */
function AnswerRow({ field, answers, onEdit }) {
  const { text, tone } = shortAnswer(field, answers)
  const missing = !hasAnswer(field, answers)
  const required = isFieldRequired(field, answers)

  return (
    <li style={{ margin: 0, borderTop: `1px solid ${color.border}` }}>
      <button
        type="button"
        onClick={() => onEdit(field.id)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          width: '100%',
          minHeight: control.touchMin,
          margin: 0,
          padding: '14px',
          textAlign: 'left',
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: font.family,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ flex: '1 1 auto', minWidth: 0 }}>
          <span
            style={{
              display: 'block',
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
          </span>

          <span
            style={{
              display: 'block',
              marginTop: '6px',
              fontSize: font.size.base,
              fontWeight: font.weight.regular,
              lineHeight: font.leading.normal,
              color: color.muted,
              wordBreak: 'break-word',
            }}
          >
            {missing ? (
              <Badge tone={required ? 'warning' : 'neutral'}>
                {required ? 'Ainda sem resposta' : 'Deixado em branco'}
              </Badge>
            ) : tone !== 'answer' ? (
              <span style={{ color: color.actionText, fontWeight: font.weight.medium }}>
                {text}
              </span>
            ) : (
              text
            )}
          </span>
          <span style={srOnly}> — tocar para editar esta resposta.</span>
        </span>

        <Icon name="chevronRight" size={16} color={color.muted} style={{ flex: 'none', marginTop: '2px' }} />
      </button>
    </li>
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

  /* Um acordeão por etapa: cada uma abre e fecha sozinha. Podem coexistir
     abertas (quem revisa duas etapas seguidas não perde a primeira), mas
     nenhuma abre por padrão — a tela chega compacta. */
  const [openSteps, setOpenSteps] = useState(() => ({}))
  const [pending, setPending] = useState(null)
  const sendingRef = useRef(false)
  const noticeRef = useRef(null)

  const sending = submission.status === 'sending'

  const summary = useMemo(
    () => STEPS.map((step) => ({ step, counts: countStep(step, answers) })),
    [answers],
  )

  const toggleStep = useCallback(
    (stepId) => setOpenSteps((current) => ({ ...current, [stepId]: !current[stepId] })),
    [],
  )

  const editField = useCallback(
    (fieldId) => {
      goToField(fieldId)
      if (typeof window !== 'undefined') {
        window.setTimeout(() => focusField(fieldId, { delay: 0 }), 180)
      }
    },
    [goToField],
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
        <Body style={{ marginTop: '22px' }}>
          Toque em uma etapa para conferir as respostas. Toque em uma resposta para editá-la.
        </Body>

        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
          {summary.map(({ step, counts }) => (
            <StepAccordion
              key={step.id}
              step={step}
              counts={counts}
              answers={answers}
              open={Boolean(openSteps[step.id])}
              onToggle={() => toggleStep(step.id)}
              onOpenStep={() => openStep(step.index - 1)}
              onEdit={editField}
            />
          ))}
        </div>

        <div ref={noticeRef} style={{ marginTop: pending ? '18px' : 0 }}>
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
      </Reveal>

    </ScreenShell>
  )
}
