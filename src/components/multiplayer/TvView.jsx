import { AnimatePresence, motion } from 'framer-motion'
import { Star, Trophy, CheckCircle2, Clock, Tv2 } from 'lucide-react'
import { useTvView } from '../../hooks/useTvView'

const MEDAL_BG = [
  'bg-yellow-400 text-yellow-900',
  'bg-slate-300 text-slate-700',
  'bg-amber-600 text-white',
]
const MEDAL_GLOW = [
  'shadow-[0_0_24px_rgba(250,204,21,0.6)]',
  'shadow-[0_0_16px_rgba(203,213,225,0.4)]',
  'shadow-[0_0_14px_rgba(217,119,6,0.4)]',
]

export default function TvView({ roomCode }) {
  const {
    players,
    pokemon,
    phase,
    questionIndex,
    totalQuestions,
    firstCorrect,
    gameOver,
    gameStarted,
    silhouetteCountdown,
    answeredPlayers,
    flashMap,
  } = useTvView(roomCode)

  const sorted = [...players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))

  return (
    <div className="fixed inset-0 bg-poke-navy overflow-hidden flex flex-col">
      {/* Decorative background grid */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(96,165,250,0.8) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-poke-blue/20 bg-poke-dark-blue/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <Tv2 className="w-6 h-6 text-poke-yellow" />
          <span className="font-bangers text-2xl tracking-widest text-white">WHO'S THAT POKÉMON?</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="font-nunito text-blue-400 text-xs">ROOM</p>
            <p className="font-bangers text-2xl tracking-[0.25em] text-white">{roomCode}</p>
          </div>
          {gameStarted && !gameOver && (
            <div className="text-center">
              <p className="font-nunito text-blue-400 text-xs">QUESTION</p>
              <p className="font-bangers text-2xl text-poke-yellow">
                {questionIndex + 1} / {totalQuestions}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">

        {/* ── Left: Pokémon Panel ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 py-6">
          <AnimatePresence mode="wait">
            {gameOver ? (
              <GameOverPanel key="gameover" players={sorted} />
            ) : !gameStarted ? (
              <WaitingPanel key="waiting" roomCode={roomCode} playerCount={players.length} />
            ) : (
              <QuestionPanel
                key="question"
                pokemon={pokemon}
                phase={phase}
                silhouetteCountdown={silhouetteCountdown}
                firstCorrect={firstCorrect}
                questionIndex={questionIndex}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: Scoreboard ────────────────────────────────────────── */}
        <div className="w-[380px] xl:w-[440px] shrink-0 border-l border-poke-blue/20 bg-poke-dark-blue/50 backdrop-blur flex flex-col">
          <div className="px-6 py-4 border-b border-poke-blue/20">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-poke-yellow" />
              <h2 className="font-bangers text-2xl tracking-widest text-poke-yellow">SCOREBOARD</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            <AnimatePresence>
              {sorted.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-nunito text-blue-400 text-sm text-center py-8"
                >
                  Waiting for players to join…
                </motion.p>
              ) : (
                sorted.map((player, i) => (
                  <PlayerCard
                    key={player.name}
                    player={player}
                    rank={i}
                    answered={answeredPlayers.has(player.name)}
                    flashKey={flashMap[player.name]}
                    isFirst={i === 0 && (player.points ?? 0) > 0}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Player Card ──────────────────────────────────────────────────────────────

function PlayerCard({ player, rank, answered, flashKey, isFirst }) {
  return (
    <motion.div
      layout
      layoutId={`player-${player.name}`}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 } }}
      className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 overflow-hidden
        ${isFirst
          ? 'bg-gradient-to-r from-yellow-500/20 to-poke-dark-blue border border-yellow-400/40'
          : 'bg-poke-navy/80 border border-poke-blue/20'
        } ${rank < 3 ? MEDAL_GLOW[rank] : ''}`}
    >
      {/* Score flash overlay */}
      <AnimatePresence>
        {flashKey && (
          <motion.div
            key={flashKey}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-poke-yellow rounded-2xl pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Rank badge */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bangers text-sm shrink-0
          ${rank < 3 ? MEDAL_BG[rank] : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/40'}`}
      >
        {rank < 3 ? ['1', '2', '3'][rank] : rank + 1}
      </div>

      {/* Name */}
      <span className="flex-1 font-nunito font-800 text-white text-lg leading-tight truncate">
        {player.name}
      </span>

      {/* Answered check */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Points */}
      <div className="flex items-center gap-1 shrink-0">
        <Star className="w-4 h-4 fill-poke-yellow text-poke-yellow" />
        <motion.span
          key={player.points}
          initial={{ scale: 1.5, color: '#facc15' }}
          animate={{ scale: 1, color: '#ffffff' }}
          transition={{ duration: 0.4 }}
          className="font-bangers text-2xl text-white leading-none"
        >
          {player.points ?? 0}
        </motion.span>
      </div>
    </motion.div>
  )
}

// ── Question Panel ───────────────────────────────────────────────────────────

function QuestionPanel({ pokemon, phase, silhouetteCountdown, firstCorrect, questionIndex }) {
  const showSilhouette = phase === 'silhouette'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center gap-6 w-full"
    >
      {/* Phase label */}
      <AnimatePresence mode="wait">
        {showSilhouette ? (
          <motion.div
            key="sil"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-poke-dark-blue/80 rounded-full px-5 py-2 border border-poke-blue/30"
          >
            <Clock className="w-4 h-4 text-poke-yellow" />
            <span className="font-nunito text-blue-200 text-base font-700">Revealing in</span>
            <motion.span
              key={silhouetteCountdown}
              initial={{ scale: 1.5, color: '#facc15' }}
              animate={{ scale: 1, color: '#93c5fd' }}
              className="font-bangers text-2xl text-poke-yellow ml-1"
            >
              {silhouetteCountdown}s
            </motion.span>
          </motion.div>
        ) : (
          <motion.div
            key="rev"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-green-900/40 rounded-full px-5 py-2 border border-green-500/30"
          >
            <span className="font-nunito text-green-300 text-base font-700">
              {firstCorrect ? `${firstCorrect} got it!` : 'Who is it?'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pokémon image — large for TV */}
      <div className="relative flex items-center justify-center w-72 h-72 xl:w-96 xl:h-96">
        {/* Glow */}
        <div className={`absolute inset-0 rounded-full blur-3xl scale-110 transition-colors duration-700
          ${showSilhouette ? 'bg-blue-500/20' : 'bg-poke-yellow/15'}`} />

        <AnimatePresence mode="wait">
          {pokemon && (
            <motion.div
              key={pokemon.id}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="relative z-10"
            >
              <AnimatePresence mode="wait">
                {showSilhouette ? (
                  <motion.img
                    key="sil"
                    src={pokemon.image_url}
                    alt="Who's that Pokémon?"
                    className="w-64 h-64 xl:w-80 xl:h-80 object-contain select-none"
                    style={{
                      filter: pokemon.image_url?.endsWith('.png')
                        ? 'brightness(0) invert(1)'
                        : 'brightness(0.12) contrast(1.5) saturate(0) blur(3px)',
                    }}
                    exit={{ opacity: 0, scale: 1.15 }}
                    transition={{ duration: 0.35 }}
                    draggable={false}
                  />
                ) : (
                  <motion.div className="relative">
                    <motion.img
                      key="rev"
                      src={pokemon.image_url}
                      alt={pokemon.name}
                      className="w-64 h-64 xl:w-80 xl:h-80 object-contain select-none"
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                      draggable={false}
                    />
                    {/* Name reveal */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="absolute -bottom-10 left-0 right-0 text-center"
                    >
                      <span className="font-bangers text-4xl xl:text-5xl tracking-widest text-poke-yellow drop-shadow-[0_0_20px_rgba(250,204,21,0.7)]">
                        {pokemon.name.toUpperCase()}
                      </span>
                      <span className="block font-nunito text-blue-300 text-sm">
                        #{String(pokemon.number).padStart(3, '0')}
                      </span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* First-correct banner */}
      <AnimatePresence>
        {firstCorrect && showSilhouette === false && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-green-700/70 border border-green-400/50 rounded-2xl px-6 py-3"
          >
            <span className="text-2xl">🎉</span>
            <span className="font-bangers text-2xl tracking-widest text-white">
              {firstCorrect} got it first!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Waiting Panel ────────────────────────────────────────────────────────────

function WaitingPanel({ roomCode, playerCount }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      {/* Pokéball spinner */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        className="w-24 h-24 rounded-full border-[6px] border-poke-blue border-t-poke-yellow"
      />
      <div>
        <p className="font-bangers text-4xl text-poke-yellow tracking-widest mb-2">
          WAITING FOR HOST
        </p>
        <p className="font-nunito text-blue-300 text-lg">
          {playerCount === 0
            ? 'No players yet — share the room code!'
            : `${playerCount} player${playerCount === 1 ? '' : 's'} in the lobby`}
        </p>
      </div>
      <div className="bg-poke-dark-blue/80 border border-poke-blue/30 rounded-2xl px-10 py-4">
        <p className="font-nunito text-blue-400 text-sm mb-1">JOIN WITH CODE</p>
        <p className="font-bangers text-6xl tracking-[0.4em] text-white">{roomCode}</p>
      </div>
    </motion.div>
  )
}

// ── Game Over Panel ──────────────────────────────────────────────────────────

function GameOverPanel({ players }) {
  const top = players.slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
      >
        <Trophy className="w-20 h-20 text-poke-yellow drop-shadow-[0_0_30px_rgba(250,204,21,0.7)]" />
      </motion.div>

      <div>
        <p className="font-bangers text-5xl tracking-widest text-poke-yellow drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
          GAME OVER!
        </p>
        {players[0] && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-nunito text-white text-xl mt-2"
          >
            🏆 <strong>{players[0].name}</strong> wins with{' '}
            <span className="text-poke-yellow font-700">{players[0].points ?? 0} points</span>!
          </motion.p>
        )}
      </div>

      {/* Podium */}
      <div className="flex items-end gap-4">
        {[1, 0, 2].map((idx) => {
          const p = top[idx]
          if (!p) return null
          const heights = ['h-24', 'h-32', 'h-20']
          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="font-bangers text-2xl text-white">{p.name}</span>
              <span className="font-bangers text-xl text-poke-yellow flex items-center gap-1">
                <Star className="w-4 h-4 fill-poke-yellow" />{p.points ?? 0}
              </span>
              <div
                className={`w-24 ${heights[idx]} rounded-t-xl flex items-center justify-center font-bangers text-3xl
                  ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-slate-300 text-slate-700' : 'bg-amber-600 text-white'}`}
              >
                {['2nd', '1st', '3rd'][idx]}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
