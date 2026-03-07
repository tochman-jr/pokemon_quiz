import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function AnswerForm({ answer, setAnswer, onSubmit, onSkip, disabled }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus()
    }
  }, [disabled])

  function handleSubmit(e) {
    e.preventDefault()
    if (!answer.trim()) return
    onSubmit(answer)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <motion.div
        className="w-full"
        animate={disabled ? {} : { y: [0, -2, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={disabled}
          placeholder="Type Pokémon name…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className="
            w-full text-center font-nunito font-700 text-xl text-poke-navy
            bg-white border-4 border-poke-blue rounded-2xl px-5 py-4
            placeholder:text-blue-200 focus:outline-none focus:border-poke-yellow
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        />
      </motion.div>

      <div className="flex gap-4 w-full">
        <motion.button
          type="submit"
          disabled={disabled || !answer.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="
            flex-1 font-bangers text-2xl tracking-widest
            bg-poke-yellow text-poke-navy py-3 rounded-2xl
            shadow-[0_5px_0_#C7A008] hover:shadow-[0_2px_0_#C7A008] hover:translate-y-[3px]
            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
            transition-all duration-100
          "
        >
          GUESS!
        </motion.button>

        <motion.button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="
            font-nunito font-700 text-sm
            bg-poke-dark-blue text-blue-200 px-5 py-3 rounded-2xl
            hover:bg-poke-navy
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        >
          Skip
        </motion.button>
      </div>
    </form>
  )
}
