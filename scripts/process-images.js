/**
 * process-images.js
 *
 * Downloads all Pokémon images from Supabase storage, removes the white
 * background using ImageMagick, re-uploads as transparent PNG, and updates
 * the image_url in the database.
 *
 * Requirements:
 *   - ImageMagick 7+ installed (https://imagemagick.org)
 *     Verify with: magick --version
 *   - .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *
 * Usage:
 *   node scripts/process-images.js
 */

import { execSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createClient } from '@supabase/supabase-js'
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

const supabase = createClient(supabaseUrl, supabaseKey)
const BUCKET = 'pokemon-images'

// Detect ImageMagick command (IM7 uses "magick", IM6 uses "convert")
function getMagickCmd() {
  try {
    execSync('magick --version', { stdio: 'ignore' })
    return 'magick'
  } catch {
    try {
      execSync('convert --version', { stdio: 'ignore' })
      return 'convert'
    } catch {
      console.error('❌ ImageMagick not found. Install from https://imagemagick.org')
      process.exit(1)
    }
  }
}

async function processImages() {
  const magick = getMagickCmd()
  console.log(`✅ Using ImageMagick command: ${magick}`)

  // List all files in bucket
  const { data: files, error: listErr } = await supabase.storage.from(BUCKET).list()
  if (listErr) throw new Error(`Could not list bucket: ${listErr.message}`)
  if (!files || files.length === 0) {
    console.error('No files found in bucket. Run "npm run scrape" first.')
    process.exit(1)
  }

  // Only process JPG files (skip already-processed PNGs)
  const jpgFiles = files.filter((f) => f.name.endsWith('.jpg'))
  console.log(`📂 Found ${jpgFiles.length} JPG images to process\n`)

  let processed = 0
  let failed = 0

  for (const file of jpgFiles) {
    const jpgPath = join(tmpdir(), `pokemon-input-${file.name}`)
    const pngName = file.name.replace('.jpg', '.png')
    const pngPath = join(tmpdir(), `pokemon-output-${pngName}`)

    try {
      // 1. Download JPG from storage
      const { data: fileData, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(file.name)
      if (dlErr) throw new Error(`Download failed: ${dlErr.message}`)

      writeFileSync(jpgPath, Buffer.from(await fileData.arrayBuffer()))

      // 2. Remove white background with ImageMagick
      //    -fuzz 8%: allows near-white pixels to also become transparent
      //    -alpha set: enable alpha channel
      //    flood-fill from all four corners for clean edges
      execSync(
        `${magick} "${jpgPath}" -alpha set ` +
          `-fuzz 8% -draw "color 0,0 floodfill" ` +
          `-fuzz 8% -draw "color %[fx:w-1],0 floodfill" ` +
          `-fuzz 8% -draw "color 0,%[fx:h-1] floodfill" ` +
          `-fuzz 8% -draw "color %[fx:w-1],%[fx:h-1] floodfill" ` +
          `-trim +repage "${pngPath}"`,
        { stdio: 'pipe' }
      )

      // 3. Upload PNG to storage
      const pngBuffer = readFileSync(pngPath)
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(pngName, pngBuffer, { contentType: 'image/png', upsert: true })
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

      // 4. Get public URL for the PNG
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(pngName)

      // 5. Update image_url in database
      //    Extract pokemon number from filename e.g. "001-bulbasaur.jpg" → 1
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
      process.stdout.write(`\r  ✅ ${processed}/${jpgFiles.length} done (latest: ${pngName})`)
    } catch (err) {
      failed++
      console.warn(`\n  ⚠️  ${file.name}: ${err.message}`)
    } finally {
      if (existsSync(jpgPath)) unlinkSync(jpgPath)
      if (existsSync(pngPath)) unlinkSync(pngPath)
    }
  }

  console.log(`\n\n🎉 Done! ${processed} images processed, ${failed} failed.`)
  console.log(`   Images stored in bucket "${BUCKET}" as transparent PNGs.`)
  console.log(`   Database image_url fields updated to point to the new PNGs.`)
}

processImages().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
