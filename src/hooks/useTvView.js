import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SILHOUETTE_DURATION = 5000 // must match useMultiplayer.js

export function useTvView(roomCode) {
  const [players, setPlayers]                   = useState([])
  const [pokemon, setPokemon]                   = useState(null)
  const [phase, setPhase]                       = useState('silhouette')
  const [questionIndex, setQuestionIndex]       = useState(0)
  const [totalQuestions, setTotalQuestions]     = useState(20)
  const [firstCorrect, setFirstCorrect]         = useState(null)
  const [gameOver, setGameOver]                 = useState(false)
  const [gameStarted, setGameStarted]           = useState(false)
  const [silhouetteCountdown, setSilhouetteCountdown] = useState(SILHOUETTE_DURATION / 1000)
  // set of player names who answered correctly this question
  const [answeredPlayers, setAnsweredPlayers]   = useState(new Set())
  // flash map: { [name]: timestamp } — used to trigger a score flash animation
  const [flashMap, setFlashMap]                 = useState({})

  const allPokemonRef = useRef([])
  const silTimerRef   = useRef(null)
  const silCountRef   = useRef(null)

  const startSilhouetteTimer = useCallback(() => {
    clearInterval(silCountRef.current)
    clearTimeout(silTimerRef.current)

    setSilhouetteCountdown(SILHOUETTE_DURATION / 1000)
    setPhase('silhouette')

    let secs = SILHOUETTE_DURATION / 1000
    silCountRef.current = setInterval(() => {
      secs -= 1
      setSilhouetteCountdown(secs)
      if (secs <= 0) clearInterval(silCountRef.current)
    }, 1000)

    silTimerRef.current = setTimeout(() => {
      setPhase('image')
    }, SILHOUETTE_DURATION)
  }, [])

  useEffect(() => {
    if (!roomCode) return

    // Join the room channel as a silent spectator (no presence track)
    const channel = supabase.channel(`room:${roomCode}`)

    // ── presence: sync player list ────────────────────────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const list  = Object.values(state).flat().map((p) => p.meta ?? p)
      setPlayers(list)
    })

    // ── broadcast: new question ────────────────────────────────────────────
    channel.on('broadcast', { event: 'question' }, ({ payload }) => {
      const idx      = payload.index
      const gameList = payload.gameList ?? null

      if (gameList) {
        allPokemonRef.current = gameList
        setTotalQuestions(gameList.length)
      }

      // Use the pokemon object sent directly in the payload (works even if the
      // TV view was opened after Q0 and never received the gameList).
      const poke = payload.pokemon ?? allPokemonRef.current[idx] ?? null
      setPokemon(poke)

      setQuestionIndex(idx)
      setFirstCorrect(null)
      setAnsweredPlayers(new Set())
      setGameStarted(true)
      setGameOver(false)
      startSilhouetteTimer()
    })

    // ── broadcast: a player answered correctly ─────────────────────────────
    channel.on('broadcast', { event: 'correct_answer' }, ({ payload }) => {
      const { name, points } = payload

      setFirstCorrect(name)
      setAnsweredPlayers((prev) => new Set([...prev, name]))

      // Update score in the player list
      setPlayers((prev) =>
        prev.map((p) =>
          p.name === name
            ? { ...p, points: (p.points ?? 0) + points, correct: (p.correct ?? 0) + 1, total: (p.total ?? 0) + 1 }
            : { ...p, total: (p.total ?? 0) + 1 }
        )
      )

      // Trigger score flash
      setFlashMap((prev) => ({ ...prev, [name]: Date.now() }))
    })

    // ── broadcast: host manually revealed the image ────────────────────────
    channel.on('broadcast', { event: 'reveal_image' }, () => {
      clearInterval(silCountRef.current)
      clearTimeout(silTimerRef.current)
      setPhase('image')
    })

    // ── broadcast: game over ───────────────────────────────────────────────
    channel.on('broadcast', { event: 'game_over' }, () => {
      clearInterval(silCountRef.current)
      clearTimeout(silTimerRef.current)
      setGameOver(true)
      setPhase('image')
    })

    channel.subscribe()

    return () => {
      clearInterval(silCountRef.current)
      clearTimeout(silTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [roomCode, startSilhouetteTimer])

  return {
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
  }
}
