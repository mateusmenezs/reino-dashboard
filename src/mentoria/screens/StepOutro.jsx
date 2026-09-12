/**
 * StepOutro.jsx — fechamento de etapa (`nav.screenIndex === n`).
 * Dono: AGENTE E.
 *
 * Microcelebração: uma marca, uma frase, um respiro. Nada de confete.
 * `outro.badge` e `outro.body` vêm do schema. A animação é a `.m-pop` da folha
 * de estilo do construtor, que já é neutralizada em `prefers-reduced-motion`.
 */

import React from 'react'
import { Button, Icon, ProgressBar, Reveal, color, font, radius, shadow } from '../ui/index.js'
import { STEPS } from '../schema/questions.js'
import { useBriefing } from '../state/store.jsx'
import { Body, BarRow, ScreenShell, titleCase } from './Layout.jsx'

export default function StepOutro() {
  const { currentStep, nav, progress, next, back } = useBriefing()
  const step = currentStep
  if (!step) return null

  const outro = step.outro || {}
  const nextStep = STEPS[nav.stepIndex + 1] || null
  const hint = nextStep
    ? `Próxima etapa: ${titleCase(nextStep.title)}.`
    : 'Próximo passo: a revisão final.'

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
        {hint}
      </p>
      <BarRow>
        <Button variant="secondary" onClick={back} aria-label="Voltar para a última pergunta">
          Voltar
        </Button>
        <Button variant="primary" full onClick={next} style={{ flex: '1 1 auto' }}>
          CONTINUAR →
        </Button>
      </BarRow>
    </div>
  )

  return (
    <ScreenShell footer={footer} padTop={48} padBottom={40}>
      <div style={{ textAlign: 'center' }}>
        <span
          className="m-pop"
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: radius.pill,
            background: color.successBg,
            border: `1px solid ${color.successBorder}`,
            color: color.success,
            boxShadow: shadow.sm,
          }}
        >
          <Icon name="check" size={30} strokeWidth={2.5} />
        </span>

        <Reveal delay={80}>
          <p
            style={{
              margin: '20px 0 0',
              fontSize: font.size.xs,
              fontWeight: font.weight.semibold,
              letterSpacing: font.tracking.wide,
              textTransform: 'uppercase',
              color: color.muted,
            }}
          >
            {step.kicker} concluída
          </p>

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
            {outro.badge}
          </h1>

          {outro.body ? (
            <Body size="lg" style={{ marginTop: '14px' }}>
              {outro.body}
            </Body>
          ) : null}

          <p
            style={{
              margin: '18px 0 0',
              fontSize: font.size.base,
              fontWeight: font.weight.semibold,
              color: color.actionText,
            }}
          >
            {nextStep
              ? 'Perfeito. Vamos para a próxima parte.'
              : 'Está tudo de pé. Vamos revisar antes de criar.'}
          </p>
        </Reveal>
      </div>

      <ProgressBar
        value={progress.pct / 100}
        label="Sua mentoria até aqui"
        style={{ marginTop: '36px' }}
      />
    </ScreenShell>
  )
}
