/**
 * Design tokens — fonte única de verdade visual do Construtor de Mentoria.
 *
 * Por que tokens em JS e não CSS custom properties?
 * O dashboard antigo (`src/index.css`) tem seletores de elemento agressivos
 * (`body`, `input`, `select`) com `outline: none`, fundo navy e `font-size: 14px`.
 * Estilo inline (que estes tokens alimentam) tem especificidade 1,0,0,0 e vence
 * qualquer um deles sem `!important` e sem depender de ordem de import.
 *
 * Regra de uso: NENHUM valor de cor/raio/sombra literal nos componentes.
 * Tudo sai daqui.
 *
 * Contraste: todos os pares usados em texto foram medidos (WCAG 2.1 relative
 * luminance). Os valores estão anotados ao lado de cada cor. Mínimo aceito: 4.5:1.
 */

/* ------------------------------------------------------------------ cores */

export const color = {
  /* Tinta / texto -------------------------------------------------- */
  ink: '#0A1B33',        // 17.25:1 sobre branco · 15.94:1 sobre bg  — títulos e corpo
  inkSoft: '#22344F',    // 11.28:1 sobre branco — subtítulos fortes
  muted: '#55647A',      //  6.02:1 sobre branco ·  5.56:1 sobre bg — helper, legendas
  placeholder: '#667790',//  4.56:1 sobre branco — SÓ placeholder (nunca conteúdo real)
  onDark: '#FFFFFF',     // 17.25:1 sobre navy
  onDarkMuted: '#C6D2E4',// 11.05:1 sobre navy

  /* Ação ------------------------------------------------------------ */
  // #2F6BFF é a cor da marca. Branco sobre ela dá 4.4988:1 — reprova AA por
  // 0.0012. Por isso ela é usada em elementos NÃO textuais (anel de foco, barra
  // de progresso, borda de seleção, pontos) e as variantes abaixo carregam texto.
  action: '#2F6BFF',
  actionStrong: '#2358D9',  // branco sobre ela: 6.05:1 — fundo de botão primário
  actionDeep: '#1E4FCC',    // branco sobre ela: 6.90:1 — estado :active do primário
  actionText: '#1F4FD8',    //  6.63:1 sobre branco · 5.81:1 sobre actionTint — texto/ícone azul
  actionSoft: '#7EA6FF',    //  7.22:1 sobre navy — apoio, só decorativo no claro
  actionTint: '#EAF0FF',    // superfície azul clara
  actionTintStrong: '#DCE6FF',

  /* Superfícies ----------------------------------------------------- */
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F9FC',
  surfaceSunken: '#EFF3F9',
  navy: '#0A1B33',
  navySoft: '#0F2947',

  /* Bordas (não textuais — contraste 3:1 não se aplica a divisórias) - */
  border: '#E3E8F0',
  borderStrong: '#C8D2E0',   // borda de controle interativo (1.53:1 vs branco)
  borderFocus: '#2F6BFF',

  /* Semânticas ------------------------------------------------------ */
  success: '#0F6B45',      // 6.54:1 sobre branco · 5.93:1 sobre successBg
  successBg: '#E9F7F0',
  successBorder: '#BFE5D3',
  danger: '#B42318',       // 6.57:1 sobre branco · 6.05:1 sobre dangerBg
  dangerBg: '#FEF3F2',
  dangerBorder: '#F5C8C3',
  warning: '#7A5200',      // 6.92:1 sobre branco
  warningBg: '#FFF8E8',
  warningBorder: '#F0DCA8',

  /* Estados --------------------------------------------------------- */
  disabledBg: '#E7ECF3',
  disabledText: '#6E7C90',
  disabledBorder: '#DCE3ED',

  transparent: 'transparent',
}

/* -------------------------------------------------------------- gradientes */
/* Gradientes DISCRETOS: variação máxima de ~8% de luminância. */

export const gradient = {
  action: `linear-gradient(180deg, ${'#2C65F2'} 0%, ${color.actionStrong} 100%)`,
  actionPressed: `linear-gradient(180deg, ${color.actionStrong} 0%, ${color.actionDeep} 100%)`,
  progress: `linear-gradient(90deg, ${color.action} 0%, ${color.actionSoft} 100%)`,
  navy: `linear-gradient(160deg, ${color.navySoft} 0%, ${color.navy} 100%)`,
  page: `linear-gradient(180deg, ${color.surface} 0%, ${color.bg} 100%)`,
  tint: `linear-gradient(180deg, ${color.surface} 0%, ${color.actionTint} 100%)`,
}

/* ------------------------------------------------------------------ raios */

export const radius = {
  xs: '8px',
  sm: '10px',
  md: '12px',
  lg: '14px',
  xl: '16px',
  xxl: '20px',
  pill: '9999px',
}

/* ---------------------------------------------------------------- sombras */
/* Extremamente sutis: nada acima de 12% de opacidade, cor derivada do navy. */

export const shadow = {
  none: 'none',
  xs: '0 1px 2px rgba(10, 27, 51, 0.05)',
  sm: '0 1px 2px rgba(10, 27, 51, 0.05), 0 2px 8px rgba(10, 27, 51, 0.04)',
  md: '0 2px 4px rgba(10, 27, 51, 0.04), 0 8px 24px rgba(10, 27, 51, 0.06)',
  lifted: '0 1px 2px rgba(10, 27, 51, 0.06), 0 12px 32px rgba(10, 27, 51, 0.08)',
  bar: '0 -1px 0 rgba(10, 27, 51, 0.06), 0 -8px 24px rgba(10, 27, 51, 0.05)',
  /* Anel de foco: 3px de halo azul. Substitui o `outline: none` global. */
  focus: `0 0 0 3px rgba(47, 107, 255, 0.28)`,
  focusDanger: `0 0 0 3px rgba(180, 35, 24, 0.24)`,
  focusOnDark: `0 0 0 3px rgba(126, 166, 255, 0.45)`,
  insetSelected: `inset 0 0 0 2px ${color.action}`,
}

/* ------------------------------------------------------------- movimento */
/* Faixa contratada: 150–220ms. Nada acima disso. */

export const duration = {
  instant: 0,
  fast: 150,
  base: 180,
  slow: 220,
}

export const easing = {
  standard: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
}

export const motion = {
  /** deslocamento do Reveal — 8px, conforme direção visual */
  revealDistance: 8,
  press: 'scale(0.98)',
  transition: (props = 'all', ms = duration.fast) =>
    props
      .split(',')
      .map((p) => `${p.trim()} ${ms}ms ${easing.standard}`)
      .join(', '),
}

/* ------------------------------------------------------------ tipografia */

export const font = {
  family:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  size: {
    xs: '12px',
    sm: '13px',
    base: '15px',
    /** 16px é o piso de qualquer campo de texto — abaixo disso o Safari iOS
     *  aplica zoom automático ao focar e destrói o layout. */
    input: '16px',
    md: '16px',
    lg: '17px',
    xl: '20px',
    display: '24px',
    displayLg: '28px',
    displayXl: '32px',
  },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  leading: { tight: 1.2, snug: 1.32, normal: 1.5, relaxed: 1.6 },
  tracking: { tight: '-0.02em', snug: '-0.01em', normal: '0', wide: '0.06em' },
}

/* -------------------------------------------------------------- controles */

export const control = {
  /** WCAG 2.5.5 / diretriz Apple: nada clicável abaixo disso. */
  touchMin: 44,
  heightSm: 44,
  heightMd: 48,
  heightLg: 56,
  inputHeight: 52,
  textareaLineHeight: 26,
  iconButton: 44,
}

export const space = {
  '0': '0px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '32px',
  '8': '40px',
  '9': '48px',
}

export const layout = {
  maxWidth: '640px',
  gutter: '16px',
  z: { base: 1, sticky: 30, overlay: 60 },
  safeBottom: 'env(safe-area-inset-bottom)',
}

const tokens = {
  color,
  gradient,
  radius,
  shadow,
  duration,
  easing,
  motion,
  font,
  control,
  space,
  layout,
}

export default tokens
