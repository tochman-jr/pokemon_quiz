/**
 * Pokemon Scraper
 * Scrapes the first 151 Pokemon from pokemondb.net and stores them in Supabase.
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in your Supabase credentials.
 *   2. Run: npm run scrape
 *
 * Supabase table schema (run this SQL in your Supabase SQL editor first):
 *
 *   CREATE TABLE pokemons (
 *     id         BIGSERIAL PRIMARY KEY,
 *     number     INT UNIQUE NOT NULL,
 *     name       TEXT NOT NULL,
 *     image_url  TEXT NOT NULL,
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 *   -- Allow public read access
 *   ALTER TABLE pokemons ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Allow public read" ON pokemons FOR SELECT USING (true);
 */

import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env manually (no dotenv dependency needed)
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')

let supabaseUrl = ''
let supabaseKey = ''

try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.trim().split('=')
    const value = valueParts.join('=').trim()
    if (key === 'VITE_SUPABASE_URL') supabaseUrl = value
    if (key === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value
  }
} catch {
  console.error('Could not read .env file. Make sure you copied .env.example to .env and filled in your credentials.')
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function scrapePokemon() {
  console.log('🚀 Launching browser...')
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  // Set a user-agent to avoid bot detection
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )

  console.log('🌐 Navigating to pokemondb.net/pokedex/all ...')
  await page.goto('https://pokemondb.net/pokedex/all', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  })

  console.log('🔍 Extracting Pokemon data...')
  const allPokemon = await page.evaluate(() => {
    const rows = document.querySelectorAll('#pokedex tbody tr')
    const results = []

    rows.forEach((row) => {
      const numberEl = row.querySelector('td.cell-num .infocard-cell-data')
      const nameEl = row.querySelector('td.cell-name a.ent-name')
      const imgEl = row.querySelector('td.cell-name span.img-fixed')

      if (!numberEl || !nameEl) return

      const number = parseInt(numberEl.textContent.trim(), 10)
      const name = nameEl.textContent.trim()

      // Extract image URL from data-src or src attribute of the sprite
      const imgSrc = imgEl
        ? imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || ''
        : ''

      // Construct high-quality artwork URL from pokemondb.net
      // e.g. https://img.pokemondb.net/artwork/large/bulbasaur.jpg
      const nameLower = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
      const artworkUrl = `https://img.pokemondb.net/artwork/large/${nameLower}.jpg`

      results.push({ number, name, image_url: artworkUrl, sprite_url: imgSrc })
    })

    return results
  })

  await browser.close()

  // Filter to first 151 (original Generation 1), keep only unique numbers
  const gen1 = []
  const seen = new Set()
  for (const p of allPokemon) {
    if (p.number >= 1 && p.number <= 151 && !seen.has(p.number)) {
      seen.add(p.number)
      gen1.push({ number: p.number, name: p.name, image_url: p.image_url })
    }
  }

  console.log(`✅ Found ${gen1.length} Generation 1 Pokemon`)

  if (gen1.length === 0) {
    console.error('No Pokemon found. The page structure may have changed.')
    process.exit(1)
  }

  // Upsert into Supabase in batches of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < gen1.length; i += BATCH_SIZE) {
    const batch = gen1.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('pokemons')
      .upsert(batch, { onConflict: 'number' })

    if (error) {
      console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message)
      process.exit(1)
    }
    console.log(`📦 Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} pokemon)`)
  }

  console.log('\n🎉 Done! All 151 Generation 1 Pokemon stored in Supabase.')
  console.log('Sample entries:')
  gen1.slice(0, 3).forEach((p) => console.log(`  #${p.number} ${p.name} → ${p.image_url}`))
}

scrapePokemon().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
