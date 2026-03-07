import { motion } from 'framer-motion'

export default function MultiplayerResults({ players, playerName, onPlayAgain }) {
  const sorted = [...players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
  const medals = ['🥇', '🥈', '🥉']

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 px-4 py-10 w-full max-w-md mx-auto"
    >
      <h2 className="font-bangers text-5xl text-poke-yellow tracking-widest">RESULTS</h2>

      <div className="w-full flex flex-col gap-3">
        {sorted.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center gap-4 rounded-2xl px-5 py-4
              ${p.name === playerName
                ? 'bg-poke-yellow text-poke-navy'
                : 'bg-poke-dark-blue text-white border border-poke-blue/30'}`}
          >
            <span className="text-2xl">{medals[i] ?? `#${i + 1}`}</span>
            <span className="font-nunito font-800 text-lg flex-1">{p.name}</span>
            <span className="font-bangers text-2xl">⭐ {p.points ?? 0}</span>
            <span className="font-nunito text-xs opacity-60">
              {p.correct ?? 0}/{p.total ?? 0} correct
            </span>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onPlayAgain}
        className="font-bangers text-2xl tracking-widest bg-poke-yellow text-poke-navy px-12 py-4 rounded-2xl shadow-[0_5px_0_#C7A008] hover:translate-y-[2px] hover:shadow-[0_3px_0_#C7A008] transition-all mt-4"
      >
        PLAY AGAIN
      </button>
    </motion.div>
  )
}
