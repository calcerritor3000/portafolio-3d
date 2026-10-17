import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { player, isInsideRoom, useGame, cameraFocus } from '../state/store'

// Cámara en tercera persona con ángulo fijo (sin rotación): nunca atraviesa paredes
// porque la habitación no tiene techo y su pared frontal es baja.
const ROOM_OFFSET = new Vector3(0, 5.2, 5.8)
const WORLD_OFFSET = new Vector3(0, 8.5, 9)
const BASE_FOV = 45
const INTRO_TIME = 4.6
const INTRO_FROM = new Vector3(3, 30, 8)
const INTRO_LOOK = new Vector3(0, 0, -28)
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// Sacudida de cámara (goles, strikes): shake.amount se reduce sola
export const shake = { amount: 0 }

export default function CameraRig() {
  const offset = useRef(ROOM_OFFSET.clone().multiplyScalar(1.9))
  const look = useRef(new Vector3(0, 1, 0))
  const lead = useRef(new Vector3())
  const focusW = useRef(0)
  const intro = useRef({ t: -1 })
  const zoom = useRef(1)
  const tmp = useMemo(() => new Vector3(), [])
  const desired = useMemo(() => new Vector3(), [])

  useEffect(() => {
    const onWheel = (e) => {
      zoom.current = Math.min(1.35, Math.max(0.7, zoom.current + Math.sign(e.deltaY) * 0.08))
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = player.position
    const v = player.velocity
    const cam = state.camera
    const playing = useGame.getState().phase === 'playing'
    const inside = isInsideRoom(p)

    // Antes de entrar, plano general; al entrar, se acerca
    const portrait = state.size.width < state.size.height ? 1.3 : 1 // móvil en vertical: algo más de campo
    tmp.copy(inside ? ROOM_OFFSET : WORLD_OFFSET).multiplyScalar((playing ? zoom.current : 1.9) * portrait)
    offset.current.lerp(tmp, 1 - Math.exp(-(playing ? 2.5 : 8) * dt))

    // Se adelanta un poco hacia donde va el jugador (se ve mejor lo que viene)
    const leadAmount = inside ? 0.12 : 0.28
    tmp.set(v.x * leadAmount, 0, v.z * leadAmount)
    lead.current.lerp(tmp, 1 - Math.exp(-3 * dt))

    // Foco temporal (p. ej. seguir la bola de bolos hasta los bolos)
    const wantW = performance.now() < cameraFocus.until ? cameraFocus.weight : 0
    focusW.current += (wantW - focusW.current) * (1 - Math.exp(-3 * dt))
    const w = focusW.current
    const fx = p.x + lead.current.x + (cameraFocus.x - p.x) * w
    const fz = p.z + lead.current.z + (cameraFocus.z - p.z) * w

    desired.set(fx, p.y, fz).add(offset.current)

    // Intro: vuelo desde lo alto del mapa hasta la habitación
    const g = useGame.getState()
    if (g.intro) {
      const it = intro.current
      if (it.t < 0) it.t = 0
      it.t += dt / INTRO_TIME
      const e = ease(Math.min(1, it.t))
      cam.position.lerpVectors(INTRO_FROM, desired, e)
      look.current.lerpVectors(INTRO_LOOK, tmp.set(fx, p.y + 0.2, fz - 1), e)
      cam.lookAt(look.current)
      if (it.t >= 1) g.setIntro(false)
      return
    }
    intro.current.t = -1

    cam.position.lerp(desired, 1 - Math.exp(-6 * dt))
    look.current.lerp(tmp.set(fx, p.y + 0.2, fz - 1), 1 - Math.exp(-8 * dt))
    if (shake.amount > 0.001) {
      const a = shake.amount
      cam.position.x += (Math.random() - 0.5) * a
      cam.position.y += (Math.random() - 0.5) * a
      shake.amount *= Math.exp(-6 * dt)
    }
    cam.lookAt(look.current)

    // Ligero aumento del campo de visión al correr
    const fov = BASE_FOV + Math.min(1, player.speed / 8) * (inside ? 1 : 4)
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov += (fov - cam.fov) * (1 - Math.exp(-4 * dt))
      cam.updateProjectionMatrix()
    }
  })

  return null
}
