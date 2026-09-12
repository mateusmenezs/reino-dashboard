/**
 * Welcome.jsx — porta de entrada do Construtor de Mentoria.
 * Dono: AGENTE E.
 *
 * Dois estados: primeira visita e retomada. Na retomada, o CTA muda de texto,
 * mostra onde a pessoa parou e abre um caminho DISCRETO de recomeçar do zero —
 * sempre com confirmação em duas etapas, porque um toque acidental aqui apaga
 * o trabalho de uma palestra inteira.
 */

import React, { useState } from 'react'
import {
  Button,
  Card,
  Icon,
  ProgressBar,
  Reveal,
  Surface,
  color,
  font,
  radius,
  type,
} from '../ui/index.js'
import { STEPS } from '../schema/questions.js'
import { useBriefing } from '../state/store.jsx'
import {
  Body,
  BarRow,
  Note,
  ScreenShell,
  findResumePoint,
  titleCase,
} from './Layout.jsx'

export default function Welcome() {
  const { answers, progress, goTo, next, resetAll, restored, storageAvailable } = useBriefing()
  const [confirmingReset, setConfirmingReset] = useState(false)

  const resuming = progress.answered > 0
  const point = resuming ? findResumePoint(answers) : null

  const whereLabel = !point
    ? ''
    : point.phase === 'review'
      ? 'Tudo respondido — falta só criar sua mentoria.'
      : `Você parou na ${point.step.kicker} — ${titleCase(point.step.title)}${
          point.total > 1 ? ` · parte ${point.position} de ${point.total}` : ''
        }.`

  const handleStart = () => {
    if (!point || point.phase !== 'steps') {
      next()
      return
    }
    goTo({ phase: 'steps', stepIndex: point.stepIndex, screenIndex: point.screenIndex })
  }

  const handleReset = () => {
    setConfirmingReset(false)
    resetAll()
  }

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
        Leva aproximadamente 20–30 minutos, distribuídos ao longo do evento.
      </p>
      <BarRow>
        <Button variant="primary" size="lg" full onClick={handleStart}>
          {resuming ? 'CONTINUAR MINHA MENTORIA →' : 'COMEÇAR MINHA MENTORIA →'}
        </Button>
      </BarRow>
    </div>
  )

  return (
    <ScreenShell footer={footer} padTop={32} padBottom={28}>
      {/*
        A primeira impressão do evento abre em marinho. É a única superfície
        escura desta tela: o que vem depois (progresso, etapas, aviso) volta
        para a base clara, que é onde o trabalho acontece.

        Por que `Surface` e não `Hero`: o `Hero` fixa o título em `type.display`
        (28px), e `type.displayXl` (32px) é, por contrato dos tokens, o tamanho
        da ABERTURA DO APP. Usar o `Hero` aqui achataria dois degraus da escala
        num só e faria a porta de entrada pesar igual à abertura de etapa.
        Os três contrastes são os mesmos do `Hero`, medidos sobre o marinho:
        kicker #7EA6FF 7,22:1 · título #FFFFFF 17,25:1 · corpo #C6D2E4 11,29:1.
      */}
      <Reveal>
        <Surface tone="navy" padded={false} style={{ padding: '28px 20px' }}>
          <p style={{ margin: '0 0 12px', ...type.overline, color: color.actionSoft }}>
            Construtor de Mentoria com IA
          </p>

          <h1
            id="m-screen-title"
            tabIndex={-1}
            style={{ margin: 0, ...type.displayXl, color: color.onDark, outline: 'none' }}
          >
            Crie sua Mentoria com IA
          </h1>

          <p style={{ margin: '16px 0 0', ...type.lead, color: color.onDarkMuted }}>
            Transforme sua história, conhecimento e resultados em uma mentoria estruturada.
          </p>
        </Surface>

        <Body style={{ marginTop: '20px' }}>
          Durante o evento, vamos construir cada parte juntos. Preencha as etapas conforme Mateus
          avançar no conteúdo.
        </Body>
      </Reveal>

      {resuming ? (
        <Reveal delay={60}>
          <Card elevated style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  flex: 'none',
                  borderRadius: radius.pill,
                  background: color.successBg,
                  border: `1px solid ${color.successBorder}`,
                  color: color.success,
                }}
              >
                <Icon name="check" size={16} strokeWidth={2.5} />
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: font.size.base,
                  fontWeight: font.weight.semibold,
                  color: color.ink,
                }}
              >
                {restored ? 'Seu progresso está salvo.' : 'Seu progresso continua aqui.'}
              </p>
            </div>

            <p
              style={{
                margin: '10px 0 16px',
                fontSize: font.size.base,
                lineHeight: font.leading.relaxed,
                color: color.muted,
              }}
            >
              {whereLabel}
            </p>

            <ProgressBar value={progress.pct / 100} label="Preenchido até agora" />
          </Card>
        </Reveal>
      ) : (
        <Reveal delay={60}>
          <ol
            aria-label="As seis etapas da sua mentoria"
            style={{
              listStyle: 'none',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              margin: '24px 0 0',
              padding: 0,
            }}
          >
            {STEPS.map((step) => (
              <li
                key={step.id}
                style={{
                  padding: '7px 12px',
                  borderRadius: radius.pill,
                  background: color.surface,
                  border: `1px solid ${color.border}`,
                  color: color.inkSoft,
                  fontSize: font.size.sm,
                  fontWeight: font.weight.semibold,
                  letterSpacing: font.tracking.snug,
                }}
              >
                {titleCase(step.title)}
              </li>
            ))}
          </ol>
        </Reveal>
      )}

      <Reveal delay={120}>
        <Note
          tone={storageAvailable ? 'info' : 'warning'}
          icon={<Icon name={storageAvailable ? 'info' : 'alert'} size={18} />}
          style={{ marginTop: '20px' }}
        >
          {storageAvailable
            ? 'Não precisa preencher tudo de uma vez. Cada resposta é salva neste aparelho — você pode fechar, voltar e continuar de onde parou.'
            : 'Seu progresso não está sendo salvo neste aparelho (aba anônima ou memória cheia). Dá para preencher normalmente, mas é melhor concluir sem fechar esta aba.'}
        </Note>
      </Reveal>

      {resuming ? (
        <div style={{ marginTop: '24px' }}>
          {confirmingReset ? (
            <Card
              role="group"
              aria-label="Confirmar recomeço"
              style={{ borderColor: color.dangerBorder, background: color.dangerBg }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: font.size.base,
                  fontWeight: font.weight.semibold,
                  color: color.ink,
                }}
              >
                Recomeçar apaga todas as respostas deste aparelho.
              </p>
              <p
                style={{
                  margin: '8px 0 16px',
                  fontSize: font.size.sm,
                  lineHeight: font.leading.relaxed,
                  color: color.inkSoft,
                }}
              >
                Não dá para desfazer. Se você só quer ajustar algo, é melhor continuar e editar a
                resposta na etapa em que ela está.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmingReset(false)}
                  style={{ flex: '1 1 140px' }}
                >
                  Manter respostas
                </Button>
                <Button variant="danger" onClick={handleReset} style={{ flex: '1 1 140px' }}>
                  Apagar e recomeçar
                </Button>
              </div>
            </Card>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Button variant="ghost" onClick={() => setConfirmingReset(true)}>
                Recomeçar do zero
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </ScreenShell>
  )
}
