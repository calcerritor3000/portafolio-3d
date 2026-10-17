// Mapa del mundo: posiciones de cada zona y áreas que deben quedar libres de árboles/decoración.
export const BOUNDS = { minX: -36, maxX: 36, minZ: -74, maxZ: 12 }
export const PLAZA = [0, -22]
export const CAMPFIRE = [-9.5, -8.5]
export const POND = [24, -7]

export const LINKS_AT = [
  [-19, -19.5],
  [-12, -19.5],
  [-19, -27.5],
  [-12, -27.5],
]
export const PROJECTS_AT = [
  [12, -19.5],
  [19.5, -19.5],
  [12, -27.5],
  [19.5, -27.5],
]

// Medio campo de fútbol: portería al fondo (−z), entrada por el lado cercano
export const PITCH = { x1: -22, x2: -6, z1: -64, z2: -40, goalHalf: 2.5, goalHeight: 2.1, goalDepth: 1.6 }
export const PITCH_CX = (PITCH.x1 + PITCH.x2) / 2

// Pista de bolos
export const LANE = { x: 14, z1: -58, z2: -40, half: 1.2 }

const rects = [
  [-5.6, 5.6, -5.6, 5.6], // habitación
  [-2.2, 2.2, -9.5, -4.5], // salida
  [-1.6, 1.6, -17, -4.5], // camino principal
  [-9.2, -5.2, -23.4, -20.6],
  [5.2, 9.2, -23.4, -20.6],
  [-22.8, -8.2, -30.6, -16.6], // enlaces
  [8.2, 23.4, -30.6, -16.6], // proyectos
  [-1.5, 1.5, -39, -26.5], // camino a minijuegos
  [-15.5, 15.5, -40.4, -37.6], // cruce
  [-26.5, -4.8, -69, -39.5], // fútbol + gradas + marcador
  [10.2, 18.6, -63, -39.5], // bolos
  [3.8, 8.2, -14.5, -10.5], // cajas
]
const circles = [
  [PLAZA[0], PLAZA[1], 5.8],
  [CAMPFIRE[0], CAMPFIRE[1], 3.4],
  [POND[0], POND[1], 4.6],
]

export function isFree(x, z, pad = 0) {
  for (const [x1, x2, z1, z2] of rects) if (x > x1 - pad && x < x2 + pad && z > z1 - pad && z < z2 + pad) return false
  for (const [cx, cz, r] of circles) if (Math.hypot(x - cx, z - cz) < r + pad) return false
  return true
}

export function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Puntos del minimapa / viaje rápido (x, z = dónde aparece el jugador)
export const POIS = [
  { id: 'room', label: 'Habitación', x: 0, z: 1.2, color: '#e8e6f2' },
  { id: 'plaza', label: 'Plaza', x: 0, z: -15.5, color: '#8b8bff' },
  { id: 'links', label: 'Enlaces y contacto', x: -15.5, z: -16.5, color: '#86efac' },
  { id: 'projects', label: 'Proyectos', x: 15.75, z: -16.5, color: '#f5b84a' },
  { id: 'campfire', label: 'Hoguera', x: -6.8, z: -8.8, color: '#ff9a3c' },
  { id: 'pond', label: 'Estanque', x: 20.5, z: -3, color: '#7dd3fc' },
  { id: 'football', label: 'Fútbol', x: PITCH_CX, z: -42.5, color: '#4ade80' },
  { id: 'bowling', label: 'Bolos', x: LANE.x, z: -41.6, color: '#f472b6' },
]

// Zona en la que está el jugador (para el logro de explorador)
export function zoneAt(x, z) {
  if (x > -22.8 && x < -8.2 && z > -30.6 && z < -16.6) return 'zone-links'
  if (x > 8.2 && x < 23.4 && z > -30.6 && z < -16.6) return 'zone-projects'
  if (x > PITCH.x1 && x < PITCH.x2 && z > PITCH.z1 && z < PITCH.z2) return 'zone-football'
  if (Math.abs(x - LANE.x) < 2.5 && z > LANE.z1 && z < LANE.z2) return 'zone-bowling'
  if (Math.hypot(x - CAMPFIRE[0], z - CAMPFIRE[1]) < 4) return 'zone-campfire'
  if (Math.hypot(x - POND[0], z - POND[1]) < 6.5) return 'zone-pond'
  return null
}

// Superficie bajo el jugador (para el sonido de los pasos)
export function surfaceAt(x, z, inRoom) {
  if (inRoom) return 'wood'
  if (Math.hypot(x - PLAZA[0], z - PLAZA[1]) < 5.5) return 'stone'
  if (Math.abs(x) < 1.3 && z < -4.5 && z > -39) return 'stone'
  if (z < -37.8 && z > -40.2 && Math.abs(x) < 15) return 'stone'
  if (Math.abs(x - LANE.x) < LANE.half + 0.4 && z < LANE.z2 && z > LANE.z1) return 'wood'
  return 'grass'
}
