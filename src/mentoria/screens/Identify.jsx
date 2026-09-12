/**
 * Identify.jsx — nome, WhatsApp e e-mail, antes da Etapa 1.
 * Dono: AGENTE E.
 *
 * Por que estes três dados aparecem ANTES das perguntas: o Blueprint gerado
 * pela IA chega pelo WhatsApp. Sem telefone válido, o trabalho da palestra
 * inteira não tem para onde ir. O motivo é dito na tela, sem rodeio.
 *
 * O telefone usa <PhoneField> do Agente F: máscara BR com caret preservado,
 * `type="tel"`, `inputMode="tel"` e `autoComplete="tel"`. O valor guardado é o
 * formatado; `schema/payload.js` normaliza para E.164 no envio.
 */

import React, { useCallback } from 'react'
import { Button, FieldShell, Icon, TextInput, color, font } from '../ui/index.js'
import { PhoneField } from '../fields'
import { useBriefing } from '../state/store.jsx'
import { BarRow, Body, Eyebrow, Note, ScreenShell, focusField } from './Layout.jsx'

export default function Identify() {
  const { identity, setIdentity, errors, back, tryNext } = useBriefing()

  const handleContinue = useCallback(() => {
    const res = tryNext()
    if (!res.ok && res.firstErrorId) focusField(res.firstErrorId)
  }, [tryNext])

  const footer = (
    <BarRow>
      <Button variant="secondary" onClick={back} aria-label="Voltar para a tela inicial">
        Voltar
      </Button>
      <Button variant="primary" full onClick={handleContinue} style={{ flex: '1 1 auto' }}>
        CONTINUAR →
      </Button>
    </BarRow>
  )

  return (
    <ScreenShell footer={footer} padTop={28}>
      <Eyebrow>Antes de começar</Eyebrow>

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
        Para onde enviamos seu Blueprint?
      </h1>

      <Body style={{ marginTop: '12px' }}>
        No fim do evento, nossa IA transforma tudo o que você responder em um Blueprint de mentoria.
        Ele chega pelo WhatsApp — por isso precisamos destes três dados.
      </Body>

      <div style={{ marginTop: '28px', display: 'grid', gap: '22px' }}>
        <div data-field-anchor="name">
          <FieldShell id="name" label="Nome completo" error={errors.name}>
            <TextInput
              value={identity.name || ''}
              onChange={(value) => setIdentity({ name: value })}
              placeholder="Como você quer ser chamado no Blueprint"
              autoComplete="name"
              autoCapitalize="words"
              maxLength={120}
              error={errors.name}
            />
          </FieldShell>
        </div>

        <div data-field-anchor="whatsapp">
          <FieldShell
            id="whatsapp"
            label="WhatsApp com DDD"
            helper="É para este número que o seu Blueprint será enviado."
            error={errors.whatsapp}
          >
            <PhoneField
              id="whatsapp"
              value={identity.whatsapp || ''}
              onChange={(value) => setIdentity({ whatsapp: value })}
              error={errors.whatsapp}
            />
          </FieldShell>
        </div>

        <div data-field-anchor="email">
          <FieldShell
            id="email"
            label="E-mail"
            helper="Usamos como segunda via, caso o WhatsApp falhe."
            error={errors.email}
          >
            <TextInput
              type="email"
              value={identity.email || ''}
              onChange={(value) => setIdentity({ email: value })}
              placeholder="seu@email.com"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={160}
              error={errors.email}
            />
          </FieldShell>
        </div>
      </div>

      <Note icon={<Icon name="info" size={18} />} style={{ marginTop: '24px' }}>
        Seus dados são usados só para entregar o seu Blueprint e falar com você sobre o evento.
      </Note>
    </ScreenShell>
  )
}
