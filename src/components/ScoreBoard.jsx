import { motion } from 'framer-motion'

export default function ScoreBoard({ score, accuracy, streak }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 justify-center flex-wrap"
    >
      <StatChip icon="⭐" label="Points" value={score.points} color="bg-poke-yellow text-poke-navy" textDark />
      <StatChip icon="❌" label="Wrong" value={score.total - score.correct} color="bg-red-600" />
      <StatChip icon="🎯" label="Accuracy" value={`${accuracy}%`} color="bg-poke-blue" />
      {streak >= 2 && (
        <motion.div
          key={streak}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <StatChip icon="🔥" label="Streak" value={streak} color="bg-orange-500" />
        </motion.div>
      )}
    </motion.div>
  )
}

function StatChip({ icon, label, value, color, textDark }) {
  return (
    <div className={`${color} rounded-2xl px-4 py-2 text-center min-w-[72px]`}>
      <div className={`font-bangers text-2xl ${textDark ? 'text-poke-navy' : 'text-white'}`}>{value}</div>
      <div className={`font-nunito text-xs font-600 ${textDark ? 'text-poke-navy/70' : 'text-white/70'}`}>
        {icon} {label}
      </div>
    </div>
  )
}
