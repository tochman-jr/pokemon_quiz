/**
 * Pokemon Scraper
 * Scrapes the first 151 Pokemon from pokemondb.net, uploads their images to
 * a Supabase storage bucket, and stores the data in the pokemons table.
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in your Supabase credentials.
 *   2. Run the SQL migration in supabase/migrations/ in your Supabase SQL editor.
 *   3. Run: npm run scrape
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
  console.error('Could not read .env file. Make sure you copied .env.example to .env and filled in your credentials.')
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const BUCKET_NAME = 'pokemon-images'

async function ensureBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) throw new Error(`Could not list buckets: ${listError.message}`)

  if (buckets?.some((b) => b.name === BUCKET_NAME)) {
    console.log(`🪣 Bucket "${BUCKET_NAME}" already exists`)
    return
  }

  const { error } = await supabase.storage.createBucket(BUCKET_NAME, { public: true })
  if (error) throw new Error(`Failed to create bucket "${BUCKET_NAME}": ${error.message}`)
  console.log(`🪣 Created storage bucket: ${BUCKET_NAME}`)
}

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

async function scrapePokemon() {
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

      const imgSrc = imgEl
        ? imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || ''
        : ''

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

  // Download and upload each image to Supabase storage
  console.log('\n📸 Uploading images to Supabase storage...')
  let uploaded = 0
  for (const pokemon of gen1) {
    try {
      pokemon.image_url = await uploadImage(pokemon.number, pokemon.name, pokemon.image_url)
      uploaded++
      process.stdout.write(`\r  ✅ ${uploaded}/${gen1.length} uploaded (latest: #${pokemon.number} ${pokemon.name})`)
    } catch (err) {
      console.warn(`\n  ⚠️  #${pokemon.number} ${pokemon.name}: ${err.message} — keeping original URL`)
    }
  }
  console.log(`\n✅ Images uploaded: ${uploaded}/${gen1.length}`)

  // Upsert into Supabase in batches of 50
  console.log('\n💾 Saving to database...')
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

  console.log('\n🎉 Done! All 151 Generation 1 Pokemon stored in Supabase with images in storage bucket.')
  console.log('Sample entries:')
  gen1.slice(0, 3).forEach((p) => console.log(`  #${p.number} ${p.name} → ${p.image_url}`))
}

scrapePokemon().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
