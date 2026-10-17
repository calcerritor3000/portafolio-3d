// Todo el sonido se genera en tiempo real con Web Audio (sin archivos de audio).
let ctx = null
let master, sfxBus, ambBus, noiseBuf
let muted = readMuted()
const zones = {} // bucles ambientales con volumen según distancia (hoguera, fuente…)
const last = {} // anti-spam por tipo de sonido

function readMuted() {
  try {
    return localStorage.getItem('pf3d-muted') === '1'
  } catch {
    return false
  }
}

export const isMuted = () => muted

export function setMuted(value) {
  muted = value
  try {
    localStorage.setItem('pf3d-muted', value ? '1' : '0')
  } catch {
    /* sin almacenamiento: solo dura esta visita */
  }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05)
}

// Debe llamarse desde un gesto del usuario (clic en "Entrar")
export function initAudio() {
  if (ctx) {
    ctx.resume()
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : 0.85
  master.connect(ctx.destination)
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.connect(master)
  sfxBus = ctx.createGain()
  sfxBus.connect(comp)
  ambBus = ctx.createGain()
  ambBus.gain.value = 0.55
  ambBus.connect(comp)

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1

  startWind()
  scheduleCrickets()
  zones.fountain = loopNoise({ type: 'bandpass', freq: 1400, q: 0.6 })
  zones.fire = loopNoise({ type: 'lowpass', freq: 500, q: 0.4 })
  zones.roll = loopNoise({ type: 'lowpass', freq: 160, q: 1.2 })
  scheduleCrackles()

  document.addEventListener('visibilitychange', () => (document.hidden ? ctx.suspend() : ctx.resume()))
}

const ready = () => ctx && ctx.state === 'running'
const throttle = (key, ms) => {
  const now = performance.now()
  if (last[key] && now - last[key] < ms) return true
  last[key] = now
  return false
}

function noise({ dur = 0.2, type = 'bandpass', freq = 1000, freqEnd, q = 1, gain = 0.4, attack = 0.004, at = 0, bus = sfxBus }) {
  const t = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.setValueAtTime(freq, t)
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur)
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(bus)
  src.start(t, Math.random() * 1.5)
  src.stop(t + dur + 0.05)
}

function tone({ freq = 440, freqEnd, dur = 0.2, type = 'sine', gain = 0.25, attack = 0.005, at = 0, bus = sfxBus }) {
  const t = ctx.currentTime + at
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(bus)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function loopNoise({ type, freq, q }) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.value = 0
  src.connect(f).connect(g).connect(ambBus)
  src.start()
  return g
}

function startWind() {
  const g = loopNoise({ type: 'lowpass', freq: 380, q: 0.7 })
  g.gain.value = 0.12
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.frequency.value = 0.07
  lfoGain.gain.value = 0.06
  lfo.connect(lfoGain).connect(g.gain)
  lfo.start()
}

function scheduleCrickets() {
  const chirp = () => {
    if (ready() && !muted) {
      const base = 4200 + Math.random() * 900
      const n = 2 + ((Math.random() * 3) | 0)
      for (let i = 0; i < n; i++) tone({ freq: base, dur: 0.035, gain: 0.018, at: i * 0.07, bus: ambBus, type: 'triangle' })
    }
    setTimeout(chirp, 700 + Math.random() * 2600)
  }
  setTimeout(chirp, 1500)
}

function scheduleCrackles() {
  const pop = () => {
    const level = zones.fire?.gain.value ?? 0
    if (ready() && level > 0.01) {
      noise({ dur: 0.03 + Math.random() * 0.04, type: 'highpass', freq: 1800 + Math.random() * 2500, gain: level * 2.2, bus: ambBus })
    }
    setTimeout(pop, 60 + Math.random() * 260)
  }
  pop()
}

// ---------- Música opcional: lo-fi tranquilo generado en tiempo real ----------
const BPM = 78
const CHORDS = [
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 64], // Fmaj7
  [48, 52, 55, 59], // Cmaj7
  [55, 59, 62, 65], // G7
]
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12)
let musicBus = null
let musicTimer = null
let nextBeat = 0
let beat = 0

export function setMusicOn(on) {
  if (!ctx) return
  if (!musicBus) {
    musicBus = ctx.createGain()
    musicBus.gain.value = 0
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2200
    musicBus.connect(lp).connect(master)
  }
  musicBus.gain.setTargetAtTime(on ? 0.16 : 0, ctx.currentTime, 0.6)
  if (on && !musicTimer) {
    nextBeat = ctx.currentTime + 0.1
    musicTimer = setInterval(scheduleMusic, 30)
  } else if (!on && musicTimer) {
    setTimeout(() => {
      if (musicBus.gain.value < 0.01 && musicTimer) {
        clearInterval(musicTimer)
        musicTimer = null
      }
    }, 3000)
  }
}

function scheduleMusic() {
  const spb = 60 / BPM / 2 // corcheas
  while (nextBeat < ctx.currentTime + 0.2) {
    const bar = Math.floor(beat / 8) % CHORDS.length
    const chord = CHORDS[bar]
    const t = nextBeat - ctx.currentTime
    if (beat % 8 === 0) {
      // Pad suave del acorde
      chord.forEach((n) => {
        tone({ freq: midi(n), dur: spb * 8.2, gain: 0.05, attack: 0.6, at: t, type: 'triangle', bus: musicBus })
        tone({ freq: midi(n) * 1.004, dur: spb * 8.2, gain: 0.03, attack: 0.8, at: t, type: 'sine', bus: musicBus })
      })
      tone({ freq: midi(chord[0] - 12), dur: spb * 3.5, gain: 0.09, attack: 0.02, at: t, type: 'sine', bus: musicBus })
    }
    if (beat % 8 === 4) tone({ freq: midi(chord[0] - 12), dur: spb * 3, gain: 0.07, attack: 0.02, at: t, type: 'sine', bus: musicBus })
    // Arpegio
    const pattern = [0, 2, 1, 3, 2, 1, 3, 2]
    if (beat % 8 !== 7 || bar % 2) {
      tone({ freq: midi(chord[pattern[beat % 8]] + 12), dur: 0.35, gain: 0.035, attack: 0.005, at: t, type: 'sine', bus: musicBus })
    }
    // Percusión muy suave
    if (beat % 4 === 0) tone({ freq: 90, freqEnd: 45, dur: 0.18, gain: 0.08, at: t, bus: musicBus })
    if (beat % 4 === 2) noise({ dur: 0.08, type: 'highpass', freq: 5000, gain: 0.02, at: t, bus: musicBus })
    nextBeat += spb
    beat++
  }
}

const ZONE_GAIN ={ fire: 0.12, fountain: 0.08, roll: 0.5 }

// Volumen 0..1 de un bucle ambiental (lo actualiza la escena según la distancia)
export function setZone(name, level) {
  const g = zones[name]
  if (g) g.gain.setTargetAtTime(level * ZONE_GAIN[name], ctx.currentTime, name === 'roll' ? 0.05 : 0.2)
}

export const sfx = {
  step(surface = 'grass', run = false) {
    if (!ready()) return
    const v = run ? 1 : 0.75
    if (surface === 'wood') {
      tone({ freq: 140 + Math.random() * 30, freqEnd: 80, dur: 0.08, gain: 0.09 * v, type: 'triangle' })
      noise({ dur: 0.05, freq: 900, q: 1.5, gain: 0.05 * v })
    } else if (surface === 'stone') {
      noise({ dur: 0.06, type: 'highpass', freq: 2400 + Math.random() * 600, gain: 0.06 * v })
      tone({ freq: 220, freqEnd: 120, dur: 0.04, gain: 0.04 * v })
    } else {
      noise({ dur: 0.09, freq: 1300 + Math.random() * 500, freqEnd: 600, q: 0.8, gain: 0.07 * v })
    }
  },
  jump() {
    if (!ready()) return
    noise({ dur: 0.12, freq: 700, freqEnd: 1800, q: 0.8, gain: 0.06 })
    tone({ freq: 260, freqEnd: 420, dur: 0.12, gain: 0.04, type: 'triangle' })
  },
  land(impact = 0.5) {
    if (!ready() || throttle('land', 120)) return
    tone({ freq: 110, freqEnd: 50, dur: 0.14, gain: 0.08 + impact * 0.18 })
    noise({ dur: 0.12, type: 'lowpass', freq: 900, gain: 0.05 + impact * 0.1 })
  },
  kick(power = 0.5) {
    if (!ready()) return
    tone({ freq: 160, freqEnd: 55, dur: 0.18, gain: 0.25 + power * 0.25 })
    noise({ dur: 0.07, type: 'bandpass', freq: 1700, q: 0.7, gain: 0.15 + power * 0.15 })
  },
  bounce(speed, heavy = false) {
    if (!ready() || speed < 1.2 || throttle(heavy ? 'bounceH' : 'bounce', 70)) return
    const v = Math.min(1, speed / 12)
    tone({ freq: heavy ? 90 : 190, freqEnd: heavy ? 45 : 90, dur: heavy ? 0.2 : 0.11, gain: 0.05 + v * 0.22 })
  },
  pin(speed) {
    if (!ready() || speed < 0.8 || throttle('pin', 35)) return
    const v = Math.min(1, speed / 6)
    tone({ freq: 700 + Math.random() * 500, freqEnd: 350, dur: 0.09, gain: 0.04 + v * 0.12, type: 'triangle' })
    noise({ dur: 0.05, type: 'highpass', freq: 2500, gain: 0.03 + v * 0.08 })
  },
  crate(speed) {
    if (!ready() || speed < 1 || throttle('crate', 60)) return
    const v = Math.min(1, speed / 8)
    tone({ freq: 120 + Math.random() * 40, freqEnd: 70, dur: 0.12, gain: 0.05 + v * 0.15, type: 'triangle' })
    noise({ dur: 0.08, freq: 600, q: 1.2, gain: 0.04 + v * 0.1 })
  },
  whistle(long = false) {
    if (!ready()) return
    const dur = long ? 0.9 : 0.35
    tone({ freq: 2900, dur, gain: 0.08, type: 'square', attack: 0.01 })
    tone({ freq: 2960, dur, gain: 0.05, type: 'square', attack: 0.01 })
  },
  beep(high = false) {
    if (!ready()) return
    tone({ freq: high ? 1320 : 880, dur: high ? 0.35 : 0.14, gain: 0.12, type: 'triangle' })
  },
  goal() {
    if (!ready()) return
    noise({ dur: 2.2, type: 'bandpass', freq: 900, q: 0.4, gain: 0.22, attack: 0.25 }) // público
    ;[523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.5, gain: 0.1, at: i * 0.09, type: 'triangle' }))
  },
  strike() {
    if (!ready()) return
    ;[392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.45, gain: 0.09, at: i * 0.07, type: 'square' }))
    noise({ dur: 1.6, type: 'bandpass', freq: 1000, q: 0.5, gain: 0.15, attack: 0.2 })
  },
  score() {
    if (!ready()) return
    tone({ freq: 660, dur: 0.12, gain: 0.1, type: 'triangle' })
    tone({ freq: 990, dur: 0.2, gain: 0.1, at: 0.1, type: 'triangle' })
  },
  record() {
    if (!ready()) return
    ;[784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, dur: 0.3, gain: 0.09, at: i * 0.12, type: 'triangle' }))
  },
  blip() {
    if (!ready() || throttle('blip', 150)) return
    tone({ freq: 880, freqEnd: 1320, dur: 0.07, gain: 0.05, type: 'triangle' })
  },
  open() {
    if (!ready()) return
    tone({ freq: 660, dur: 0.08, gain: 0.08, type: 'triangle' })
    tone({ freq: 1320, dur: 0.12, gain: 0.07, at: 0.06, type: 'triangle' })
  },
  purr() {
    if (!ready() || throttle('purr', 900)) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 260
    const g = ctx.createGain()
    g.gain.value = 0
    const am = ctx.createOscillator()
    const amGain = ctx.createGain()
    am.frequency.value = 24
    amGain.gain.value = 0.12
    am.connect(amGain).connect(g.gain)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(1, t + 0.15)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.3)
    src.connect(f).connect(g).connect(env).connect(sfxBus)
    src.start(t)
    am.start(t)
    src.stop(t + 1.4)
    am.stop(t + 1.4)
    tone({ freq: 700, freqEnd: 520, dur: 0.25, gain: 0.04, at: 0.9, type: 'triangle' }) // miau corto
  },
}
