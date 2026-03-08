import { motion } from 'framer-motion'
import { User, Type, List } from 'lucide-react'

export default function MultiplayerLobby({ roomCode, players, isHost, gameMode, onSetGameMode, onStart }) {
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
