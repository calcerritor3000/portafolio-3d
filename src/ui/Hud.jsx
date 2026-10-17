import { useEffect, useState } from 'react'
import { useGame, IS_TOUCH, ACHIEVEMENTS } from '../state/store'
import { profile, links } from '../content'
import { sfx } from '../audio/sfx'
import Minimap from './Minimap'
import TouchControls from './TouchControls'

const KEY_CODES = { E: 'KeyE', R: 'KeyR' }

export default function Hud() {
  const phase = useGame((s) => s.phase)
  const active = useGame((s) => s.active)
  const kickTarget = useGame((s) => s.kickTarget)
  const inRoom = useGame((s) => s.inRoom)
  const intro = useGame((s) => s.intro)
  const [panel, setPanel] = useState(null) // 'settings' | 'achievements'

  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e) => {
      if (e.repeat) return
      const s = useGame.getState()
      if (s.intro) return s.setIntro(false)
      if (e.code === 'KeyM') return s.toggleMute()
      if (e.code === 'Escape') return setPanel(null)
      const action = s.active?.actions?.find((a) => KEY_CODES[a.key] === e.code)
      if (action) {
        sfx.open()
        action.run()
      }
    }
    const onPointer = () => useGame.getState().intro && useGame.getState().setIntro(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [phase])

  useEffect(() => {
    if (active || kickTarget) sfx.blip()
  }, [active, kickTarget])

  if (phase !== 'playing') return null

  if (intro) {
    return (
      <div className="hud">
        <div className="intro">
          <p className="intro__title">Bienvenido a mi mundo</p>
          <p className="intro__sub">Proyectos, enlaces y minijuegos te esperan ahí fuera</p>
          <p className="intro__skip">{IS_TOUCH ? 'Toca para saltar' : 'Pulsa cualquier tecla para saltar'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="hud">
      <div className="hud__brand">
        <strong>{profile.initials}</strong>
        <span>{profile.name}</span>
      </div>

      <div className="hud__top-right">
        <AchievementsPill onClick={() => setPanel(panel === 'achievements' ? null : 'achievements')} />
        <SoundPill />
        <button className="hud__pill" onClick={() => setPanel(panel === 'settings' ? null : 'settings')} aria-label="Ajustes">
          <IconGear />
        </button>
        <a className="hud__pill hud__pill--hide-sm" href={links.classic}>
          ← Versión clásica
        </a>
      </div>
      {panel === 'settings' && <SettingsPanel onClose={() => setPanel(null)} />}
      {panel === 'achievements' && <AchievementsPanel onClose={() => setPanel(null)} />}

      <FootballHud />
      <Toast />
      <Minimap />
      {IS_TOUCH && <TouchControls />}

      {!IS_TOUCH && (
        <div className={`hud__controls ${inRoom ? '' : 'hud__controls--hidden'}`}>
          <span><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> moverte</span>
          <span><kbd>Shift</kbd> correr</span>
          <span><kbd>Espacio</kbd> saltar</span>
          <span><kbd>E</kbd> interactuar / chutar</span>
          <span><kbd>M</kbd> sonido</span>
        </div>
      )}

      {active ? (
        <div className={`prompt ${IS_TOUCH ? 'prompt--touch' : ''}`} key={active.id}>
          <p className="prompt__title">{active.title}</p>
          {active.subtitle && (
            <p className={`prompt__subtitle ${active.pending ? 'prompt__subtitle--pending' : ''}`}>{active.subtitle}</p>
          )}
          {active.actions?.length > 0 && (
            <div className="prompt__actions">
              {active.actions.map((a) => (
                <button
                  key={a.key}
                  className="btn btn--small"
                  onClick={() => {
                    sfx.open()
                    a.run()
                  }}
                >
                  {!IS_TOUCH && <kbd>{a.key}</kbd>} {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        kickTarget && (
          <div className={`prompt prompt--compact ${IS_TOUCH ? 'prompt--touch' : ''}`} key={kickTarget}>
            <p className="prompt__title">{kickTarget}</p>
            <p className="prompt__subtitle">
              {IS_TOUCH ? 'Mantén "Chutar" para cargar y suelta' : <>Mantén <kbd>E</kbd> para cargar y suelta para chutar</>}
            </p>
          </div>
        )
      )}
    </div>
  )
}

function SoundPill() {
  const muted = useGame((s) => s.muted)
  const toggleMute = useGame((s) => s.toggleMute)
  return (
    <button className="hud__pill" onClick={toggleMute} aria-label={muted ? 'Activar sonido' : 'Silenciar'} title="Sonido (M)">
      {muted ? <IconMuted /> : <IconSound />}
    </button>
  )
}

function AchievementsPill({ onClick }) {
  const got = useGame((s) => Object.keys(s.achievements).length)
  return (
    <button className="hud__pill" onClick={onClick} aria-label="Logros">
      <IconTrophy /> <span className="hud__pill-num">{got}/{ACHIEVEMENTS.length}</span>
    </button>
  )
}

function Row({ label, value, onClick }) {
  return (
    <button className="panel__row" onClick={onClick}>
      <span>{label}</span>
      <span className="panel__value">{value}</span>
    </button>
  )
}

function SettingsPanel({ onClose }) {
  const s = useGame()
  return (
    <div className="panel" role="dialog" aria-label="Ajustes">
      <div className="panel__head">
        <strong>Ajustes</strong>
        <button className="panel__close" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <Row label="Calidad gráfica" value={s.quality === 'high' ? 'Alta' : 'Baja'} onClick={() => s.setQuality(s.quality === 'high' ? 'low' : 'high')} />
      <p className="panel__note">{s.qualityAuto ? 'Automática: baja sola si el equipo va justo.' : 'Elegida a mano.'}</p>
      <Row label="Hora del día" value={s.timeOfDay === 'night' ? 'Noche' : 'Día'} onClick={s.toggleTime} />
      <Row label="Música" value={s.music ? 'Sí' : 'No'} onClick={() => s.setMusic(!s.music)} />
      <Row label="Efectos de sonido" value={s.muted ? 'No' : 'Sí'} onClick={s.toggleMute} />
      <a className="panel__row" href={links.classic}>
        <span>Versión clásica del portafolio</span>
        <span className="panel__value">↗</span>
      </a>
    </div>
  )
}

function AchievementsPanel({ onClose }) {
  const got = useGame((s) => s.achievements)
  return (
    <div className="panel" role="dialog" aria-label="Logros">
      <div className="panel__head">
        <strong>Logros · {Object.keys(got).length}/{ACHIEVEMENTS.length}</strong>
        <button className="panel__close" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <ul className="panel__list">
        {ACHIEVEMENTS.map((a) => (
          <li key={a.id} className={got[a.id] ? 'is-done' : ''}>
            <span className="panel__badge">{got[a.id] ? '★' : '☆'}</span>
            <span>
              <strong>{a.title}</strong>
              <small>{a.hint}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FootballHud() {
  const f = useGame((s) => s.football)
  if (f.status !== 'countdown' && f.status !== 'playing') return null
  const secs = Math.ceil(f.timeLeft)
  return (
    <>
      <div className={`match ${secs <= 10 && f.status === 'playing' ? 'match--hurry' : ''}`}>
        <span className="match__label">Reto de goles</span>
        <span className="match__value">{f.score}</span>
        <span className="match__sep" />
        <span className="match__value">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
        </span>
      </div>
      {f.status === 'countdown' && f.countdown > 0 && (
        <div className="countdown" key={f.countdown}>
          {f.countdown}
        </div>
      )}
    </>
  )
}

function Toast() {
  const toast = useGame((s) => s.toast)
  const [visible, setVisible] = useState(null)
  useEffect(() => {
    if (!toast) return
    setVisible(toast)
    const t = setTimeout(() => setVisible(null), 2300)
    return () => clearTimeout(t)
  }, [toast])
  if (!visible) return null
  return (
    <div className={`toast toast--${visible.tone}`} key={visible.id}>
      <p className="toast__title">{visible.title}</p>
      {visible.sub && <p className="toast__sub">{visible.sub}</p>}
    </div>
  )
}

const svg = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const IconSound = () => (
  <svg {...svg}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M19 5a10 10 0 0 1 0 14" />
  </svg>
)
const IconMuted = () => (
  <svg {...svg}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </svg>
)
const IconGear = () => (
  <svg {...svg}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)
const IconTrophy = () => (
  <svg {...svg}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
  </svg>
)
