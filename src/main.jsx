import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

/**
 * Roteamento mínimo, sem dependência de router.
 * - "/"          → Dashboard de eventos (app original, intocado)
 * - "/mentoria"  → Construtor de Mentoria com IA (evento "Crie Sua Mentoria em 1 Dia")
 *
 * O split por lazy() garante que quem abre o dashboard não baixa o bundle do
 * construtor — e vice-versa. Isso importa: 20 pessoas abrindo pelo 4G da sala.
 */
const isMentoriaRoute = () => {
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '/mentoria' || path.startsWith('/mentoria/')
}

const Dashboard = lazy(() => import('./App.jsx'))
const MentoriaApp = lazy(() => import('./mentoria/MentoriaApp.jsx'))

const mentoria = isMentoriaRoute()

// O CSS global do dashboard pinta o body de azul-marinho. O construtor tem
// direção visual própria (clara), então marcamos o body antes do primeiro paint.
if (mentoria) document.body.classList.add('mentoria-page')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div className="boot-fallback" aria-hidden="true" />}>
      {mentoria ? <MentoriaApp /> : <Dashboard />}
    </Suspense>
  </React.StrictMode>,
)
