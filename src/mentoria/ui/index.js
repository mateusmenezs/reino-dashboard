/**
 * Design System do Construtor de Mentoria — ponto único de import.
 *
 *   import { Button, FieldShell, TextArea, BottomBar, color } from '../ui/index.js'
 *
 * Regras do DS:
 * - Componentes puramente apresentacionais: não conhecem schema, store nem rotas.
 * - Nenhum estado é comunicado só por :hover — sempre há estado de seleção/foco.
 * - Todo alvo clicável tem no mínimo 44×44px; todo campo de texto tem 16px.
 * - Movimento respeita `prefers-reduced-motion` (resolvido em JS, sem CSS externo).
 */

export { default as tokens } from './tokens.js'
export {
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
} from './tokens.js'

export {
  Button,
  Card,
  SelectableCard,
  Badge,
  Toast,
  Spinner,
  Reveal,
  SaveIndicator,
  Divider,
  SectionTitle,
  Icon,
  Indicator,
  /* utilitários compartilhados — úteis para os agentes E e F */
  useReducedMotion,
  useFocusVisible,
  usePressed,
  composeHandlers,
  transition,
  focusRing,
  srOnly,
  tapReset,
  hiddenControl,
} from './primitives.jsx'

export {
  FieldShell,
  useField,
  TextInput,
  TextArea,
  RadioGroup,
  CheckboxRow,
  RatingScale,
  Chip,
  ChipGroup,
  Stepper,
} from './inputs.jsx'

export {
  ProgressBar,
  StepHeader,
  StepDots,
  BottomBar,
  IconButton,
  useKeyboardOpen,
} from './navigation.jsx'
