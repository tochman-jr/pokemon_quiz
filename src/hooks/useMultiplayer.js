import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { isAnswerCorrect } from '../lib/fuzzyMatch'

const SILHOUETTE_DURATION = 5000  // ms silhouette is shown before image auto-reveals
const FEEDBACK_DURATION   = 3000  // ms feedback is shown before next question

// Pick the correct pokemon name + 3 random wrong names, then shuffle them.
function generateOptions(correctPokemon, fullList) {
  const wrong = fullList
    .filter((p) => p.id !== correctPokemon.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((p) => p.name)
  return [correctPokemon.name, ...wrong].sort(() => Math.random() - 0.5)
}

export function useMultiplayer() {
  // ── lobby state ──────────────────────────────────────────────────────────
  const [screen, setScreen]         = useState('home')   // 'home'|'lobby'|'game'|'results'
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode]     = useState('')
  const [isHost, setIsHost]         = useState(false)
  const [players, setPlayers]       = useState([])       // { name, points, correct, total }

  // ── game state ────────────────────────────────────────────────────────────
  const [allPokemon, setAllPokemon]       = useState([])
  const [pokemon, setPokemon]             = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [phase, setPhase]                 = useState('silhouette')
  const [feedback, setFeedback]           = useState(null)
  const [answer, setAnswer]               = useState('')
  const [answered, setAnswered]           = useState(false)
  const [firstCorrect, setFirstCorrect]   = useState(null)
  const [silhouetteCountdown, setSilhouetteCountdown] = useState(SILHOUETTE_DURATION / 1000)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)

  const channelRef   = useRef(null)
  const silTimerRef  = useRef(null)
  const silCountRef  = useRef(null)
  const feedTimerRef = useRef(null)
  const myScore      = useRef({ points: 0, correct: 0, total: 0 })

  // Refs that always hold the latest mutable game values so stale closures
  // (e.g. inside joinChannel event handlers) can still read current state.
  const questionIndexRef  = useRef(0)
  const allPokemonRef     = useRef([])
  const advanceRef        = useRef(null) // set at render time below

  // ── per-question history (for results screen) ─────────────────────────────
  // { pokemon, winnerName, winnerPoints, winnerPhase }
  const historyRef       = useRef([])
  const currentWinnerRef = useRef({ name: null, points: 0, phase: null })
  const hasStartedRef    = useRef(false)
  const [gameHistory, setGameHistory] = useState([])

  // ── game mode (open / multiple choice) ───────────────────────────────────
  const [gameMode, setGameMode] = useState('open')   // 'open' | 'choice'
  const gameModeRef             = useRef('open')
  const [options, setOptions]   = useState([])        // MC answer options for current Q
  const fullPokemonListRef      = useRef([])           // all 151 pokemon, never overwritten

  // ── question count (0 = unlimited) ───────────────────────────────────────
  const [questionCount, setQuestionCount] = useState(10)
  const questionCountRef                  = useRef(10)

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
        setAllPokemon(data)
        allPokemonRef.current = data
        fullPokemonListRef.current = data
      })
  }, [])

  // ── build player list from presence ──────────────────────────────────────
  const buildPlayerList = useCallback((presenceState) => {
    const list = Object.values(presenceState)
      .flat()
      .map((p) => p.meta ?? p)
    setPlayers(list)
  }, [])

  // ── start silhouette countdown ────────────────────────────────────────────
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
  // IMPORTANT: this function must update the HOST's own local state AND
  // broadcast to other players, because Supabase does not deliver a client's
  // own broadcast back to itself.
  const advanceQuestion = useCallback(
    (currentIndex, pokemonList) => {
      // Save completed question to history
      historyRef.current.push({
        pokemon:      pokemonList[currentIndex],
        winnerName:   currentWinnerRef.current.name,
        winnerPoints: currentWinnerRef.current.points,
        winnerPhase:  currentWinnerRef.current.phase,
      })
      currentWinnerRef.current = { name: null, points: 0, phase: null }

      const next = currentIndex + 1
      if (next >= pokemonList.length) {
        setGameHistory([...historyRef.current])
        broadcast('game_over', {})
        setScreen('results')
        return
      }

      // Generate MC options for next question (empty array in open mode)
      const opts = gameModeRef.current === 'choice'
        ? generateOptions(pokemonList[next], fullPokemonListRef.current)
        : []

      // Update host state directly
      setPokemon(pokemonList[next])
      setQuestionIndex(next)
      questionIndexRef.current = next
      setAnswered(false)
      setFeedback(null)
      setAnswer('')
      setFirstCorrect(null)
      setOptions(opts)
      startSilhouetteTimer()

      // Notify other players. Include the pokemon object so spectator TV views
      // don't need to have received the full gameList from Q0.
      broadcast('question', { index: next, gameMode: gameModeRef.current, options: opts, pokemon: pokemonList[next] })
    },
    [broadcast, startSilhouetteTimer]
  )

  // Keep advanceRef pointing to the latest advanceQuestion so stale closures
  // inside joinChannel can still call the up-to-date version.
  advanceRef.current = advanceQuestion

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
      // The host drives its own state directly in advanceQuestion / startGame,
      // so only non-host players need to react here.
      channel.on('broadcast', { event: 'question' }, ({ payload }) => {
        if (host) return // host manages its own state

        const idx      = payload.index
        const gameList = payload.gameList ?? null // included in Q0 to sync shuffle

        // Save previous question to history (except on the very first question)
        if (hasStartedRef.current) {
          const prevPokemon = allPokemonRef.current[questionIndexRef.current]
          if (prevPokemon) {
            historyRef.current.push({
              pokemon:      prevPokemon,
              winnerName:   currentWinnerRef.current.name,
              winnerPoints: currentWinnerRef.current.points,
              winnerPhase:  currentWinnerRef.current.phase,
            })
            currentWinnerRef.current = { name: null, points: 0, phase: null }
          }
        }
        hasStartedRef.current = true

        if (gameList) {
          // First question: store the host's shuffled list and index into it
          setAllPokemon(gameList)
          allPokemonRef.current = gameList
          setPokemon(gameList[idx])
        } else {
          // Subsequent questions: allPokemon is already the game list
          setAllPokemon((prev) => {
            setPokemon(prev[idx])
            return prev
          })
        }

        setQuestionIndex(idx)
        questionIndexRef.current = idx
        setAnswered(false)
        setFeedback(null)
        setAnswer('')
        setFirstCorrect(null)
        // Sync game mode and MC options from host
        if (payload.gameMode) {
          gameModeRef.current = payload.gameMode
          setGameMode(payload.gameMode)
        }
        setOptions(payload.options ?? [])
        setScreen('game')
        startSilhouetteTimer()
      })

      // ── broadcast: someone answered correctly ─────────────────────────────
      channel.on('broadcast', { event: 'correct_answer' }, ({ payload }) => {
        // Track current question winner for history
        currentWinnerRef.current = { name: payload.name, points: payload.points, phase: payload.phase }
        setFirstCorrect(payload.name)
        setPlayers((prev) =>
          prev.map((p) =>
            p.name === payload.name
              ? { ...p, points: (p.points ?? 0) + payload.points, correct: (p.correct ?? 0) + 1, total: (p.total ?? 0) + 1 }
              : { ...p, total: (p.total ?? 0) + 1 }
          )
        )

        // If this client is the host, a NON-HOST player just answered correctly.
        // (The host never receives its own broadcasts, so this is always from another player.)
        // Trigger the advance timer so the game progresses.
        if (host) {
          clearTimeout(feedTimerRef.current)
          feedTimerRef.current = setTimeout(() => {
            advanceRef.current(questionIndexRef.current, allPokemonRef.current)
          }, FEEDBACK_DURATION)
        }
      })

      // ── broadcast: reveal image (phase change) ────────────────────────────
      channel.on('broadcast', { event: 'reveal_image' }, () => {
        setPhase('image')
      })

      // ── broadcast: game over ──────────────────────────────────────────────
      channel.on('broadcast', { event: 'game_over' }, () => {
        if (!host) {
          // Save the last question for non-host players
          const lastPokemon = allPokemonRef.current[questionIndexRef.current]
          if (lastPokemon) {
            historyRef.current.push({
              pokemon:      lastPokemon,
              winnerName:   currentWinnerRef.current.name,
              winnerPoints: currentWinnerRef.current.points,
              winnerPhase:  currentWinnerRef.current.phase,
            })
          }
          setGameHistory([...historyRef.current])
        }
        setScreen('results')
      })

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name, points: 0, correct: 0, total: 0 })
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

    // 0 means unlimited — use all 151; otherwise slice to requested count
    const count   = questionCountRef.current
    const shuffled = [...allPokemon]
      .sort(() => Math.random() - 0.5)
      .slice(0, count > 0 ? count : allPokemon.length)

    // Reset history for new game
    historyRef.current = []
    currentWinnerRef.current = { name: null, points: 0, phase: null }
    hasStartedRef.current = false
    setGameHistory([])

    // Generate MC options for Q0 (empty in open mode)
    const opts = gameModeRef.current === 'choice'
      ? generateOptions(shuffled[0], fullPokemonListRef.current)
      : []

    // Update host state
    setAllPokemon(shuffled)
    allPokemonRef.current = shuffled
    setQuestionIndex(0)
    questionIndexRef.current = 0
    setPokemon(shuffled[0])
    setAnswered(false)
    setFeedback(null)
    setFirstCorrect(null)
    setOptions(opts)
    startSilhouetteTimer()
    setScreen('game')

    // Broadcast Q0 with the full game list so non-host players can sync the shuffle.
    // Also include gameMode and options so everyone is in sync.
    broadcast('question', { index: 0, gameList: shuffled, gameMode: gameModeRef.current, options: opts, pokemon: shuffled[0] })
  }, [isHost, allPokemon, broadcast, startSilhouetteTimer])

  // ── submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = useCallback(
    (userAnswer) => {
      if (answered || !pokemon) return
      setAnswered(true)

      const isCorrect = isAnswerCorrect(userAnswer, pokemon.name)

      if (isCorrect) {
        const alreadyAnswered = firstCorrect !== null
        const basePoints = phase === 'silhouette' ? (alreadyAnswered ? 3 : 5) : (alreadyAnswered ? 1 : 3)
        myScore.current.points  += basePoints
        myScore.current.correct += 1
        myScore.current.total   += 1

        setFeedback(phase === 'silhouette'
          ? (alreadyAnswered ? 'correct3' : 'correct5')
          : (alreadyAnswered ? 'correct1' : 'correct3'))

        channelRef.current?.track({
          name:    playerName,
          points:  myScore.current.points,
          correct: myScore.current.correct,
          total:   myScore.current.total,
        })

        broadcast('correct_answer', { name: playerName, points: basePoints, phase })

        // Host advances after feedback delay when HOST answers correctly.
        // (When a non-host answers correctly, the correct_answer handler above handles it.)
        if (isHost) {
          clearTimeout(feedTimerRef.current)
          feedTimerRef.current = setTimeout(() => {
            advanceRef.current(questionIndexRef.current, allPokemonRef.current)
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
    [answered, pokemon, phase, firstCorrect, playerName, isHost, broadcast]
  )

  // ── manual reveal (host broadcasts, all clients listen) ──────────────────
  const revealImage = useCallback(() => {
    clearTimeout(silTimerRef.current)
    clearInterval(silCountRef.current)
    setPhase('image')
    if (isHost) broadcast('reveal_image', {})
  }, [isHost, broadcast])

  // ── toggle game mode (host only, lobby) ─────────────────────────────────
  const toggleGameMode = useCallback((mode) => {
    gameModeRef.current = mode
    setGameMode(mode)
  }, [])

  // ── set question count (host only, lobby) ──────────────────────────────
  const changeQuestionCount = useCallback((n) => {
    questionCountRef.current = n
    setQuestionCount(n)
  }, [])

  // ── skip question (host only) ─────────────────────────────────────────────
  const skipQuestion = useCallback(() => {
    if (!isHost) return
    clearTimeout(feedTimerRef.current)
    advanceRef.current(questionIndexRef.current, allPokemonRef.current)
  }, [isHost])

  // ── quit game early (host only) ───────────────────────────────────────────
  const quitGame = useCallback(() => {
    if (!isHost) return
    clearTimeout(feedTimerRef.current)
    clearTimeout(silTimerRef.current)
    clearInterval(silCountRef.current)
    // Save current question to history
    const curPokemon = allPokemonRef.current[questionIndexRef.current]
    if (curPokemon) {
      historyRef.current.push({
        pokemon:      curPokemon,
        winnerName:   currentWinnerRef.current.name,
        winnerPoints: currentWinnerRef.current.points,
        winnerPhase:  currentWinnerRef.current.phase,
      })
    }
    setGameHistory([...historyRef.current])
    broadcast('game_over', {})
    setScreen('results')
  }, [isHost, broadcast])

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
    // game mode
    gameMode,
    setGameMode: toggleGameMode,
    options,
    // question count
    questionCount,
    setQuestionCount: changeQuestionCount,
    // actions
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    revealImage,
    skipQuestion,
    quitGame,
    // history for results
    gameHistory,
  }
}
