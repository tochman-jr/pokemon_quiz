import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { isAnswerCorrect } from '../lib/fuzzyMatch'
import { sounds } from '../lib/sounds'

const FEEDBACK_DURATION = 2000
const ROUND_LENGTH = 20
const STREAK_MILESTONES = new Set([5, 10, 15, 20])

function generateOptions(correctPokemon, fullList) {
  const wrong = fullList
    .filter((p) => p.id !== correctPokemon.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((p) => p.name)
  return [correctPokemon.name, ...wrong].sort(() => Math.random() - 0.5)
}

export function useQuiz() {
  const [pokemon, setPokemon] = useState(null)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ points: 0, correct: 0, total: 0 })
  const [phase, setPhase] = useState('silhouette') // 'silhouette' | 'image'
  const [gameStarted, setGameStarted] = useState(false)
  const [streak, setStreak] = useState(0)

  // ── persistent / session extras ───────────────────────────────────────────
  const [allPokemon, setAllPokemon] = useState([])
  const allPokemonRef = useRef([])
  const [bestScore, setBestScore] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pokequiz-best') ?? 'null') ?? { points: 0, streak: 0 } }
    catch { return { points: 0, streak: 0 } }
  })
  const [streakMilestone, setStreakMilestone] = useState(null)
  const [roundComplete, setRoundComplete] = useState(false)

  // ── game mode ─────────────────────────────────────────────────────────────
  const [gameMode, setGameMode] = useState('open') // 'open' | 'choice'
  const gameModeRef = useRef('open')
  const [options, setOptions] = useState([])

  // Fetch all 151 pokemon and shuffle them into a queue
  const loadPokemon = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: dbError } = await supabase
        .from('pokemons')
        .select('id, number, name, image_url')
        .order('number', { ascending: true })

      if (dbError) throw dbError
      if (!data || data.length === 0) throw new Error('No Pokemon found in database. Run "npm run scrape" first.')

      setAllPokemon(data) // keep full unshuffled pool for background decoration
      allPokemonRef.current = data
      const shuffled = [...data].sort(() => Math.random() - 0.5)
      setQueue(shuffled)
      setPokemon(shuffled[0])
      setPhase('silhouette')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const nextPokemon = useCallback(() => {
    setQueue((prev) => {
      if (prev.length <= 1) {
        // Re-shuffle when we run out
        const reshuffled = [...prev].sort(() => Math.random() - 0.5)
        setPokemon(reshuffled[0])
        return reshuffled.slice(1)
      }
      setPokemon(prev[1])
      // Preload the image two ahead so it's ready when we get there
      if (prev[2]) {
        const img = new Image()
        img.src = prev[2].image_url
      }
      return prev.slice(1)
    })
    setAnswer('')
    setFeedback(null)
    setRevealed(false)
    setPhase('silhouette')
  }, [])

  // Regenerate MC options whenever the current pokemon changes
  useEffect(() => {
    if (gameModeRef.current === 'choice' && pokemon && allPokemonRef.current.length > 0) {
      setOptions(generateOptions(pokemon, allPokemonRef.current))
    } else {
      setOptions([])
    }
  }, [pokemon])

  const changeGameMode = useCallback((mode) => {
    gameModeRef.current = mode
    setGameMode(mode)
    if (mode === 'choice' && pokemon && allPokemonRef.current.length > 0) {
      setOptions(generateOptions(pokemon, allPokemonRef.current))
    } else {
      setOptions([])
    }
  }, [pokemon])

  const submitAnswer = useCallback(
    (userAnswer) => {
      if (feedback !== null || !pokemon) return // already answered

      const isCorrect = isAnswerCorrect(userAnswer, pokemon.name)
      sounds[isCorrect ? 'correct' : 'wrong']()

      const pointsEarned = isCorrect ? (phase === 'silhouette' ? 3 : 1) : 0
      setFeedback(isCorrect ? (phase === 'silhouette' ? 'correct3' : 'correct1') : 'wrong')
      setRevealed(true)
      setScore((prev) => ({
        points: prev.points + pointsEarned,
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
      }))

      const newStreak = isCorrect ? streak + 1 : 0
      setStreak(newStreak)

      // Streak milestone toast
      if (isCorrect && STREAK_MILESTONES.has(newStreak)) {
        sounds.streak()
        setStreakMilestone(newStreak)
        setTimeout(() => setStreakMilestone(null), 2500)
      }

      // Persist best streak
      if (newStreak > (bestScore.streak ?? 0)) {
        const updated = { ...bestScore, streak: newStreak }
        setBestScore(updated)
        localStorage.setItem('pokequiz-best', JSON.stringify(updated))
      }

      setTimeout(() => {
        nextPokemon()
      }, FEEDBACK_DURATION)
    },
    [feedback, pokemon, phase, nextPokemon, streak, bestScore]
  )

  const revealImage = useCallback(() => {
    setPhase('image')
  }, [])

  const skipPokemon = useCallback(() => {
    if (feedback !== null) return
    sounds.skip()
    setFeedback('skipped')
    setRevealed(true)
    setScore((prev) => ({ ...prev, total: prev.total + 1 }))
    setStreak(0)
    setTimeout(() => {
      nextPokemon()
    }, FEEDBACK_DURATION)
  }, [feedback, nextPokemon])

  const startGame = useCallback(() => {
    setScore({ points: 0, correct: 0, total: 0 })
    setStreak(0)
    setPhase('silhouette')
    setRoundComplete(false)
    setGameStarted(true)
  }, [])

  const exitGame = useCallback(() => {
    setGameStarted(false)
  }, [])

  const startNewRound = useCallback(() => {
    setScore({ points: 0, correct: 0, total: 0 })
    setStreak(0)
    setRoundComplete(false)
    setPhase('silhouette')
    setAnswer('')
    setFeedback(null)
    setRevealed(false)
    nextPokemon()
  }, [nextPokemon])

  // Trigger round summary after ROUND_LENGTH answers and persist best points
  useEffect(() => {
    if (score.total > 0 && score.total % ROUND_LENGTH === 0 && !roundComplete) {
      setRoundComplete(true)
      if (score.points > (bestScore.points ?? 0)) {
        const updated = { points: score.points, streak: Math.max(bestScore.streak ?? 0, streak) }
        setBestScore(updated)
        localStorage.setItem('pokequiz-best', JSON.stringify(updated))
      }
    }
  }, [score.total]) // intentionally omit others — only fires on total change

  useEffect(() => {
    loadPokemon()
  }, [loadPokemon])

  const accuracy =
    score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0

  return {
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
    reloadPokemon: loadPokemon,
    allPokemon,
    bestScore,
    streakMilestone,
    roundComplete,
    gameMode,
    setGameMode: changeGameMode,
    options,
  }
}
