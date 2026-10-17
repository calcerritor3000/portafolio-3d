import { useRef, useState } from 'react'
import { useGame, touchInput } from '../state/store'
import { sfx } from '../audio/sfx'

const RADIUS = 56

// Joystick virtual (mitad izquierda de la pantalla) + botones de saltar y acción
export default function TouchControls() {
  const [stick, setStick] = useState(null) // { ox, oy, dx, dy }
  const pointer = useRef(null)
  const active = useGame((s) => s.active)
  const kickTarget = useGame((s) => s.kickTarget)

  const onDown = (e) => {
    if (pointer.current !== null) return
    pointer.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    setStick({ ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 })
  }
  const onMove = (e) => {
    if (e.pointerId !== pointer.current || !stick) return
    let dx = e.clientX - stick.ox
    let dy = e.clientY - stick.oy
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    touchInput.x = dx / RADIUS
    touchInput.z = dy / RADIUS
    setStick({ ...stick, dx, dy })
  }
  const onUp = (e) => {
    if (e.pointerId !== pointer.current) return
    pointer.current = null
    touchInput.x = 0
    touchInput.z = 0
    setStick(null)
  }

  const hold = (key) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      // Capturar el dedo: si se desliza fuera del botón mientras carga el chut, no se cancela
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // algunos navegadores no lo permiten; no pasa nada
      }
      touchInput[key] = true
      if (key === 'kick' && useGame.getState().active?.actions?.[0] && !useGame.getState().kickTarget) {
        sfx.open()
        useGame.getState().active.actions[0].run()
      }
    },
    onPointerUp: () => (touchInput[key] = false),
    onPointerCancel: () => (touchInput[key] = false),
  })

  const actionLabel = kickTarget ? 'Chutar' : active?.actions?.[0]?.label ?? 'Acción'

  return (
    <div className="touch">
      <div className="touch__zone" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {stick ? (
          <div className="touch__base" style={{ left: stick.ox, top: stick.oy }}>
            <div className="touch__knob" style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
          </div>
        ) : (
          <div className="touch__hint">Arrastra para moverte</div>
        )}
      </div>
      <div className="touch__buttons">
        <button className="touch__btn touch__btn--jump" {...hold('jump')} aria-label="Saltar">
          Saltar
        </button>
        <button className={`touch__btn touch__btn--action ${active || kickTarget ? 'touch__btn--ready' : ''}`} {...hold('kick')} aria-label={actionLabel}>
          {actionLabel}
        </button>
      </div>
    </div>
  )
}
