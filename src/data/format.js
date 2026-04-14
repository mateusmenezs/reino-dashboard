export const brl = (v) => v != null
  ? new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 }).format(v)
  : '—'

export const brlCents = (v) => v != null
  ? new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:2 }).format(v)
  : '—'

export const pct = (v) => v != null ? `${v.toFixed(1)}%` : '—'

export const roi = (v) => v != null ? `${v.toFixed(1)}x` : '—'

export const num = (v) => v != null ? v.toLocaleString('pt-BR') : '—'
