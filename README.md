# 四季樂園 Four Seasons Land

A game that teaches young children (under 6 and up) Traditional Chinese zhuyin (注音符號, Bopomofo) the Taiwan way:
pick a baby hero, walk a Mario-style map through four seasons, earn animal stickers for each symbol, and fill a
Sakura-pink sticker book.

It is a plain static website: HTML, CSS and JavaScript with no build step and no server code.

## Run it locally

```bash
npm run dev          # serves ./public at http://localhost:3000
# or: python3 -m http.server 3000 --directory public
```

Open it through a local server, not by double-clicking `index.html`: the 3D characters load `cast/*.txt` with `fetch`,
which browsers block on `file://` pages.

## Deploy to Vercel

**Dashboard:** push this folder to a GitHub/GitLab/Bitbucket repo, then in Vercel choose *Add New → Project*, import
the repo and click *Deploy*. `vercel.json` already sets the output folder to `public` with no build or install
command, so leave Framework Preset as *Other* and the build settings empty.

**CLI:**

```bash
npm i -g vercel      # or use npx
vercel               # preview deployment
vercel --prod        # production deployment
```

## Project layout

```
public/
  index.html          page shell, gate markup, HUD buttons, script order
  css/game.css        all styles (gate, map, lessons, sticker book, 設定 panel)
  js/
    zhuyin.js         the 37 zhuyin symbols, sound-alike characters, stroke data
    content.js        levels, lines, seasons, stickers and treats
    state.js          saved progress (localStorage) and heroes
    audio.js          sound effects and the Taiwan-accent voice router
    voice.js          built-in recorded voice: 253 MP3 clips (base64), loaded after the page is up
    cast-three.js     3D heroes and guides (three.js), sculpted meshes from cast/*.txt
    stage.js          character stages and portrait fallbacks
    seasons.js        painted season backgrounds, cherry trees, meadow and falling petals
    world.js          the Mario-style world map
    castle.js         SVG castle gate (fallback when 3D is off)
    gate3d.js         realistic 3D park entrance
    game.js           screens, lessons, sticker book (drag-to-turn pages), 設定 panel
  spline/scenes.js    optional Spline scene slots (all empty: the built-in three.js models are used)
  spline/runtime/     self-hosted Spline runtime and its .wasm modules, loaded only if a scene slot is filled
  cast/               sculpted 3D meshes (*.txt, base64) and portrait PNGs
  vendor/three.min.js three.js r128 (MIT), served locally
vercel.json           static hosting config for Vercel
```

## Voice

The game speaks with a Taiwan accent only. When the device has a Taiwan Mandarin voice (for example Mei-Jia on Apple
devices, 國語（臺灣） on Android/Chrome, HsiaoChen on Windows), lines without zhuyin are spoken with it. Lines
containing zhuyin symbols, and devices without a Taiwan voice, use the built-in recordings in `js/voice.js` (Kokoro-82M,
Apache-2.0, with Taiwan Ministry of Education readings). Parents can change this in 設定.

## Third-party

- three.js r128 — MIT (`public/vendor/three-LICENSE.txt`)
- Fonts: LXGW WenKai TC and Fredoka from Google Fonts (loaded at runtime)
- Recorded voice generated with Kokoro-82M (Apache-2.0)
