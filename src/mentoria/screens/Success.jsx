/**
 * Success.jsx — fim da jornada do participante.
 * Dono: AGENTE E.
 *
 * Sobriedade proposital: uma marca de confirmação, três blocos de texto e o
 * número mascarado para onde o Blueprint vai. Zero emoji, zero confete e —
 * decisão consciente — NENHUMA promessa de prazo de processamento.
 */

import React from 'react'
import { Card, Icon, Reveal, color, font, radius, shadow } from '../ui/index.js'
import { maskForDisplay } from '../state/phone.js'
import { useBriefing } from '../state/store.jsx'
import { Body, ScreenShell } from './Layout.jsx'

export default function Success() {
  const { identity } = useBriefing()
  const masked = maskForDisplay(identity.whatsapp || '')

  return (
    <ScreenShell center padTop={40} padBottom={40}>
      <div style={{ textAlign: 'center' }}>
        <span
          className="m-pop"
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 76,
            height: 76,
            borderRadius: radius.pill,
            background: color.successBg,
            border: `1px solid ${color.successBorder}`,
            color: color.success,
            boxShadow: shadow.sm,
          }}
        >
          <Icon name="check" size={36} strokeWidth={2.5} />
        </span>

        <Reveal delay={80}>
          <h1
            id="m-screen-title"
            tabIndex={-1}
            style={{
              margin: '24px 0 0',
              fontSize: font.size.displayXl,
              fontWeight: font.weight.bold,
              letterSpacing: font.tracking.tight,
              lineHeight: font.leading.tight,
              color: color.ink,
              outline: 'none',
            }}
          >
            RECEBEMOS TUDO.
          </h1>

          <p
            style={{
              margin: '14px 0 0',
              fontSize: font.size.lg,
              fontWeight: font.weight.semibold,
              lineHeight: font.leading.snug,
              color: color.actionText,
            }}
          >
            Sua mentoria está sendo estruturada pela nossa IA.
          </p>

          <Body style={{ marginTop: '14px' }}>
            Estamos conectando sua história, persona, transformação e método para construir seu
            Blueprint personalizado.
          </Body>
        </Reveal>
      </div>

      <Reveal delay={140}>
        <Card elevated style={{ marginTop: '32px', textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontSize: font.size.xl,
              fontWeight: font.weight.bold,
              letterSpacing: font.tracking.tight,
              color: color.ink,
            }}
          >
            Fique de olho no WhatsApp.
          </p>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: font.size.base,
              lineHeight: font.leading.relaxed,
              color: color.muted,
            }}
          >
            {masked ? (
              <React.Fragment>
                Seu Blueprint será enviado para{' '}
                <strong
                  style={{
                    color: color.ink,
                    fontWeight: font.weight.semibold,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {masked}
                </strong>
                .
              </React.Fragment>
            ) : (
              'Seu Blueprint será enviado para o WhatsApp que você informou.'
            )}
          </p>
        </Card>
      </Reveal>

      <Reveal delay={200}>
        <p
          style={{
            margin: '36px 0 0',
            textAlign: 'center',
            fontSize: font.size.base,
            lineHeight: font.leading.relaxed,
            fontWeight: font.weight.medium,
            color: color.inkSoft,
          }}
        >
          Você acaba de transformar seu conhecimento em uma propriedade intelectual estruturada.
        </p>
      </Reveal>
    </ScreenShell>
  )
}
