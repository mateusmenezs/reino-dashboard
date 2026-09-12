/**
 * Configuração de ambiente do Construtor de Mentoria.
 * Dono: AGENTE B. Ver docs/ARQUITETURA_MENTORIA.md §4.
 *
 * Nenhuma credencial é embutida aqui: tudo vem de variáveis VITE_* do ambiente.
 * Este módulo NÃO importa React nem nenhum outro módulo do app (é folha da árvore).
 */

/** Lê import.meta.env de forma tolerante (Vite em build/dev, Node em scripts de teste). */
function readEnv() {
  try {
    return import.meta.env || {};
  } catch (_err) {
    return {};
  }
}

const ENV = readEnv();

/**
 * Configuração em TEMPO DE EXECUÇÃO, para a versão de arquivo único.
 * Num build normal (Vercel), tudo vem das variáveis VITE_*. No HTML avulso
 * hospedado em Cloudflare Pages não há etapa de build, então a URL do webhook
 * é editada direto no topo do arquivo, em window.__MENTORIA_CONFIG__.
 * O que vier daqui tem precedência; segue valendo que nada é credencial
 * secreta — qualquer coisa exposta ao navegador é pública.
 */
function readRuntime() {
  try {
    return (typeof window !== 'undefined' && window.__MENTORIA_CONFIG__) || {};
  } catch (_err) {
    return {};
  }
}

const RUNTIME = readRuntime();
const pick = (chave, viteKey) => {
  const valor = RUNTIME[chave];
  if (typeof valor === 'string' && valor.trim() !== '') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') return valor;
  return ENV[viteKey];
};

/** Number() seguro: string vazia, undefined ou lixo caem no fallback. */
function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const CONFIG = {
  /** URL do webhook n8n. Sem ela, o AGENTE C deve devolver erro claro de configuração. */
  WEBHOOK_URL: pick('WEBHOOK_URL', 'VITE_N8N_WEBHOOK_URL') || '',
  /** Timeout do POST (AbortController). */
  WEBHOOK_TIMEOUT_MS: num(pick('WEBHOOK_TIMEOUT_MS', 'VITE_N8N_TIMEOUT_MS'), 15000),
  /** Token opcional -> header Authorization: Bearer <token>. */
  WEBHOOK_TOKEN: pick('WEBHOOK_TOKEN', 'VITE_N8N_WEBHOOK_TOKEN') || '',
  /** Modo evento ao vivo. Hoje é apenas informativo: NÃO bloqueia nada. */
  EVENT_MODE: pick('EVENT_MODE', 'VITE_EVENT_MODE') === true || pick('EVENT_MODE', 'VITE_EVENT_MODE') === 'true',
  /** Etapa que o palco está conduzindo agora (1..6). 0 = livre (default). */
  CURRENT_EVENT_STEP: num(pick('CURRENT_EVENT_STEP', 'VITE_CURRENT_EVENT_STEP'), 0),
  /** Versão do schema persistido/enviado. Muda só com quebra de formato. */
  SCHEMA_VERSION: '1.0',
  /** Logs de debug (console.debug do analytics, avisos do store). */
  DEBUG: ENV.DEV === true,
};

/**
 * Hook de "etapa do evento".
 *
 * HOJE: devolve apenas CONFIG.CURRENT_EVENT_STEP (0 = livre) e não bloqueia nada.
 * O participante navega livremente pelas 6 etapas.
 *
 * COMO LIGAR BLOQUEIO REMOTO NO FUTURO (sem mexer em nenhuma tela):
 *  1. Trocar o corpo deste hook por um estado + polling:
 *       const [step, setStep] = useState(CONFIG.CURRENT_EVENT_STEP)
 *       useEffect(() => {
 *         if (!CONFIG.EVENT_MODE) return
 *         const id = setInterval(async () => {
 *           try {
 *             const r = await fetch(CONFIG.EVENT_STATE_URL, { cache: 'no-store' })
 *             const j = await r.json()
 *             setStep(Number(j.current_step) || 0)
 *           } catch (_) { }   // rede instável no evento: mantém o último valor
 *         }, 15000)
 *         return () => clearInterval(id)
 *       }, [])
 *       return step
 *     (o setInterval é proposital: polling simples sobrevive melhor a wifi de evento
 *      do que SSE/WebSocket, e nunca derruba o formulário se cair.)
 *  2. Trocar isStepLocked() abaixo por: return CONFIG.EVENT_MODE && step > 0 && stepIndex > step
 *  3. As telas (AGENTE E) já podem chamar isStepLocked(n) desde já: hoje sempre false.
 *
 * REGRA DE OURO: bloqueio nunca pode apagar nem impedir a gravação de respostas
 * já digitadas — só esconde o avanço para a próxima etapa.
 */
export function useEventStep() {
  return CONFIG.CURRENT_EVENT_STEP;
}

/**
 * Ponto único de decisão de bloqueio. Hoje SEMPRE liberado.
 * @param {number} _stepIndex etapa 1..6
 * @returns {boolean}
 */
export function isStepLocked(_stepIndex) {
  return false;
}

export default CONFIG;
