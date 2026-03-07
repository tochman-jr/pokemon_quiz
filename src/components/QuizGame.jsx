import { motion } from 'framer-motion'
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
  score,
  accuracy,
  streak,
  onSubmit,
  onSkip,
}) {
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
        <p className="font-nunito text-blue-300 text-sm text-center mb-4 font-600 tracking-wide uppercase">
          {revealed ? pokemon?.name : "Who's that Pokémon?"}
        </p>

        {/* Pokemon image */}
        <PokemonImage pokemon={pokemon} revealed={revealed} />

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
