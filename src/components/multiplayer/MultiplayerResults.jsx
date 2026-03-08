import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Trophy, ArrowLeft, RotateCcw, Target } from 'lucide-react'

const RANK_STYLE = [
  'bg-yellow-400 text-yellow-900',
  'bg-gray-300 text-gray-700',
  'bg-amber-600 text-white',
]

export default function MultiplayerResults({
  players,
  playerName,
  gameHistory = [],
  isHost,
  onPlayAgain,
  onBackToMenu,
}) {
  const [tab, setTab] = useState('leaderboard')
  const sorted = [...players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
  const winner = sorted[0]
  const isWinner = winner?.name === playerName

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 px-4 py-6 w-full max-w-lg mx-auto"
    >
      {/* Winner banner */}
      {winner && (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="w-full bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/30 rounded-3xl px-5 py-4 text-center"
        >
          <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-1" />
          <p className="font-bangers text-3xl text-poke-yellow tracking-widest">
            {winner.name}
          </p>
          <p className="font-nunito text-blue-200 text-sm">
            wins with{' '}
            <span className="font-800 text-poke-yellow">{winner.points ?? 0} pts</span>
          </p>
          {isWinner && (
            <p className="font-nunito font-700 text-green-400 text-xs mt-1">
              🎉 That&apos;s you!
            </p>
          )}
        </motion.div>
      )}

      {/* Tab bar */}
      <div className="flex w-full gap-2">
        {['leaderboard', 'rounds'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 font-bangers text-lg tracking-widest py-2 rounded-2xl transition-colors capitalize ${
              tab === t
                ? 'bg-poke-yellow text-poke-navy'
                : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/30 hover:bg-poke-blue/20'
            }`}
          >
            {t === 'rounds' ? `Rounds (${gameHistory.length})` : t}
          </button>
        ))}
      </div>

      {/* ── Leaderboard tab ── */}
      {tab === 'leaderboard' && (
        <div className="w-full flex flex-col gap-2">
          {sorted.map((p, i) => {
            const accuracy =
              p.total > 0 ? Math.round(((p.correct ?? 0) / p.total) * 100) : 0
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3
                  ${p.name === playerName
                    ? 'bg-poke-yellow text-poke-navy'
                    : 'bg-poke-dark-blue text-white border border-poke-blue/30'}`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bangers text-sm shrink-0 ${
                    RANK_STYLE[i] ?? 'bg-poke-navy text-blue-300'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="font-nunito font-800 text-base flex-1 min-w-0 truncate">
                  {p.name}
                </span>
                <span className="font-bangers text-xl flex items-center gap-1 shrink-0">
                  <Star className="w-4 h-4 fill-current" /> {p.points ?? 0}
                </span>
                <span className="font-nunito text-xs opacity-60 flex items-center gap-1 shrink-0">
                  <Target className="w-3 h-3" />
                  {p.correct ?? 0}/{p.total ?? 0}
                  <span className="hidden sm:inline ml-1">({accuracy}%)</span>
                </span>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Rounds tab ── */}
      {tab === 'rounds' && (
        <div className="w-full flex flex-col gap-3 overflow-y-auto max-h-[55vh] pr-1">
          {gameHistory.length === 0 ? (
            <p className="text-center font-nunito text-blue-400 text-sm py-6">
              No round data available.
            </p>
          ) : (
            gameHistory.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="w-full bg-poke-navy border border-poke-blue/30 rounded-2xl p-3 flex gap-3"
              >
                {/* Left: image */}
                <div className="shrink-0 w-14 h-14 bg-poke-dark-blue rounded-xl flex items-center justify-center">
                  {q.pokemon?.image_url ? (
                    <img
                      src={q.pokemon.image_url}
                      alt={q.pokemon.name}
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <span className="text-blue-500 text-lg">?</span>
                  )}
                </div>

                {/* Right: stacked text */}
                <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
                  {/* Row 1: index + name + phase pill */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bangers text-sm text-blue-400 shrink-0">#{i + 1}</span>
                    <span className="font-bangers text-lg text-white capitalize leading-none">
                      {q.pokemon?.name ?? '?'}
                    </span>
                    {q.winnerPhase && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                        q.winnerPhase === 'silhouette'
                          ? 'bg-yellow-400/20 text-yellow-300'
                          : 'bg-sky-400/20 text-sky-300'
                      }`}>
                        {q.winnerPhase === 'silhouette' ? 'Silhouette' : 'Revealed'}
                      </span>
                    )}
                  </div>

                  {/* Row 2: winner info */}
                  {q.winnerName ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-400 shrink-0">First:</span>
                      <span className="text-sm text-white font-bold truncate">{q.winnerName}</span>
                      <span className="ml-auto shrink-0 font-bangers text-base text-green-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current" />+{q.winnerPoints}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-blue-500 italic">No one got it</span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 w-full mt-2">
        <button
          onClick={onBackToMenu}
          className="flex-1 flex items-center justify-center gap-2 font-bangers text-xl tracking-widest bg-poke-dark-blue text-blue-300 border border-poke-blue/30 py-3 rounded-2xl hover:bg-poke-blue/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Menu
        </button>
        {isHost && (
          <button
            onClick={onPlayAgain}
            className="flex-1 flex items-center justify-center gap-2 font-bangers text-xl tracking-widest bg-poke-yellow text-poke-navy py-3 rounded-2xl shadow-[0_4px_0_#C7A008] hover:translate-y-[2px] hover:shadow-[0_2px_0_#C7A008] transition-all"
          >
            <RotateCcw className="w-5 h-5" /> Play Again
          </button>
        )}
      </div>
    </motion.div>
  )
}
