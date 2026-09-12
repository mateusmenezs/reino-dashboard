# Construtor de Mentoria com IA — Contrato de Arquitetura

> Documento normativo. Todo agente/desenvolvedor implementa **contra este contrato**.
> Stack existente: Vite 5 + React 18 + Tailwind v4 + deploy Vercel. **Sem novas dependências.**

## 1. Isolamento em relação ao dashboard

- O dashboard atual (`src/App.jsx`, tema navy/gold) **não pode ser alterado**.
- A aplicação nova vive em `src/mentoria/**` e é servida na rota `/mentoria`.
- `src/main.jsx` decide a rota por `location.pathname`.
- CSS do dashboard (`src/index.css`) tem estilos globais agressivos (`body`, `input`, `select`).
  Por isso o app de mentoria monta dentro de `.mentoria-root` e **todo** estilo dele é escrito
  em `src/mentoria/mentoria.css` com escopo `.mentoria-root ...` ou via classes utilitárias Tailwind
  com valores explícitos. Nenhum estilo do dashboard pode vazar.

## 2. Propriedade de arquivos (não editar arquivo de outro dono)

| Dono | Arquivos |
|---|---|
| Tech Lead | `src/main.jsx`, `src/mentoria/mentoria.css`, `index.html` |
| A — Schema | `src/mentoria/schema/questions.js`, `schema/payload.js`, `schema/options.js` |
| B — Estado | `src/mentoria/config/env.js`, `state/*.js`, `analytics/*.js` |
| C — Webhook | `src/mentoria/integration/*.js`, `docs/WEBHOOK_N8N.md`, `.env.example` |
| D — Design System | `src/mentoria/ui/*.jsx` |
| E — Telas | `src/mentoria/MentoriaApp.jsx`, `src/mentoria/screens/*.jsx` |
| F — Campos | `src/mentoria/fields/*.jsx` |

## 3. Schema de pergunta (dono: A)

```js
/** @typedef {'text'|'textarea'|'radio'|'select'|'multiselect'|'audience-cards'|'repeater'|'steps-repeater'|'product-cards'|'phone'|'email'} FieldType */

export const STEPS = [
  {
    id: 'lastro',                 // 'lastro'|'persona'|'transformacao'|'metodo'|'produto'|'entrega'
    index: 1,                     // 1..6
    title: 'SEU LASTRO',
    kicker: 'Etapa 1 de 6',
    intro: { title: 'Todo grande método começa com uma história.', body: '…' },
    outro: { badge: 'Lastro identificado', body: '…' },
    screens: [                    // sub-telas: 1/3, 2/3, 3/3
      {
        id: 'lastro-conhecimento',
        label: 'Seu conhecimento',
        sectionTitle: null,       // separador visual opcional
        sectionBody: null,
        fields: [ /* Field[] */ ],
      },
    ],
  },
]
```

`Field`:

```js
{
  id: 'lastro_forca',            // chave semântica estável (snake_case) = chave de resposta
  number: 1,                     // número exibido (1..37) ou null
  type: 'textarea',
  label: 'No que você é realmente bom?',
  helper: 'Pense em algo que você sabe fazer bem…',
  placeholder: '',
  required: true,
  minLength: 20,                 // só textarea/text; 0 = sem mínimo
  maxLength: 1200,
  rows: 4,
  options: [{ value: 'ate_4_semanas', label: 'Até 4 semanas' }],   // radio/select/multiselect
  otherOption: { value: 'outro', placeholderFieldId: 'x_outro' },  // opcional
  escape: { id: 'lastro_terceiros_ausente', label: 'Ainda não gerei resultados para terceiros.' },
  aiFallback: 'Ainda não sei — quero que a IA recomende.',         // texto da opção de delegar à IA
  visibleIf: (answers) => true,  // lógica condicional — pura, sem efeitos
  requiredIf: (answers) => true, // obrigatoriedade condicional (default = required)
  payloadPath: 'lastro.forca',   // caminho no JSON do webhook
  max: 5, min: 0,                // repeater
}
```

Regras:
- Toda `escape`/`aiFallback` marcada **desabilita a obrigatoriedade** do campo e grava `true` na chave da escape.
- `id` é imutável: é o que a IA no n8n vai ler. Nunca renomear depois do evento.
- Nenhum componente pode hardcodar texto de pergunta: tudo vem daqui.

API exportada por `schema/questions.js`:
`STEPS`, `ALL_FIELDS` (array achatado), `FIELD_BY_ID` (map), `TOTAL_QUESTIONS`,
`getVisibleFields(screen, answers)`, `getVisibleScreens(step, answers)`.

## 4. Estado (dono: B)

`src/mentoria/state/store.jsx` exporta `<BriefingProvider>` + `useBriefing()`:

```js
const {
  answers,            // { [fieldId]: value }
  setAnswer,          // (id, value) => void   (autosave debounce 400ms)
  setAnswers,         // (patch) => void
  identity,           // { name, whatsapp, email }
  session,            // { session_id, submission_id, started_at, user_agent }
  progress,           // { pct, perStep: {lastro: 0..1, …}, completedSteps: [] }
  nav,                // { stepIndex, screenIndex, phase: 'welcome'|'identify'|'steps'|'review'|'success'|'error' }
  goTo, next, back,   // navegação
  submission,         // { status: 'idle'|'sending'|'success'|'error', error, attempts, sent_at }
  submit, retry,      // ações
  resetAll,           // limpa tudo (com confirmação na UI)
  saveState,          // 'idle'|'saving'|'saved'
} = useBriefing()
```

Persistência: `localStorage` chave `reino.mentoria.v1`, com `schema_version`, gravação
debounced, tolerante a quota/modo privado (try/catch, degrada para memória).
Restaurar **sempre** ao abrir. Nunca apagar resposta ao voltar de etapa.
`session_id` e `submission_id` gerados uma única vez por sessão (crypto.randomUUID com fallback).

`src/mentoria/config/env.js`:
```js
export const CONFIG = {
  WEBHOOK_URL: import.meta.env.VITE_N8N_WEBHOOK_URL || '',
  WEBHOOK_TIMEOUT_MS: Number(import.meta.env.VITE_N8N_TIMEOUT_MS || 15000),
  WEBHOOK_TOKEN: import.meta.env.VITE_N8N_WEBHOOK_TOKEN || '',   // opcional, header
  EVENT_MODE: import.meta.env.VITE_EVENT_MODE === 'true',
  CURRENT_EVENT_STEP: Number(import.meta.env.VITE_CURRENT_EVENT_STEP || 0), // 0 = livre
  SCHEMA_VERSION: '1.0',
  DEBUG: import.meta.env.DEV,
}
```
**EVENT_MODE não bloqueia etapas agora** — só expõe o valor e um hook `useEventStep()` pronto pra futuro.

`src/mentoria/analytics/track.js`: `track(event, props)` com fila em memória +
`window.__mentoriaEvents` para inspeção. Eventos: `form_started`, `step_started`, `step_completed`,
`autosave`, `review_opened`, `submission_started`, `submission_success`, `submission_error`.

## 5. Validação (dono: B, consumida por E/F)

`src/mentoria/state/validation.js`:
- `validateField(field, answers) -> null | { message }`
- `validateScreen(screen, answers) -> { ok, errors: {fieldId: message}, firstErrorId }`
- `validateAll(answers, identity) -> { ok, errors, firstErrorId, stepIndex, screenIndex }`
- Telefone BR: máscara `(11) 91234-5678`, aceita 10/11 dígitos, DDD válido; normaliza p/ `+5511912345678`.
- E-mail: validação pragmática.
- Mensagens humanas, nunca "campo obrigatório".

## 6. Webhook (dono: C)

`src/mentoria/integration/webhook.js`:
```js
sendBriefing(payload, { signal, timeoutMs }) -> Promise<{ ok, status, body }>
```
- `POST` JSON, header `Content-Type: application/json`, `X-Idempotency-Key: <submission_id>`,
  e `Authorization: Bearer <token>` somente se `CONFIG.WEBHOOK_TOKEN` existir.
- Timeout via `AbortController`. Retry **apenas** manual (botão) ou automático **1x** em erro de rede,
  sempre com o **mesmo** `submission_id`.
- Nunca embutir credencial no código. Sem URL → erro claro de configuração.
- `docs/WEBHOOK_N8N.md`: como configurar no n8n, payload de exemplo, idempotência, teste local.

## 7. Payload (dono: A — `schema/payload.js`)

`buildPayload({ answers, identity, session, progress }) -> object` no formato:

```jsonc
// ESQUELETO REAL, gerado por buildPayload() com respostas vazias.
// A forma é sempre esta: ausência vira "" / [] / false, nunca null.
// O exemplo PREENCHIDO, campo a campo, vive em docs/WEBHOOK_N8N.md §5 —
// aquele é o documento que o n8n consome; este aqui é o contrato de forma.
{
  "meta": {
    "session_id": "",
    "submission_id": "",
    "submitted_at": "2026-09-12T04:28:52.649Z",
    "version": "1.0",
    "event_mode": false,
    "client": {
      "user_agent": "Node.js/22",
      "locale": "en-US",
      "timezone": "UTC",
      "viewport": ""
    }
  },
  "participant": {
    "name": "",
    "whatsapp": "",
    "whatsapp_display": "",
    "email": ""
  },
  "lastro": {
    "forca": "",
    "maior_resultado_proprio": "",
    "melhor_resultado_terceiros": "",
    "melhor_resultado_terceiros_ausente": false,
    "narrativa": {
      "antes": "",
      "dificuldade": "",
      "tentativas_falhas": "",
      "virada": "",
      "novas_acoes": "",
      "resultado_gerado": "",
      "repeticao": "",
      "repeticao_ausente": false
    }
  },
  "persona": {
    "quem_deseja_resultado": "",
    "publicos": [],
    "publicos_descritos": [],
    "publico_escolhido": "",
    "publico_escolhido_descricao": "",
    "publico_escolhido_origem": "indefinido",
    "delegar_escolha_ia": true,
    "maior_score": "",
    "maior_score_total": 0,
    "maior_score_empate": [],
    "tipo_cliente": "",
    "tipo_cliente_label": "",
    "pf": {
      "perfil": "",
      "faixa_renda": "",
      "faixa_renda_label": "",
      "faixa_renda_outro": ""
    },
    "pj": {
      "segmento": "",
      "faixa_faturamento": "",
      "faixa_faturamento_label": "",
      "faixa_faturamento_outro": ""
    },
    "dor_principal": "",
    "desejo_principal": "",
    "tentativas_anteriores": "",
    "por_que_falham": ""
  },
  "transformacao": {
    "ponto_a": "",
    "ponto_b": "",
    "prazo_estimado": "",
    "prazo_estimado_label": "",
    "evidencias_resultado": ""
  },
  "metodo": {
    "erros_comuns": [],
    "por_que_falham": "",
    "o_que_precisa_ser_diferente": "",
    "passos": [],
    "passos_delegados_ia": false,
    "tem_nome": false,
    "nome": ""
  },
  "produto": {
    "modelo": "",
    "modelo_label": "",
    "duracao_acompanhamento": "",
    "duracao_acompanhamento_label": "",
    "carga_horaria_semanal": "",
    "carga_horaria_semanal_label": "",
    "entregas_indispensaveis": ""
  },
  "entrega": {
    "briefing_necessario": "",
    "tem_niveis": "",
    "niveis_descricao": "",
    "frequencia_hot_seat": "",
    "frequencia_hot_seat_label": "",
    "suporte_entre_encontros": [],
    "suporte_entre_encontros_labels": [],
    "contexto_adicional": ""
  },
  "progress": {
    "completion_pct": 0,
    "answered_questions": 0,
    "total_questions": 33,
    "started_at": "",
    "duration_seconds": 0,
    "ai_delegations": []
  }
}
```

Regras do payload:
- Strings sempre `trim()`; ausência = `""` (nunca `null`/`undefined`); listas vazias = `[]`.
- Enums em snake_case estável + `*_label` quando o rótulo humano ajudar a IA.
- Sem labels visuais desnecessários, sem HTML, sem chaves dinâmicas.
- `ai_delegations` lista onde o participante pediu recomendação da IA (13 regras).
- `persona.publico_escolhido` só contém um público REALMENTE descrito, ou `""`.
  Invariante: `publico_escolhido === "" ⟺ delegar_escolha_ia ⟺ "persona.escolha" em ai_delegations`.
  `publico_escolhido_origem` explica qual dos 5 caminhos produziu o valor.
- `maior_score` ignora público sem descrição; empate no topo vai em `maior_score_empate`.
- Escape de ausência marcada zera o texto correspondente no payload (o texto
  continua no estado, para a pessoa não perder o que escreveu ao desmarcar).
- Todo texto é limitado defensivamente a 4000 caracteres, para que estado
  restaurado ou adulterado não estoure o prompt da IA.

## 8. UI (dono: D) — `src/mentoria/ui/`

Primitivas (todas mobile-first, sem hover-dependência, foco visível, `aria-*` correto):
`Button`, `Card`, `SelectableCard`, `ProgressBar`, `StepHeader`, `FieldShell` (label+helper+erro),
`TextArea`, `TextInput`, `RadioGroup`, `CheckboxRow`, `Chip`, `RatingScale` (1–5, touch ≥44px),
`Badge`, `Reveal` (fade/slide sutil), `Spinner`, `SaveIndicator`, `Toast`.

Direção visual: azul-marinho profundo `#0A1B33`, azul sofisticado `#2F6BFF`/`#7EA6FF`,
cinza claro `#F4F6FA`, branco `#FFFFFF`, gradientes discretos, sombras sutis, raio 12–16px,
tipografia system-ui com tracking apertado nos títulos. Contraste AA. Sem emoji excessivo.

Acessibilidade obrigatória: `<label for>` real, `aria-describedby` no helper, `aria-invalid`,
`role="alert"` nas mensagens de erro, foco programático no primeiro erro, `prefers-reduced-motion`.

## 9. Campos (dono: F) — `src/mentoria/fields/`

`FieldRenderer.jsx` exporta `<FieldRenderer field={} value={} error={} onChange={} answers={} />`
com registry por `type`. Componentes especiais:
- `AudienceCards` (Públicos A/B/C + 3 notas 1–5 + score X/15 + selo "Maior potencial")
- `Repeater` (erros comuns / passos do método, adicionar/remover, reordenar não é necessário)
- `ProductCards` (3 modelos selecionáveis + opção "ainda não sei")
- `PhoneInput` (máscara BR), `EmailInput`
- Suporte a `escape`/`aiFallback` desabilitando o campo sem travar avanço.

## 10. Telas (dono: E) — `src/mentoria/screens/`

`Welcome`, `Identify`, `StepIntro`, `StepScreen`, `StepOutro`, `Review`, `Success`, `ErrorScreen`.
`MentoriaApp.jsx` compõe provider + rota interna + transições.

Regras de fluxo:
- Máx. ~3–4 perguntas por sub-tela. Progresso sempre visível (`Etapa X de 6` + barra + %).
- Voltar nunca perde resposta. Reabrir a página restaura no ponto exato.
- CTA fixo no rodapé com `env(safe-area-inset-bottom)`; teclado iOS não pode cobrir o CTA.
- Erro: rolar até o campo + mensagem humana. Nunca `alert()`.
- Submissão: botão desabilita no 1º clique, loading state, guarda de double-submit no store.

## 11. Padrão de qualidade

Entrega só é aceita com nota ≥ 9,5 do time de supervisão (UX/mobile, robustez técnica,
design premium, qualidade de dados para IA, acessibilidade/performance).
