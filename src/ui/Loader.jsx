import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/store'
import { profile, links } from '../content'
import { initAudio } from '../audio/sfx'

// Pesos aproximados de cada fase real de carga
const WEIGHTS = { engine: 40, physics: 20, fonts: 15, assets: 10, scene: 15 }
const LABELS = {
  engine: 'Descargando motor 3D',
  physics: 'Iniciando física',
  fonts: 'Cargando tipografías',
  assets: 'Cargando modelos',
  scene: 'Preparando la escena',
}

const isTouchOnly =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches &&
  !window.matchMedia('(pointer: fine)').matches

export default function Loader({ webgl }) {
  const steps = useGame((s) => s.steps)
  const assets = useGame((s) => s.assets)
  const phase = useGame((s) => s.phase)
  const startGame = useGame((s) => s.start)
  const start = () => {
    initAudio()
    startGame()
    useGame.getState().setIntro(true)
  }
  const [shown, setShown] = useState(0)
  const [gone, setGone] = useState(false)
  const shownRef = useRef(0)

  const target =
    (steps.engine ? WEIGHTS.engine : 0) +
    (steps.physics ? WEIGHTS.physics : 0) +
    (steps.fonts ? WEIGHTS.fonts : 0) +
    (steps.engine ? WEIGHTS.assets * assets : 0) +
    (steps.scene ? WEIGHTS.scene : 0)
  const ready = Object.values(steps).every(Boolean) && assets >= 1
  const current = Object.keys(LABELS).find((k) => (k === 'assets' ? assets < 1 : !steps[k]))

  // Suaviza la barra hacia el progreso real (nunca lo adelanta)
  useEffect(() => {
    let id
    const tick = () => {
      shownRef.current += (target - shownRef.current) * 0.12
      if (Math.abs(target - shownRef.current) < 0.2) shownRef.current = target
      setShown(shownRef.current)
      if (shownRef.current !== target) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [target])

  useEffect(() => {
    if (phase !== 'playing') return
    const t = setTimeout(() => setGone(true), 900)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (!ready || phase !== 'loading') return
    const onKey = (e) => e.key === 'Enter' && start()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (gone) return null

  return (
    <div className={`loader ${phase === 'playing' ? 'loader--out' : ''}`}>
      <div className="loader__card">
        <p className="loader__eyebrow">{profile.status}</p>
        <h1 className="loader__name">{profile.name}</h1>
        <p className="loader__role">{profile.role}</p>
        <p className="loader__tagline">{profile.tagline}</p>

        {!webgl ? (
          <div className="loader__notice">
            <p>Tu navegador no puede mostrar la escena 3D (WebGL no disponible).</p>
            <a className="btn btn--primary" href={links.classic}>Ver portafolio clásico</a>
          </div>
        ) : (
          <>
            <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(shown)}>
              <div className="bar__fill" style={{ width: `${ready ? 100 : shown}%` }} />
            </div>
            <div className="loader__status">
              <span>{ready ? 'Todo listo' : `${LABELS[current] ?? 'Cargando'}…`}</span>
              <span>{ready ? 100 : Math.round(shown)}%</span>
            </div>

            {isTouchOnly && (
              <div className="loader__notice">
                <p>En móvil se juega con un joystick (izquierda) y botones (derecha). Si prefieres algo rápido, tienes la versión clásica.</p>
                <a className="btn btn--primary" href={links.classic}>Ver portafolio clásico</a>
              </div>
            )}

            <button className="btn btn--primary btn--enter" disabled={!ready} onClick={start}>
              {ready ? 'Entrar a mi habitación' : 'Cargando…'}
            </button>
            {ready && !isTouchOnly && <p className="loader__hint">o pulsa Enter</p>}
          </>
        )}
      </div>
    </div>
  )
}
