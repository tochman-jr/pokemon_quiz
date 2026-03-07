import { motion } from 'framer-motion'
import { Star, Eye } from 'lucide-react'
import PokemonImage from './PokemonImage'
import AnswerForm from './AnswerForm'
import FeedbackMessage from './FeedbackMessage'
import ScoreBoard from './ScoreBoard'

export default function QuizGame({
  pokemon,
  answer,
  setAnswer,
  feedback,
  revealed,
  phase,
  onReveal,
  score,
  accuracy,
  streak,
  onSubmit,
  onSkip,
}) {
  const showSilhouette = phase === 'silhouette' && !revealed
  const pointsAvailable = phase === 'silhouette' ? 3 : 1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6 px-4 py-6 w-full max-w-lg mx-auto"
    >
      {/* Score row */}
      <ScoreBoard score={score} accuracy={accuracy} streak={streak} />

      {/* Card */}
      <motion.div
        layout
        className="w-full bg-gradient-to-b from-poke-dark-blue to-poke-navy rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.5)] border border-poke-blue/30"
      >
        {/* Hint text */}
        <p className="font-nunito text-blue-300 text-xs md:text-sm text-center mb-4 font-600 tracking-wide uppercase">
          {revealed ? pokemon?.name : (
            <span className="inline-flex items-center gap-1">
              Who&apos;s that Pokémon? <Star className="w-3 h-3 text-poke-yellow fill-poke-yellow" /> {pointsAvailable} {pointsAvailable === 1 ? 'pt' : 'pts'}
            </span>
          )}
        </p>

        {/* Pokemon image */}
        <PokemonImage pokemon={pokemon} showSilhouette={showSilhouette} />

        {/* Reveal button — only in silhouette phase before answering */}
        {phase === 'silhouette' && !revealed && feedback === null && (
          <div className="flex justify-center mt-4">
            <button
              onClick={onReveal}
              className="font-nunito font-700 text-sm text-blue-300 border border-blue-400/40 rounded-sm px-4 py-2 hover:bg-poke-blue/20 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" /> Reveal image (1 pt)
            </button>
          </div>
        )}

        {/* Feedback */}
        <div className="mt-6 min-h-[72px] flex items-center justify-center">
          <FeedbackMessage feedback={feedback} pokemonName={pokemon?.name ?? ''} />
        </div>

        {/* Answer form */}
        <div className="mt-4">
          <AnswerForm
            answer={answer}
            setAnswer={setAnswer}
            onSubmit={onSubmit}
            onSkip={onSkip}
            disabled={feedback !== null}
          />
        </div>
      </motion.div>

      {/* Fun tip */}
      <p className="font-nunito text-blue-300/60 text-xs text-center">
        Tip: spelling doesn't have to be perfect — just close enough!
      </p>
    </motion.div>
  )
}
