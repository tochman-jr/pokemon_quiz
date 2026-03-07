import { motion, AnimatePresence } from 'framer-motion'

export default function PokemonImage({ pokemon, revealed }) {
  return (
    <div className="relative flex items-center justify-center w-56 h-56 md:w-72 md:h-72 mx-auto">
      {/* Glow ring behind image */}
      <div className="absolute inset-0 rounded-full bg-poke-blue/20 blur-2xl scale-110" />

      <AnimatePresence mode="wait">
        {pokemon && (
          <motion.div
            key={pokemon.id}
            initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.7, opacity: 0, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="relative z-10"
          >
            {/* Pokemon image — always visible */}
            <motion.img
              key="image"
              src={pokemon.image_url}
              alt="Who's that Pokémon?"
              className="w-48 h-48 md:w-64 md:h-64 object-contain"
              draggable={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pokemon number badge (only when revealed) */}
      <AnimatePresence>
        {revealed && pokemon && (
          <motion.span
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 right-0 font-nunito font-800 text-xs bg-poke-navy text-poke-yellow px-2 py-1 rounded-lg z-20"
          >
            #{String(pokemon.number).padStart(3, '0')}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
