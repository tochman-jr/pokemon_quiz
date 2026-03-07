import { motion } from 'framer-motion'

export default function MultiplayerLobby({ roomCode, players, isHost, onStart }) {
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
            className="flex items-center gap-3 bg-poke-navy/60 rounded-xl px-4 py-2"
          >
            <span className="text-lg">👤</span>
            <span className="font-nunito font-700 text-white">{p.name}</span>
          </div>
        ))}
        {players.length === 0 && (
          <p className="font-nunito text-blue-400 text-sm text-center py-2">Waiting for players…</p>
        )}
      </div>

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
