/**
 * Campos do Construtor de Mentoria — ponto único de import.
 *
 *   import { FieldRenderer } from '../fields/index.js'
 *
 * Dono: AGENTE F. Ver docs/ARQUITETURA_MENTORIA.md §9.
 *
 * Contrato destes componentes:
 * - São PUROS: não conhecem o store, não leem localStorage, não fazem fetch.
 *   Recebem `value` e devolvem `onChange(valor)` — nada mais.
 * - Nenhum texto de pergunta nasce aqui: tudo vem de `schema/questions.js`.
 * - O valor emitido é exatamente o que `schema/payload.js` espera ler.
 *
 * Na prática só `FieldRenderer` precisa ser importado: ele resolve o tipo.
 * Os demais estão expostos para o painel de revisão e para testes.
 */

export { FieldRenderer, RENDERER_COPY, default as default } from './FieldRenderer.jsx'
export { AudienceCards, AUDIENCE_COPY } from './AudienceCards.jsx'
export { Repeater, REPEATER_COPY } from './Repeater.jsx'
export { ProductCards } from './ProductCards.jsx'
export { PhoneField } from './PhoneField.jsx'
export { EscapeToggle, ESCAPE_COPY } from './EscapeToggle.jsx'
