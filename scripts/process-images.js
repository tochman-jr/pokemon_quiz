/**
 * process-images.js
 *
 * Downloads JPG Pokémon images from Supabase storage, removes the white
 * background using jimp (pure JS — no native deps), re-uploads as transparent
 * PNG, and updates image_url in the database.
 *
 * Usage:
 *   node scripts/process-images.js          # skip PNGs already in bucket
 *   node scripts/process-images.js --force  # re-process and overwrite all
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import Jimp from 'jimp'

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

const supabase = createClient(supabaseUrl, supabaseKey)
const BUCKET = 'pokemon-images'
const FUZZ = 30 // color tolerance for near-white pixels (0–255)
const FORCE = process.argv.includes('--force')

/**
 * BFS flood-fill from the four corners of the image, making white/near-white
 * connected pixels fully transparent. Returns a PNG Buffer.
 */
async function removeWhiteBackground(jpgBuffer) {
  const image = await Jimp.read(jpgBuffer)
  const width = image.getWidth()
  const height = image.getHeight()
  const visited = new Uint8Array(width * height)

  function isWhitish(x, y) {
    const { r, g, b } = Jimp.intToRGBA(image.getPixelColor(x, y))
    return r >= 255 - FUZZ && g >= 255 - FUZZ && b >= 255 - FUZZ
  }

  // Seed the fill from all four corners
  const stack = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]
  for (const [sx, sy] of stack) {
    visited[sy * width + sx] = 1
  }

  while (stack.length > 0) {
    const [x, y] = stack.pop()
    if (!isWhitish(x, y)) continue

    // Set pixel fully transparent (RGBA: 0,0,0,0)
    image.setPixelColor(0x00000000, x, y)

    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
      const idx = ny * width + nx
      if (!visited[idx]) {
        visited[idx] = 1
        stack.push([nx, ny])
      }
    }
  }

  return image.getBufferAsync(Jimp.MIME_PNG)
}

/** Fetch all files in the bucket, handling Supabase's 100-item page limit. */
async function listAllFiles() {
  const allFiles = []
  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: PAGE, offset })
    if (error) throw new Error(`Could not list bucket: ${error.message}`)
    if (!data || data.length === 0) break
    allFiles.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return allFiles
}

async function processImages() {
  const files = await listAllFiles()
  if (files.length === 0) {
    console.error('No files found in bucket. Run "npm run scrape" first.')
    process.exit(1)
  }

  const jpgFiles = files.filter((f) => f.name.endsWith('.jpg'))
  const existingPngs = new Set(files.filter((f) => f.name.endsWith('.png')).map((f) => f.name))

  console.log(`📂 Found ${jpgFiles.length} JPG(s) and ${existingPngs.size} existing PNG(s) in bucket`)
  if (FORCE) {
    console.log(`   --force: re-processing and overwriting all PNGs.\n`)
  } else {
    console.log(`   Skipping ${existingPngs.size} already-uploaded PNG(s). Use --force to re-process all.\n`)
  }

  let processed = 0
  let skipped = 0
  let failed = 0

  for (const file of jpgFiles) {
    const pngName = file.name.replace('.jpg', '.png')

    // Skip if PNG already exists and we're not forcing a re-run
    if (!FORCE && existingPngs.has(pngName)) {
      skipped++
      continue
    }

    try {
      // 1. Download original JPG from storage
      const { data: fileData, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(file.name)
      if (dlErr) throw new Error(`Download failed: ${dlErr.message}`)

      const jpgBuffer = Buffer.from(await fileData.arrayBuffer())

      // 2. Remove white background → transparent PNG
      const pngBuffer = await removeWhiteBackground(jpgBuffer)

      // 3. Upload PNG (upsert overwrites any existing bad version)
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(pngName, pngBuffer, { contentType: 'image/png', upsert: true })
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

      // 4. Get public URL
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(pngName)

      // 5. Update DB image_url (filename pattern: "001-bulbasaur.jpg" → number 1)
      const numberMatch = file.name.match(/^(\d+)-/)
      if (numberMatch) {
        const number = parseInt(numberMatch[1], 10)
        const { error: dbErr } = await supabase
          .from('pokemons')
          .update({ image_url: urlData.publicUrl })
          .eq('number', number)
        if (dbErr) throw new Error(`DB update failed: ${dbErr.message}`)
      }

      processed++
      process.stdout.write(`\r  ✅ ${processed} processed (latest: ${pngName})`)
    } catch (err) {
      failed++
      console.warn(`\n  ⚠️  ${file.name}: ${err.message}`)
    }
  }

  console.log(
    `\n\n🎉 Done! ${processed} processed, ${skipped} skipped (already PNG), ${failed} failed.`
  )
}

processImages().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
