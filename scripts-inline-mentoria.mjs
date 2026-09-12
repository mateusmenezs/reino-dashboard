/**
 * Costura o build avulso num único arquivo HTML: CSS e JS embutidos, mais o
 * bloco de configuração em tempo de execução no topo, para a URL do webhook
 * ser editada sem rebuildar.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const DIR = 'dist-mentoria'
const html = readFileSync(`${DIR}/mentoria.html`, 'utf8')
const css = readFileSync(`${DIR}/app.css`, 'utf8')
const js = readFileSync(`${DIR}/app.js`, 'utf8')

const CONFIG_BLOCK = `    <script>
      /* ====================================================================
         CONFIGURAÇÃO — edite APENAS as linhas abaixo.
         Depois de salvar, suba este arquivo. Não precisa compilar nada.
         ==================================================================== */
      window.__MENTORIA_CONFIG__ = {
        // Cole aqui a Production URL do Webhook node do n8n (método POST).
        WEBHOOK_URL: '',

        // Opcional: token do Header Auth do n8n. Deixe vazio se não usar.
        WEBHOOK_TOKEN: '',

        // Tempo máximo de espera do envio, em milissegundos.
        WEBHOOK_TIMEOUT_MS: 12000,

        // Modo evento (hoje apenas informativo; não bloqueia etapas).
        EVENT_MODE: false,
        CURRENT_EVENT_STEP: 0,
      }
      /* ================= fim da configuração ============================= */
    </script>
`

let out = html
  .replace(/\s*<link rel="stylesheet"[^>]*href="[^"]*app\.css"[^>]*>/, '')
  .replace(/\s*<script type="module"[^>]*src="[^"]*app\.js"[^>]*><\/script>/, '')
  .replace('</head>', `  <style>\n${css}\n    </style>\n${CONFIG_BLOCK}  </head>`)
  /* O bundle vai como módulo em data URI, não como texto dentro da tag: assim
     nenhuma sequência do código (como "</script" ou "<!--") pode encerrar o
     script cedo ou virar comentário HTML. Custa ~33% de tamanho em base64 e
     elimina de vez a classe inteira de erro de parsing. */
  .replace(
    '</body>',
    `    <script type="module" src="data:text/javascript;base64,${Buffer.from(js, 'utf8').toString('base64')}"></script>\n  </body>`,
  )

mkdirSync('entrega', { recursive: true })
writeFileSync('entrega/index.html', out)
const kb = (Buffer.byteLength(out) / 1024).toFixed(0)
console.log(`entrega/index.html — ${kb} KB (um arquivo, sem dependências externas)`)
