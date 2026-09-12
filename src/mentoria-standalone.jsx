/**
 * Entry da versão AVULSA (arquivo único) do Construtor de Mentoria.
 * Diferente de src/main.jsx, aqui não há roteamento nem dashboard: o HTML
 * gerado por este entry serve o construtor direto na raiz, para hospedagem
 * estática simples (Cloudflare Pages, Netlify, qualquer servidor de arquivos).
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import MentoriaApp from './mentoria/MentoriaApp.jsx'

document.body.classList.add('mentoria-page')
document.title = 'Crie sua Mentoria com IA · Reino'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MentoriaApp />
  </React.StrictMode>,
)
