import { useState, useMemo } from 'react'
import { EVENTS } from './data/events.js'
import { calcMetrics } from './data/metrics.js'
import { brl, brlCents, pct, roi, num } from './data/format.js'

const TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'comparativo', label: 'Comparativo' },
  { id: 'funil', label: 'Funil' },
  { id: 'insights', label: 'Insights' },
  { id: 'projecao', label: 'Projeção' },
]

export default function App() {
  const [tab, setTab] = useState('resumo')
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-[color:var(--navy)]/90 border-b border-[color:var(--gold)]/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-[color:var(--gold)] text-xl font-semibold tracking-wide">Reino · Dashboard</div>
            <div className="text-xs text-[#a8b3c4] mt-0.5">Funil de Eventos · Performance & ROI</div>
          </div>
          <nav className="flex flex-wrap gap-1">
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {tab === 'resumo' && <TabResumo />}
        {tab === 'comparativo' && <TabComparativo />}
        {tab === 'funil' && <TabFunil />}
        {tab === 'insights' && <TabInsights />}
        {tab === 'projecao' && <TabProjecao />}
      </main>

      <footer className="max-w-7xl mx-auto px-4 md:px-8 py-8 text-xs text-[#555]">
        Reino · Mateus Menezes · Dados atualizados manualmente
      </footer>
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'final')     return <span className="badge badge-final">✓ Final</span>
  if (status === 'parcial')   return <span className="badge badge-parcial">⚙ Parcial</span>
  if (status === 'andamento') return <span className="badge badge-andamento">● Em andamento</span>
  return null
}

/* ---------- TAB 1 · RESUMO ---------- */
function TabResumo() {
  const finals = EVENTS.filter(e => e.status === 'final')
  const totInvest   = finals.reduce((s,e) => s + (e.investimento || 0), 0)
  const totImediata = finals.reduce((s,e) => s + (e.receitaImediata || 0), 0)
  const totContrato = finals.reduce((s,e) => s + (e.receitaContrato || 0), 0)
  const rois = finals.map(e => calcMetrics(e).roiContrato).filter(v => v != null)
  const avgRoiContrato = rois.length ? rois.reduce((s,v) => s+v, 0) / rois.length : null

  const cards = [
    { label: 'Total investido',         value: brl(totInvest) },
    { label: 'Receita imediata total',  value: brl(totImediata) },
    { label: 'Receita contrato total',  value: brl(totContrato) },
    { label: 'ROI médio (contrato)',    value: roi(avgRoiContrato) },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map(c => (
          <div key={c.label} className="card">
            <div className="card-label">{c.label}</div>
            <div className="card-value">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="reino">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Status</th>
              <th className="text-right">Invest</th>
              <th className="text-right">Ingressos</th>
              <th className="text-right">VIPs</th>
              <th className="text-right">% VIP</th>
              <th className="text-right">Mentorias</th>
              <th className="text-right">ROI imed.</th>
              <th className="text-right">ROI contr.</th>
            </tr>
          </thead>
          <tbody>
            {EVENTS.map(e => {
              const m = calcMetrics(e)
              return (
                <tr key={e.id}>
                  <td className="font-medium">{e.label}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td className="text-right">{brl(e.investimento)}</td>
                  <td className="text-right">{num(e.ingressos)}</td>
                  <td className="text-right">{num(e.vips)}</td>
                  <td className="text-right">{pct(m.pctVip)}</td>
                  <td className="text-right">{num(e.mentorias)}</td>
                  <td className="text-right">{roi(m.roiImediato)}</td>
                  <td className="text-right">{roi(m.roiContrato)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- TAB 2 · COMPARATIVO ---------- */
const GROUPS = [
  { id: 'trafego', icon: '📊', label: 'Tráfego', rows: [
    { key: 'investimento', label: 'Investimento', fmt: brl, betterLow: true },
    { key: 'impressoes',   label: 'Impressões',   fmt: num },
    { key: 'alcance',      label: 'Alcance',      fmt: num },
    { key: 'cpm',          label: 'CPM',          fmt: brlCents, betterLow: true },
  ]},
  { id: 'cliques', icon: '🖱️', label: 'Cliques', rows: [
    { key: 'cliques',  label: 'Cliques',  fmt: num },
    { key: 'ctr',      label: 'CTR %',    fmt: pct },
    { key: 'cpc',      label: 'CPC',      fmt: brlCents, betterLow: true },
    { key: 'viewPage', label: 'View Page', fmt: num },
  ]},
  { id: 'leads', icon: '👤', label: 'Leads', rows: [
    { key: 'leads', label: 'Leads', fmt: num },
    { key: 'cpl',   label: 'CPL',   fmt: brlCents, betterLow: true },
  ]},
  { id: 'checkout', icon: '🛒', label: 'Checkout', rows: [
    { key: 'ic',      label: 'Initiate Checkout', fmt: num },
    { key: 'custoIc', label: 'Custo IC',          fmt: brlCents, betterLow: true },
  ]},
  { id: 'ingressos', icon: '🎟️', label: 'Ingressos', rows: [
    { key: 'ingressos',      label: 'Ingressos',       fmt: num },
    { key: 'vips',           label: 'VIPs',            fmt: num },
    { key: 'pctVip',         label: '% VIP',           fmt: pct, derived: true },
    { key: 'fatIngressos',   label: 'Fat. ingressos',  fmt: brl },
    { key: 'ticketMedioIng', label: 'Ticket médio ing.', fmt: brlCents, derived: true },
    { key: 'custoIngresso',  label: 'Custo / ingresso', fmt: brlCents, derived: true, betterLow: true },
  ]},
  { id: 'mentorias', icon: '💰', label: 'Mentorias', rows: [
    { key: 'mentorias',         label: 'Mentorias',              fmt: num },
    { key: 'receitaImediata',   label: 'Receita imediata',       fmt: brl },
    { key: 'receitaContrato',   label: 'Receita contrato',       fmt: brl },
    { key: 'ticketMedImediato', label: 'Ticket médio imediato',  fmt: brl, derived: true },
    { key: 'ticketMedContrato', label: 'Ticket médio contrato',  fmt: brl, derived: true },
    { key: 'taxaIngMent',       label: 'Taxa ingresso→mentoria', fmt: pct, derived: true },
  ]},
  { id: 'roi', icon: '🚀', label: 'ROI', rows: [
    { key: 'roiImediato',   label: 'ROI imediato',    fmt: roi, derived: true },
    { key: 'roiContrato',   label: 'ROI contrato',    fmt: roi, derived: true },
    { key: 'receitaPorIng', label: 'Receita / ingresso', fmt: brlCents, derived: true },
  ]},
]

function getVal(e, m, row) {
  return row.derived ? m[row.key] : e[row.key]
}

function TabComparativo() {
  const [open, setOpen] = useState(() => Object.fromEntries(GROUPS.map(g => [g.id, true])))
  const metricsByEv = useMemo(() => EVENTS.map(e => calcMetrics(e)), [])

  return (
    <div className="card !p-0 overflow-x-auto">
      <table className="reino">
        <thead>
          <tr>
            <th className="sticky left-0 bg-[color:var(--dark)] min-w-[220px]">Métrica</th>
            {EVENTS.map(e => (
              <th key={e.id} className="text-right whitespace-nowrap">
                <div>{e.id}</div>
                <div className="text-[10px] font-normal text-[#a8b3c4] normal-case tracking-normal">{e.cidade}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map(g => (
            <GroupRows key={g.id} group={g} open={open[g.id]} onToggle={() => setOpen(o => ({...o, [g.id]: !o[g.id]}))} metricsByEv={metricsByEv} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupRows({ group, open, onToggle, metricsByEv }) {
  return (
    <>
      <tr className="cursor-pointer select-none" onClick={onToggle}>
        <td colSpan={EVENTS.length + 1} className="!bg-[color:var(--mid)]/40 font-semibold text-[color:var(--gold)]">
          <span className="inline-block w-4">{open ? '▾' : '▸'}</span> {group.icon} {group.label}
        </td>
      </tr>
      {open && group.rows.map(row => {
        const values = EVENTS.map((e, i) => getVal(e, metricsByEv[i], row))
        const valid = values.filter(v => v != null)
        const best  = valid.length ? (row.betterLow ? Math.min(...valid) : Math.max(...valid)) : null
        const worst = valid.length ? (row.betterLow ? Math.max(...valid) : Math.min(...valid)) : null
        return (
          <tr key={row.key}>
            <td className="sticky left-0 bg-[color:var(--dark)] text-[#cdd3dd]">{row.label}</td>
            {values.map((v, i) => {
              let cls = ''
              if (v == null) cls = 'cell-null'
              else if (valid.length > 1 && v === best) cls = 'cell-best'
              else if (valid.length > 1 && v === worst) cls = 'cell-worst'
              return <td key={i} className={`text-right tabular-nums ${cls}`}>{row.fmt(v)}</td>
            })}
          </tr>
        )
      })}
    </>
  )
}

/* ---------- TAB 3 · FUNIL VISUAL ---------- */
const FUNIL_STEPS = [
  { key: 'impressoes', label: 'Impressões' },
  { key: 'cliques',    label: 'Cliques' },
  { key: 'viewPage',   label: 'View Page' },
  { key: 'leads',      label: 'Leads' },
  { key: 'ic',         label: 'IC' },
  { key: 'ingressos',  label: 'Ingressos' },
  { key: 'mentorias',  label: 'Mentorias' },
]

function TabFunil() {
  const [id, setId] = useState(EVENTS[0].id)
  const ev = EVENTS.find(e => e.id === id)
  const maxByStep = useMemo(() => {
    const mx = {}
    FUNIL_STEPS.forEach(s => {
      mx[s.key] = Math.max(...EVENTS.map(e => e[s.key] || 0))
    })
    return mx
  }, [])
  const m = calcMetrics(ev)

  const phaseRates = [
    { label: 'Clique→VP',        value: m.taxaCliqueVP },
    { label: 'VP→Lead',          value: m.taxaVPLead },
    { label: 'Lead→IC',          value: m.taxaLeadIc },
    { label: 'IC→Ingresso',      value: m.taxaIcIngresso },
    { label: 'Ingresso→Mentoria',value: m.taxaIngMent },
  ]

  const pctOrNull = (a, b) => (a != null && b && b > 0) ? (a / b) * 100 : null
  const cumRates = [
    { label: 'Clique→Ingresso', value: pctOrNull(ev.ingressos, ev.cliques) },
    { label: 'VP→Ingresso',     value: pctOrNull(ev.ingressos, ev.viewPage) },
    { label: 'Lead→Ingresso',   value: pctOrNull(ev.ingressos, ev.leads) },
    { label: 'IC→Ingresso',     value: pctOrNull(ev.ingressos, ev.ic) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-[#a8b3c4]">Evento:</label>
        <select value={id} onChange={e => setId(e.target.value)}>
          {EVENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <StatusBadge status={ev.status} />
      </div>

      <div className="card">
        <div className="space-y-1">
          {FUNIL_STEPS.map((s, i) => {
            const v = ev[s.key]
            const mx = maxByStep[s.key] || 1
            const w = v != null ? Math.max(2, (v / mx) * 100) : 0
            const prev = i > 0 ? ev[FUNIL_STEPS[i-1].key] : null
            const rate = i > 0 ? pctOrNull(v, prev) : null
            return (
              <div key={s.key}>
                {i > 0 && (
                  <div className="flex justify-center text-[11px] text-[#a8b3c4] py-1">
                    ↓ {rate != null ? `${rate.toFixed(1)}%` : '—'}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-32 text-xs text-[#cdd3dd] shrink-0">{s.label}</div>
                  <div className="flex-1 bg-[color:var(--mid)]/40 rounded-md h-8 relative overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all"
                      style={{ width: `${w}%`, background: 'linear-gradient(90deg, var(--gold) 0%, #e6c670 100%)' }}
                    />
                    <div className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-[color:var(--navy)] mix-blend-normal">
                      {v != null ? num(v) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-[color:var(--gold)] mb-2">Taxas fase a fase</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {phaseRates.map(r => (
            <div key={r.label} className="card !p-3">
              <div className="text-[10px] uppercase text-[#a8b3c4]">{r.label}</div>
              <div className="text-lg font-bold text-[color:var(--gold)] mt-1">{pct(r.value)}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-[color:var(--gold)] mb-2">Conversão acumulada → ingresso</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {cumRates.map(r => (
            <div key={r.label} className="card !p-3">
              <div className="text-[10px] uppercase text-[#a8b3c4]">{r.label}</div>
              <div className="text-lg font-bold text-[color:var(--gold)] mt-1">{pct(r.value)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- TAB 4 · INSIGHTS ---------- */
function TabInsights() {
  const [id, setId] = useState(EVENTS.find(e => e.status !== 'final')?.id || EVENTS[EVENTS.length - 1].id)
  const ev = EVENTS.find(e => e.id === id)
  const m = calcMetrics(ev)

  // Médias entre eventos finais (benchmark histórico)
  const finals = EVENTS.filter(e => e.status === 'final')
  const avg = (arr) => arr.filter(v => v != null).length
    ? arr.filter(v => v != null).reduce((s,v) => s+v, 0) / arr.filter(v => v != null).length
    : null
  const finalMetrics = finals.map(calcMetrics)
  const bench = {
    cpl:              avg(finals.map(e => e.cpl)),
    custoIc:          avg(finals.map(e => e.custoIc)),
    ctr:              avg(finals.map(e => e.ctr)),
    cpm:              avg(finals.map(e => e.cpm)),
    custoIngresso:    avg(finalMetrics.map(x => x.custoIngresso)),
    taxaLeadIc:       avg(finalMetrics.map(x => x.taxaLeadIc)),
    taxaIcIngresso:   avg(finalMetrics.map(x => x.taxaIcIngresso)),
    taxaCliqueVP:     avg(finalMetrics.map(x => x.taxaCliqueVP)),
    taxaVPLead:       avg(finalMetrics.map(x => x.taxaVPLead)),
    taxaLeadIngresso: avg(finalMetrics.map(x => x.taxaLeadIngresso)),
  }

  const pctOrNull = (a, b) => (a != null && b && b > 0) ? (a / b) * 100 : null

  // MÉTRICAS RELACIONAIS
  const relacionais = [
    { label: 'Clique → Lead',     value: pctOrNull(ev.leads, ev.cliques),    desc: 'Do clique no anúncio até virar lead' },
    { label: 'Clique → IC',       value: pctOrNull(ev.ic, ev.cliques),       desc: 'Do clique até iniciar checkout' },
    { label: 'Clique → Ingresso', value: pctOrNull(ev.ingressos, ev.cliques),desc: 'Do clique até comprar ingresso' },
    { label: 'Lead → IC',         value: m.taxaLeadIc,                       desc: 'Do lead até iniciar checkout' },
    { label: 'Lead → Ingresso',   value: m.taxaLeadIngresso,                 desc: 'Do lead até comprar ingresso' },
    { label: 'IC → Ingresso',     value: m.taxaIcIngresso,                   desc: 'Do checkout até fechar compra' },
  ]

  // COMPARATIVO vs MÉDIA histórica
  const compareRows = [
    { label: 'CPM',                 cur: ev.cpm,     bench: bench.cpm,     fmt: brlCents, lower: true },
    { label: 'CTR',                 cur: ev.ctr,     bench: bench.ctr,     fmt: (v) => v != null ? `${v.toFixed(2)}%` : '—', lower: false },
    { label: 'CPL',                 cur: ev.cpl,     bench: bench.cpl,     fmt: brlCents, lower: true },
    { label: 'Custo IC',            cur: ev.custoIc, bench: bench.custoIc, fmt: brlCents, lower: true },
    { label: 'Custo / ingresso',    cur: m.custoIngresso, bench: bench.custoIngresso, fmt: brlCents, lower: true },
    { label: 'Taxa Clique→VP',      cur: m.taxaCliqueVP, bench: bench.taxaCliqueVP, fmt: pct, lower: false },
    { label: 'Taxa VP→Lead',        cur: m.taxaVPLead,   bench: bench.taxaVPLead,   fmt: pct, lower: false },
    { label: 'Taxa Lead→IC',        cur: m.taxaLeadIc,   bench: bench.taxaLeadIc,   fmt: pct, lower: false },
    { label: 'Taxa IC→Ingresso',    cur: m.taxaIcIngresso, bench: bench.taxaIcIngresso, fmt: pct, lower: false },
    { label: 'Taxa Lead→Ingresso',  cur: m.taxaLeadIngresso, bench: bench.taxaLeadIngresso, fmt: pct, lower: false },
  ]

  // SUGESTÕES AUTOMÁTICAS (regras)
  const tips = []
  const pctDiff = (cur, ref) => (cur != null && ref && ref > 0) ? ((cur - ref) / ref) * 100 : null

  compareRows.forEach(r => {
    const d = pctDiff(r.cur, r.bench)
    if (d == null) return
    const worse = r.lower ? d > 15 : d < -15
    const better = r.lower ? d < -15 : d > 15
    if (worse) {
      if (r.label === 'CPM') tips.push({ tipo: 'ruim', txt: `CPM está ${d.toFixed(0)}% acima da média — público muito disputado. Teste criativos novos ou segmentação mais ampla.` })
      if (r.label === 'CTR') tips.push({ tipo: 'ruim', txt: `CTR ${Math.abs(d).toFixed(0)}% abaixo da média — criativo não está atraindo clique. Troque imagem/hook do anúncio.` })
      if (r.label === 'CPL') tips.push({ tipo: 'ruim', txt: `CPL ${d.toFixed(0)}% acima da média — landing page ou oferta do lead magnet está fraca. Teste nova headline.` })
      if (r.label === 'Custo IC') tips.push({ tipo: 'ruim', txt: `Custo por IC ${d.toFixed(0)}% acima da média — nurturing até checkout precisa melhorar (emails/WhatsApp).` })
      if (r.label === 'Custo / ingresso') tips.push({ tipo: 'ruim', txt: `Custo por ingresso ${d.toFixed(0)}% acima da média — revise funil de checkout e urgência na página.` })
      if (r.label.startsWith('Taxa')) tips.push({ tipo: 'ruim', txt: `${r.label} ${Math.abs(d).toFixed(0)}% abaixo da média — gargalo nessa etapa, investigar.` })
    }
    if (better) {
      if (r.label === 'CPL' || r.label === 'Custo IC' || r.label === 'Custo / ingresso' || r.label === 'CPM')
        tips.push({ tipo: 'bom', txt: `${r.label} ${Math.abs(d).toFixed(0)}% melhor que a média — escale o investimento.` })
      if (r.label === 'CTR' || r.label.startsWith('Taxa'))
        tips.push({ tipo: 'bom', txt: `${r.label} ${d.toFixed(0)}% acima da média — mantenha o padrão.` })
    }
  })
  if (!tips.length) tips.push({ tipo: 'neutro', txt: 'Métricas dentro do padrão histórico — sem gargalos evidentes.' })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-[#a8b3c4]">Evento analisado:</label>
        <select value={id} onChange={e => setId(e.target.value)}>
          {EVENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <StatusBadge status={ev.status} />
      </div>

      {/* MÉTRICAS RELACIONAIS */}
      <section>
        <div className="text-xs uppercase tracking-wider text-[color:var(--gold)] mb-2">📐 Métricas relacionais</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {relacionais.map(r => (
            <div key={r.label} className="card">
              <div className="card-label">{r.label}</div>
              <div className="card-value">{pct(r.value)}</div>
              <div className="text-xs text-[#a8b3c4] mt-1">{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARATIVO vs MÉDIA */}
      <section>
        <div className="text-xs uppercase tracking-wider text-[color:var(--gold)] mb-2">⚖️ Comparativo vs média histórica</div>
        <div className="card !p-0 overflow-x-auto">
          <table className="reino">
            <thead>
              <tr>
                <th>Métrica</th>
                <th className="text-right">Evento atual</th>
                <th className="text-right">Média histórica</th>
                <th className="text-right">Variação</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map(r => {
                const d = pctDiff(r.cur, r.bench)
                const good = d != null && (r.lower ? d < 0 : d > 0)
                const bad  = d != null && (r.lower ? d > 0 : d < 0)
                return (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td className="text-right tabular-nums">{r.fmt(r.cur)}</td>
                    <td className="text-right tabular-nums text-[#a8b3c4]">{r.fmt(r.bench)}</td>
                    <td className={`text-right tabular-nums ${good ? 'cell-best' : bad ? 'cell-worst' : 'cell-null'}`}>
                      {d != null ? `${d > 0 ? '+' : ''}${d.toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* SUGESTÕES */}
      <section>
        <div className="text-xs uppercase tracking-wider text-[color:var(--gold)] mb-2">💡 Sugestões de melhoria</div>
        <div className="space-y-2">
          {tips.map((t, i) => (
            <div key={i} className={`card !py-3 flex items-start gap-3 ${
              t.tipo === 'ruim' ? 'border-l-4 !border-l-[color:var(--reino-red)]' :
              t.tipo === 'bom'  ? 'border-l-4 !border-l-[color:var(--reino-green)]' :
              'border-l-4 !border-l-[color:var(--gold)]'
            }`}>
              <div className="text-lg">
                {t.tipo === 'ruim' ? '⚠️' : t.tipo === 'bom' ? '✅' : 'ℹ️'}
              </div>
              <div className="text-sm leading-relaxed">{t.txt}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROJEÇÃO DE GASTO DIÁRIO */}
      <TabGastoDiario ev={ev} bench={bench} m={m} />
    </div>
  )
}

function TabGastoDiario({ ev, bench, m }) {
  const [meta, setMeta] = useState(30)
  const [diasRestantes, setDiasRestantes] = useState(30)

  // Custo por ingresso do evento atual (se houver) senão benchmark
  const custoIng = m.custoIngresso || bench.custoIngresso
  const ingressosAtuais = ev.ingressos || 0
  const faltam = Math.max(0, meta - ingressosAtuais)
  const investNecessario = (custoIng && faltam > 0) ? faltam * custoIng : 0
  const gastoDiario = (investNecessario && diasRestantes > 0) ? investNecessario / diasRestantes : null
  const gastoAtual = ev.investimento || 0
  const totalProjetado = gastoAtual + investNecessario

  return (
    <section>
      <div className="text-xs uppercase tracking-wider text-[color:var(--gold)] mb-2">🎯 Quanto gastar por dia pra bater a meta</div>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div className="card">
          <div className="card-label">Meta de ingressos</div>
          <input type="number" value={meta} onChange={e => setMeta(Number(e.target.value) || 0)} className="w-full mt-2" />
        </div>
        <div className="card">
          <div className="card-label">Dias restantes até o evento</div>
          <input type="number" value={diasRestantes} onChange={e => setDiasRestantes(Number(e.target.value) || 0)} className="w-full mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="card-label">Ingressos já vendidos</div>
          <div className="card-value">{num(ingressosAtuais)}</div>
        </div>
        <div className="card">
          <div className="card-label">Faltam vender</div>
          <div className="card-value">{num(faltam)}</div>
        </div>
        <div className="card">
          <div className="card-label">Custo / ingresso usado</div>
          <div className="card-value">{brlCents(custoIng)}</div>
          <div className="text-xs text-[#a8b3c4] mt-1">{m.custoIngresso ? 'Do evento atual' : 'Média histórica'}</div>
        </div>
        <div className="card">
          <div className="card-label">Investimento necessário</div>
          <div className="card-value">{brl(investNecessario)}</div>
        </div>
        <div className="card md:col-span-2">
          <div className="card-label">📅 Gasto diário sugerido</div>
          <div className="card-value text-2xl">{brl(gastoDiario)}</div>
          <div className="text-xs text-[#a8b3c4] mt-1">Por dia, durante os {diasRestantes} dias restantes</div>
        </div>
        <div className="card md:col-span-2">
          <div className="card-label">Investimento total projetado</div>
          <div className="card-value">{brl(totalProjetado)}</div>
          <div className="text-xs text-[#a8b3c4] mt-1">Atual ({brl(gastoAtual)}) + adicional ({brl(investNecessario)})</div>
        </div>
      </div>
    </section>
  )
}

/* ---------- TAB 5 · PROJEÇÃO ---------- */
function TabProjecao() {
  const finals = EVENTS.filter(e => e.status === 'final')
  const [refId, setRefId] = useState(finals[0]?.id || EVENTS[0].id)
  const [meta, setMeta] = useState(50000)
  const refEv = EVENTS.find(e => e.id === refId) || EVENTS[0]
  const refMetrics = calcMetrics(refEv)
  const [ticket, setTicket] = useState(refMetrics.ticketMedImediato || 10000)
  const [dataEvento, setDataEvento] = useState('')

  // Recompute ticket when refId changes
  const handleRef = (v) => {
    setRefId(v)
    const newRef = EVENTS.find(e => e.id === v)
    const nm = calcMetrics(newRef)
    if (nm.ticketMedImediato) setTicket(Math.round(nm.ticketMedImediato))
  }

  const taxaIngMent   = refMetrics.taxaIngMent   // %
  const taxaIcIng     = refMetrics.taxaIcIngresso // %
  const custoIcHist   = refEv.custoIc

  const mentoriasNec = (meta > 0 && ticket > 0) ? meta / ticket : null
  const ingressosNec = (mentoriasNec != null && taxaIngMent && taxaIngMent > 0)
    ? mentoriasNec / (taxaIngMent / 100) : null
  const icsNec = (ingressosNec != null && taxaIcIng && taxaIcIng > 0)
    ? ingressosNec / (taxaIcIng / 100) : null

  // What's already done — use current in-progress event (first non-final)
  const atual = EVENTS.find(e => e.status !== 'final') || refEv
  const icsAtuais = atual.ic || 0
  const ingressosAtuais = atual.ingressos || 0
  const invAtual = atual.investimento || 0

  const icsFaltando = icsNec != null ? Math.max(0, icsNec - icsAtuais) : null
  const budgetAdicional = (icsFaltando != null && custoIcHist) ? icsFaltando * custoIcHist : null
  const invProjetado = budgetAdicional != null ? invAtual + budgetAdicional : null
  const fatIngProj = atual.fatIngressos || refEv.fatIngressos || 0
  const roiProjetado = invProjetado && invProjetado > 0 ? (meta + fatIngProj) / invProjetado : null

  const ingressosFaltando = ingressosNec != null ? Math.max(0, ingressosNec - ingressosAtuais) : null

  const diasFaltando = useMemo(() => {
    if (!dataEvento) return null
    const d = new Date(dataEvento)
    const now = new Date()
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24))
  }, [dataEvento])

  const out = [
    { label: 'Taxa ingresso→mentoria (ref)',  value: pct(taxaIngMent) },
    { label: 'Taxa IC→ingresso (ref)',        value: pct(taxaIcIng) },
    { label: 'Mentorias necessárias',         value: mentoriasNec != null ? mentoriasNec.toFixed(1) : '—' },
    { label: 'Ingressos necessários',         value: ingressosNec != null ? Math.ceil(ingressosNec).toString() : '—' },
    { label: 'ICs necessários',               value: icsNec != null ? Math.ceil(icsNec).toString() : '—' },
    { label: 'Budget adicional estimado',     value: brl(budgetAdicional) },
    { label: 'Investimento total projetado',  value: brl(invProjetado) },
    { label: 'ROI projetado',                 value: roi(roiProjetado) },
  ]

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-3">
        <div className="card">
          <div className="card-label">Meta receita imediata (R$)</div>
          <input
            type="number"
            value={meta}
            onChange={e => setMeta(Number(e.target.value) || 0)}
            className="w-full mt-2"
          />
        </div>
        <div className="card">
          <div className="card-label">Evento de referência</div>
          <select value={refId} onChange={e => handleRef(e.target.value)} className="w-full mt-2">
            {finals.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        <div className="card">
          <div className="card-label">Ticket médio esperado (R$)</div>
          <input
            type="number"
            value={ticket}
            onChange={e => setTicket(Number(e.target.value) || 0)}
            className="w-full mt-2"
          />
        </div>
        <div className="card">
          <div className="card-label">Data do evento</div>
          <input
            type="date"
            value={dataEvento}
            onChange={e => setDataEvento(e.target.value)}
            className="w-full mt-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {out.map(o => (
          <div key={o.label} className="card">
            <div className="card-label">{o.label}</div>
            <div className="card-value">{o.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="card">
          <div className="card-label">Faltam</div>
          <div className="card-value">
            {ingressosFaltando != null ? `${Math.ceil(ingressosFaltando)} ingressos` : '—'}
          </div>
          <div className="text-xs text-[#a8b3c4] mt-1">Referência: {atual.label}</div>
        </div>
        <div className="card">
          <div className="card-label">Prazo</div>
          <div className="card-value">
            {diasFaltando != null ? `${diasFaltando} dias` : '—'}
          </div>
          <div className="text-xs text-[#a8b3c4] mt-1">Selecione uma data para calcular</div>
        </div>
      </div>
    </div>
  )
}
