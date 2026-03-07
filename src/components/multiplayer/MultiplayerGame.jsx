import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Zap, Eye } from 'lucide-react'
import PokemonImage from '../PokemonImage'
import FeedbackMessage from '../FeedbackMessage'

export default function MultiplayerGame({
  pokemon,
  phase,
  silhouetteCountdown,
  answer,
  setAnswer,
  feedback,
  answered,
  firstCorrect,
  players,
  playerName,
  isHost,
  onSubmit,
  onReveal,
  onSkip,
  questionIndex,
}) {
  const inputRef = useRef(null)
  const showSilhouette = phase === 'silhouette'

  useEffect(() => {
    if (!answered) inputRef.current?.focus()
  }, [answered, pokemon])

  function handleSubmit(e) {
    e.preventDefault()
    if (!answer.trim() || answered) return
    onSubmit(answer)
  }

  // Sort players by points descending
  const sorted = [...players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 w-full max-w-lg mx-auto">

      {/* Leaderboard */}
      <div className="flex gap-2 flex-wrap justify-center w-full">
        {sorted.map((p, i) => (
          <div
            key={p.name}
            className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-nunito font-700
              ${p.name === playerName ? 'bg-poke-yellow text-poke-navy' : 'bg-poke-dark-blue text-white border border-poke-blue/30'}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bangers text-xs shrink-0
              ${ i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-600 text-white' : 'bg-poke-navy text-blue-300' }`}>
              {i + 1}
            </span>
            <span>{p.name}</span>
            <span className="font-bangers text-base flex items-center gap-0.5"><Star className="w-3 h-3 fill-current" />{p.points ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Card */}
      <motion.div
        layout
        className="w-full bg-gradient-to-b from-poke-dark-blue to-poke-navy rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.5)] border border-poke-blue/30"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <p className="font-nunito text-blue-300 text-xs font-700 tracking-wide uppercase shrink-0">
            Q{questionIndex + 1}
          </p>
          {showSilhouette && (
            <div className="flex items-center gap-1">
              <span className="font-nunito text-blue-300 text-xs hidden sm:inline">Image in</span>
              <motion.span
                key={silhouetteCountdown}
                initial={{ scale: 1.4, color: '#facc15' }}
                animate={{ scale: 1, color: '#93c5fd' }}
                className="font-bangers text-xl text-poke-yellow"
              >
                {silhouetteCountdown}s
              </motion.span>
            </div>
          )}
          <p className="font-nunito text-blue-300 text-xs font-700 tracking-wide uppercase shrink-0">
            <span className="inline-flex items-center gap-0.5"><Star className="w-3 h-3 text-poke-yellow fill-poke-yellow" />{showSilhouette ? '5 (first)' : '3 (first)'}</span>
          </p>
        </div>

        {/* Image */}
        <PokemonImage pokemon={pokemon} showSilhouette={showSilhouette} />

        {/* First correct banner */}
        <AnimatePresence>
          {firstCorrect && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-center font-nunito font-700 text-green-300 text-sm"
            >
              <span className="inline-flex items-center gap-1"><Zap className="w-4 h-4 text-yellow-300" /> {firstCorrect} answered first!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback */}
        <div className="mt-4 min-h-[64px] flex items-center justify-center">
          <FeedbackMessage feedback={feedback} pokemonName={pokemon?.name ?? ''} />
        </div>

        {/* Input */}
        {!answered && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type Pokémon name…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="w-full text-center font-nunito font-700 text-xl text-poke-navy bg-white border-4 border-poke-blue rounded-2xl px-5 py-4 placeholder:text-blue-200 focus:outline-none focus:border-poke-yellow"
            />
            <button
              type="submit"
              className="w-full font-bangers text-2xl tracking-widest bg-poke-yellow text-poke-navy py-3 rounded-2xl shadow-[0_4px_0_#C7A008] hover:translate-y-[2px] hover:shadow-[0_2px_0_#C7A008] transition-all"
            >
              GUESS!
            </button>
          </form>
        )}

        {answered && !feedback?.startsWith('correct') && (
          <p className="text-center font-nunito text-blue-300 text-sm mt-4 animate-pulse">
            Waiting for others…
          </p>
        )}

        {/* Skip always visible for host regardless of whether they answered */}
        {isHost && (
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 font-bangers text-xl tracking-widest bg-poke-dark-blue text-blue-300 border border-poke-blue/40 py-2 rounded-2xl hover:bg-poke-blue/20 transition-colors"
            >
              Skip
            </button>
          </div>
        )}

        {/* Manual reveal button (host, silhouette phase) */}
        {isHost && showSilhouette && (
          <div className="flex justify-center mt-3">
            <button
              onClick={onReveal}
              className="font-nunito text-xs text-blue-400 border border-blue-400/30 rounded-sm px-3 py-1 hover:bg-poke-blue/20 transition-colors flex items-center gap-1"
            >
              <Eye className="w-3 h-3" /> Reveal image now
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
