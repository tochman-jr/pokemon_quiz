import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { isAnswerCorrect } from '../lib/fuzzyMatch'

const FEEDBACK_DURATION = 2000 // ms before advancing to next pokemon

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
      return prev.slice(1)
    })
    setAnswer('')
    setFeedback(null)
    setRevealed(false)
    setPhase('silhouette')
  }, [])

  const submitAnswer = useCallback(
    (userAnswer) => {
      if (feedback !== null || !pokemon) return // already answered

      const isCorrect = isAnswerCorrect(userAnswer, pokemon.name)

      const pointsEarned = isCorrect ? (phase === 'silhouette' ? 3 : 1) : 0
      setFeedback(isCorrect ? (phase === 'silhouette' ? 'correct3' : 'correct1') : 'wrong')
      setRevealed(true)
      setScore((prev) => ({
        points: prev.points + pointsEarned,
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
      }))
      setStreak((prev) => (isCorrect ? prev + 1 : 0))

      setTimeout(() => {
        nextPokemon()
      }, FEEDBACK_DURATION)
    },
    [feedback, pokemon, phase, nextPokemon]
  )

  const revealImage = useCallback(() => {
    setPhase('image')
  }, [])

  const skipPokemon = useCallback(() => {
    if (feedback !== null) return
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
    setGameStarted(true)
  }, [])

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
    submitAnswer,
    skipPokemon,
    reloadPokemon: loadPokemon,
  }
}
