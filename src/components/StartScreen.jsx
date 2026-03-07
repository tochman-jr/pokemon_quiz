import { motion } from 'framer-motion'

export default function StartScreen({ onStart }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
      {/* Pokeball decoration */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, delay: 0.1 }}
        className="relative mb-8 select-none"
      >
        <div className="w-40 h-40 rounded-full border-8 border-poke-navy bg-white overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative">
          {/* Top half */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-red-500" />
          {/* Center band */}
          <div className="absolute top-1/2 left-0 w-full h-2 bg-poke-navy -translate-y-1/2 z-10" />
          {/* Center button */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border-4 border-poke-navy z-20 shadow-inner" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.25 }}
        className="font-bangers text-6xl md:text-8xl text-poke-yellow drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] tracking-widest mb-2"
      >
        WHO'S THAT
      </motion.h1>
      <motion.h2
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.35 }}
        className="font-bangers text-4xl md:text-6xl text-white tracking-widest mb-6"
      >
        POKÉMON?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="font-nunito text-blue-200 text-lg max-w-sm mb-10"
      >
        Identify all <span className="text-poke-yellow font-bold">151</span> original Pokémon from their silhouette. How many do you know?
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="font-bangers text-3xl tracking-widest bg-poke-yellow text-poke-navy px-14 py-4 rounded-2xl shadow-[0_6px_0_#C7A008] hover:shadow-[0_3px_0_#C7A008] hover:translate-y-[3px] transition-all duration-100"
      >
        START QUIZ!
      </motion.button>
    </div>
  )
}
