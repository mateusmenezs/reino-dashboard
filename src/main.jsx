import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'

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

// index.css (Tailwind + tema navy/dourado) é importado DENTRO de App.jsx, não
// aqui: o construtor não usa nenhuma classe utilitária, e mantê-lo global fazia
// o participante baixar ~4,5 KB gzip de estilo que ele nunca aplica.
const Dashboard = lazy(() => import('./App.jsx'))
const MentoriaApp = lazy(() => import('./mentoria/MentoriaApp.jsx'))

const mentoria = isMentoriaRoute()

// O CSS global do dashboard pinta o body de azul-marinho. O construtor tem
// direção visual própria (clara), então marcamos o body antes do primeiro paint.
// O título também é definido aqui, e não dentro do chunk da rota: em 3G ruim o
// chunk só chega ~1,3s depois, e até lá a aba mostraria o nome do dashboard.
if (mentoria) {
  document.body.classList.add('mentoria-page')
  document.title = 'Crie sua Mentoria com IA · Reino'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div className="boot-fallback" aria-hidden="true" />}>
      {mentoria ? <MentoriaApp /> : <Dashboard />}
    </Suspense>
  </React.StrictMode>,
)
