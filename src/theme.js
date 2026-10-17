// Paleta. El fondo parte de #17131e (a validar); el acento es el de tu portafolio actual.
export const theme = {
  bg: '#17131e',
  accent: '#8b8bff',
  text: '#e8e6f2',
  textMuted: '#9a96b0',
  pending: '#f5b84a', // marca visual para huecos de contenido pendiente

  ground: '#2a2337',
  path: '#352c47',
  plaza: '#3b3252',
  zone: '#2b2439',
  trunk: '#4a3a32',
  foliage: ['#3d4f78', '#4b3f7a', '#365a6b'],
  rock: '#4a4560',
  wood: '#6b4f3f',
  woodDark: '#4a3629',
  wall: '#d9d4e6',
  wallOuter: '#8f88a8',
  floor: '#8a6a52',
  board: '#1f1a2b',
}

// Cielo y luz según la hora (botón día/noche)
export const sky = {
  night: { bg: '#17131e', fogFar: 62, sun: 1.7, sunColor: '#dcd9ff', hemi: 1.45, hemiSky: '#8d8ad0', hemiGround: '#2a2238', ground: '#2a2337' },
  day: { bg: '#a9bff0', fogFar: 85, sun: 2.8, sunColor: '#fff1d6', hemi: 1.5, hemiSky: '#ffffff', hemiGround: '#6f7a5c', ground: '#5d7a55' },
}

export const FONT_BOLD = import.meta.env.BASE_URL + 'fonts/inter-latin-700-normal.woff'
export const FONT_REGULAR = import.meta.env.BASE_URL + 'fonts/inter-latin-400-normal.woff'
export const FONT_MONO = import.meta.env.BASE_URL + 'fonts/jetbrains-mono-latin-500-normal.woff'
