/**
 * StepScreen.jsx — sub-tela de perguntas (`0 <= nav.screenIndex < n`).
 * Dono: AGENTE E.
 *
 * Contrato com o Agente F:
 *   <FieldRenderer field value answers error onChange onEscapeChange />
 *
 * Regras desta tela:
 * - avanço SEMPRE passa por `tryNext()` do store (valida antes de navegar);
 * - erro não vira alert nem lista no topo: rola até o campo, foca e mostra a
 *   mensagem onde ela nasceu;
 * - cada campo é embrulhado em `[data-field-anchor]` para que a rolagem tenha
 *   um alvo estável mesmo que o componente do campo mude por dentro.
 */

import React, { useCallback } from 'react'
import {
  Button,
  Icon,
  ProgressBar,
  Reveal,
  SaveIndicator,
  SectionTitle,
  color,
  font,
  radius,
} from '../ui/index.js'
import { FieldRenderer } from '../fields'
import { getVisibleFields, getScreenPosition } from '../schema/questions.js'
import { useBriefing } from '../state/store.jsx'
import { BarRow, Eyebrow, Note, ScreenShell, focusField } from './Layout.jsx'

export default function StepScreen() {
  const {
    answers,
    setAnswer,
    errors,
    currentStep,
    currentScreen,
    progress,
    saveState,
    storageAvailable,
    back,
    tryNext,
  } = useBriefing()

  const step = currentStep
  const screen = currentScreen

  const handleContinue = useCallback(() => {
    const res = tryNext()
    if (!res.ok && res.firstErrorId) focusField(res.firstErrorId)
  }, [tryNext])

  const handleEscapeChange = useCallback(
    (id, checked) => setAnswer(id, checked),
    [setAnswer],
  )

  if (!step || !screen) return null

  const fields = getVisibleFields(screen, answers)
  const position = getScreenPosition(step, screen, answers)

  const footer = (
    <BarRow>
      <Button variant="secondary" onClick={back} aria-label="Voltar para a tela anterior">
        Voltar
      </Button>
      <Button variant="primary" full onClick={handleContinue} style={{ flex: '1 1 auto' }}>
        CONTINUAR →
      </Button>
    </BarRow>
  )

  return (
    <ScreenShell footer={footer} padTop={22} padBottom={32}>
      <header>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            minHeight: 24,
          }}
        >
          <Eyebrow>{step.kicker}</Eyebrow>
          <SaveIndicator
            state={saveState}
            labels={
              storageAvailable
                ? { saving: 'Salvando…', saved: 'Progresso salvo', idle: '' }
                : { saving: 'Guardando…', saved: 'Só nesta aba', idle: '' }
            }
          />
        </div>

        <h1
          id="m-screen-title"
          tabIndex={-1}
          style={{
            margin: '10px 0 0',
            fontSize: font.size.display,
            fontWeight: font.weight.bold,
            letterSpacing: font.tracking.tight,
            lineHeight: font.leading.tight,
            color: color.ink,
            outline: 'none',
          }}
        >
          {step.title}
        </h1>

        <ProgressBar
          value={progress.pct / 100}
          label={position.label}
          style={{ marginTop: '16px' }}
        />
      </header>

      {!storageAvailable ? (
        <Note icon={<Icon name="alert" size={18} />} tone="warning" style={{ marginTop: '18px' }}>
          Este aparelho não está guardando o progresso. Continue sem fechar a aba até enviar.
        </Note>
      ) : null}

      {screen.sectionTitle ? (
        <Reveal>
          <div
            style={{
              marginTop: '22px',
              padding: '18px',
              borderRadius: radius.xl,
              background: color.actionTint,
              border: `1px solid ${color.actionTintStrong}`,
            }}
          >
            <SectionTitle level={2} title={screen.sectionTitle} />
            {screen.sectionBody ? (
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: font.size.base,
                  lineHeight: font.leading.relaxed,
                  color: color.inkSoft,
                }}
              >
                {screen.sectionBody}
              </p>
            ) : null}
          </div>
        </Reveal>
      ) : null}

      <div style={{ marginTop: '26px', display: 'grid', gap: '30px' }}>
        {fields.map((field) => (
          <div key={field.id} data-field-anchor={field.id}>
            <FieldRenderer
              field={field}
              value={answers[field.id]}
              answers={answers}
              error={errors[field.id]}
              onChange={(value) => setAnswer(field.id, value)}
              onEscapeChange={handleEscapeChange}
            />
          </div>
        ))}
      </div>

      {screen.note ? (
        <Note icon={<Icon name="info" size={18} />} style={{ marginTop: '26px' }}>
          {screen.note}
        </Note>
      ) : null}

    </ScreenShell>
  )
}
