# Quiz App Architecture — Full Documentation

This document captures every architectural decision, pattern, and implementation detail from the **Who's That Pokémon?** quiz app. Use it as the blueprint for building a new **Music Quiz** (or any other quiz) on the same foundation.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Environment Variables](#3-environment-variables)
4. [Database — Supabase Setup](#4-database--supabase-setup)
5. [Data Layer — Seeding Content](#5-data-layer--seeding-content)
6. [Design System — Tailwind & Fonts](#6-design-system--tailwind--fonts)
7. [App Entry & Routing](#7-app-entry--routing)
8. [Solo Mode — useQuiz Hook](#8-solo-mode--usequiz-hook)
9. [Multiplayer System — useMultiplayer Hook](#9-multiplayer-system--usemultiplayer-hook)
10. [TV / Spectator View — useTvView Hook](#10-tv--spectator-view--ustvview-hook)
11. [Sound Effects Library](#11-sound-effects-library)
12. [Fuzzy Answer Matching](#12-fuzzy-answer-matching)
13. [Scoring System](#13-scoring-system)
14. [Component Catalogue](#14-component-catalogue)
15. [Multiplayer Event Protocol](#15-multiplayer-event-protocol)
16. [Adapting to a Music Quiz (Spotify API)](#16-adapting-to-a-music-quiz-spotify-api)

---

## 1. Tech Stack

| Layer | Library / Service | Version |
|---|---|---|
| UI framework | React | 18 |
| Bundler | Vite | 6 |
| Styling | Tailwind CSS | 3 |
| Animations | Framer Motion | 11 |
| Icons | Lucide React | latest |
| Routing | React Router DOM | 7 |
| Backend / DB | Supabase (PostgreSQL) | 2 |
| Realtime / Multiplayer | Supabase Realtime Channels | — |
| Scraping (data seed) | Puppeteer | 24 |
| Image processing | Jimp | 0.22 |
| Fonts | Google Fonts (Bangers, Nunito) | — |
| Prod server | `serve` (static) | 14 |

**Key principle:** the entire backend is Supabase. There is no custom server — multiplayer runs entirely over Supabase Realtime channels. The app is fully static (Vite build → `serve dist`).

---

## 2. Project Structure

```
├── index.html                  # Root HTML, imports fonts, mounts #root
├── vite.config.js              # Vite config (React plugin, VITE_BASE)
├── tailwind.config.js          # Custom colors, fonts, keyframes
├── postcss.config.js           # Autoprefixer
├── package.json                # Scripts: dev / build / scrape / process-images
├── Procfile                    # Heroku/Render: web: npm start
├── .env                        # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
│
├── scripts/
│   ├── scrape-pokemon.js       # Puppeteer scraper → uploads images → seeds DB
│   └── process-images.js      # JPG → transparent PNG (BFS white removal)
│
├── supabase/
│   └── migrations/
│       └── 20260307000000_create_pokemons_table.sql
│
└── src/
    ├── main.jsx                # React root, BrowserRouter
    ├── App.jsx                 # Route split: /tv → TvHostView, /* → PlayerApp
    ├── index.css               # Tailwind directives + global reset
    │
    ├── lib/
    │   ├── supabase.js         # Singleton supabase client
    │   └── fuzzyMatch.js       # Levenshtein-based answer checker
    │
    ├── hooks/
    │   ├── useQuiz.js          # All solo-mode state & logic
    │   ├── useMultiplayer.js   # All multiplayer state, channels & logic
    │   └── useTvView.js        # Spectator/TV state (read-only channel listener)
    │
    └── components/
        ├── Header.jsx          # Top bar: logo + score chips + streak
        ├── StartScreen.jsx     # Animated solo start screen
        ├── QuizGame.jsx        # Solo game card (image + form)
        ├── PokemonImage.jsx    # Silhouette ↔ revealed image with animations
        ├── AnswerForm.jsx      # Input + GUESS button + skip
        ├── FeedbackMessage.jsx # Animated correct/wrong/skipped banner
        ├── ScoreBoard.jsx      # Points / accuracy / streak chips
        ├── FloatingSilhouettes.jsx  # Animated background decoration
        └── multiplayer/
            ├── MultiplayerHome.jsx    # Create / join room forms
            ├── MultiplayerLobby.jsx   # Room code display + player list + settings
            ├── MultiplayerGame.jsx    # In-game card for players
            ├── MultiplayerResults.jsx # Leaderboard + round history
            ├── TvHostView.jsx         # Full-screen TV host interface (route /tv)
            └── TvView.jsx             # TV scoreboard + question panel (rendered inside TvHostView)
```

---

## 3. Environment Variables

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Both prefixed with `VITE_` so Vite exposes them to browser code via `import.meta.env`.

**`src/lib/supabase.js`** — the only file that reads these:

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Import `supabase` everywhere else — never re-create the client.

---

## 4. Database — Supabase Setup

### `pokemons` table

```sql
CREATE TABLE pokemons (
  id         BIGSERIAL PRIMARY KEY,
  number     INT UNIQUE NOT NULL,   -- Pokédex number (ordering)
  name       TEXT NOT NULL,         -- canonical name, lowercase
  image_url  TEXT NOT NULL,         -- public URL in Supabase Storage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pokemons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read"  ON pokemons FOR SELECT USING (true);
CREATE POLICY "Allow anon insert"  ON pokemons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update"  ON pokemons FOR UPDATE USING (true);
```

### Storage bucket: `pokemon-images`

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('pokemon-images', 'pokemon-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read"  ON storage.objects FOR SELECT USING (bucket_id = 'pokemon-images');
CREATE POLICY "Allow anon upload"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pokemon-images');
CREATE POLICY "Allow anon upsert"  ON storage.objects FOR UPDATE USING (bucket_id = 'pokemon-images');
```

### For a Music Quiz — equivalent schema

```sql
CREATE TABLE tracks (
  id          BIGSERIAL PRIMARY KEY,
  spotify_id  TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  preview_url TEXT NOT NULL,   -- 30-second Spotify preview
  cover_url   TEXT,            -- album art
  year        INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON tracks FOR SELECT USING (true);
```

---

## 5. Data Layer — Seeding Content

### Pattern (from `scripts/scrape-pokemon.js`)

1. Read `.env` manually (Node.js scripts run outside Vite, so `import.meta.env` is unavailable).
2. Create a Supabase client with the anon key.
3. Ensure the storage bucket exists (`supabase.storage.listBuckets()` → create if missing).
4. Fetch/scrape content → upload binary to Storage → get public URL.
5. Upsert into the DB table with `{ upsert: true }`.

```js
// Minimal pattern for a music quiz seeder
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8')
    .split('\n')
    .map(line => line.split('='))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

// Fetch tracks from Spotify API, then:
const { error } = await supabase.from('tracks').upsert(tracks, { onConflict: 'spotify_id' })
```

### Image processing pattern (`scripts/process-images.js`)

- Fetches existing images from Supabase Storage.
- Uses **Jimp** (pure JS, no native binaries) to BFS flood-fill from image corners, making white background transparent.
- Re-uploads as PNG and updates `image_url` in the DB.
- Accepts `--force` flag to re-process already-converted images.

---

## 6. Design System — Tailwind & Fonts

### Custom colors (`tailwind.config.js`)

```js
colors: {
  poke: {
    blue:       '#3466AF',
    'dark-blue':'#21308E',
    navy:       '#1D2C5E',   // main background
    yellow:     '#FFC805',   // primary accent
    gold:       '#C7A008',   // button shadow
  }
}
```

The entire app uses a **dark navy background** (`bg-poke-navy`) with **yellow accents** for primary actions and **blue tones** for secondary UI.

### Fonts

```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
```

- **Bangers** (`font-bangers`) — display font for titles, scores, room codes, buttons.
- **Nunito** (`font-nunito`) — body font for labels, hints, player names.

### Custom keyframes

```js
wiggle:   rotate -4deg → 4deg → -4deg (0.4s ease-in-out)
pop-in:   scale 0.5→1.08→1, opacity 0→1 (0.4s ease-out)
```

### Button style conventions

**Primary (yellow):**
```
bg-poke-yellow text-poke-navy font-bangers text-2xl tracking-widest
rounded-2xl shadow-[0_5px_0_#C7A008]
hover:translate-y-[2px] hover:shadow-[0_3px_0_#C7A008] transition-all
```

**Secondary (blue):**
```
bg-poke-blue text-white
shadow-[0_5px_0_rgba(0,0,0,0.3)] hover:translate-y-[2px] transition-all
```

**Card container:**
```
bg-gradient-to-b from-poke-dark-blue to-poke-navy
rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] border border-poke-blue/30
```

---

## 7. App Entry & Routing

### `src/main.jsx`
```jsx
import { BrowserRouter } from 'react-router-dom'
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter><App /></BrowserRouter>
)
```

### `src/App.jsx`
```jsx
export default function App() {
  return (
    <Routes>
      <Route path="/tv" element={<TvHostView />} />  {/* Full-screen TV mode */}
      <Route path="*"   element={<PlayerApp />} />   {/* All other routes */}
    </Routes>
  )
}
```

**`PlayerApp`** manages top-level mode state:
- `null` → mode select screen (buttons: SOLO / MULTIPLAYER)
- `'solo'` → renders solo quiz subtree using `useQuiz`
- `'multi'` → renders multiplayer subtree using `useMultiplayer`

Both hooks are instantiated at the top of `PlayerApp` so their state persists while switching views.

### Navigation model

There is **no URL-based navigation** for solo/multiplayer — it is controlled by a single `mode` state variable. Only the TV view (`/tv`) has its own route.

---

## 8. Solo Mode — `useQuiz` Hook

**File:** `src/hooks/useQuiz.js`

### State

| State | Type | Description |
|---|---|---|
| `pokemon` | object \| null | Current question `{ id, number, name, image_url }` |
| `queue` | array | Shuffled remaining pokemon |
| `loading` | boolean | DB fetch in progress |
| `error` | string \| null | DB error message |
| `answer` | string | Controlled input value |
| `feedback` | string \| null | `'correct3'` \| `'correct1'` \| `'wrong'` \| `'skipped'` \| `null` |
| `revealed` | boolean | Whether the answer has been revealed |
| `phase` | string | `'silhouette'` \| `'image'` |
| `score` | `{ points, correct, total }` | Running score |
| `streak` | number | Current correct-answer streak |
| `gameStarted` | boolean | Whether the player has pressed START |
| `gameMode` | string | `'open'` \| `'choice'` — answer input mode |
| `options` | string[] | 4 pokemon names for multiple choice (empty in open mode) |
| `bestScore` | `{ points, streak }` | All-time best from localStorage |
| `streakMilestone` | number \| null | Fires at multiples of 5 streak for overlay |
| `roundComplete` | boolean | True every 20 questions for summary screen |

### Key behaviours

**Load & shuffle:**
```js
const { data } = await supabase.from('pokemons').select('id, number, name, image_url').order('number')
const shuffled = [...data].sort(() => Math.random() - 0.5)
setQueue(shuffled)
setPokemon(shuffled[0])
allPokemonRef.current = data   // kept for generateOptions
```

**Advance to next:**
- Sets next pokemon, resets `answer`, `feedback`, `revealed`, `phase`.
- Preloads next image (`new Image().src = ...`) to avoid flicker.
- When queue depletes, re-shuffles in place (infinite loop).
- Every 20 questions sets `roundComplete = true` (triggers SoloSummary overlay).

**Score on correct answer:**
- Silhouette phase: +3 pts
- Image phase: +1 pt

**Auto-advance timer:** `FEEDBACK_DURATION = 2000ms` after answer/skip → `nextPokemon()`.

**LocalStorage best score:**
```js
// Key: 'pokequiz-best' → { points: number, streak: number }
// Read on hook init, written whenever a new record is set
const saved = JSON.parse(localStorage.getItem('pokequiz-best') || '{}')
const [bestScore, setBestScore] = useState({ points: saved.points || 0, streak: saved.streak || 0 })
```

**Streak milestones:** Fires `setStreakMilestone(streak)` at every multiple of 5. `App.jsx` renders a full-screen overlay when `streakMilestone !== null`.

**Multiple choice mode:**
```js
function generateOptions(correctPokemon, fullList) {
  const wrong = fullList
    .filter(p => p.id !== correctPokemon.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(p => p.name)
  return [correctPokemon.name, ...wrong].sort(() => Math.random() - 0.5)
}
```
Options regenerate automatically via a `useEffect` watching `pokemon`. Changing `gameMode` via `changeGameMode()` also regenerates immediately. Options are local to the player (not broadcast) in solo mode.

**Exported API:**
```js
{
  pokemon, loading, error,
  answer, setAnswer,
  feedback, revealed, phase,
  score, accuracy, streak, gameStarted,
  gameMode,
  setGameMode,   // changeGameMode — updates ref + state, regenerates options
  options,       // [] in open mode, [name, name, name, name] in choice mode
  bestScore,     // { points, streak } from localStorage
  streakMilestone, // number | null — cleared by App.jsx after overlay
  roundComplete, // boolean — cleared by startNewRound()
  allPokemon,    // full unshuffled pool (used by FloatingSilhouettes)
  revealImage,   // silhouette → image
  startGame,     // resets score, sets gameStarted=true
  exitGame,      // sets gameStarted=false (back button)
  startNewRound, // clears roundComplete, continues with same pool
  submitAnswer,  // checks answer, sets feedback, plays sound, advances timer
  skipPokemon,   // marks skipped, plays sound, advances timer
  reloadPokemon, // re-fetches DB (error recovery)
}
```

---

## 9. Multiplayer System — `useMultiplayer` Hook

**File:** `src/hooks/useMultiplayer.js`

This is the most complex piece of the codebase. It manages:
- Room creation / joining / presence
- Game state synchronisation between all players via Supabase Realtime
- Host-driven game flow
- Multiple choice vs open-answer modes
- Per-question history for results screen

### Reactive score state fix

The player's own score is stored in both a `useRef` (for use inside channel callbacks without stale-closure issues) **and** a `useState` mirror (`myScoreState`). The hook returns the state version so React re-renders reliably:

```js
const myScore = useRef({ points: 0, correct: 0, total: 0 })
const [myScoreState, setMyScoreState] = useState({ points: 0, correct: 0, total: 0 })

// Always update both together:
function updateScore(next) {
  myScore.current = next
  setMyScoreState(next)
}
```

### Player cap

When a new player subscribes (joins the channel), the host checks `players.length >= 20` and — if over the cap — the new client's subscription is allowed but game start is blocked via a guard. (The cap is enforced in the UI: the lobby shows a warning and the host cannot start with > 20 players.)

### Host disconnect handling

A `beforeunload` event listener fires `broadcast('host_left', {})` when the host closes the tab. Remaining players receive `host_left` and `hostLeft` state is set `true` — `MultiplayerGame` shows a WifiOff banner.

### Sound effects

The hook imports `sounds` from `src/lib/sounds.js` and calls:
- `sounds.correct()` / `sounds.wrong()` on answer submission
- No sounds on skip (handled by solo hook only)

### Architecture: Host-Driven Model

The **host** (room creator) is the single source of truth. It:
1. Shuffles and owns the game's pokemon list
2. Controls timers (`silhouetteTimer`, `feedbackTimer`)
3. Calls `advanceQuestion()` to move to the next question
4. Broadcasts all state changes to other players

**Important Supabase quirk:** A client does NOT receive its own broadcasts. So after the host broadcasts, it also updates its own local state directly in the same function.

### Supabase Realtime — Channel setup

```js
const channel = supabase.channel(`room:${code}`, {
  config: { presence: { key: name } },
})
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({ name, points: 0, correct: 0, total: 0 })
  }
})
channelRef.current = channel
```

**Channel name pattern:** `room:<ROOMCODE>` (e.g. `room:AB3XY`)

### Presence — Player List

```js
channel.on('presence', { event: 'sync' }, () => {
  const list = Object.values(channel.presenceState())
    .flat()
    .map(p => p.meta ?? p)
  setPlayers(list)
})
```

Each player tracks `{ name, points, correct, total }`. When a player scores, the host updates via `channel.track()` with new totals — this triggers a `presence: sync` event on all clients and live-updates the leaderboard.

### Broadcast Events

#### `question` (host → all)
```js
broadcast('question', {
  index: 0,
  gameList: shuffled,  // only on Q0, syncs the shuffle to all players
  gameMode: 'open',    // 'open' | 'choice'
  options: [],         // MC options array (empty in open mode)
  pokemon: shuffled[0] // included so TV/late-joiners can show the image
})
```

#### `correct_answer` (player → all)
```js
broadcast('correct_answer', {
  name: playerName,
  points: pointsEarned,
  phase: 'silhouette' | 'image'
})
```
On receiving this, all clients update the leaderboard. The host also starts the `FEEDBACK_DURATION` timer to advance.

#### `reveal_image` (host → all)
```js
broadcast('reveal_image', {})
```
Transitions all clients from `phase: 'silhouette'` to `phase: 'image'`.

#### `game_over` (host → all)
```js
broadcast('game_over', {})
```
All clients save their last question to history and navigate to results screen.

### Timers

| Timer | Duration | Purpose |
|---|---|---|
| `silTimerRef` | 5000ms | Auto-reveal image after silhouette phase |
| `silCountRef` | 1s interval | Countdown display (5→4→3…) |
| `feedTimerRef` | 3000ms | Advance to next question after correct answer |

**Critical:** Timers use `useRef` (not `useState`) so `clearTimeout`/`clearInterval` always works without stale closures.

### Stale Closure Problem & Solution

Multiplayer uses many refs to avoid stale closures inside channel event handlers:

```js
const questionIndexRef = useRef(0)   // mirrors questionIndex state
const allPokemonRef    = useRef([])   // mirrors allPokemon state
const advanceRef       = useRef(null) // always points to latest advanceQuestion fn
```

`advanceRef.current = advanceQuestion` is set on every render, so channel callbacks (which capture the ref at subscription time) always call the latest version.

### Multiple Choice Mode

```js
function generateOptions(correctPokemon, fullList) {
  const wrong = fullList
    .filter(p => p.id !== correctPokemon.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(p => p.name)
  return [correctPokemon.name, ...wrong].sort(() => Math.random() - 0.5)
}
```

Options are generated by the host and sent in the `question` broadcast so all players see the same 4 choices.

### Multiplayer Scoring

| Situation | Points |
|---|---|
| Silhouette phase, first correct | 5 |
| Silhouette phase, already answered | 3 |
| Image phase, first correct | 3 |
| Image phase, already answered | 1 |
| Wrong / skipped | 0 |

### Screen State Machine

```
'home' → 'lobby' → 'game' → 'results'
```
Controlled by `setScreen()` inside the hook. Components render conditionally based on `multi.screen`.

### TV / Spectator Mode

The TV creates a room with `createRoomAsTV()`:
- Generates a room code but joins with `skipPresence: true`
- This means `__TV__` never appears in the player list
- The TV is the host — it controls the game via `TvHostView`

### Exported API

```js
{
  // State
  screen, playerName, roomCode, isHost, players,
  pokemon, phase, silhouetteCountdown,
  feedback, answer, setAnswer, answered, firstCorrect,
  gameMode, setGameMode: (mode) => { gameModeRef.current = mode; setGameMode(mode) },
  questionCount, setQuestionCount: (n) => { questionCountRef.current = n; setQuestionCount(n) },
  options, gameHistory,
  hostLeft,          // boolean — host disconnected mid-game (shows banner)
  loading, error,
  myScore: myScoreState,  // { points, correct, total } — reactive state (NOT a ref)

  // Actions
  createRoom,        // (name) → generate code, join channel, lobby
  createRoomAsTV,    // () → host-only, no presence
  joinRoom,          // (name, code) → join channel, lobby
  startGame,         // () → shuffle, broadcast Q0, set screen='game'
  submitAnswer,      // (userAnswer) → check, broadcast, update score
  revealImage,       // () → setPhase('image'), broadcast reveal_image
  skipQuestion,      // () → host-only, advances immediately
  quitGame,          // () → broadcast game_over, set screen='results'
}
```

---

## 10. TV / Spectator View — `useTvView` Hook

**File:** `src/hooks/useTvView.js`

A **read-only** channel listener — it joins the channel without calling `channel.track()`, so it never appears in the player presence list.

```js
const channel = supabase.channel(`room:${roomCode}`)
// Listens to: presence sync, question broadcast, correct_answer, reveal_image, game_over
// Never calls channel.track()
channel.subscribe()
```

It maintains its own player list by listening to presence events, and its own `pokemon`/`phase` state by listening to `question` broadcasts.

**`TvHostView`** (`/tv` route):
- Uses `useMultiplayer` as the host
- Renders a setup screen → lobby → game
- The game view shows a large `TvView` component (full-screen layout with pokemon panel + live scoreboard)

---

## 11. Sound Effects Library

**File:** `src/lib/sounds.js`

All game sound effects using the **Web Audio API** — zero audio files required.

### API

```js
import sounds from '../lib/sounds'

sounds.correct()  // ascending 3-note arpeggio (correct answer)
sounds.wrong()    // descending 2-note (wrong answer)
sounds.skip()     // soft 2-note step-down (skip)
sounds.streak()   // 4-note triumphant fanfare (streak milestone)
sounds.click()    // short tick (UI interaction)
```

### Implementation pattern

```js
let _ctx = null
function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  return _ctx
}

function note(freq, startTime, duration, gain = 0.3, type = 'square') {
  const ac = getCtx()
  const osc = ac.createOscillator()
  const g   = ac.createGain()
  osc.connect(g)
  g.connect(ac.destination)
  osc.frequency.value = freq
  osc.type = type
  g.gain.setValueAtTime(0, startTime)
  g.gain.linearRampToValueAtTime(gain, startTime + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.05)
}

const sounds = {
  correct: () => { const t = getCtx().currentTime; note(523, t, 0.1, 0.25); note(659, t+0.09, 0.12, 0.25); note(784, t+0.18, 0.18, 0.28) },
  wrong:   () => { const t = getCtx().currentTime; note(311, t, 0.18, 0.25, 'sawtooth'); note(233, t+0.16, 0.25, 0.22, 'sawtooth') },
  skip:    () => { const t = getCtx().currentTime; note(440, t, 0.05, 0.15, 'sine'); note(330, t+0.05, 0.1, 0.1, 'sine') },
  streak:  () => { const t = getCtx().currentTime; note(523,t,0.1,0.2); note(659,t+0.1,0.1,0.2); note(784,t+0.2,0.1,0.2); note(1046,t+0.3,0.25,0.3) },
  click:   () => { const t = getCtx().currentTime; note(1200, t, 0.03, 0.1, 'sine') },
}

export default sounds
```

**Key design decisions:**
- `AudioContext` is lazily created on first use (browsers block it until user gesture).
- Notes are scheduled with `AudioContext.currentTime` offsets — this ensures tight, glitch-free timing without `setTimeout`.
- `exponentialRampToValueAtTime` produces natural-sounding note decay.
- Imported by both `useQuiz.js` and `useMultiplayer.js`.

**For Music Quiz:** keep this as-is for UI feedback. Actual audio playback uses `<audio>` or the Web Audio `AudioBufferSourceNode` for the track preview.

---

## 12. Fuzzy Answer Matching

**File:** `src/lib/fuzzyMatch.js`

```js
import { isAnswerCorrect } from '../lib/fuzzyMatch'
const ok = isAnswerCorrect(userInput, correctName)
```

**Algorithm:**
1. Normalize both strings: `toLowerCase().trim().replace(/[^a-z0-9]/g, '')`
2. Fast path: exact match after normalization.
3. Compute Levenshtein edit distance (O(m×n) time, O(n) space with two rolling arrays).
4. Allow errors based on name length:
   - 1–3 chars → 0 errors (too short to guess fuzzily)
   - 4–5 chars → 1 error
   - 6+ chars → 2 errors

**For a Music Quiz:** reuse as-is. Works perfectly for song titles and artist names. Just pass `isAnswerCorrect(userInput, track.title)` or implement a variant that also checks `track.artist`.

---

## 13. Scoring System

### Solo

| Event | Points |
|---|---|
| Correct in silhouette phase | +3 |
| Correct in image phase | +1 |
| Skip or wrong | +0 |

Stats displayed: `points, correct, total, accuracy (correct/total %)`, `streak`.

### Multiplayer

| Event | Points |
|---|---|
| First to answer correctly, silhouette | +5 |
| Correct, but someone already answered, silhouette | +3 |
| First to answer correctly, image | +3 |
| Correct, but someone already answered, image | +1 |
| Wrong / no answer | +0 |

`firstCorrect` state tracks who answered first this question.

---

## 14. Component Catalogue

### `<Header score streak />`
Top bar always visible. Shows logo, correct count chip, total count chip. Shows flame streak chip when `streak >= 3`.

### `<StartScreen onStart onBack bestScore pool gameMode onSetGameMode />`
Solo pre-game screen. Animated Pokeball, title, description, mode selector, START button. Uses `<FloatingSilhouettes pool={pool} />` for background.

**Mode selector** — two buttons (Open / Multiple Choice) using `Type` and `List` icons from lucide-react:
- Active: `bg-poke-yellow text-poke-navy`
- Inactive: `bg-poke-dark-blue text-blue-300 border border-poke-blue/30`

**Best score badges** — shown when `bestScore.points > 0` or `bestScore.streak >= 3`:
- `<Star>` badge: all-time best points
- `<Flame>` badge: all-time best streak (shown when streak ≥ 3)

### `<FloatingSilhouettes pool? />`
Fetches all pokemon images from DB **unless** a `pool` prop is provided (avoids a redundant network call when `useQuiz` has already loaded the data). Cycles silhouettes through 8 fixed screen slots at staggered intervals. Pure decoration — `aria-hidden`, `pointer-events-none`.

### `<QuizGame pokemon answer setAnswer feedback revealed phase onReveal score accuracy streak onSubmit onSkip onBack gameMode options />`
Solo game card. Renders `<PokemonImage>`, answer UI, `<FeedbackMessage>`, `<ScoreBoard>`. Has a back button (ArrowLeft icon) and a "Reveal image (1 pt)" button in silhouette phase.

**Answer UI modes:**
- `gameMode === 'open'` → `<AnswerForm>` text input
- `gameMode === 'choice'` + `options.length > 0` + `feedback === null` → 2×2 grid of option buttons; each button calls `onSubmit(opt)` directly. The fuzzy-match hint and AnswerForm are hidden in this mode.

### `<PokemonImage pokemon showSilhouette />`
Animated image component. When `showSilhouette=true`, applies CSS filter to turn the image into a silhouette:
- `.png` files: `brightness(0) invert(1)` → pure white silhouette
- `.jpg` fallback: `brightness(0.15) contrast(1.5) saturate(0) blur(2px)` → dark blur

Reveals with spring animation. Shows `#NNN` number badge when revealed.

### `<AnswerForm answer setAnswer onSubmit onSkip disabled />`
Controlled text input with auto-focus when not disabled. GUESS + Skip buttons. Subtle floating animation on input when active.

### `<FeedbackMessage feedback pokemonName />`
Animated banner. Feedback keys and their display:

| `feedback` | Color | Icon | Text |
|---|---|---|---|
| `correct5` | green-400 | Zap | `Correct! It's {name}! +5 pts` |
| `correct3` | green-500 | Sparkles | `+3 pts` |
| `correct1` | green-600 | CheckCircle2 | `+1 pt` |
| `wrong` | red-500 | XCircle | `It's {name}!` |
| `skipped` | dark-blue | Eye | `It was {name}!` |

### `<ScoreBoard score accuracy streak />`
Row of stat chips: Points, Wrong, Accuracy %, Streak (shown when ≥ 2).

### `<MultiplayerHome onCreate onJoin onBack />`
Two-step form: choose Create or Join, then enter name (and room code for join).

### `<MultiplayerLobby roomCode players isHost gameMode onSetGameMode questionCount onSetQuestionCount onStart />`
Shows room code with a **copy-to-clipboard button** (Check/Copy icons, `copied` state), player list (from presence), game mode selector (host only), question count selector (host only), START button (host only, disabled if no players).

### `<MultiplayerGame ... hostLeft />`
In-game view for players. Shows mini-leaderboard, image card, answer input (text or 2×2 choice grid), feedback, "first to answer" banner, host-only Skip/Quit/Reveal controls.

When `hostLeft === true`, renders a `WifiOff` banner: *"The host has left the game."*

### `<MultiplayerResults players playerName gameHistory isHost onPlayAgain onBackToMenu />`
Two-tab results screen:
- **Leaderboard tab:** sorted players with rank medals, points, accuracy.
- **Rounds tab:** per-question history (image, name, who won, points, phase).

### `<TvHostView />`
Full-screen TV interface at `/tv`. Uses `useMultiplayer` as host. Three sub-screens:
1. **Setup** — mode and question count, then Create Room → shows QR-able URL + room code.
2. **Lobby** — player list + start button.
3. **Game/Results** — renders `<TvView roomCode />` which handles its own channel via `useTvView`.

### `<TvView roomCode />`
Two-panel layout:
- **Left** — large pokemon image + countdown + first-correct banner
- **Right** — animated live scoreboard with score flash on point gain

---

## 15. Multiplayer Event Protocol

Complete message flow for a game:

```
HOST                                PLAYERS                         TV VIEW
 |                                     |                               |
 |-- presence track ------------------>|                               |
 |                                     |-- presence track ------------>|
 |                                     |   (all sync player list)      |
 |                                     |                               |
 | [host presses START]                |                               |
 | shuffle list                        |                               |
 | update own state (Q0)               |                               |
 |-- broadcast: question{index:0, ---->|                               |
 |     gameList, gameMode, options,    |  update pokemon, start timer  |
 |     pokemon}                        |                               |
 |                                     |                               |
 | start silhouette timer (5s)         | start silhouette timer (5s)   |
 |                                     |                               |
 | [player answers correctly]          |                               |
 |                                     |-- broadcast: correct_answer-->|
 |                                     |   {name, points, phase}       |
 | receive correct_answer              |                               |
 | update leaderboard                  | update leaderboard            |
 | start feedback timer (3s)           |                               |
 |                                     |                               |
 | [feedback timer fires]              |                               |
 | advanceQuestion(Q1)                 |                               |
 | update own state (Q1)               |                               |
 |-- broadcast: question{index:1, ---->|                               |
 |     gameMode, options, pokemon}     | update for Q1                 |
 |                                     |                               |
 | [all questions done]                |                               |
 | update own state → 'results'        |                               |
 |-- broadcast: game_over ------------>|                               |
 |                                     | save history, show results    |
```

---

## 16. Adapting to a Music Quiz (Spotify API)

Below is a concrete mapping of every piece from the Pokémon quiz to a music quiz.

### Database changes

Replace `pokemons` with `tracks`:

```sql
CREATE TABLE tracks (
  id          BIGSERIAL PRIMARY KEY,
  spotify_id  TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  preview_url TEXT NOT NULL,   -- Spotify 30s preview URL
  cover_url   TEXT,            -- album artwork URL
  year        INT,
  genre       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON tracks FOR SELECT USING (true);
```

### Data seeding

Replace the Puppeteer scraper with a Spotify API script:

```js
// scripts/seed-spotify.js
import SpotifyWebApi from 'spotify-web-api-node'
import { createClient } from '@supabase/supabase-js'

// 1. Authenticate with Spotify Client Credentials Flow (no user login needed)
// 2. Fetch playlists / search tracks
// 3. Filter for tracks that have a preview_url (not all do)
// 4. Upsert into tracks table

const tracks = spotifyTracks
  .filter(t => t.preview_url)  // IMPORTANT: many tracks have no preview
  .map(t => ({
    spotify_id:  t.id,
    title:       t.name,
    artist:      t.artists[0].name,
    preview_url: t.preview_url,
    cover_url:   t.album.images[0]?.url,
    year:        new Date(t.album.release_date).getFullYear(),
  }))

await supabase.from('tracks').upsert(tracks, { onConflict: 'spotify_id' })
```

### Replacing `PokemonImage` → `TrackCard`

Instead of revealing a silhouette image, reveal an audio clip:

```jsx
// components/TrackCard.jsx
import { useEffect, useRef } from 'react'

export default function TrackCard({ track, revealed }) {
  const audioRef = useRef(null)

  // Autoplay preview when component mounts, stop when revealed (or keep playing)
  useEffect(() => {
    if (track?.preview_url) {
      audioRef.current?.play().catch(() => {}) // browsers block autoplay without user gesture
    }
  }, [track])

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Album art — blurred until revealed */}
      <div className="relative w-56 h-56">
        <img
          src={track?.cover_url}
          alt={revealed ? track?.title : 'Mystery Track'}
          className={`w-full h-full object-cover rounded-2xl transition-all duration-500
            ${revealed ? '' : 'blur-3xl scale-95 brightness-50'}`}
        />
      </div>

      {/* Audio player */}
      <audio ref={audioRef} src={track?.preview_url} loop />

      {/* Reveal: show title/artist */}
      {revealed && (
        <div className="text-center">
          <p className="font-bangers text-2xl text-white">{track.title}</p>
          <p className="font-nunito text-blue-300">{track.artist}</p>
        </div>
      )}
    </div>
  )
}
```

**Silhouette equivalent for music:** play the audio preview with effects (lower pitch, muffled) first, then reveal the full preview. This requires Web Audio API — keep it simple by just playing the 30s preview from start.

### Replacing `useQuiz` → `useTrackQuiz`

Minimal changes:
1. Change `supabase.from('pokemons')` → `supabase.from('tracks')`
2. Change `select('id, number, name, image_url')` → `select('id, spotify_id, title, artist, preview_url, cover_url')`
3. Change `isAnswerCorrect(answer, pokemon.name)` → `isAnswerCorrect(answer, track.title)` (and optionally also check `track.artist`)

### Replacing `useMultiplayer` — minimal changes

1. Replace every `pokemons` table reference with `tracks`.
2. Replace `pokemon` variable names with `track` throughout (or keep as generic `item`).
3. The `generateOptions()` function for multiple choice: use `track.title` instead of `track.name`.
4. The `question` broadcast payload: replace `pokemon` key with `track`.
5. Scoring, timers, channel setup — all identical.

### Answer matching for music

The existing `isAnswerCorrect` (Levenshtein fuzzy match) works well for song titles. Consider:

```js
export function isTrackAnswerCorrect(userAnswer, track) {
  // Accept if title matches
  if (isAnswerCorrect(userAnswer, track.title)) return true
  // Also accept "Artist - Title" format
  const combined = `${track.artist} ${track.title}`
  if (isAnswerCorrect(userAnswer, combined)) return true
  return false
}
```

### `FeedbackMessage` — reuse as-is

The feedback keys (`correct5`, `correct3`, `correct1`, `wrong`, `skipped`) and their display text are generic. Just change `It's ${name}!` to `It's "${title}" by ${artist}!` in the label functions.

### Renaming the design theme

For a music quiz, swap the Pokémon color palette for a music-inspired one in `tailwind.config.js`:

```js
colors: {
  music: {
    green:       '#1DB954',  // Spotify green
    'dark-green':'#158a3e',
    dark:        '#121212',  // Spotify black
    card:        '#282828',
    light:       '#B3B3B3',
  }
}
```

### Complete rename map

| Pokémon quiz | Music quiz |
|---|---|
| `pokemons` table | `tracks` table |
| `pokemon.name` | `track.title` |
| `pokemon.number` | `track.spotify_id` |
| `pokemon.image_url` | `track.preview_url` (audio) / `track.cover_url` (image) |
| `PokemonImage` component | `TrackCard` component |
| `FloatingSilhouettes` | `FloatingAlbumArt` (same pattern, use cover images) |
| `scrape-pokemon.js` | `seed-spotify.js` |
| `process-images.js` | not needed (Spotify provides images) |
| `pokemon-images` bucket | not needed (Spotify CDN) |
| `BUCKET_NAME` | — |
| `Who's That Pokémon?` | `Name That Track!` |
| Silhouette reveal | Album art blur → reveal |
| Phase: `'silhouette'` / `'image'` | Phase: `'blind'` / `'revealed'` |

---

## Deployment

### Build

```bash
npm run build    # outputs to dist/
npm run preview  # local preview of dist/
```

### Production with `serve`

```bash
npm start        # runs: serve dist
```

The `Procfile` (for Heroku/Render):
```
web: npm start
```

### Environment variables on the hosting platform

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the platform's environment settings. For a new project, create a new Supabase project and get these from **Project Settings → API**.

`VITE_BASE` can be set to a sub-path if deploying to a subdirectory (e.g. `/music-quiz/`).

---

## Common Gotchas

1. **Supabase doesn't deliver broadcasts to sender.** After broadcasting, always update host state directly — don't rely on receiving your own broadcast.

2. **Stale closures in channel handlers.** Use `useRef` for any value that channel event handlers need to read. Update refs alongside state setters.

3. **Spotify previews aren't available for all tracks.** Always filter `track.preview_url !== null` when seeding and querying.

4. **Autoplay is blocked by browsers.** Audio playback requires a user gesture. The simplest solution: provide a visible "▶ Play" button that starts the audio, or use the answer submit form interaction as the gesture.

5. **Multiple choice options must be broadcast by host.** Don't generate them client-side from a local shuffle — all players need the same options, so they must come from the `question` broadcast payload.

6. **Re-shuffle on queue depletion.** In `useQuiz`, when the queue runs out, re-shuffle the existing array in-place (don't re-fetch from DB) to keep the game infinite without extra network calls.

7. **TV view joins without presence.** Pass `skipPresence: true` / don't call `channel.track()` from the TV to avoid the TV name appearing in the player list.

8. **State vs Ref for game values.** Use `useState` for anything that drives component re-renders (display). Use `useRef` for values that only need to be read inside callbacks or timers (e.g. `questionIndexRef`, `allPokemonRef`).
