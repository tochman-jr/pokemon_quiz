import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

// Fixed screen positions [left%, top%, sizePx] – staggered so they don't all cycle together
const SLOTS = [
  { id: 0, x: '5%',  y: '9%',  size: 72,  cycleMs: 4200 },
  { id: 1, x: '77%', y: '6%',  size: 60,  cycleMs: 5100 },
  { id: 2, x: '87%', y: '46%', size: 88,  cycleMs: 4700 },
  { id: 3, x: '3%',  y: '58%', size: 64,  cycleMs: 5600 },
  { id: 4, x: '55%', y: '76%', size: 80,  cycleMs: 4000 },
  { id: 5, x: '27%', y: '4%',  size: 56,  cycleMs: 6000 },
  { id: 6, x: '81%', y: '72%', size: 76,  cycleMs: 4900 },
  { id: 7, x: '43%', y: '84%', size: 60,  cycleMs: 5400 },
]

// pool prop is optional — if provided the DB fetch is skipped entirely
export default function FloatingSilhouettes({ pool: poolProp }) {
  const [pool, setPool]   = useState([])
  const [shown, setShown] = useState(Array(SLOTS.length).fill(null))

  // Use provided pool or fall back to fetching from DB
  useEffect(() => {
    if (poolProp && poolProp.length > 0) {
      setPool([...poolProp].sort(() => Math.random() - 0.5))
      return
    }
    supabase
      .from('pokemons')
      .select('id, image_url')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPool([...data].sort(() => Math.random() - 0.5))
        }
      })
  }, [poolProp])

  // Seed slots, then cycle each slot on its own interval
  useEffect(() => {
    if (pool.length === 0) return
    setShown(SLOTS.map((_, i) => pool[i % pool.length]))

    const timers = SLOTS.map((slot, i) =>
      setInterval(() => {
        setShown((prev) => {
          const next = [...prev]
          let pick
          do {
            pick = pool[Math.floor(Math.random() * pool.length)]
          } while (pick?.id === prev[i]?.id)
          next[i] = pick
          return next
        })
      }, slot.cycleMs)
    )
    return () => timers.forEach(clearInterval)
  }, [pool])

  if (pool.length === 0) return null

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {SLOTS.map((slot, i) => (
        <div key={slot.id} className="absolute" style={{ left: slot.x, top: slot.y }}>
          <AnimatePresence mode="wait">
            {shown[i] && (
              <motion.img
                key={shown[i].id}
                src={shown[i].image_url}
                alt=""
                draggable={false}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 0.15, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
                style={{
                  width: slot.size,
                  height: slot.size,
                  objectFit: 'contain',
                  filter: shown[i].image_url?.endsWith('.png')
                    ? 'brightness(0) invert(1)'
                    : 'brightness(0.15) contrast(1.5) saturate(0)',
                }}
              />
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
