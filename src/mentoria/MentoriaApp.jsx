/* =============================================================================
   PLACEHOLDER — SERÁ SUBSTITUÍDO INTEGRALMENTE PELA ONDA 2 (Agente E).
   Existe só para manter o branch buildável enquanto o time de agentes trabalha.
   ========================================================================== */
import './mentoria.css'

export default function MentoriaApp() {
  return (
    <div className="mentoria-root">
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '96px 20px' }}>
        <p
          style={{
            fontSize: 12,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--m-ink-3)',
          }}
        >
          Reino · Em construção
        </p>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '10px 0 12px',
          }}
        >
          Crie sua Mentoria com IA
        </h1>
        <p style={{ color: 'var(--m-ink-2)' }}>
          Esta experiência está sendo montada. Volte em instantes.
        </p>
      </main>
    </div>
  )
}
