/**
 * Programmatic sound effects using the Web Audio API.
 * Uses scheduled multi-note sequences for a proper 8-bit game feel.
 * AudioContext is created lazily on first call (always follows a user gesture).
 */

let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

/**
 * Schedule a single note at an exact AudioContext time.
 * @param {number} freq    - frequency in Hz
 * @param {number} start   - AudioContext timestamp to start
 * @param {number} dur     - duration in seconds
 * @param {number} gain    - peak gain (0–1)
 * @param {OscillatorType} type
 */
function note(freq, start, dur, gain = 0.28, type = 'square') {
  try {
    const ac = getCtx()
    const osc = ac.createOscillator()
    const g   = ac.createGain()
    osc.connect(g)
    g.connect(ac.destination)
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(gain, start + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, start + dur)
    osc.start(start)
    osc.stop(start + dur + 0.05)
  } catch {
    // AudioContext unavailable (SSR / blocked by browser policy)
  }
}

export const sounds = {
  /** Play the correct-answer audio file */
  correct: () => {
    try {
      const audio = new Audio('/12_3.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {
      // Audio unavailable
    }
  },

  /** Play the wrong-answer audio file */
  wrong: () => {
    try {
      const audio = new Audio('/bumpintowall_X5CNQPB.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {
      // Audio unavailable
    }
  },

  /** Soft two-note descending tap — light skip */
  skip: () => {
    const t = getCtx().currentTime
    note(440, t,        0.07, 0.14, 'sine') // A4
    note(330, t + 0.07, 0.10, 0.09, 'sine') // E4
  },

  /** Four-note triumphant fanfare — streak milestone */
  streak: () => {
    const t = getCtx().currentTime
    note(523,  t,        0.09, 0.20) // C5
    note(659,  t + 0.09, 0.09, 0.20) // E5
    note(784,  t + 0.18, 0.09, 0.22) // G5
    note(1047, t + 0.27, 0.28, 0.32) // C6
  },

  /** Tiny tick for UI interactions */
  click: () => {
    const t = getCtx().currentTime
    note(1200, t, 0.05, 0.08, 'sine')
  },
}
