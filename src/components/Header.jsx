import { motion } from 'framer-motion'

export default function Header({ score, streak }) {
  return (
    <header className="w-full py-3 px-4 md:py-4 md:px-6 flex items-center justify-between bg-poke-navy shadow-lg">
      {/* Logo */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="flex flex-col leading-none"
      >
        <span className="font-bangers text-poke-yellow text-2xl md:text-4xl tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
          WHO'S THAT
        </span>
        <span className="font-bangers text-white text-lg md:text-2xl tracking-widest">
          POKÉMON?
        </span>
      </motion.div>

      {/* Score chips */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="flex gap-2"
      >
        {streak >= 3 && (
          <motion.div
            key={streak}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 bg-orange-500 text-white font-nunito font-900 text-xs md:text-sm px-2 md:px-3 py-1 rounded-full"
          >
            🔥 {streak}
          </motion.div>
        )}
        <div className="flex items-center gap-1 bg-poke-blue text-white font-nunito font-700 text-xs md:text-sm px-3 md:px-4 py-1 rounded-full">
          ✅ {score.correct}
        </div>
        <div className="flex items-center gap-1 bg-poke-dark-blue text-white font-nunito font-700 text-xs md:text-sm px-3 md:px-4 py-1 rounded-full">
          📋 {score.total}
        </div>
      </motion.div>
    </header>
  )
}
