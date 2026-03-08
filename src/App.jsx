import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gamepad2, Users, AlertTriangle } from 'lucide-react'
import { useQuiz } from './hooks/useQuiz'
import { useMultiplayer } from './hooks/useMultiplayer'
import Header from './components/Header'
import StartScreen from './components/StartScreen'
import QuizGame from './components/QuizGame'
import FloatingSilhouettes from './components/FloatingSilhouettes'
import MultiplayerHome from './components/multiplayer/MultiplayerHome'
import MultiplayerLobby from './components/multiplayer/MultiplayerLobby'
import MultiplayerGame from './components/multiplayer/MultiplayerGame'
import MultiplayerResults from './components/multiplayer/MultiplayerResults'
import TvView from './components/multiplayer/TvView'

// If opened with ?tv=ROOMCODE, render the TV spectator view directly
const tvRoomCode = new URLSearchParams(window.location.search).get('tv')

export default function App() {
  // TV spectator mode — full-screen display for a shared screen / TV
  if (tvRoomCode) return <TvView roomCode={tvRoomCode.toUpperCase()} />

  const [mode, setMode] = useState(null) // null | 'solo' | 'multi'

  const quiz = useQuiz()
  const multi = useMultiplayer()

  const {
    pokemon,
    loading,
    error,
    answer,
    setAnswer,
    feedback,
    revealed,
    phase,
    revealImage,
    score,
    accuracy,
    streak,
    gameStarted,
    startGame,
    submitAnswer,
    skipPokemon,
    reloadPokemon,
  } = quiz

  return (
    <div className="min-h-screen bg-poke-navy flex flex-col font-nunito">
      <Header score={mode === 'multi' ? { points: multi.myScore.points, correct: multi.myScore.correct, total: multi.myScore.total } : score} streak={streak} />

      <main className="flex-1 flex flex-col items-center justify-center">
        {/* ── MODE SELECT ── */}
        {!mode && (
          <AnimatePresence mode="wait">
            <motion.div
              key="modeselect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative flex flex-col items-center justify-center gap-6 px-6 py-10 text-center w-full min-h-[calc(100vh-64px)] overflow-hidden"
            >
              <FloatingSilhouettes />
              <h1 className="font-bangers text-5xl text-poke-yellow tracking-widest relative z-10">WHO'S THAT POKÉMON?</h1>
              <button
                onClick={() => setMode('solo')}
                className="relative z-10 font-bangers text-2xl tracking-widest bg-poke-yellow text-poke-navy px-12 py-4 rounded-2xl shadow-[0_5px_0_#C7A008] hover:translate-y-[2px] hover:shadow-[0_3px_0_#C7A008] transition-all w-64 flex items-center justify-center gap-3"
              >
                <Gamepad2 className="w-6 h-6" /> SOLO
              </button>
              <button
                onClick={() => setMode('multi')}
                className="relative z-10 font-bangers text-2xl tracking-widest bg-poke-blue text-white px-12 py-4 rounded-2xl shadow-[0_5px_0_rgba(0,0,0,0.3)] hover:translate-y-[2px] transition-all w-64 flex items-center justify-center gap-3"
              >
                <Users className="w-6 h-6" /> MULTIPLAYER
              </button>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── SOLO MODE ── */}
        {mode === 'solo' && (
          <>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-16 h-16 rounded-full border-[5px] border-poke-blue border-t-poke-yellow" />
                <p className="font-nunito text-blue-200 font-600">Loading Pokédex…</p>
              </motion.div>
            )}
            {error && !loading && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 p-8 bg-poke-dark-blue rounded-3xl border border-red-500/40 max-w-sm text-center mx-4">
                <AlertTriangle className="w-12 h-12 text-yellow-400" />
                <p className="font-nunito text-white font-700 text-lg">Something went wrong</p>
                <p className="font-nunito text-blue-300 text-sm">{error}</p>
                <button onClick={reloadPokemon} className="font-bangers text-xl tracking-widest bg-poke-yellow text-poke-navy px-8 py-2 rounded-sm">TRY AGAIN</button>
              </motion.div>
            )}
            {!loading && !error && (
              <AnimatePresence mode="wait">
                {!gameStarted ? (
                  <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col w-full">
                    <StartScreen onStart={startGame} onBack={() => setMode(null)} />
                  </motion.div>
                ) : (
                  <motion.div key="game" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
                    <QuizGame pokemon={pokemon} answer={answer} setAnswer={setAnswer} feedback={feedback} revealed={revealed} phase={phase} onReveal={revealImage} score={score} accuracy={accuracy} streak={streak} onSubmit={submitAnswer} onSkip={skipPokemon} />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </>
        )}

        {/* ── MULTIPLAYER MODE ── */}
        {mode === 'multi' && (
          <AnimatePresence mode="wait">
            {multi.screen === 'home' && (
              <MultiplayerHome
                key="mphome"
                onCreate={multi.createRoom}
                onJoin={multi.joinRoom}
                onBack={() => setMode(null)}
              />
            )}
            {multi.screen === 'lobby' && (
              <MultiplayerLobby
                key="mplobby"
                roomCode={multi.roomCode}
                players={multi.players}
                isHost={multi.isHost}
                gameMode={multi.gameMode}
                onSetGameMode={multi.setGameMode}
                onStart={multi.startGame}
              />
            )}
            {multi.screen === 'game' && (
              <MultiplayerGame
                key="mpgame"
                pokemon={multi.pokemon}
                phase={multi.phase}
                silhouetteCountdown={multi.silhouetteCountdown}
                answer={multi.answer}
                setAnswer={multi.setAnswer}
                feedback={multi.feedback}
                answered={multi.answered}
                firstCorrect={multi.firstCorrect}
                players={multi.players}
                playerName={multi.playerName}
                isHost={multi.isHost}
                onSubmit={multi.submitAnswer}
                onReveal={multi.revealImage}
                onSkip={multi.skipQuestion}
                onQuit={multi.quitGame}
                questionIndex={multi.questionIndex}
                gameMode={multi.gameMode}
                options={multi.options}
              />
            )}
            {multi.screen === 'results' && (
              <MultiplayerResults
                key="mpresults"
                players={multi.players}
                playerName={multi.playerName}
                gameHistory={multi.gameHistory}
                isHost={multi.isHost}
                onPlayAgain={() => multi.setScreen('lobby')}
                onBackToMenu={() => setMode(null)}
              />
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
