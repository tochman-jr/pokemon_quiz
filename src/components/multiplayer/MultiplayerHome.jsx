import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gamepad2, Link2 } from 'lucide-react'

export default function MultiplayerHome({ onCreate, onJoin, onBack }) {
  const [mode, setMode]       = useState(null) // 'create' | 'join'
  const [name, setName]       = useState('')
  const [code, setCode]       = useState('')

  function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    onCreate(name.trim())
  }

  function handleJoin(e) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return
    onJoin(name.trim(), code.trim())
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 px-4 py-10 w-full max-w-md mx-auto"
    >
      <h2 className="font-bangers text-5xl text-poke-yellow tracking-widest">MULTIPLAYER</h2>

      {!mode && (
        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={() => setMode('create')}
            className="font-bangers text-2xl tracking-widest bg-poke-yellow text-poke-navy py-4 rounded-2xl shadow-[0_5px_0_#C7A008] hover:translate-y-[2px] hover:shadow-[0_3px_0_#C7A008] transition-all flex items-center justify-center gap-3"
          >
            <Gamepad2 className="w-6 h-6" /> CREATE ROOM
          </button>
          <button
            onClick={() => setMode('join')}
            className="font-bangers text-2xl tracking-widest bg-poke-blue text-white py-4 rounded-2xl shadow-[0_5px_0_rgba(0,0,0,0.3)] hover:translate-y-[2px] transition-all flex items-center justify-center gap-3"
          >
            <Link2 className="w-6 h-6" /> JOIN ROOM
          </button>
          <button
            onClick={onBack}
            className="font-nunito text-blue-300 text-sm mt-2 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="flex flex-col gap-4 w-full">
          <label className="font-nunito text-blue-200 text-sm font-700">Your name</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ash Ketchum"
            maxLength={20}
            className="text-center font-nunito font-700 text-xl text-poke-navy bg-white border-4 border-poke-blue rounded-2xl px-5 py-4 focus:outline-none focus:border-poke-yellow"
          />
          <button
            type="submit"
            className="font-bangers text-2xl tracking-widest bg-poke-yellow text-poke-navy py-4 rounded-2xl shadow-[0_5px_0_#C7A008] hover:translate-y-[2px] hover:shadow-[0_3px_0_#C7A008] transition-all"
          >
            CREATE ROOM
          </button>
          <button type="button" onClick={() => setMode(null)} className="font-nunito text-blue-300 text-sm">
            ← Back
          </button>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={handleJoin} className="flex flex-col gap-4 w-full">
          <label className="font-nunito text-blue-200 text-sm font-700">Your name</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ash Ketchum"
            maxLength={20}
            className="text-center font-nunito font-700 text-xl text-poke-navy bg-white border-4 border-poke-blue rounded-2xl px-5 py-3 focus:outline-none focus:border-poke-yellow"
          />
          <label className="font-nunito text-blue-200 text-sm font-700">Room code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCDE"
            maxLength={5}
            className="text-center font-bangers text-3xl tracking-widest text-poke-navy bg-white border-4 border-poke-blue rounded-2xl px-5 py-3 focus:outline-none focus:border-poke-yellow"
          />
          <button
            type="submit"
            className="font-bangers text-2xl tracking-widest bg-poke-blue text-white py-4 rounded-2xl shadow-[0_5px_0_rgba(0,0,0,0.3)] hover:translate-y-[2px] transition-all"
          >
            JOIN ROOM
          </button>
          <button type="button" onClick={() => setMode(null)} className="font-nunito text-blue-300 text-sm">
            ← Back
          </button>
        </form>
      )}
    </motion.div>
  )
}
