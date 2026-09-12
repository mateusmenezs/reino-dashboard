/**
 * ErrorScreen.jsx — o envio não passou.
 * Dono: AGENTE E.
 *
 * Duas verdades que esta tela nunca pode contradizer:
 *   1. nada foi perdido — as respostas continuam salvas;
 *   2. o motivo real é dito, sem jargão, usando o objeto já classificado em
 *      `integration/errors.js` (sem internet, tempo esgotado, servidor fora,
 *      canal não configurado).
 * Quando o erro não é retentável, a tela para de oferecer o botão como solução
 * principal e manda falar com a equipe do evento.
 */

import React, { useCallback, useRef } from 'react'
import { Button, Card, Icon, Reveal, color, font, radius, shadow } from '../ui/index.js'
import { useBriefing } from '../state/store.jsx'
import { BarRow, Body, Note, ScreenShell, wrapCta } from './Layout.jsx'

export default function ErrorScreen() {
  const { submission, retry, back } = useBriefing()
  const busyRef = useRef(false)

  const sending = submission.status === 'sending'
  const info = submission.error || null
  const retryable = !info || info.retryable !== false

  const handleRetry = useCallback(() => {
    if (busyRef.current || sending) return
    busyRef.current = true
    Promise.resolve(retry()).finally(() => {
      busyRef.current = false
    })
  }, [retry, sending])

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
        {sending
          ? 'Enviando de novo. Não feche esta tela.'
          : retryable
            ? 'Nada foi perdido. Podemos tentar quantas vezes precisar.'
            : 'Mostre esta tela para a equipe do evento — eles destravam o envio.'}
      </p>
      <BarRow>
        <Button variant="secondary" onClick={back} aria-label="Voltar para a revisão">
          Voltar
        </Button>
        <Button
          variant={retryable ? 'primary' : 'secondary'}
          full
          onClick={handleRetry}
          loading={sending}
          disabled={sending}
          style={{ ...wrapCta, flex: '1 1 auto' }}
        >
          {sending ? 'ENVIANDO…' : 'TENTAR NOVAMENTE'}
        </Button>
      </BarRow>
    </div>
  )

  return (
    <ScreenShell footer={footer} padTop={44} padBottom={36}>
      <div style={{ textAlign: 'center' }}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: radius.pill,
            background: color.dangerBg,
            border: `1px solid ${color.dangerBorder}`,
            color: color.danger,
            boxShadow: shadow.xs,
          }}
        >
          <Icon name="alert" size={30} strokeWidth={2.25} />
        </span>

        <h1
          id="m-screen-title"
          tabIndex={-1}
          style={{
            margin: '22px 0 0',
            fontSize: font.size.displayLg,
            fontWeight: font.weight.bold,
            letterSpacing: font.tracking.tight,
            lineHeight: font.leading.tight,
            color: color.ink,
            outline: 'none',
          }}
        >
          Não conseguimos enviar seu Blueprint ainda.
        </h1>

        <p
          style={{
            margin: '14px 0 0',
            fontSize: font.size.lg,
            lineHeight: font.leading.relaxed,
            color: color.inkSoft,
          }}
        >
          Suas respostas estão salvas. Tente novamente.
        </p>
      </div>

      {info ? (
        <Reveal delay={60}>
          <Card style={{ marginTop: '28px' }} role="group" aria-label="Detalhe do problema">
            <p
              style={{
                margin: 0,
                fontSize: font.size.base,
                fontWeight: font.weight.semibold,
                letterSpacing: font.tracking.snug,
                color: color.ink,
              }}
            >
              {info.title}
            </p>
            <Body style={{ marginTop: '8px' }}>{info.message}</Body>
          </Card>
        </Reveal>
      ) : null}

      {!retryable ? (
        <Reveal delay={90}>
          <Note tone="warning" icon={<Icon name="info" size={18} />} style={{ marginTop: '18px' }}>
            Insistir no botão não vai resolver este caso. Procure a equipe do evento: seu briefing
            continua salvo neste aparelho e será enviado assim que o canal for liberado.
          </Note>
        </Reveal>
      ) : null}

      {submission.attempts > 1 ? (
        <p
          style={{
            margin: '18px 0 0',
            textAlign: 'center',
            fontSize: font.size.sm,
            color: color.muted,
          }}
        >
          {submission.attempts} tentativas até agora — todas com o mesmo registro, sem risco de
          enviar duas vezes.
        </p>
      ) : null}
    </ScreenShell>
  )
}
