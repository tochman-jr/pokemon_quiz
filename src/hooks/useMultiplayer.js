import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SILHOUETTE_DURATION = 5000  // ms silhouette is shown before image auto-reveals
const FEEDBACK_DURATION   = 3000  // ms feedback is shown before next question

const normalise = (str) =>
  str.toLowerCase().trim().replace(/[^a-z0-9]/g, '')

export function useMultiplayer() {
  // ── lobby state ──────────────────────────────────────────────────────────
  const [screen, setScreen]         = useState('home')   // 'home'|'lobby'|'game'|'results'
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode]     = useState('')
  const [isHost, setIsHost]         = useState(false)
  const [players, setPlayers]       = useState([])       // { name, points, correct, total }

  // ── game state ────────────────────────────────────────────────────────────
  const [allPokemon, setAllPokemon]   = useState([])
  const [pokemon, setPokemon]         = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [phase, setPhase]             = useState('silhouette') // 'silhouette'|'image'
  const [feedback, setFeedback]       = useState(null)
  const [answer, setAnswer]           = useState('')
  const [answered, setAnswered]       = useState(false)   // this player already answered
  const [firstCorrect, setFirstCorrect] = useState(null)  // name of first correct player
  const [silhouetteCountdown, setSilhouetteCountdown] = useState(SILHOUETTE_DURATION / 1000)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)

  const channelRef     = useRef(null)
  const silTimerRef    = useRef(null)
  const silCountRef    = useRef(null)
  const feedTimerRef   = useRef(null)
  const myScore        = useRef({ points: 0, correct: 0, total: 0 })

  // ── helpers ───────────────────────────────────────────────────────────────
  const broadcast = useCallback((event, payload) => {
    channelRef.current?.send({ type: 'broadcast', event, payload })
  }, [])

  const generateRoomCode = () =>
    Math.random().toString(36).substring(2, 7).toUpperCase()

  // ── load all pokemon once ─────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('pokemons')
      .select('id, number, name, image_url')
      .order('number')
      .then(({ data, error: err }) => {
        if (err || !data) return
        // stable shuffle seeded later by host
        setAllPokemon(data)
      })
  }, [])

  // ── build player list from presence ──────────────────────────────────────
  const buildPlayerList = useCallback((presenceState) => {
    const list = Object.values(presenceState)
      .flat()
      .map((p) => p.meta ?? p)
    setPlayers(list)
  }, [])

  // ── start silhouette countdown (host drives, all clients listen) ──────────
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

  // ── advance to next question (host only) ──────────────────────────────────
  const advanceQuestion = useCallback(
    (currentIndex, pokemonList) => {
      const next = currentIndex + 1
      if (next >= pokemonList.length) {
        broadcast('game_over', {})
        setScreen('results')
        return
      }
      broadcast('question', { index: next })
    },
    [broadcast]
  )

  // ── subscribe to a room channel ───────────────────────────────────────────
  const joinChannel = useCallback(
    (code, name, host) => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      const channel = supabase.channel(`room:${code}`, {
        config: { presence: { key: name } },
      })

      // ── presence: player list ─────────────────────────────────────────────
      channel.on('presence', { event: 'sync' }, () => {
        buildPlayerList(channel.presenceState())
      })

      // ── broadcast: host sends question index ─────────────────────────────
      channel.on('broadcast', { event: 'question' }, ({ payload }) => {
        const idx = payload.index
        setAllPokemon((prev) => {
          setPokemon(prev[idx])
          return prev
        })
        setQuestionIndex(idx)
        setAnswered(false)
        setFeedback(null)
        setAnswer('')
        setFirstCorrect(null)
        startSilhouetteTimer()
      })

      // ── broadcast: someone answered correctly ─────────────────────────────
      channel.on('broadcast', { event: 'correct_answer' }, ({ payload }) => {
        // payload: { name, points, phase }
        setFirstCorrect(payload.name)
        // Update that player's score in the list
        setPlayers((prev) =>
          prev.map((p) =>
            p.name === payload.name
              ? { ...p, points: (p.points ?? 0) + payload.points, correct: (p.correct ?? 0) + 1, total: (p.total ?? 0) + 1 }
              : { ...p, total: (p.total ?? 0) + 1 }
          )
        )
      })

      // ── broadcast: reveal image (phase change) ────────────────────────────
      channel.on('broadcast', { event: 'reveal_image' }, () => {
        setPhase('image')
      })

      // ── broadcast: game over ──────────────────────────────────────────────
      channel.on('broadcast', { event: 'game_over' }, () => {
        setScreen('results')
      })

      channel
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              name,
              points: 0,
              correct: 0,
              total: 0,
            })
          }
        })

      channelRef.current = channel
    },
    [buildPlayerList, startSilhouetteTimer]
  )

  // ── create room ───────────────────────────────────────────────────────────
  const createRoom = useCallback(
    async (name) => {
      if (!name.trim()) return
      setError(null)
      setLoading(true)
      const code = generateRoomCode()
      setRoomCode(code)
      setPlayerName(name)
      setIsHost(true)
      myScore.current = { points: 0, correct: 0, total: 0 }
      joinChannel(code, name, true)
      setLoading(false)
      setScreen('lobby')
    },
    [joinChannel]
  )

  // ── join room ─────────────────────────────────────────────────────────────
  const joinRoom = useCallback(
    async (name, code) => {
      if (!name.trim() || !code.trim()) return
      setError(null)
      setLoading(true)
      setRoomCode(code.toUpperCase())
      setPlayerName(name)
      setIsHost(false)
      myScore.current = { points: 0, correct: 0, total: 0 }
      joinChannel(code.toUpperCase(), name, false)
      setLoading(false)
      setScreen('lobby')
    },
    [joinChannel]
  )

  // ── start game (host only) ────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (!isHost || allPokemon.length === 0) return
    // shuffle using Fisher-Yates
    const shuffled = [...allPokemon].sort(() => Math.random() - 0.5).slice(0, 20)
    setAllPokemon(shuffled)
    setQuestionIndex(0)
    setPokemon(shuffled[0])
    setAnswered(false)
    setFeedback(null)
    setFirstCorrect(null)
    broadcast('question', { index: 0 })
    startSilhouetteTimer()
    setScreen('game')
  }, [isHost, allPokemon, broadcast, startSilhouetteTimer])

  // ── submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = useCallback(
    (userAnswer) => {
      if (answered || !pokemon) return
      setAnswered(true)

      const isCorrect = normalise(userAnswer) === normalise(pokemon.name)

      if (isCorrect) {
        const alreadyAnswered = firstCorrect !== null
        // First correct gets bonus points
        const basePoints = phase === 'silhouette' ? (alreadyAnswered ? 3 : 5) : (alreadyAnswered ? 1 : 3)
        myScore.current.points  += basePoints
        myScore.current.correct += 1
        myScore.current.total   += 1

        setFeedback(phase === 'silhouette'
          ? (alreadyAnswered ? 'correct3' : 'correct5')
          : (alreadyAnswered ? 'correct1' : 'correct3'))

        // Update own presence score
        channelRef.current?.track({
          name: playerName,
          points:  myScore.current.points,
          correct: myScore.current.correct,
          total:   myScore.current.total,
        })

        // Broadcast win to all players
        broadcast('correct_answer', {
          name:   playerName,
          points: basePoints,
          phase,
        })

        // Host advances after feedback delay
        if (isHost) {
          clearTimeout(feedTimerRef.current)
          feedTimerRef.current = setTimeout(() => {
            advanceQuestion(questionIndex, allPokemon)
          }, FEEDBACK_DURATION)
        }
      } else {
        myScore.current.total += 1
        setFeedback('wrong')
        channelRef.current?.track({
          name:    playerName,
          points:  myScore.current.points,
          correct: myScore.current.correct,
          total:   myScore.current.total,
        })
      }

      setAnswer(userAnswer)
    },
    [answered, pokemon, phase, firstCorrect, playerName, isHost, questionIndex, allPokemon, broadcast, advanceQuestion]
  )

  // ── manual reveal (host or player hint) ──────────────────────────────────
  const revealImage = useCallback(() => {
    clearTimeout(silTimerRef.current)
    clearInterval(silCountRef.current)
    setPhase('image')
    if (isHost) broadcast('reveal_image', {})
  }, [isHost, broadcast])

  // ── skip (host only) ──────────────────────────────────────────────────────
  const skipQuestion = useCallback(() => {
    if (!isHost) return
    clearTimeout(feedTimerRef.current)
    advanceQuestion(questionIndex, allPokemon)
  }, [isHost, questionIndex, allPokemon, advanceQuestion])

  // ── cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(silTimerRef.current)
      clearInterval(silCountRef.current)
      clearTimeout(feedTimerRef.current)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  return {
    // lobby
    screen, setScreen,
    playerName, setPlayerName,
    roomCode,
    isHost,
    players,
    loading,
    error,
    // game
    pokemon,
    phase,
    silhouetteCountdown,
    questionIndex,
    feedback,
    answer, setAnswer,
    answered,
    firstCorrect,
    myScore: myScore.current,
    // actions
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    revealImage,
    skipQuestion,
  }
}
