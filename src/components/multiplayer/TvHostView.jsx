/**
 * TvHostView — full-screen host interface designed for a TV / projector.
 *
 * Route: /#/tv
 *
 * The TV IS the host. It creates a room (without appearing in the player list),
 * controls the game, and displays the current Pokémon + live animated scoreboard.
 * Players join from their phones/laptops using the displayed room code.
 */

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Star, Trophy, Eye, SkipForward, LogOut, Users, Type, List,
  Hash, Play, Tv2, CheckCircle2, RotateCcw, Target,
} from 'lucide-react'
import { useMultiplayer } from '../../hooks/useMultiplayer'

const COUNT_OPTIONS = [5, 10, 20, 0] // 0 = all

const MEDAL_BG   = ['bg-yellow-400 text-yellow-900', 'bg-slate-300 text-slate-700', 'bg-amber-600 text-white']
const MEDAL_GLOW = ['shadow-[0_0_20px_rgba(250,204,21,0.5)]', 'shadow-[0_0_12px_rgba(203,213,225,0.3)]', 'shadow-[0_0_12px_rgba(217,119,6,0.3)]']

// ── Shared helpers ────────────────────────────────────────────────────────────

const joinUrl = `${window.location.origin}${window.location.pathname}`

function PlayerCard({ player, rank, answered = false, flashKey }) {
  return (
    <motion.div
      layout
      layoutId={`tv-player-${player.name}`}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 } }}
      className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 overflow-hidden
        ${rank === 0 && (player.points ?? 0) > 0
          ? 'bg-gradient-to-r from-yellow-500/20 to-poke-dark-blue border border-yellow-400/40'
          : 'bg-poke-navy/80 border border-poke-blue/20'
        } ${rank < 3 ? MEDAL_GLOW[rank] : ''}`}
    >
      {/* Score flash */}
      <AnimatePresence>
        {flashKey && (
          <motion.div
            key={flashKey}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-poke-yellow rounded-2xl pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Rank badge */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bangers text-sm shrink-0
        ${rank < 3 ? MEDAL_BG[rank] : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/40'}`}>
        {rank + 1}
      </div>

      <span className="flex-1 font-nunito font-800 text-white text-lg leading-tight truncate">
        {player.name}
      </span>

      <AnimatePresence>
        {answered && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1 shrink-0">
        <Star className="w-4 h-4 fill-poke-yellow text-poke-yellow" />
        <motion.span
          key={player.points}
          initial={{ scale: 1.5, color: '#facc15' }}
          animate={{ scale: 1, color: '#ffffff' }}
          transition={{ duration: 0.4 }}
          className="font-bangers text-2xl text-white leading-none"
        >
          {player.points ?? 0}
        </motion.span>
      </div>
    </motion.div>
  )
}

// ── Setup screen (before room is created) ─────────────────────────────────────

function SetupScreen({ gameMode, onSetGameMode, questionCount, onSetQuestionCount, onCreate }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-10 h-full text-center px-12"
    >
      <div className="flex flex-col items-center gap-2">
        <Tv2 className="w-14 h-14 text-poke-yellow" />
        <h1 className="font-bangers text-7xl text-poke-yellow tracking-widest drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]">
          TV PARTY HOST
        </h1>
        <p className="font-nunito text-blue-300 text-xl">
          Configure the game, then show this screen to your players.
        </p>
      </div>

      {/* Game mode */}
      <div className="flex flex-col items-center gap-3 w-full max-w-lg">
        <p className="font-nunito text-blue-300 font-700 uppercase tracking-widest text-sm">Question Type</p>
        <div className="flex gap-4 w-full">
          {[['open', <Type key="t" className="w-6 h-6" />, 'Open Answer'],
            ['choice', <List key="l" className="w-6 h-6" />, 'Multiple Choice']].map(([val, icon, label]) => (
            <button
              key={val}
              onClick={() => onSetGameMode(val)}
              className={`flex-1 flex items-center justify-center gap-2 font-bangers text-2xl tracking-widest py-4 rounded-2xl transition-all
                ${gameMode === val
                  ? 'bg-poke-yellow text-poke-navy shadow-[0_5px_0_#C7A008]'
                  : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/30 hover:bg-poke-blue/20'}`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Question count */}
      <div className="flex flex-col items-center gap-3 w-full max-w-lg">
        <p className="font-nunito text-blue-300 font-700 uppercase tracking-widest text-sm flex items-center gap-1">
          <Hash className="w-4 h-4" /> Questions
        </p>
        <div className="flex gap-3">
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => onSetQuestionCount(n)}
              className={`font-bangers text-2xl tracking-widest px-6 py-3 rounded-2xl transition-all
                ${questionCount === n
                  ? 'bg-poke-yellow text-poke-navy shadow-[0_4px_0_#C7A008]'
                  : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/30 hover:bg-poke-blue/20'}`}
            >
              {n === 0 ? 'ALL' : n}
            </button>
          ))}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={onCreate}
        className="font-bangers text-4xl tracking-widest bg-poke-yellow text-poke-navy px-20 py-5 rounded-2xl shadow-[0_8px_0_#C7A008] hover:shadow-[0_4px_0_#C7A008] hover:translate-y-1 transition-all flex items-center gap-3"
      >
        <Play className="w-8 h-8 fill-current" /> CREATE ROOM
      </motion.button>
    </motion.div>
  )
}

// ── Lobby screen ──────────────────────────────────────────────────────────────

function LobbyScreen({ roomCode, players, gameMode, onSetGameMode, questionCount, onSetQuestionCount, onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-1 overflow-hidden"
    >
      {/* Left — join instructions + room code */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-16 border-r border-poke-blue/20">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="flex flex-col items-center gap-4"
        >
          <p className="font-nunito text-blue-300 font-700 uppercase tracking-widest text-lg">
            JOIN THIS GAME
          </p>
          <div className="bg-poke-dark-blue/80 border-2 border-poke-blue/50 rounded-3xl px-16 py-8 text-center">
            <p className="font-nunito text-blue-400 text-sm mb-2 uppercase tracking-widest">Room Code</p>
            <p className="font-bangers text-[8rem] leading-none tracking-[0.3em] text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              {roomCode}
            </p>
          </div>
          <p className="font-nunito text-blue-400 text-base">
            Go to <span className="text-poke-yellow font-700">{joinUrl}</span> and join with this code
          </p>
        </motion.div>
      </div>

      {/* Right — player list + controls */}
      <div className="w-[420px] shrink-0 flex flex-col gap-4 px-6 py-8 overflow-y-auto">
        {/* Player list */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-poke-yellow" />
            <p className="font-bangers text-2xl text-poke-yellow tracking-widest">
              PLAYERS ({players.length})
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {players.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="font-nunito text-blue-400 text-sm text-center py-4 animate-pulse"
                >
                  Waiting for players to join…
                </motion.p>
              ) : players.map((p) => (
                <motion.div
                  key={p.name}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 bg-poke-dark-blue/80 border border-poke-blue/20 rounded-2xl px-4 py-3"
                >
                  <div className="w-8 h-8 rounded-full bg-poke-blue/30 flex items-center justify-center">
                    <span className="font-bangers text-sm text-blue-200">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-nunito font-700 text-white text-base flex-1 truncate">{p.name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="border-t border-poke-blue/20 pt-4 flex flex-col gap-3">
          {/* Game mode */}
          <p className="font-nunito text-blue-400 text-xs uppercase tracking-widest">Question Type</p>
          <div className="flex gap-2">
            {[['open', 'Open'], ['choice', 'Multiple Choice']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => onSetGameMode(val)}
                className={`flex-1 font-bangers text-lg tracking-widest py-2 rounded-xl transition-all
                  ${gameMode === val
                    ? 'bg-poke-yellow text-poke-navy shadow-[0_3px_0_#C7A008]'
                    : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/30 hover:bg-poke-blue/20'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Question count */}
          <p className="font-nunito text-blue-400 text-xs uppercase tracking-widest mt-1">Questions</p>
          <div className="flex gap-2 flex-wrap">
            {COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onSetQuestionCount(n)}
                className={`font-bangers text-lg tracking-widest px-4 py-2 rounded-xl transition-all
                  ${questionCount === n
                    ? 'bg-poke-yellow text-poke-navy shadow-[0_3px_0_#C7A008]'
                    : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/30 hover:bg-poke-blue/20'}`}
              >
                {n === 0 ? 'ALL' : n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={players.length < 1}
          className="mt-auto font-bangers text-3xl tracking-widest bg-poke-yellow text-poke-navy py-5 rounded-2xl shadow-[0_6px_0_#C7A008] hover:shadow-[0_3px_0_#C7A008] hover:translate-y-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <Play className="w-6 h-6 fill-current" /> START GAME!
        </button>
      </div>
    </motion.div>
  )
}

// ── Game screen ───────────────────────────────────────────────────────────────

function GameScreen({
  pokemon, phase, silhouetteCountdown, firstCorrect, questionIndex, totalQuestions,
  players, answeredSet,
  onReveal, onSkip, onQuit,
}) {
  const sorted = [...players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
  const showSilhouette = phase === 'silhouette'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-1 overflow-hidden"
    >
      {/* Left — Pokémon display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 py-6 relative">

        {/* Phase / status pill */}
        <AnimatePresence mode="wait">
          {showSilhouette ? (
            <motion.div
              key="sil-pill"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 bg-poke-dark-blue/80 rounded-full px-6 py-2 border border-poke-blue/30"
            >
              <span className="font-nunito text-blue-200 text-lg font-700">Revealing in</span>
              <motion.span
                key={silhouetteCountdown}
                initial={{ scale: 1.5, color: '#facc15' }}
                animate={{ scale: 1, color: '#93c5fd' }}
                className="font-bangers text-3xl text-poke-yellow ml-1"
              >
                {silhouetteCountdown}s
              </motion.span>
            </motion.div>
          ) : (
            <motion.div
              key="rev-pill"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`flex items-center gap-2 rounded-full px-6 py-2 border
                ${firstCorrect
                  ? 'bg-green-900/50 border-green-500/40'
                  : 'bg-poke-dark-blue/80 border-poke-blue/30'}`}
            >
              <span className={`font-nunito text-lg font-700 ${firstCorrect ? 'text-green-300' : 'text-blue-200'}`}>
                {firstCorrect ? `🎉 ${firstCorrect} got it!` : "Who's that Pokémon?"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pokémon image */}
        <div className="relative flex items-center justify-center w-80 h-80 xl:w-96 xl:h-96">
          <div className={`absolute inset-0 rounded-full blur-3xl scale-110 transition-colors duration-700
            ${showSilhouette ? 'bg-blue-500/20' : 'bg-poke-yellow/15'}`} />
          <AnimatePresence mode="wait">
            {pokemon && (
              <motion.div
                key={pokemon.id}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                className="relative z-10"
              >
                <AnimatePresence mode="wait">
                  {showSilhouette ? (
                    <motion.img
                      key="sil"
                      src={pokemon.image_url}
                      alt="Who's that Pokémon?"
                      className="w-72 h-72 xl:w-88 xl:h-88 object-contain select-none"
                      style={{ filter: 'brightness(0) invert(1)' }}
                      exit={{ opacity: 0, scale: 1.15 }}
                      transition={{ duration: 0.35 }}
                      draggable={false}
                    />
                  ) : (
                    <motion.div className="relative">
                      <motion.img
                        key="rev"
                        src={pokemon.image_url}
                        alt={pokemon.name}
                        className="w-72 h-72 xl:w-88 xl:h-88 object-contain select-none"
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                        draggable={false}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="absolute -bottom-12 left-0 right-0 text-center"
                      >
                        <span className="font-bangers text-5xl xl:text-6xl tracking-widest text-poke-yellow drop-shadow-[0_0_20px_rgba(250,204,21,0.7)]">
                          {pokemon.name.toUpperCase()}
                        </span>
                        <span className="block font-nunito text-blue-300 text-sm mt-1">
                          #{String(pokemon.number).padStart(3, '0')}
                        </span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Host controls */}
        <div className="flex gap-3 mt-8">
          {showSilhouette && (
            <button
              onClick={onReveal}
              className="flex items-center gap-2 font-bangers text-xl tracking-widest bg-poke-blue text-white px-6 py-3 rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:translate-y-px hover:shadow-[0_3px_0_rgba(0,0,0,0.3)] transition-all"
            >
              <Eye className="w-5 h-5" /> REVEAL NOW
            </button>
          )}
          <button
            onClick={onSkip}
            className="flex items-center gap-2 font-bangers text-xl tracking-widest bg-poke-dark-blue text-blue-200 border border-poke-blue/40 px-6 py-3 rounded-2xl hover:bg-poke-blue/20 transition-all"
          >
            <SkipForward className="w-5 h-5" /> SKIP
          </button>
          <button
            onClick={onQuit}
            className="flex items-center gap-2 font-bangers text-xl tracking-widest bg-red-900/60 text-red-300 border border-red-800/50 px-6 py-3 rounded-2xl hover:bg-red-800/60 transition-all"
          >
            <LogOut className="w-5 h-5" /> END GAME
          </button>
        </div>
      </div>

      {/* Right — scoreboard */}
      <div className="w-[380px] xl:w-[440px] shrink-0 border-l border-poke-blue/20 bg-poke-dark-blue/50 flex flex-col">
        <div className="px-6 py-4 border-b border-poke-blue/20">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-poke-yellow" />
            <h2 className="font-bangers text-2xl tracking-widest text-poke-yellow">SCOREBOARD</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          <AnimatePresence>
            {sorted.map((player, i) => (
              <PlayerCard
                key={player.name}
                player={player}
                rank={i}
                answered={answeredSet?.has(player.name)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Results screen ────────────────────────────────────────────────────────────

function ResultsScreen({ players, gameHistory, onPlayAgain, onNewGame }) {
  const sorted  = [...players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
  const top     = sorted.slice(0, 3)
  const heights = [24, 32, 20] // h- in tailwind units, mapped via inline style

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-1 overflow-hidden"
    >
      {/* Left — podium */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-16">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}>
          <Trophy className="w-20 h-20 text-poke-yellow drop-shadow-[0_0_30px_rgba(250,204,21,0.7)]" />
        </motion.div>

        <div>
          <p className="font-bangers text-6xl text-poke-yellow tracking-widest text-center">GAME OVER!</p>
          {sorted[0] && (
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="font-nunito text-white text-2xl text-center mt-2"
            >
              🏆 <strong>{sorted[0].name}</strong> wins with{' '}
              <span className="text-poke-yellow font-700">{sorted[0].points ?? 0} pts</span>!
            </motion.p>
          )}
        </div>

        {/* Podium */}
        <div className="flex items-end gap-6">
          {[1, 0, 2].map((idx) => {
            const p = top[idx]
            if (!p) return null
            const podiumH = [heights[1], heights[0], heights[2]][idx]
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.12 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="font-bangers text-2xl text-white">{p.name}</span>
                <span className="font-bangers text-xl text-poke-yellow flex items-center gap-1">
                  <Star className="w-4 h-4 fill-poke-yellow" />{p.points ?? 0}
                </span>
                <div
                  style={{ height: `${podiumH * 4}px` }}
                  className={`w-28 flex items-center justify-center font-bangers text-3xl rounded-t-xl
                    ${MEDAL_BG[idx === 1 ? 0 : idx === 0 ? 1 : 2]}`}
                >
                  {['2nd', '1st', '3rd'][idx]}
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="flex gap-4 mt-4">
          <button
            onClick={onPlayAgain}
            className="flex items-center gap-2 font-bangers text-2xl tracking-widest bg-poke-yellow text-poke-navy px-10 py-4 rounded-2xl shadow-[0_5px_0_#C7A008] hover:translate-y-px hover:shadow-[0_4px_0_#C7A008] transition-all"
          >
            <RotateCcw className="w-6 h-6" /> PLAY AGAIN
          </button>
          <button
            onClick={onNewGame}
            className="flex items-center gap-2 font-bangers text-2xl tracking-widest bg-poke-dark-blue text-blue-300 border border-poke-blue/30 px-10 py-4 rounded-2xl hover:bg-poke-blue/20 transition-all"
          >
            <LogOut className="w-6 h-6" /> EXIT
          </button>
        </div>
      </div>

      {/* Right — full leaderboard */}
      <div className="w-[420px] shrink-0 border-l border-poke-blue/20 bg-poke-dark-blue/50 flex flex-col">
        <div className="px-6 py-4 border-b border-poke-blue/20">
          <p className="font-bangers text-2xl text-poke-yellow tracking-widest">FINAL SCORES</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {sorted.map((p, i) => {
            const acc = p.total > 0 ? Math.round(((p.correct ?? 0) / p.total) * 100) : 0
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3
                  ${i === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-poke-dark-blue border border-yellow-400/40' : 'bg-poke-navy/80 border border-poke-blue/20'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bangers text-sm shrink-0
                  ${i < 3 ? MEDAL_BG[i] : 'bg-poke-dark-blue text-blue-300 border border-poke-blue/40'}`}>
                  {i + 1}
                </div>
                <span className="flex-1 font-nunito font-800 text-white text-lg truncate">{p.name}</span>
                <span className="font-nunito text-xs text-blue-400 flex items-center gap-1 shrink-0">
                  <Target className="w-3 h-3" />{p.correct ?? 0}/{p.total ?? 0} ({acc}%)
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-4 h-4 fill-poke-yellow text-poke-yellow" />
                  <span className="font-bangers text-2xl text-white leading-none">{p.points ?? 0}</span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Round history */}
        {gameHistory.length > 0 && (
          <>
            <div className="px-6 py-3 border-t border-poke-blue/20">
              <p className="font-nunito text-blue-400 text-xs uppercase tracking-widest">Round History</p>
            </div>
            <div className="overflow-y-auto px-4 pb-4 flex flex-col gap-1 max-h-48">
              {gameHistory.map((q, i) => (
                <div key={i} className="flex items-center gap-2 bg-poke-navy/60 rounded-xl px-3 py-2">
                  <span className="font-bangers text-sm text-blue-400 w-6 text-right shrink-0">{i + 1}</span>
                  {q.pokemon?.image_url && (
                    <img src={q.pokemon.image_url} alt={q.pokemon.name} className="w-7 h-7 object-contain shrink-0" />
                  )}
                  <span className="font-nunito font-700 text-white text-sm flex-1 truncate capitalize">
                    {q.pokemon?.name ?? '?'}
                  </span>
                  {q.winnerName ? (
                    <span className="font-nunito text-xs text-green-300 shrink-0">🏅 {q.winnerName}</span>
                  ) : (
                    <span className="font-nunito text-xs text-blue-500 shrink-0">No winner</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function TvHostView() {
  const multi = useMultiplayer()

  const [answeredSet, setAnsweredSet] = useState(new Set())
  useEffect(() => {
    setAnsweredSet(new Set())
  }, [multi.questionIndex])

  // Add player name to answered set when firstCorrect fires
  useEffect(() => {
    if (multi.firstCorrect) {
      setAnsweredSet((prev) => new Set([...prev, multi.firstCorrect]))
    }
  }, [multi.firstCorrect])

  return (
    <div className="fixed inset-0 bg-poke-navy overflow-hidden flex flex-col">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(96,165,250,0.8) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-poke-blue/20 bg-poke-dark-blue/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <Tv2 className="w-6 h-6 text-poke-yellow" />
          <span className="font-bangers text-2xl tracking-widest text-white">WHO'S THAT POKÉMON? — TV HOST</span>
        </div>
        <div className="flex items-center gap-6">
          {multi.roomCode && (
            <div className="text-center">
              <p className="font-nunito text-blue-400 text-xs">ROOM</p>
              <p className="font-bangers text-2xl tracking-[0.25em] text-white">{multi.roomCode}</p>
            </div>
          )}
          {multi.screen === 'game' && (
            <div className="text-center">
              <p className="font-nunito text-blue-400 text-xs">QUESTION</p>
              <p className="font-bangers text-2xl text-poke-yellow">
                {multi.questionIndex + 1} / {multi.allPokemonLength ?? '?'}
              </p>
            </div>
          )}
          {multi.players.length > 0 && multi.screen !== 'home' && (
            <div className="text-center">
              <p className="font-nunito text-blue-400 text-xs">PLAYERS</p>
              <p className="font-bangers text-2xl text-white">{multi.players.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Screens */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {multi.screen === 'home' && (
            <SetupScreen
              key="setup"
              gameMode={multi.gameMode}
              onSetGameMode={multi.setGameMode}
              questionCount={multi.questionCount}
              onSetQuestionCount={multi.setQuestionCount}
              onCreate={multi.createRoomAsTV}
            />
          )}
          {multi.screen === 'lobby' && (
            <LobbyScreen
              key="lobby"
              roomCode={multi.roomCode}
              players={multi.players}
              gameMode={multi.gameMode}
              onSetGameMode={multi.setGameMode}
              questionCount={multi.questionCount}
              onSetQuestionCount={multi.setQuestionCount}
              onStart={multi.startGame}
            />
          )}
          {multi.screen === 'game' && (
            <GameScreen
              key="game"
              pokemon={multi.pokemon}
              phase={multi.phase}
              silhouetteCountdown={multi.silhouetteCountdown}
              firstCorrect={multi.firstCorrect}
              questionIndex={multi.questionIndex}
              players={multi.players}
              answeredSet={answeredSet}
              onReveal={multi.revealImage}
              onSkip={multi.skipQuestion}
              onQuit={multi.quitGame}
            />
          )}
          {multi.screen === 'results' && (
            <ResultsScreen
              key="results"
              players={multi.players}
              gameHistory={multi.gameHistory}
              onPlayAgain={() => multi.setScreen('lobby')}
              onNewGame={() => multi.setScreen('home')}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
