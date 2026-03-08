/**
 * Programmatic sound effects using the Web Audio API.
 * No asset files needed — tones are synthesised from parameters.
 * Safe to call before a user gesture; the AudioContext is created lazily
 * on first play (which always follows a gesture).
 */

let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

function beep({ frequency = 440, duration = 0.15, type = 'sine', gain = 0.25 } = {}) {
  try {
    const ac = getCtx()
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.connect(g)
    g.connect(ac.destination)
    osc.frequency.value = frequency
    osc.type = type
    g.gain.setValueAtTime(gain, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + duration)
  } catch {
    // Silently ignore if AudioContext is unavailable (e.g. server-side render)
  }
}

export const sounds = {
  correct: () => beep({ frequency: 880, duration: 0.18, type: 'sine' }),
  wrong:   () => beep({ frequency: 200, duration: 0.25, type: 'sawtooth', gain: 0.2 }),
  skip:    () => beep({ frequency: 440, duration: 0.1,  type: 'sine',     gain: 0.12 }),
  streak:  () => {
    beep({ frequency: 660, duration: 0.12 })
    setTimeout(() => beep({ frequency: 880, duration: 0.18, gain: 0.3 }), 120)
  },
  click:   () => beep({ frequency: 1200, duration: 0.07, gain: 0.1 }),
}
