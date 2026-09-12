/**
 * StepIntro.jsx — abertura de cada etapa (`nav.screenIndex === -1`).
 * Dono: AGENTE E.
 *
 * Papel: dar respiro e contexto antes das perguntas. Uma ideia dominante por
 * tela. Todo texto vem de `step.intro` (schema); os diagramas vêm de
 * `intro.diagram` / `intro.flow` — nada é escrito aqui.
 */

import React from 'react'
import {
  Button,
  Card,
  Icon,
  Reveal,
  StepDots,
  color,
  font,
  radius,
  srOnly,
} from '../ui/index.js'
import { STEPS } from '../schema/questions.js'
import { useBriefing } from '../state/store.jsx'
import { Body, BarRow, Eyebrow, Note, ScreenShell } from './Layout.jsx'
import { FlowChain, FlowSteps } from './Diagrams.jsx'

/** O título da abertura já É o diagrama? (Etapa 3: "PONTO A → SEU MÉTODO → PONTO B") */
function titleIsDiagram(intro) {
  if (!intro || !Array.isArray(intro.diagram) || intro.diagram.length === 0) return false
  return intro.diagram.join(' → ') === String(intro.title || '').trim()
}

/** Modelos de produto explicados + nota da etapa — lidos do schema, nunca escritos aqui. */
function productModels(step) {
  const screens = step && Array.isArray(step.screens) ? step.screens : []
  for (let s = 0; s < screens.length; s += 1) {
    const fields = screens[s].fields || []
    for (let f = 0; f < fields.length; f += 1) {
      const field = fields[f]
      if (field.type === 'product-cards' && Array.isArray(field.options)) {
        const options = field.options.filter(
          (opt) => !field.aiFallback || opt.label !== field.aiFallback,
        )
        return { options, note: screens[s].note || '' }
      }
    }
  }
  return null
}

export default function StepIntro() {
  const { currentStep, next, back } = useBriefing()
  const step = currentStep
  if (!step) return null

  const intro = step.intro || {}
  const asDiagram = titleIsDiagram(intro)
  const models = productModels(step)

  const footer = (
    <BarRow>
      <Button variant="secondary" onClick={back} aria-label="Voltar para a etapa anterior">
        Voltar
      </Button>
      <Button variant="primary" full onClick={next} style={{ flex: '1 1 auto' }}>
        COMEÇAR ETAPA →
      </Button>
    </BarRow>
  )

  return (
    <ScreenShell footer={footer} padTop={32} padBottom={32}>
      <Reveal>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <Eyebrow>{step.kicker}</Eyebrow>
          <StepDots total={STEPS.length} current={step.index} />
        </div>

        <p
          style={{
            margin: '20px 0 0',
            fontSize: font.size.sm,
            fontWeight: font.weight.bold,
            letterSpacing: font.tracking.wide,
            textTransform: 'uppercase',
            color: color.muted,
          }}
        >
          {step.title}
        </p>

        {asDiagram ? (
          <h1 id="m-screen-title" tabIndex={-1} style={{ margin: '14px 0 0', outline: 'none' }}>
            <span style={srOnly}>{intro.title}</span>
            <FlowChain items={intro.diagram} label={intro.title} />
          </h1>
        ) : (
          <h1
            id="m-screen-title"
            tabIndex={-1}
            style={{
              margin: '10px 0 0',
              fontSize: font.size.displayLg,
              fontWeight: font.weight.bold,
              letterSpacing: font.tracking.tight,
              lineHeight: font.leading.tight,
              color: color.ink,
              outline: 'none',
            }}
          >
            {intro.title}
          </h1>
        )}

        {intro.body ? (
          <Body size="lg" style={{ marginTop: '18px' }}>
            {intro.body}
          </Body>
        ) : null}
      </Reveal>

      {!asDiagram && Array.isArray(intro.diagram) && intro.diagram.length > 0 ? (
        <Reveal delay={60}>
          <FlowChain items={intro.diagram} style={{ marginTop: '24px' }} />
        </Reveal>
      ) : null}

      {Array.isArray(intro.flow) && intro.flow.length > 0 ? (
        <Reveal delay={60}>
          <FlowSteps items={intro.flow} label={intro.title} style={{ marginTop: '24px' }} />
        </Reveal>
      ) : null}

      {models && models.options.length > 0 ? (
        <Reveal delay={80}>
          <div style={{ marginTop: '24px', display: 'grid', gap: '12px' }}>
            {models.options.map((opt, index) => (
              <Card key={opt.value} style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                      width: 28,
                      height: 28,
                      borderRadius: radius.pill,
                      background: color.actionTint,
                      border: `1px solid ${color.actionTintStrong}`,
                      color: color.actionText,
                      fontSize: font.size.xs,
                      fontWeight: font.weight.bold,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: font.size.base,
                        fontWeight: font.weight.bold,
                        letterSpacing: font.tracking.snug,
                        color: color.ink,
                      }}
                    >
                      {opt.label}
                    </p>
                    {opt.description ? (
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: font.size.sm,
                          lineHeight: font.leading.relaxed,
                          color: color.muted,
                        }}
                      >
                        {opt.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {models.note ? (
            <Note icon={<Icon name="info" size={18} />} style={{ marginTop: '16px' }}>
              {models.note}
            </Note>
          ) : null}
        </Reveal>
      ) : null}
    </ScreenShell>
  )
}
