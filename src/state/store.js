import { create } from 'zustand'
import { isMuted, setMuted } from '../audio/sfx'

export const DEBUG = new URLSearchParams(window.location.search).has('debug')
export const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches

// Estado no reactivo que se lee cada frame
export const player = {
  position: { x: 0, y: 1, z: 1.5 },
  velocity: { x: 0, y: 0, z: 0 },
  facing: 0,
  speed: 0,
  kickCharge: 0,
  aim: { active: false, x: 0, z: 0, dx: 0, dz: -1, charge: 0 },
}

// La cámara puede mirar hacia otro punto un momento (bola rodando, chut…)
export const cameraFocus = { x: 0, z: 0, weight: 0, until: 0 }
export const focusCamera = (x, z, weight = 0.6, ms = 250) => {
  Object.assign(cameraFocus, { x, z, weight, until: performance.now() + ms })
}

export const ROOM = { half: 4.5, height: 2.6, doorHalf: 0.9, doorHeight: 2.25 }
export const isInsideRoom = (p) => Math.abs(p.x) < ROOM.half + 0.1 && p.z > -ROOM.half - 0.1 && p.z < ROOM.half + 0.1

const readBest = (key) => {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}
export const saveBest = (key, value) => {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* sin almacenamiento */
  }
}

export const useGame = create((set, get) => ({
  // loading → playing
  phase: 'loading',
  steps: { engine: false, physics: false, fonts: false, scene: false },
  assets: 0, // 0..1, modelos/texturas vía LoadingManager de three
  markStep: (step) => {
    if (DEBUG && !get().steps[step]) console.info(`[carga] ${step} listo a los ${Math.round(performance.now())} ms`)
    set((s) => ({ steps: { ...s.steps, [step]: true } }))
  },
  setAssets: (assets) => set({ assets }),
  start: () => set({ phase: 'playing' }),

  inRoom: true,
  setInRoom: (inRoom) => get().inRoom !== inRoom && set({ inRoom }),

  muted: isMuted(),
  toggleMute: () => {
    setMuted(!get().muted)
    set({ muted: !get().muted })
  },

  // Interacción activa: { id, title, subtitle, actions: [{ key, label, run }] }
  active: null,
  setActive: (active) => set({ active }),
  clearActive: (id) => get().active?.id === id && set({ active: null }),

  // Balón al alcance del jugador (muestra el aviso de chut)
  kickTarget: null,
  setKickTarget: (kickTarget) => get().kickTarget !== kickTarget && set({ kickTarget }),

  // Avisos grandes en pantalla (¡GOL!, ¡STRIKE!…)
  toast: null,
  showToast: (title, sub, tone = 'accent') => set({ toast: { title, sub, tone, id: performance.now() } }),

  football: { status: 'idle', timeLeft: 60, countdown: 0, score: 0, best: readBest('pf3d-football') },
  setFootball: (patch) => set((s) => ({ football: { ...s.football, ...patch } })),

  bowling: { roll: 0, last: null, total: 0, best: readBest('pf3d-bowling'), state: 'ready' },
  setBowling: (patch) => set((s) => ({ bowling: { ...s.bowling, ...patch } })),

  // Calidad gráfica: 'high' | 'low'. auto=true → baja sola si van mal los FPS
  quality: readPref('pf3d-quality', IS_TOUCH ? 'low' : 'high'),
  qualityAuto: readPref('pf3d-quality-auto', '1') === '1',
  setQuality: (quality, manual = true) => {
    if (manual) savePref('pf3d-quality-auto', '0')
    savePref('pf3d-quality', quality)
    set({ quality, qualityAuto: manual ? false : get().qualityAuto })
  },

  timeOfDay: readPref('pf3d-time', 'night'),
  toggleTime: () => {
    const timeOfDay = get().timeOfDay === 'night' ? 'day' : 'night'
    savePref('pf3d-time', timeOfDay)
    set({ timeOfDay })
  },

  music: readPref('pf3d-music', '0') === '1',
  setMusic: (music) => {
    savePref('pf3d-music', music ? '1' : '0')
    set({ music })
  },

  // Intro: vuelo de cámara al entrar (se puede saltar)
  intro: false,
  slowmo: false,
  setIntro: (intro) => set({ intro }),

  // Logros
  achievements: readJson('pf3d-achievements', {}),
  unlock: (id) => {
    if (get().achievements[id]) return
    const achievements = { ...get().achievements, [id]: Date.now() }
    savePref('pf3d-achievements', JSON.stringify(achievements))
    set({ achievements })
    const a = ACHIEVEMENTS.find((x) => x.id === id)
    if (a) get().showToast('Logro desbloqueado', a.title, 'gold')
  },
  visited: {},
  visit: (id) => {
    if (get().visited[id]) return
    const visited = { ...get().visited, [id]: true }
    set({ visited })
    if (['project-taskorit', 'project-qr', 'project-cvn', 'project-fichajes'].every((k) => visited[k])) get().unlock('projects')
    if (['zone-links', 'zone-projects', 'zone-football', 'zone-bowling', 'zone-campfire', 'zone-pond'].every((k) => visited[k])) get().unlock('explorer')
  },
}))

export const ACHIEVEMENTS = [
  { id: 'goal', title: 'Primer gol', hint: 'Marca un gol al portero' },
  { id: 'hattrick', title: 'Hat-trick', hint: 'Marca 3 goles en un mismo reto' },
  { id: 'strike', title: '¡Strike!', hint: 'Tira los 10 bolos de una vez' },
  { id: 'cat', title: 'Amigo felino', hint: 'Acaricia al gato de la habitación' },
  { id: 'projects', title: 'Reclutador curioso', hint: 'Visita los 4 proyectos' },
  { id: 'explorer', title: 'Explorador', hint: 'Visita todas las zonas del mapa' },
  { id: 'contact', title: 'Hablemos', hint: 'Abre GitHub, LinkedIn, el CV o el email' },
  { id: 'crates', title: 'Demolición', hint: 'Tira la torre de cajas de la plaza' },
]

// Cámara lenta (gol, impacto en los bolos)
export const slowmo = { until: 0, scale: 0.3 }
export const slowMotion = (ms, scale = 0.3) => Object.assign(slowmo, { until: performance.now() + ms, scale })

// Entrada táctil (joystick virtual) que el jugador combina con el teclado
export const touchInput = { x: 0, z: 0, run: false, jump: false, kick: false }

// El jugador registra aquí su función de teletransporte (viaje rápido del minimapa)
export const travel = { to: null }

function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}
function savePref(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* sin almacenamiento */
  }
}
function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback
  } catch {
    return fallback
  }
}

// Abre un enlace en otra pestaña. Si el navegador bloquea la ventana emergente
// (p. ej. Safari en iPhone con los botones táctiles), lo abre en la misma pestaña.
// No se usa 'noopener' en las opciones porque entonces window.open siempre devuelve null
// y no se podría detectar el bloqueo; se corta window.opener a mano (evita reverse tabnabbing).
export const openUrl = (url) => {
  const w = window.open(url, '_blank')
  if (w) w.opener = null
  else window.location.href = url
}
