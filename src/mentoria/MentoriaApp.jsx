/**
 * MentoriaApp.jsx — raiz do Construtor de Mentoria com IA.
 * Dono: AGENTE E. Ver docs/ARQUITETURA_MENTORIA.md §10.
 *
 * Responsabilidades desta camada (e só estas):
 *   1. montar <BriefingProvider> dentro de `.mentoria-root` e importar o CSS
 *      isolado UMA única vez;
 *   2. traduzir `nav.phase` + `screenPhase` em uma tela;
 *   3. o que toda troca de tela exige: rolar ao topo, mover o foco para o <h1>
 *      e anunciar a mudança em `aria-live`;
 *   4. não deixar um erro de render de um campo derrubar a palestra inteira.
 *
 * O que esta camada NÃO faz: validar, salvar, enviar ou disparar analytics de
 * navegação — tudo isso é do store (Agente B), e duplicar aqui geraria evento
 * dobrado no funil.
 *
 * Layout: a página inteira rola no <body>. NENHUM ancestral da <BottomBar> tem
 * `overflow: hidden/auto` — é essa a condição para o CTA sticky continuar
 * acessível com o teclado do iOS aberto.
 */

import React, { Component, useEffect, useRef } from 'react'

import './mentoria.css'

import { BriefingProvider, useBriefing } from './state/store.jsx'
import { Button, color, font, layout, srOnly } from './ui/index.js'
import {
  ErrorScreen,
  Identify,
  Review,
  StepIntro,
  StepOutro,
  StepScreen,
  Success,
  Welcome,
} from './screens/index.js'

const PAGE_TITLE = 'Crie sua Mentoria com IA · Reino'
const TITLE_ID = 'm-screen-title'

/* ------------------------------------------------------------------ */
/* Rede de segurança                                                   */
/* ------------------------------------------------------------------ */

/**
 * Um campo que quebra não pode levar o briefing junto. As respostas já estão
 * no localStorage: recarregar devolve a pessoa ao ponto exato.
 */
class ScreenBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    try {
      if (typeof console !== 'undefined' && console.error) {
        console.error('[mentoria] falha ao renderizar a tela', error)
      }
    } catch (_e) {
      /* noop */
    }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          padding: '64px 16px',
          boxSizing: 'border-box',
          fontFamily: font.family,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: font.size.displayLg,
            fontWeight: font.weight.bold,
            letterSpacing: font.tracking.tight,
            lineHeight: font.leading.tight,
            color: color.ink,
          }}
        >
          Esta tela travou.
        </h1>
        <p
          style={{
            margin: '14px 0 24px',
            fontSize: font.size.base,
            lineHeight: font.leading.relaxed,
            color: color.muted,
          }}
        >
          Suas respostas continuam salvas neste aparelho. Recarregue a página: você volta
          exatamente ao ponto em que estava.
        </p>
        <Button
          variant="primary"
          full
          onClick={() => {
            if (typeof window !== 'undefined') window.location.reload()
          }}
        >
          RECARREGAR
        </Button>
      </div>
    )
  }
}

/* ------------------------------------------------------------------ */
/* Rota interna                                                        */
/* ------------------------------------------------------------------ */

function screenFor(phase, screenPhase) {
  if (phase === 'identify') return Identify
  if (phase === 'review') return Review
  if (phase === 'success') return Success
  if (phase === 'error') return ErrorScreen
  if (phase === 'steps') {
    if (screenPhase === 'intro') return StepIntro
    if (screenPhase === 'outro') return StepOutro
    return StepScreen
  }
  return Welcome
}

/** Texto curto anunciado em `aria-live` a cada troca de tela. */
function announcementFor({ phase, screenPhase, step, screenIndex, screenCount, pct }) {
  if (phase === 'identify') return 'Seus dados de contato.'
  if (phase === 'review') return `Revisão final. ${pct}% preenchido.`
  if (phase === 'success') return 'Briefing enviado com sucesso.'
  if (phase === 'error') return 'Não foi possível enviar o briefing.'
  if (phase === 'steps' && step) {
    if (screenPhase === 'intro') return `${step.kicker}. ${step.title}. Abertura.`
    if (screenPhase === 'outro') return `${step.kicker} concluída.`
    return `${step.kicker}. Tela ${screenIndex + 1} de ${screenCount}. ${pct}% preenchido.`
  }
  return 'Início do construtor de mentoria.'
}

function Router() {
  const { nav, screenPhase, currentStep, visibleScreens, progress } = useBriefing()

  const Screen = screenFor(nav.phase, screenPhase)
  const routeKey = `${nav.phase}:${nav.stepIndex}:${nav.screenIndex}`
  const lastRouteRef = useRef(null)

  const announcement = announcementFor({
    phase: nav.phase,
    screenPhase,
    step: currentStep,
    screenIndex: nav.screenIndex,
    screenCount: visibleScreens.length,
    pct: progress.pct,
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.title = PAGE_TITLE
  }, [])

  /**
   * Troca de tela: topo + foco no título.
   * O guarda por `routeKey` garante que o foco só se mova quando a rota muda
   * de verdade — nunca durante a digitação, e nunca duas vezes no StrictMode.
   */
  useEffect(() => {
    const previous = lastRouteRef.current
    lastRouteRef.current = routeKey
    if (previous === null || previous === routeKey) return
    if (typeof window === 'undefined') return

    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    } catch (_e) {
      window.scrollTo(0, 0)
    }

    const title = document.getElementById(TITLE_ID)
    if (title && typeof title.focus === 'function') {
      try {
        title.focus({ preventScroll: true })
      } catch (_e) {
        title.focus()
      }
    }
  }, [routeKey])

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      <p aria-live="polite" role="status" style={srOnly}>
        {announcement}
      </p>

      <ScreenBoundary key={`boundary:${nav.phase}`}>
        <Screen key={routeKey} />
      </ScreenBoundary>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Raiz                                                                */
/* ------------------------------------------------------------------ */

export default function MentoriaApp() {
  return (
    <div className="mentoria-root">
      <BriefingProvider>
        <Router />
      </BriefingProvider>
    </div>
  )
}

export { PAGE_TITLE }
