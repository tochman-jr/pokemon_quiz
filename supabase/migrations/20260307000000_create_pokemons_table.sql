-- Create pokemons table
CREATE TABLE pokemons (
  id         BIGSERIAL PRIMARY KEY,
  number     INT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  image_url  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE pokemons ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON pokemons FOR SELECT USING (true);

-- Allow the scraper (anon key) to insert and update pokemon rows
CREATE POLICY "Allow anon insert" ON pokemons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON pokemons FOR UPDATE USING (true);

-- Storage bucket: pokemon-images
-- Run this after creating the bucket in the Supabase dashboard (or via the scraper script)
INSERT INTO storage.buckets (id, name, public)
VALUES ('pokemon-images', 'pokemon-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to images in the bucket
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'pokemon-images');

-- Allow the scraper (anon key) to upload images
CREATE POLICY "Allow anon upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'pokemon-images');

-- Allow the scraper (anon key) to overwrite existing images
CREATE POLICY "Allow anon upsert" ON storage.objects
  FOR UPDATE USING (bucket_id = 'pokemon-images');
