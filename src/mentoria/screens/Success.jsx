/**
 * Success.jsx — fim da jornada do participante.
 * Dono: AGENTE E.
 *
 * Sobriedade proposital: uma marca de confirmação, três blocos de texto e o
 * número mascarado para onde o Blueprint vai. Zero emoji, zero confete e —
 * decisão consciente — NENHUMA promessa de prazo de processamento.
 *
 * ── A ÂNCORA ESCURA ─────────────────────────────────────────────────────────
 * Esta era a única tela da jornada sem um momento marinho: tudo claro, e a
 * última imagem que o participante leva do evento acabava parecendo leve
 * demais para o que ele acabou de construir. O bloco do WhatsApp — a única
 * informação que ele PRECISA guardar daqui — passa a ser a superfície escura
 * da tela. É o bloco que ele vai fotografar.
 */

import React, { useState } from 'react'
import { Button, Card, Icon, Reveal, SectionTitle, color, font, radius, shadow } from '../ui/index.js'
import { maskForDisplay } from '../state/phone.js'
import { useBriefing } from '../state/store.jsx'
import { Body, ScreenShell } from './Layout.jsx'

export default function Success() {
  const { identity, reopenForEdit } = useBriefing()
  const [confirmando, setConfirmando] = useState(false)
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
        <Card tone="navy" elevated style={{ marginTop: '32px', textAlign: 'center' }}>
          <SectionTitle
            onDark
            title="Fique de olho no WhatsApp."
            description={
              masked ? (
                <React.Fragment>
                  Seu Blueprint será enviado para{' '}
                  <strong
                    style={{
                      color: color.onDark,
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
              )
            }
          />
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

      {/* Saída para quem percebeu um erro logo depois de enviar. Fica discreta
          e exige dois toques: um toque acidental não pode reabrir o briefing
          nem gerar um segundo envio. */}
      <Reveal delay={260}>
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          {confirmando ? (
            <div
              style={{
                border: `1px solid ${color.border}`,
                borderRadius: radius.xl,
                background: color.surface,
                padding: '20px 18px',
                textAlign: 'left',
              }}
            >
              <p style={{ margin: 0, fontSize: font.size.base, fontWeight: font.weight.semibold, color: color.ink }}>
                Reabrir para corrigir?
              </p>
              <p style={{ margin: '8px 0 16px', fontSize: font.size.sm, lineHeight: font.leading.relaxed, color: color.muted }}>
                Suas respostas continuam salvas. Ao reenviar, nossa IA monta um novo Blueprint e
                você recebe outra mensagem no WhatsApp.
              </p>
              <div style={{ display: 'grid', gap: '10px' }}>
                <Button variant="secondary" full onClick={reopenForEdit}>
                  Reabrir e corrigir
                </Button>
                <Button variant="ghost" full onClick={() => setConfirmando(false)}>
                  Deixar como está
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmando(true)}>
              Preciso corrigir alguma resposta
            </Button>
          )}
        </div>
      </Reveal>
    </ScreenShell>
  )
}
