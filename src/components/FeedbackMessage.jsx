import { motion, AnimatePresence } from 'framer-motion'

const configs = {
  correct5: {
    bg: 'bg-green-400',
    border: 'border-green-300',
    icon: '⚡',
    label: (name) => `Correct! It's ${name}! +5 pts`,
  },
  correct3: {
    bg: 'bg-green-500',
    border: 'border-green-400',
    icon: '🎉',
    label: (name) => `Correct! It's ${name}! +3 pts`,
  },
  correct1: {
    bg: 'bg-green-600',
    border: 'border-green-500',
    icon: '✅',
    label: (name) => `Correct! It's ${name}! +1 pt`,
  },
  wrong: {
    bg: 'bg-red-500',
    border: 'border-red-400',
    icon: '😅',
    label: (name) => `It's ${name}!`,
  },
  skipped: {
    bg: 'bg-poke-dark-blue',
    border: 'border-poke-blue',
    icon: '👀',
    label: (name) => `It was ${name}!`,
  },
}

export default function FeedbackMessage({ feedback, pokemonName }) {
  const cfg = feedback ? configs[feedback] : null

  return (
    <AnimatePresence>
      {cfg && (
        <motion.div
          key={feedback + pokemonName}
          initial={{ opacity: 0, y: 24, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className={`
            ${cfg.bg} border-2 ${cfg.border}
            flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl
            font-nunito font-800 text-white text-xl
          `}
        >
          <span className="text-3xl">{cfg.icon}</span>
          <span>{cfg.label(pokemonName)}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
