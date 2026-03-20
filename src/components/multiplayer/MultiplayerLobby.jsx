import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Type, List, Hash, Globe, Copy, Check } from 'lucide-react'

const COUNT_OPTIONS = [5, 10, 15, 20, 0] // 0 = Unlimited
const GEN_OPTIONS = [
  { value: 'gen1', label: 'Gen 1', sub: '#1–151' },
  { value: 'gen2', label: 'Gen 2', sub: '#152–251' },
  { value: 'both', label: 'Both',  sub: '#1–251' },
]

export default function MultiplayerLobby({
  roomCode, players, isHost,
  gameMode, onSetGameMode,
  questionCount, onSetQuestionCount,
  generation, onSetGeneration,
  onStart,
}) {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 px-4 py-10 w-full max-w-md mx-auto"
    >
      <h2 className="font-bangers text-4xl text-poke-yellow tracking-widest">LOBBY</h2>

      {/* Room code */}
      <div className="bg-poke-dark-blue border-2 border-poke-blue/50 rounded-2xl px-8 py-4 text-center">
        <p className="font-nunito text-blue-300 text-xs mb-1">ROOM CODE</p>
        <p className="font-bangers text-5xl tracking-[0.3em] text-white">{roomCode}</p>
        <p className="font-nunito text-blue-400 text-xs mt-1">Share this with friends</p>
        <button
          onClick={copyCode}
          aria-label="Copy room code"
          className="mt-3 flex items-center gap-1.5 mx-auto font-nunito text-xs text-blue-300 border border-poke-blue/40 rounded-xl px-4 py-1.5 hover:bg-poke-blue/20 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>

      {/* Player list */}
      <div className="w-full bg-poke-dark-blue border border-poke-blue/30 rounded-2xl p-4 flex flex-col gap-2">
        <p className="font-nunito text-blue-300 text-xs font-700 mb-1">
          PLAYERS ({players.length})
        </p>
        {players.map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-3 bg-poke-navy/60 rounded-sm px-4 py-2"
          >
            <User className="w-4 h-4 text-blue-300 shrink-0" />
            <span className="font-nunito font-700 text-white">{p.name}</span>
          </div>
        ))}
        {players.length === 0 && (
          <p className="font-nunito text-blue-400 text-sm text-center py-2">Waiting for players…</p>
        )}
      </div>

      {/* Game mode selector (host only) */}
      {isHost && (
        <div className="w-full flex flex-col gap-2">
          <p className="font-nunito text-blue-300 text-xs font-700 text-center">QUESTION TYPE</p>
          <div className="flex gap-3">
            <button
              onClick={() => onSetGameMode('open')}
              className={`flex-1 flex items-center justify-center gap-2 font-bangers text-xl tracking-widest py-3 rounded-2xl transition-all ${
                gameMode === 'open'
                  ? 'bg-poke-yellow text-poke-navy shadow-[0_4px_0_#C7A008]'
                  : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/30 hover:bg-poke-blue/20'
              }`}
            >
              <Type className="w-5 h-5" /> Open
            </button>
            <button
              onClick={() => onSetGameMode('choice')}
              className={`flex-1 flex items-center justify-center gap-2 font-bangers text-xl tracking-widest py-3 rounded-2xl transition-all ${
                gameMode === 'choice'
                  ? 'bg-poke-yellow text-poke-navy shadow-[0_4px_0_#C7A008]'
                  : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/30 hover:bg-poke-blue/20'
              }`}
            >
              <List className="w-5 h-5" /> Multiple Choice
            </button>
          </div>
        </div>
      )}

      {/* Question count selector (host only) */}
      {isHost && (
        <div className="w-full flex flex-col gap-2">
          <p className="font-nunito text-blue-300 text-xs font-700 text-center flex items-center justify-center gap-1">
            <Hash className="w-3 h-3" /> QUESTIONS
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            {COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onSetQuestionCount(n)}
                className={`font-bangers text-lg tracking-widest px-4 py-2 rounded-2xl transition-all ${
                  questionCount === n
                    ? 'bg-poke-yellow text-poke-navy shadow-[0_3px_0_#C7A008]'
                    : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/30 hover:bg-poke-blue/20'
                }`}
              >
                {n === 0 ? 'Unlimited' : n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generation selector (host only) */}
      {isHost && (
        <div className="w-full flex flex-col gap-2">
          <p className="font-nunito text-blue-300 text-xs font-700 text-center flex items-center justify-center gap-1">
            <Globe className="w-3 h-3" /> GENERATION
          </p>
          <div className="flex gap-2 justify-center">
            {GEN_OPTIONS.map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => onSetGeneration(value)}
                className={`flex flex-col items-center font-bangers tracking-widest px-4 py-2 rounded-2xl transition-all ${
                  generation === value
                    ? 'bg-poke-yellow text-poke-navy shadow-[0_3px_0_#C7A008]'
                    : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/30 hover:bg-poke-blue/20'
                }`}
              >
                <span className="text-base leading-none">{label}</span>
                <span className="text-xs font-nunito font-600 opacity-70 leading-none mt-0.5">{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isHost ? (
        <button
          onClick={onStart}
          disabled={players.length < 1}
          className="font-bangers text-3xl tracking-widest bg-poke-yellow text-poke-navy px-14 py-4 rounded-2xl shadow-[0_6px_0_#C7A008] hover:shadow-[0_3px_0_#C7A008] hover:translate-y-[3px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          START GAME!
        </button>
      ) : (
        <p className="font-nunito text-blue-300 text-sm animate-pulse">
          Waiting for host to start…
        </p>
      )}
    </motion.div>
  )
}
