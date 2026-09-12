/**
 * Design tokens — fonte única de verdade visual do Construtor de Mentoria.
 *
 * Por que tokens em JS e não CSS custom properties?
 * O dashboard antigo (`src/index.css`) tem seletores de elemento agressivos
 * (`body`, `input`, `select`) com `outline: none`, fundo navy e `font-size: 14px`.
 * Estilo inline (que estes tokens alimentam) tem especificidade 1,0,0,0 e vence
 * qualquer um deles sem `!important` e sem depender de ordem de import.
 *
 * `mentoria.css` NÃO duplica estes valores. Lá só existe o que precisa existir
 * em CSS (reset de formulário, `:focus-visible`, `::placeholder`, keyframes) e
 * cada um desses poucos literais está anotado com o token que ele espelha.
 *
 * Regra de uso: NENHUM valor de cor/raio/sombra literal nos componentes.
 * Tudo sai daqui.
 *
 * DIREÇÃO (Governante + Sábio + Tecnologia)
 * -----------------------------------------
 * 1. O MARINHO é superfície, não só tinta: ele carrega o CTA primário, a
 *    abertura de etapa, os diagramas e o início da barra de progresso.
 * 2. O AZUL `#2F6BFF` é reservado a SELEÇÃO, FOCO e PROGRESSO. Ele nunca é
 *    fundo de botão — era isso que fazia o app parecer Bootstrap.
 * 3. A base continua clara: cinza `#F4F6FA` e branco. O marinho é pontual.
 *
 * Contraste: todos os pares de texto foram medidos (WCAG 2.1). Mínimo 4.5:1.
 * Bordas de CONTROLE e trilhos seguem 1.4.11 (mínimo 3:1 contra o vizinho).
 */

/* ------------------------------------------------------------------ cores */

export const color = {
  /* Tinta / texto -------------------------------------------------- */
  ink: '#0A1B33',        // 17.25:1 sobre branco · 15.94:1 sobre bg  — títulos e corpo
  inkSoft: '#22344F',    // 11.28:1 sobre branco — subtítulos fortes
  muted: '#55647A',      //  6.02:1 sobre branco ·  5.56:1 sobre bg — helper, legendas
  placeholder: '#667790',//  4.56:1 sobre branco — SÓ placeholder (nunca conteúdo real)
  onDark: '#FFFFFF',     // 17.25:1 sobre navy · 14.70:1 sobre navyRaised
  onDarkMuted: '#C6D2E4',// 11.29:1 sobre navy ·  9.62:1 sobre navyRaised

  /* Ação ------------------------------------------------------------ */
  // #2F6BFF é a cor da marca. Branco sobre ela dá 4.4988:1 — reprova AA por
  // 0.0012. Por isso ela NUNCA carrega texto: é anel de foco, borda de seleção,
  // ponta da barra de progresso e ponto de etapa. Texto azul usa `actionText`.
  action: '#2F6BFF',
  actionStrong: '#2358D9',  // branco sobre ela: 6.05:1 — fundo da nota selecionada
  actionDeep: '#1E4FCC',    // branco sobre ela: 6.90:1 — estado pressionado
  actionText: '#1F4FD8',    //  6.63:1 sobre branco · 5.81:1 sobre actionTint
  actionSoft: '#7EA6FF',    //  7.22:1 sobre navy — texto/realce sobre marinho
  actionTint: '#EAF0FF',    // superfície azul clara
  actionTintStrong: '#DCE6FF',
  selectedBg: '#F6F9FF',    // fundo de linha/cartão selecionado (ink: 16.36:1)

  /* Superfícies ----------------------------------------------------- */
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F9FC',
  surfaceSunken: '#EFF3F9',

  /* Marinho — superfície de autoridade ------------------------------ */
  navy: '#0A1B33',       // base do CTA e das superfícies escuras
  navyRaised: '#0F2947', // topo do gradiente marinho (14.70:1 com branco)
  navyDeep: '#06101F',   // estado pressionado (19.42:1 com branco)
  navyLine: '#24395A',   // divisória/borda DENTRO do marinho (decorativa)

  /* Bordas ---------------------------------------------------------- */
  // `border` é divisória decorativa (1.4.11 não se aplica).
  // `borderStrong` delimita CONTROLE (campo, opção, chip, nota, trilho) e por
  // isso passa de 3:1 contra TODAS as superfícies claras do app:
  //   branco 3.45:1 · bg 3.19:1 · surfaceMuted 3.27:1 · surfaceSunken 3.10:1
  // (era #C8D2E0 = 1.53:1 no branco e 1.41:1 no fundo — reprovava 1.4.11).
  border: '#E3E8F0',
  borderStrong: '#7E8B9F',
  borderFocus: '#2F6BFF',

  /* Semânticas ------------------------------------------------------ */
  success: '#0F6B45',      // 6.54:1 sobre branco · 5.93:1 sobre successBg
  successBg: '#E9F7F0',
  successBorder: '#BFE5D3',
  danger: '#B42318',       // 6.57:1 sobre branco · 6.05:1 sobre dangerBg
  dangerDeep: '#8F1C13',   // :active do botão danger — branco: 9.05:1
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
/* Gradientes DISCRETOS: dois passos, sem viradas de matiz.                  */

export const gradient = {
  /** CTA primário — marinho profundo. Branco: 14.70:1 no topo, 17.25:1 na base. */
  primary: `linear-gradient(180deg, ${color.navyRaised} 0%, ${color.navy} 100%)`,
  primaryPressed: `linear-gradient(180deg, ${color.navy} 0%, ${color.navyDeep} 100%)`,
  /** Superfície marinho (Hero, Surface tone="navy", cabeçalho de diagrama). */
  navy: `linear-gradient(160deg, ${color.navyRaised} 0%, ${color.navy} 100%)`,
  /** Progresso: sai do marinho e chega no azul da marca (3.66:1 sobre o trilho). */
  progress: `linear-gradient(90deg, ${color.navy} 0%, ${color.actionStrong} 60%, ${color.action} 100%)`,
}

/* ------------------------------------------------------------------ raios */
/*
 * REGRA: o raio cresce com a SUPERFÍCIE, nunca com o destaque.
 * Valor ≈ ¼ da menor dimensão do elemento, arredondado para a escala, com
 * teto de 14px em controles e 18px em superfícies que contêm controles.
 *
 *   xs  8px  → marcas ≤ 32px (indicador, badge numérico, quadradinho)
 *   sm 10px  → controles de 44px (botão de ícone, stepper, ponto de etapa)
 *   md 12px  → controles de 48px (Button md)
 *   lg 14px  → controles de largura total / 52–56px (campo, opção, Button lg)
 *   xl 18px  → SUPERFÍCIES que contêm controles (Card, Toast, diagrama, Hero)
 *   pill     → pílulas, nós de diagrama, trilhos e barras
 *
 * Não existe raio maior que 18px: os diagramas (as duas maiores caixas do app)
 * usavam 20px e invertiam a escala — agora acompanham o cartão.
 */

export const radius = {
  xs: '8px',
  sm: '10px',
  md: '12px',
  lg: '14px',
  xl: '18px',
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
  /** Superfície marinho: a sombra é mais profunda porque a peça é pesada. */
  navy: '0 2px 6px rgba(10, 27, 51, 0.14), 0 14px 34px rgba(10, 27, 51, 0.16)',
  bar: '0 -1px 0 rgba(10, 27, 51, 0.06), 0 -8px 24px rgba(10, 27, 51, 0.05)',
  /* Anel de foco em DUAS camadas: 2px da cor da superfície separando o
     controle e 2px de azul SÓLIDO por fora. Substitui o `outline: none`
     global e garante 3:1 contra qualquer vizinho (azul 4.50:1 sobre branco,
     4.16:1 sobre o fundo; sobre o CTA marinho o anel branco faz a separação).
     `mentoria.css` repete EXATAMENTE #2F6BFF no `:focus-visible`. */
  focus: `0 0 0 2px ${color.surface}, 0 0 0 4px ${color.action}`,
  focusDanger: `0 0 0 2px ${color.surface}, 0 0 0 4px ${color.danger}`,
  focusOnDark: `0 0 0 2px ${color.navy}, 0 0 0 4px ${color.actionSoft}`,
  insetSelected: `inset 0 0 0 2px ${color.action}`,
  /** Contorno de controle sobre fundo claro (1.4.11 — 3.03:1 sobre o bg). */
  controlRing: `inset 0 0 0 1px ${color.borderStrong}`,
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
/*
 * ESCALA FECHADA: 8 tamanhos de texto (+16px, que é piso de campo, não estilo).
 * Cada tamanho tem UMA entrelinha e UM tracking — era daí que vinham as 38
 * combinações e as cinco entrelinhas diferentes no mesmo corpo de 13px.
 *
 *   12 → 1.35 / +0.06em (caixa alta)      20 → 1.25 / −0.01em
 *   13 → 1.50 / 0                         24 → 1.18 / −0.02em
 *   15 → 1.55 / 0                         28 → 1.15 / −0.02em
 *   17 → 1.45 / −0.01em                   32 → 1.12 / −0.02em
 *
 * Os três tamanhos de display são FLUIDOS: em 320px o título encolhe sozinho
 * em vez de quebrar em quatro linhas.
 */

export const font = {
  family:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  size: {
    xs: '12px',
    sm: '13px',
    base: '15px',
    /** 16px é o piso de qualquer campo de texto — abaixo disso o Safari iOS
     *  aplica zoom automático ao focar e destrói o layout. Não é estilo de
     *  texto: só existe para campo. */
    input: '16px',
    md: '17px',
    lg: '17px',
    xl: '20px',
    display: 'clamp(21px, 6.4vw, 24px)',
    displayLg: 'clamp(24px, 7.6vw, 28px)',
    displayXl: 'clamp(26px, 8.6vw, 32px)',
  },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  leading: { tight: 1.15, snug: 1.32, normal: 1.5, relaxed: 1.55 },
  tracking: { tight: '-0.02em', snug: '-0.01em', normal: '0', wide: '0.06em' },
}

/**
 * OS 12 ESTILOS NOMEADOS. Use `{...type.body}` em vez de montar
 * tamanho/peso/entrelinha/tracking à mão — é isso que fecha o sistema.
 */
export const type = {
  /** abertura do app (Welcome) */
  displayXl: { fontSize: font.size.displayXl, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.02em' },
  /** abertura de etapa / fim de etapa */
  display: { fontSize: font.size.displayLg, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' },
  /** título de tela com perguntas */
  title: { fontSize: font.size.display, fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.02em' },
  /** título de bloco dentro da tela */
  heading: { fontSize: font.size.xl, fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.01em' },
  /** rótulo de campo, título de cartão */
  subtitle: { fontSize: font.size.lg, fontWeight: 600, lineHeight: 1.45, letterSpacing: '-0.01em' },
  /** primeiro parágrafo de uma tela */
  lead: { fontSize: font.size.lg, fontWeight: 400, lineHeight: 1.45, letterSpacing: '-0.01em' },
  /** corpo padrão */
  body: { fontSize: font.size.base, fontWeight: 400, lineHeight: 1.55, letterSpacing: '0' },
  /** corpo com ênfase (opção marcada, valor de resposta) */
  bodyStrong: { fontSize: font.size.base, fontWeight: 600, lineHeight: 1.55, letterSpacing: '0' },
  /** legenda, ajuda curta, dica do rodapé */
  caption: { fontSize: font.size.sm, fontWeight: 400, lineHeight: 1.5, letterSpacing: '0' },
  /** legenda com ênfase (estado salvo, contador) */
  captionStrong: { fontSize: font.size.sm, fontWeight: 600, lineHeight: 1.5, letterSpacing: '0' },
  /** kicker em caixa alta ("ETAPA 3 DE 6") */
  overline: {
    fontSize: font.size.xs,
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  /** número dentro de marca/contador — tabular para não dançar */
  numeric: { fontSize: font.size.xs, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
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

/* ------------------------------------------------------------ espaçamento */
/*
 * Escala de 4px. `stack` nomeia os únicos saltos verticais permitidos entre
 * blocos — 2, 6, 10, 14, 18, 22, 26 e 36px estão fora da escala e não devem
 * aparecer em margin/padding novos.
 */

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
  /** saltos verticais nomeados (use estes nas telas) */
  stack: {
    /** dentro de um mesmo bloco (rótulo → campo) */
    xs: '8px',
    /** entre elementos irmãos próximos */
    sm: '12px',
    /** entre campos */
    md: '16px',
    /** entre blocos */
    lg: '24px',
    /** entre seções */
    xl: '32px',
    /** respiro de abertura/fechamento de tela */
    xxl: '40px',
  },
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
  type,
  control,
  space,
  layout,
}

export default tokens
