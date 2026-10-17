// Decoración de temporada. Halloween se activa solo del 1 de octubre al 7 de noviembre.
// Se puede forzar con ?halloween o quitar con ?nohalloween en la URL.
const params = new URLSearchParams(window.location.search)
const now = new Date()
const inSeason = now.getMonth() === 9 || (now.getMonth() === 10 && now.getDate() <= 7)

export const HALLOWEEN = params.has('halloween') || (!params.has('nohalloween') && inSeason)
