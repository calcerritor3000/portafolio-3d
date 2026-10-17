// Contenido real, sacado de https://jorge-calcerrada.expo.app/
// Lo marcado como PENDIENTE se muestra en la escena con un aviso visible (color ámbar).

export const profile = {
  name: 'Jorge Calcerrada',
  fullName: 'Jorge Calcerrada Sánchez-Mateos',
  initials: 'JC.',
  role: 'Desarrollador de Aplicaciones Multiplataforma',
  location: 'Paiporta, Valencia',
  status: 'Disponible para incorporación inmediata',
  tagline: 'Hola, soy Jorge. Creo software que funciona.',
  bio: 'Técnico en Desarrollo de Aplicaciones con experiencia en programación, bases de datos y redes. Me motivan los proyectos tecnológicos, aprendo rápido y me importa el trabajo bien hecho.',
  facts: ['DAM · ciclo terminado en 2026', 'Inglés B1 (Trinity)', 'Máster en IA · en curso'],
  code: [
    'const jorge = {',
    "  rol: 'Desarrollador DAM',",
    "  ciudad: 'Valencia',",
    '  stack: [',
    "    'React', 'TypeScript',",
    "    'Node.js', 'React Native',",
    '  ],',
    '  disponible: true,',
    "  buscando: 'mi primer equipo',",
    '}',
  ],
}

export const links = {
  github: 'https://github.com/calcerritor3000',
  githubUser: 'calcerritor3000',
  linkedin: 'https://www.linkedin.com/in/jorge-calcerrada-s%C3%A1nchez-mateos-aa3570333/',
  email: 'calcerradasanchezjorge@gmail.com',
  cv: 'https://jorge-calcerrada.expo.app/cv-jorge-calcerrada.pdf',
  classic: 'https://jorge-calcerrada.expo.app/',
}

export const projects = [
  {
    id: 'taskorit',
    featured: true,
    kind: 'App móvil · 2026',
    title: 'Taskorit',
    summary: 'Tareas, horario semanal y rachas en una sola app. Android, iOS y web; se instala como PWA y tus datos se quedan en tu dispositivo.',
    tech: ['React Native', 'Expo', 'TypeScript', 'Expo Router', 'AsyncStorage'],
    demo: 'https://gestor-tareas.expo.app/',
    image: import.meta.env.BASE_URL + 'projects/taskorit.jpg', // captura real de la demo
    code: 'https://github.com/calcerritor3000/gestor-tareas',
  },
  {
    id: 'qr',
    kind: 'SaaS · Proyecto personal · 2026',
    title: 'QR para restaurantes',
    summary: 'El cliente escanea un QR en la mesa, ve su cuenta, la divide a partes iguales y paga al instante con Stripe.',
    tech: ['React', 'Vite', 'Node.js', 'Express', 'SQLite', 'Stripe', 'PWA'],
    demo: null,
    code: 'https://github.com/calcerritor3000/App-QR',
    art: 'qr',
    note: 'Aún no desplegado: se ejecuta en local',
  },
  {
    id: 'cvn',
    kind: 'TFG · 2025 — 2026',
    title: 'CVN Alertas',
    summary: 'Centraliza alertas ciudadanas en la Comunidad Valenciana: mapa interactivo, datos de DANA y meteorología, y panel de administración.',
    tech: ['React', 'Node.js', 'Express', 'MySQL', 'JWT', 'PWA'],
    demo: null, // la demo (alertascvn.onrender.com) da 404: se quita hasta que vuelva a estar publicada
    art: 'map',
    code: 'https://github.com/calcerritor3000/TFG-Sistema-de-Gesti-n-de-Alertas---CVN-24-7-Noticias-Calce',
  },
  {
    id: 'fichajes',
    kind: 'Prácticas · TiaTools · 2025 — 2026',
    title: 'Web de fichajes',
    summary: 'Registro de la jornada laboral: fichaje de entradas y salidas, autenticación segura y panel de administración.',
    tech: ['Next.js', 'React', 'TypeScript', 'Firebase', 'Tailwind CSS'],
    demo: null,
    code: null,
    note: 'Código privado (proyecto de empresa)',
    art: 'clock',
  },
]

// PENDIENTE: modelo .glb de tu avatar (low-poly, comprimido con Draco). Mientras sea null se usa el avatar provisional.
// Los colores del avatar provisional se pueden ajustar a tu aspecto (pelo, piel, ropa).
export const avatar = {
  modelUrl: null,
  colors: {
    skin: '#e3b892',
    hair: '#2b2018',
    top: '#8b8bff',
    topDetail: '#e8e6f2',
    pants: '#2d2b45',
    shoes: '#3a3650',
  },
}

// Minijuegos del mundo (implementados en src/scene/games/)
export const minigames = [
  { id: 'football', title: 'Reto de goles', hint: '60 segundos contra el portero' },
  { id: 'bowling', title: 'Bolos', hint: '5 tiradas, chutando la bola' },
]
