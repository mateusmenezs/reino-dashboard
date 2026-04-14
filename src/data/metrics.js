export function calcMetrics(e) {
  const safe = (num, den) => (den && den > 0 && num != null) ? num / den : null
  const pct  = (num, den) => safe(num, den) != null ? safe(num, den) * 100 : null

  return {
    pctVip:            pct(e.vips, e.ingressos),
    custoIngresso:     safe(e.investimento, e.ingressos),
    ticketMedioIng:    safe(e.fatIngressos, e.ingressos),
    taxaIcIngresso:    pct(e.ingressos, e.ic),
    taxaLeadIngresso:  pct(e.ingressos, e.leads),
    taxaLeadIc:        pct(e.ic, e.leads),
    taxaCliqueVP:      pct(e.viewPage, e.cliques),
    taxaVPLead:        pct(e.leads, e.viewPage),
    taxaIngMent:       pct(e.mentorias, e.ingressos),
    ticketMedImediato: safe(e.receitaImediata, e.mentorias),
    ticketMedContrato: safe(e.receitaContrato, e.mentorias),
    roiImediato:       safe((e.receitaImediata || 0) + (e.fatIngressos || 0), e.investimento),
    roiContrato:       safe((e.receitaContrato || 0) + (e.fatIngressos || 0), e.investimento),
    receitaPorIng:     safe(e.receitaImediata, e.ingressos),
  }
}
