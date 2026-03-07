# Pokémon Quiz 🎮

A "Who's That Pokémon?" quiz app — guess all 151 original Pokémon from their silhouette!

## Tech stack
- **React 18** + Vite
- **Tailwind CSS** with a custom Pokémon color palette
- **Framer Motion** for animations
- **Supabase** for the Pokémon database
- **Puppeteer** to scrape data from pokemondb.net

## Getting started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. In the SQL editor, run:

```sql
CREATE TABLE pokemons (
  id         BIGSERIAL PRIMARY KEY,
  number     INT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  image_url  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read access
ALTER TABLE pokemons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON pokemons FOR SELECT USING (true);
```

### 3. Configure environment
```bash
cp .env.example .env
```
Then edit `.env` with your Supabase project URL and anon key (found in **Settings → API**).

### 4. Scrape & seed Pokémon data
```bash
npm run scrape
```
This uses Puppeteer to scrape the first 151 Pokémon from [pokemondb.net](https://pokemondb.net/pokedex/all) and stores them in your Supabase database.

### 5. Start the dev server
```bash
npm run dev
```

## Color palette
| Color | Hex |
|-------|-----|
| Blue | `#3466AF` |
| Dark Blue | `#21308E` |
| Navy | `#1D2C5E` |
| Yellow | `#FFC805` |
| Gold | `#C7A008` |
