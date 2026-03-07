import { motion, AnimatePresence } from 'framer-motion'
import { useQuiz } from './hooks/useQuiz'
import Header from './components/Header'
import StartScreen from './components/StartScreen'
import QuizGame from './components/QuizGame'

export default function App() {
  const {
    pokemon,
    loading,
    error,
    answer,
    setAnswer,
    feedback,
    revealed,
    score,
    accuracy,
    streak,
    gameStarted,
    startGame,
    submitAnswer,
    skipPokemon,
    reloadPokemon,
  } = useQuiz()

  return (
    <div className="min-h-screen bg-poke-navy flex flex-col font-nunito">
      <Header score={score} streak={streak} />

      <main className="flex-1 flex flex-col items-center justify-center">
        {/* Loading */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-[5px] border-poke-blue border-t-poke-yellow"
            />
            <p className="font-nunito text-blue-200 font-600">Loading Pokédex…</p>
          </motion.div>
        )}

        {/* Error */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 p-8 bg-poke-dark-blue rounded-3xl border border-red-500/40 max-w-sm text-center mx-4"
          >
            <span className="text-5xl">⚠️</span>
            <p className="font-nunito text-white font-700 text-lg">Something went wrong</p>
            <p className="font-nunito text-blue-300 text-sm">{error}</p>
            <button
              onClick={reloadPokemon}
              className="font-bangers text-xl tracking-widest bg-poke-yellow text-poke-navy px-8 py-2 rounded-xl"
            >
              TRY AGAIN
            </button>
          </motion.div>
        )}

        {/* Content */}
        {!loading && !error && (
          <AnimatePresence mode="wait">
            {!gameStarted ? (
              <motion.div
                key="start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col w-full"
              >
                <StartScreen onStart={startGame} />
              </motion.div>
            ) : (
              <motion.div
                key="game"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <QuizGame
                  pokemon={pokemon}
                  answer={answer}
                  setAnswer={setAnswer}
                  feedback={feedback}
                  revealed={revealed}
                  score={score}
                  accuracy={accuracy}
                  streak={streak}
                  onSubmit={submitAnswer}
                  onSkip={skipPokemon}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
