/**
 * screens/index.js — ponto único de import das telas.
 * Dono: AGENTE E.
 */

export { default as Welcome } from './Welcome.jsx'
export { default as Identify } from './Identify.jsx'
export { default as StepIntro } from './StepIntro.jsx'
export { default as StepScreen } from './StepScreen.jsx'
export { default as StepOutro } from './StepOutro.jsx'
export { default as Review } from './Review.jsx'
export { default as Success } from './Success.jsx'
export { default as ErrorScreen } from './ErrorScreen.jsx'

export { FlowChain, FlowSteps } from './Diagrams.jsx'
export {
  ScreenShell,
  BarRow,
  BarHint,
  Eyebrow,
  Body,
  Note,
  focusField,
  fieldAnchor,
  findResumePoint,
  prefersReducedMotion,
  titleCase,
  wrapCta,
} from './Layout.jsx'
