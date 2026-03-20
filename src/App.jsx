import { useState, useRef, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Gamepad2, Users, AlertTriangle, Star, Target, Flame, Trophy, RotateCcw, ArrowLeft } from 'lucide-react'
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
import TvHostView from './components/multiplayer/TvHostView'

export default function App() {
  return (
    <Routes>
      <Route path="/tv" element={<TvHostView />} />
      <Route path="*" element={<PlayerApp />} />
    </Routes>
  )
}

function PlayerApp() {
  const [mode, setMode] = useState(null) // null | 'solo' | 'multi'
  const [joinCode, setJoinCode] = useState(null)
  const introAudioRef = useRef(null)
  const introPlayedRef = useRef(false)

  // Auto-switch to multiplayer join when ?join=CODE is in the URL (or hash params)
  useEffect(() => {
    // Support both /?join=CODE (direct) and /#/?join=CODE (from QR via HashRouter)
    const searchParams = new URLSearchParams(window.location.search)
    const hashSearch   = new URLSearchParams(window.location.hash.replace(/^#\/?/, '').split('?')[1] ?? '')
    const code = searchParams.get('join') || hashSearch.get('join')
    if (code) {
      setJoinCode(code.toUpperCase())
      setMode('multi')
      // Clean up the URL without reloading
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    introAudioRef.current = new Audio('/whos-that-pokemon_.mp3')
    introAudioRef.current.volume = 0.5
  }, [])

  const playIntro = useCallback(() => {
    if (!introPlayedRef.current && introAudioRef.current) {
      introPlayedRef.current = true
      introAudioRef.current.play().catch(() => {})
    }
  }, [])

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
    exitGame,
    startNewRound,
    submitAnswer,
    skipPokemon,
    reloadPokemon,
    allPokemon,
    bestScore,
    streakMilestone,
    roundComplete,
    gameMode,
    setGameMode,
    options,
    generation,
    setGeneration,
    questionCount,
    setQuestionCount,
  } = quiz

  return (
    <div className="min-h-screen bg-poke-navy flex flex-col font-nunito">
      <Header score={mode === 'multi' ? multi.myScore : score} streak={streak} />

      {/* ── STREAK MILESTONE OVERLAY ── */}
      <AnimatePresence>
        {streakMilestone && (
          <motion.div
            key={streakMilestone}
            initial={{ opacity: 0, scale: 0.6, y: -40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-orange-500 text-white font-bangers text-2xl tracking-widest px-6 py-3 rounded-2xl shadow-[0_6px_24px_rgba(249,115,22,0.5)]">
              <Flame className="w-6 h-6" /> {streakMilestone} IN A ROW! 🔥
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <FloatingSilhouettes pool={allPokemon} />
              <h1 className="font-bangers text-5xl text-poke-yellow tracking-widest relative z-10">WHO'S THAT POKÉMON?</h1>
              <button
                onClick={() => { playIntro(); setMode('solo') }}
                className="relative z-10 font-bangers text-2xl tracking-widest bg-poke-yellow text-poke-navy px-12 py-4 rounded-2xl shadow-[0_5px_0_#C7A008] hover:translate-y-[2px] hover:shadow-[0_3px_0_#C7A008] transition-all w-64 flex items-center justify-center gap-3"
              >
                <Gamepad2 className="w-6 h-6" /> SOLO
              </button>
              <button
                onClick={() => { playIntro(); setMode('multi') }}
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
                    <StartScreen
                      onStart={startGame}
                      onBack={() => setMode(null)}
                      bestScore={bestScore}
                      pool={allPokemon}
                      gameMode={gameMode}
                      onSetGameMode={setGameMode}
                      generation={generation}
                      onSetGeneration={setGeneration}
                      questionCount={questionCount}
                      onSetQuestionCount={setQuestionCount}
                    />
                  </motion.div>
                ) : roundComplete ? (
                  <motion.div key="summary" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
                    <SoloSummary score={score} accuracy={accuracy} bestScore={bestScore} onPlayAgain={startNewRound} onMenu={() => { exitGame(); setMode(null) }} />
                  </motion.div>
                ) : (
                  <motion.div key="game" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
                    <QuizGame pokemon={pokemon} answer={answer} setAnswer={setAnswer} feedback={feedback} revealed={revealed} phase={phase} onReveal={revealImage} score={score} accuracy={accuracy} streak={streak} onSubmit={submitAnswer} onSkip={skipPokemon} onBack={exitGame} gameMode={gameMode} options={options} />
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
                onJoin={(name, code) => { setJoinCode(null); multi.joinRoom(name, code) }}
                onBack={() => { setJoinCode(null); setMode(null) }}
                initialCode={joinCode}
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
                questionCount={multi.questionCount}
                onSetQuestionCount={multi.setQuestionCount}
                generation={multi.generation}
                onSetGeneration={multi.setGeneration}
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
                hostLeft={multi.hostLeft}
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

// ── Solo Round Summary ────────────────────────────────────────────────────────

function SoloSummary({ score, accuracy, bestScore, onPlayAgain, onMenu }) {
  const isNewBest = score.points > 0 && score.points >= (bestScore?.points ?? 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5 px-4 py-8 w-full max-w-md mx-auto"
    >
      <Trophy className="w-14 h-14 text-poke-yellow" />
      <h2 className="font-bangers text-5xl text-poke-yellow tracking-widest">ROUND OVER!</h2>

      {isNewBest && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260 }}
          className="bg-gradient-to-r from-yellow-500/20 to-amber-600/10 border border-yellow-500/30 rounded-2xl px-5 py-2 font-bangers text-xl text-poke-yellow tracking-widest"
        >
          🏆 NEW PERSONAL BEST!
        </motion.div>
      )}

      <div className="flex gap-4 flex-wrap justify-center">
        <div className="bg-poke-dark-blue rounded-2xl px-5 py-3 text-center min-w-[80px]">
          <div className="font-bangers text-3xl text-poke-yellow">{score.points}</div>
          <div className="font-nunito text-xs text-blue-300 flex items-center justify-center gap-1">
            <Star className="w-3 h-3" /> Points
          </div>
        </div>
        <div className="bg-poke-dark-blue rounded-2xl px-5 py-3 text-center min-w-[80px]">
          <div className="font-bangers text-3xl text-white">{accuracy}%</div>
          <div className="font-nunito text-xs text-blue-300 flex items-center justify-center gap-1">
            <Target className="w-3 h-3" /> Accuracy
          </div>
        </div>
        <div className="bg-poke-dark-blue rounded-2xl px-5 py-3 text-center min-w-[80px]">
          <div className="font-bangers text-3xl text-white">{score.correct}/{score.total}</div>
          <div className="font-nunito text-xs text-blue-300">Correct</div>
        </div>
      </div>

      {bestScore?.points > 0 && !isNewBest && (
        <p className="font-nunito text-blue-400 text-sm">
          Personal best: <span className="text-poke-yellow font-700">{bestScore.points} pts</span>
        </p>
      )}

      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onPlayAgain}
          className="font-bangers text-2xl tracking-widest bg-poke-yellow text-poke-navy py-4 rounded-2xl shadow-[0_5px_0_#C7A008] hover:translate-y-[2px] hover:shadow-[0_3px_0_#C7A008] transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" /> PLAY AGAIN
        </button>
        <button
          onClick={onMenu}
          className="font-nunito text-blue-300 text-sm flex items-center justify-center gap-1 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to menu
        </button>
      </div>
    </motion.div>
  )
}
