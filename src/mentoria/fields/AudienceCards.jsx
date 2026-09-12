/**
 * AudienceCards — o coração da Etapa 2 (pergunta 12).
 *
 * Dono: AGENTE F. Textos vêm de `schema/options.js` (PUBLICOS, CRITERIOS_PUBLICO,
 * ESCALA_PUBLICO) através do próprio `field`. Nada é hardcodado aqui.
 *
 * Três cards (PÚBLICO A / B / C). Só o A é esperado; B e C são opcionais e
 * existem para dar COMPARAÇÃO — é a comparação que gera a recomendação da IA.
 *
 * ── FORMATO DO VALOR ────────────────────────────────────────────────────────
 * {
 *   A: {
 *     descricao: 'mães recém-formadas em nutrição',
 *     capacidade_financeira: 4,        // ← lido por schema/payload.js
 *     velocidade_resultado: 5,
 *     prazer_atender: 5,
 *     scores: { capacidade_financeira: 4, velocidade_resultado: 5, prazer_atender: 5 },
 *   },                                 //   ↑ lido por state/validation.js
 *   B: {...}, C: {...}
 * }
 *
 * As notas aparecem DUAS vezes de propósito. `buildPayload` lê achatado
 * (`entry[criterio.value]`, conforme o typedef de questions.js) e
 * `validation.js` lê aninhado (`entry.scores[c.value]`). Escrever os dois é a
 * única forma de satisfazer os dois donos sem editar arquivo de ninguém — e é
 * barato, porque `scores` é sempre derivado dos valores achatados, nunca o
 * contrário. Chave extra é ignorada pelo payload.
 *
 * ── SELO "MAIOR POTENCIAL" ──────────────────────────────────────────────────
 * Aparece só quando há pelo menos DOIS públicos pontuados (sem comparação o selo
 * não significa nada). EM CASO DE EMPATE, TODOS OS EMPATADOS RECEBEM O SELO —
 * nunca escolhemos um vencedor arbitrário. O selo diz "maior potencial", jamais
 * "esta é a persona certa": a escolha é da pergunta 13, e a recomendação é da IA.
 */

import React, { useCallback, useMemo } from 'react'
import {
  Badge,
  RatingScale,
  Reveal,
  TextArea,
  color,
  font,
  radius,
  shadow,
  srOnly,
} from '../ui/index.js'

/** Microcopy de apoio (o texto das perguntas vem do schema). */
export const AUDIENCE_COPY = Object.freeze({
  optional: 'opcional',
  scoreLabel: (total, maxTotal) => `${total}/${maxTotal}`,
  scoreAria: (audience, total, maxTotal) => `${audience}: ${total} de ${maxTotal} pontos.`,
  scorePending: 'Dê as três notas para fechar a pontuação.',
  low: '1',
  high: '5',
})

const asText = (v) => String(v == null ? '' : v)

/** Leitura tolerante de um público do valor bruto. */
function readEntry(value, id) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const entry = source[id] && typeof source[id] === 'object' ? source[id] : {}
  return entry
}

/** Nota saneada de um critério, aceitando as duas formas (achatada e aninhada). */
function readScore(entry, criterio, scale) {
  const nested = entry.scores && typeof entry.scores === 'object' ? entry.scores : {}
  const n = Number(entry[criterio] != null ? entry[criterio] : nested[criterio])
  if (!Number.isFinite(n)) return 0
  const rounded = Math.round(n)
  if (rounded < (scale.min || 1) || rounded > (scale.max || 5)) return 0
  return rounded
}

/**
 * <AudienceCards value onChange audiences criteria scale />
 *
 * @param {Object} props
 * @param {string} [props.id]              id do contêiner — alvo do foco no 1º erro.
 * @param {Object} [props.value]           Valor atual (ver formato acima).
 * @param {(value: Object) => void} [props.onChange] Convenção do DS: valor primeiro.
 * @param {Array<{value:string,label:string}>} props.audiences   PUBLICOS do schema.
 * @param {Array<{value:string,label:string,question:string}>} props.criteria  CRITERIOS_PUBLICO.
 * @param {{min:number,max:number,maxTotal:number,selo:string}} props.scale     ESCALA_PUBLICO.
 * @param {string[]} [props.requiredAudiences] Ex.: ['A'].
 * @param {number} [props.minLength]       Mínimo de caracteres da descrição.
 * @param {number} [props.maxLength]
 * @param {string} [props.placeholder]
 * @param {boolean} [props.disabled]
 * @param {string} [props.labelledBy]
 * @param {string} [props.describedBy]
 * @param {boolean} [props.invalid]
 */
export function AudienceCards({
  id,
  value,
  onChange,
  audiences = [],
  criteria = [],
  scale = { min: 1, max: 5, maxTotal: 15, selo: 'Maior potencial' },
  requiredAudiences = ['A'],
  maxLength = 0,
  placeholder = '',
  disabled = false,
  labelledBy,
  describedBy,
  invalid = false,
  style,
  ...rest
}) {
  const baseId = id || 'publicos'
  const maxTotal = scale.maxTotal || criteria.length * (scale.max || 5)

  /* ------------------------------------------------ leitura normalizada */
  const rows = useMemo(
    () =>
      audiences.map((audience) => {
        const entry = readEntry(value, audience.value)
        const descricao = asText(entry.descricao)
        const scores = {}
        let total = 0
        for (const criterio of criteria) {
          const n = readScore(entry, criterio.value, scale)
          scores[criterio.value] = n
          total += n
        }
        const described = descricao.trim() !== ''
        return {
          audience,
          descricao,
          scores,
          total,
          described,
          complete: described && criteria.every((c) => scores[c.value] > 0),
        }
      }),
    [audiences, criteria, scale, value],
  )

  /* ----------------------------------------------------- selo de maior */
  const ranked = rows.filter((r) => r.described && r.total > 0)
  const best = ranked.reduce((acc, r) => Math.max(acc, r.total), 0)
  /* comparar exige pelo menos dois concorrentes */
  const showSelo = ranked.length >= 2 && best > 0
  const winners = showSelo ? ranked.filter((r) => r.total === best).map((r) => r.audience.value) : []

  /* --------------------------------------------------------- escritura */
  const write = useCallback(
    (audienceId, patch) => {
      if (!onChange) return
      const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
      const previous = readEntry(value, audienceId)

      const merged = { ...previous, ...patch }
      /* `scores` é sempre DERIVADO das notas achatadas — nunca a fonte. */
      const scores = {}
      for (const criterio of criteria) {
        const n = Number(merged[criterio.value])
        scores[criterio.value] = Number.isFinite(n) ? n : 0
      }

      onChange({
        ...source,
        [audienceId]: {
          ...merged,
          descricao: asText(merged.descricao),
          scores,
        },
      })
    },
    [criteria, onChange, value],
  )

  return (
    <div
      id={baseId}
      tabIndex={-1}
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-disabled={disabled || undefined}
      style={{ display: 'grid', gap: '14px', fontFamily: font.family, outline: 'none', ...style }}
      {...rest}
    >
      {rows.map((row) => {
        const audienceId = row.audience.value
        const cardId = `${baseId}-${audienceId}`
        const textId = `${cardId}-descricao`
        const isOptional = !requiredAudiences.includes(audienceId)
        const isWinner = winners.includes(audienceId)

        return (
          <section
            key={audienceId}
            aria-labelledby={`${cardId}-titulo`}
            style={{
              padding: '16px',
              borderRadius: radius.xl,
              border: `1px solid ${isWinner ? color.action : color.border}`,
              background: isWinner ? color.selectedBg : color.surface,
              boxShadow: isWinner ? shadow.sm : shadow.xs,
              /* borda troca de cor sem mudar espessura: nada "pula" 1px */
              transition: 'none',
            }}
          >
            {/* ---------------------------------------------- cabeçalho */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '10px',
                minHeight: '26px',
              }}
            >
              <span
                id={`${cardId}-titulo`}
                style={{
                  fontSize: font.size.sm,
                  fontWeight: font.weight.bold,
                  letterSpacing: font.tracking.wide,
                  color: color.actionText,
                  textTransform: 'uppercase',
                }}
              >
                {row.audience.label}
                {isOptional ? (
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: font.size.xs,
                      fontWeight: font.weight.medium,
                      letterSpacing: font.tracking.normal,
                      color: color.muted,
                      textTransform: 'none',
                    }}
                  >
                    {AUDIENCE_COPY.optional}
                  </span>
                ) : null}
              </span>

              {isWinner ? <Badge tone="accent">{scale.selo}</Badge> : null}
            </div>

            {/* --------------------------------------------- descrição */}
            {/* o título da seção já mostra "PÚBLICO A" na tela; o <label> real
                existe para o leitor de tela não ouvir um textarea anônimo */}
            <label htmlFor={textId} style={srOnly}>
              {row.audience.label}
            </label>
            <TextArea
              id={textId}
              name={textId}
              rows={2}
              value={row.descricao}
              onChange={(next) => write(audienceId, { descricao: next })}
              placeholder={placeholder}
              maxLength={maxLength > 0 ? maxLength : undefined}
              disabled={disabled}
              describedBy={describedBy}
              invalid={false}
            />

            {/* ------------------------------------------------- notas */}
            {row.described ? (
              <Reveal style={{ marginTop: '14px', display: 'grid', gap: '16px' }}>
                {criteria.map((criterio) => (
                  <RatingScale
                    key={criterio.value}
                    id={`${cardId}-${criterio.value}`}
                    name={`${cardId}-${criterio.value}`}
                    label={`${criterio.label} — ${criterio.question}`}
                    value={row.scores[criterio.value] || undefined}
                    min={scale.min || 1}
                    max={scale.max || 5}
                    lowLabel={AUDIENCE_COPY.low}
                    highLabel={AUDIENCE_COPY.high}
                    disabled={disabled}
                    onChange={(n) => write(audienceId, { [criterio.value]: n })}
                  />
                ))}

                <ScoreMeter
                  id={`${cardId}-score`}
                  label={row.audience.label}
                  total={row.total}
                  maxTotal={maxTotal}
                  complete={row.complete}
                  highlighted={isWinner}
                />
              </Reveal>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

/**
 * Medidor de pontuação X/15. Uma barra fina, sem gráfico — e um `aria-live`
 * discreto para o leitor de tela acompanhar a soma mudando em tempo real.
 */
function ScoreMeter({ id, label, total, maxTotal, complete, highlighted }) {
  const pct = maxTotal > 0 ? Math.max(0, Math.min(100, (total / maxTotal) * 100)) : 0
  return (
    <div id={id}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '8px',
        }}
      >
        <span
          style={{
            fontSize: font.size.sm,
            fontWeight: font.weight.medium,
            color: complete ? color.inkSoft : color.muted,
          }}
        >
          {complete ? ' ' : AUDIENCE_COPY.scorePending}
        </span>
        <span
          aria-hidden="true"
          style={{
            flex: 'none',
            fontSize: font.size.lg,
            fontWeight: font.weight.bold,
            letterSpacing: font.tracking.tight,
            color: highlighted ? color.actionText : color.ink,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {AUDIENCE_COPY.scoreLabel(total, maxTotal)}
        </span>
      </div>

      <div
        aria-hidden="true"
        style={{
          height: '6px',
          borderRadius: radius.pill,
          background: color.surfaceSunken,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: radius.pill,
            background: highlighted ? color.action : color.actionSoft,
            /* só a largura anima: nunca desloca o que está em volta */
            transition: 'width 180ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          }}
        />
      </div>

      <span aria-live="polite" style={srOnly}>
        {AUDIENCE_COPY.scoreAria(label, total, maxTotal)}
      </span>
    </div>
  )
}

export default AudienceCards
