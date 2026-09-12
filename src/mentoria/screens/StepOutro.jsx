/**
 * StepOutro.jsx — fechamento de etapa (`nav.screenIndex === n`).
 * Dono: AGENTE E.
 *
 * Microcelebração: uma marca, uma frase, um respiro. Nada de confete.
 * `outro.badge` e `outro.body` vêm do schema. A animação é a `.m-pop` da folha
 * de estilo do construtor, que já é neutralizada em `prefers-reduced-motion`.
 *
 * ── A FRASE DE DESTAQUE ─────────────────────────────────────────────────────
 * Era a MESMA nas cinco primeiras etapas ("Perfeito. Vamos para a próxima
 * parte."). Na quinta repetição soava enlatada e apagava o que os corpos, que
 * variam, tinham acabado de dizer. Agora cada etapa tem a sua, e cada uma
 * aponta para o que vem a seguir — é a ponte, não um elogio.
 *
 * ── ESCALADA ────────────────────────────────────────────────────────────────
 * Fechar a etapa 6 (100%) não pode parecer igual a fechar a etapa 1 (29%). A
 * última etapa muda de peso: a marca cresce, ganha o selo de briefing completo
 * com a porcentagem e a frase muda de registro (a partir dali o trabalho é da
 * IA). Sem confete e sem autoajuda: o que muda é a escala, não o tom.
 *
 * Nota de arquitetura: idealmente estas frases morariam em `step.outro` (dono:
 * agente do schema). Enquanto não estiverem lá, ficam aqui indexadas por
 * `step.id` — microcopy de interface, no mesmo lugar de sempre, fácil de
 * revisar de uma vez.
 */

import React from 'react'
import { Badge, Button, Icon, ProgressBar, Reveal, color, font, radius, shadow } from '../ui/index.js'
import { STEPS } from '../schema/questions.js'
import { useBriefing } from '../state/store.jsx'
import { Body, BarRow, ScreenShell, titleCase } from './Layout.jsx'

/**
 * Frase de destaque por etapa. A chave é `step.id` (imutável por contrato).
 * Cada uma é a PONTE para a etapa seguinte — nunca um elogio genérico.
 */
export const OUTRO_COPY = Object.freeze({
  lastro: 'Seu lastro está registrado. Agora, para quem ele serve.',
  persona: 'Com o público definido, tudo o que vem depois ganha direção.',
  transformacao: 'O destino está claro. Falta desenhar o caminho até ele.',
  metodo: 'Seu método já tem forma. Agora, o formato em que ele é entregue.',
  produto: 'Falta a última camada: como a entrega acontece na prática.',
  /* 100%: muda de registro, não de tom. */
  entrega: 'Seu briefing está completo. A partir daqui, o trabalho é da IA.',
  fallback: 'Está tudo de pé. Vamos revisar antes de criar.',
  completeBadge: (pct) => `Briefing completo · ${pct}%`,
})

export default function StepOutro() {
  const { currentStep, nav, progress, next, back } = useBriefing()
  const step = currentStep
  if (!step) return null

  const outro = step.outro || {}
  const nextStep = STEPS[nav.stepIndex + 1] || null
  const hint = nextStep
    ? `Próxima etapa: ${titleCase(nextStep.title)}.`
    : 'Próximo passo: a revisão final.'

  const isFinal = !nextStep
  const highlight = OUTRO_COPY[step.id] || OUTRO_COPY.fallback

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
    <ScreenShell footer={footer} center padTop={40} padBottom={36}>
      <div style={{ textAlign: 'center' }}>
        <span
          className="m-pop"
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isFinal ? 88 : 64,
            height: isFinal ? 88 : 64,
            borderRadius: radius.pill,
            background: color.successBg,
            border: `1px solid ${color.successBorder}`,
            color: color.success,
            boxShadow: isFinal ? shadow.md : shadow.sm,
          }}
        >
          <Icon name="check" size={isFinal ? 42 : 30} strokeWidth={2.5} />
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

          {isFinal ? (
            <div style={{ marginTop: '18px' }}>
              <Badge tone="success">{OUTRO_COPY.completeBadge(progress.pct)}</Badge>
            </div>
          ) : null}

          <p
            style={{
              margin: isFinal ? '14px 0 0' : '18px 0 0',
              fontSize: isFinal ? font.size.lg : font.size.base,
              fontWeight: font.weight.semibold,
              lineHeight: font.leading.snug,
              color: color.actionText,
            }}
          >
            {highlight}
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
