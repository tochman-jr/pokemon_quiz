/**
 * Gen 2 Pokémon Scraper (#152–251)
 * Scrapes Johto Pokémon from pokemondb.net, uploads images to Supabase storage,
 * and upserts into the pokemons table.
 *
 * Usage: npm run scrape-gen2
 */

import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

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
  console.error('Could not read .env file.')
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const BUCKET_NAME = 'pokemon-images'

async function uploadImage(number, name, artworkUrl) {
  const fileName = `${String(number).padStart(3, '0')}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`

  const response = await fetch(artworkUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PokemonScraper/1.0)' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${artworkUrl}`)

  const buffer = Buffer.from(await response.arrayBuffer())

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName)
  return data.publicUrl
}

async function scrapeGen2() {
  console.log('🚀 Launching browser...')
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )

  console.log('🌐 Navigating to pokemondb.net/pokedex/all ...')
  await page.goto('https://pokemondb.net/pokedex/all', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  })

  console.log('🔍 Extracting Pokémon data...')
  const allPokemon = await page.evaluate(() => {
    const rows = document.querySelectorAll('#pokedex tbody tr')
    const results = []

    rows.forEach((row) => {
      const numberEl = row.querySelector('td.cell-num .infocard-cell-data')
      const nameEl = row.querySelector('td.cell-name a.ent-name')

      if (!numberEl || !nameEl) return

      const number = parseInt(numberEl.textContent.trim(), 10)
      const name = nameEl.textContent.trim()
      const nameLower = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
      const artworkUrl = `https://img.pokemondb.net/artwork/large/${nameLower}.jpg`

      results.push({ number, name, image_url: artworkUrl })
    })

    return results
  })

  await browser.close()

  // Filter to Gen 2 (#152–251), one entry per number
  const gen2 = []
  const seen = new Set()
  for (const p of allPokemon) {
    if (p.number >= 152 && p.number <= 251 && !seen.has(p.number)) {
      seen.add(p.number)
      gen2.push({ number: p.number, name: p.name, image_url: p.image_url })
    }
  }

  console.log(`✅ Found ${gen2.length} Generation 2 Pokémon`)

  if (gen2.length === 0) {
    console.error('No Pokémon found. The page structure may have changed.')
    process.exit(1)
  }

  // Upload images to Supabase storage
  console.log('\n📸 Uploading images to Supabase storage...')
  let uploaded = 0
  for (const pokemon of gen2) {
    try {
      pokemon.image_url = await uploadImage(pokemon.number, pokemon.name, pokemon.image_url)
      uploaded++
      process.stdout.write(`\r  ✅ ${uploaded}/${gen2.length} uploaded (latest: #${pokemon.number} ${pokemon.name})`)
    } catch (err) {
      console.warn(`\n  ⚠️  #${pokemon.number} ${pokemon.name}: ${err.message} — keeping original URL`)
    }
  }
  console.log(`\n✅ Images uploaded: ${uploaded}/${gen2.length}`)

  // Upsert into Supabase in batches of 50
  console.log('\n💾 Saving to database...')
  const BATCH_SIZE = 50
  for (let i = 0; i < gen2.length; i += BATCH_SIZE) {
    const batch = gen2.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('pokemons')
      .upsert(batch, { onConflict: 'number' })

    if (error) {
      console.error(`❌ Error inserting batch:`, error.message)
      process.exit(1)
    }
    console.log(`📦 Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} Pokémon)`)
  }

  console.log('\n🎉 Done! All Generation 2 Pokémon stored.')
  gen2.slice(0, 3).forEach((p) => console.log(`  #${p.number} ${p.name} → ${p.image_url}`))
}

scrapeGen2().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
