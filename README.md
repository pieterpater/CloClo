# CloClo

A website where you can follow the life of CloClo: a cute little monster that lives his own life as an AI agent in Mosdorp, a small 3D village. Visitors can only watch. CloClo gets no input and does whatever he wants.

## Development

A Vite project with Three.js (r128, from npm).

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build in dist/
npm run preview  # preview the build locally
```

### One CloClo for everyone

CloClo lives on the server. The server runs the simulation (choices, walking, Biscuit, the garden, the clock) and streams it to every browser over `/api/stream` (Server-Sent Events), five times a second. Browsers only draw what they receive, so everyone watching sees the same CloClo at the same moment, and he keeps living when nobody watches. The world is saved to `data/world.json` every 30 seconds (and on shutdown), so a restart doesn't wipe his life.

```bash
npm run dev                                   # dev server with the live world
npm run build && npm start                    # production: one Node server for the site and the stream
                                              # http://localhost:8080 (PORT to change)
```

To put it on an Ubuntu VPS (systemd + Caddy for HTTPS), follow [DEPLOY.md](DEPLOY.md).

Without the server (static hosting, or the server can't be reached) the page runs its own copy of Mosdorp in the browser, with the rules brain and the speed button.

### The language-model brain

With an API key, **Claude Haiku 5.5** decides everything about CloClo's life: what he does next and for how long, how he feels (shown on his face), the thought he sets off with, his diary lines, and a short plan for later. At the block yard it also designs what he builds. He has no needs or stats; only opening hours limit what he can do.

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env   # .env is git-ignored (used by npm run dev/preview)
ANTHROPIC_API_KEY=sk-ant-... npm start        # production
```

Without a key CloClo decides with his own rules. He also falls back to his rules when the model returns an error or picks something that isn't open, when a spending limit is reached, and (by default) when nobody is watching.

Server settings (environment variables):

| Variable | Default | |
|---|---|---|
| `SIM_SPEED` | 1 | game minutes per real second (1 = a game day takes 24 minutes) |
| `CLOCLO_DATA` | `data/world.json` | where the world is saved |
| `BRAIN_MAX_PER_MINUTE` | 10 | language-model decisions per minute |
| `BRAIN_MAX_PER_DAY` | 3000 | language-model decisions per day (≈ $0.30 per day at most) |
| `BRAIN_WHEN_EMPTY` | off | `1`: also use the language model when nobody is watching |

The server logs every decision with its tokens and cost. `GET /api/brain` shows the brain, the number of viewers, the running totals and today's decisions.

### Structure

```
index.html            page markup (HUD, side panel)
src/
  main.js             renderer, startup and the frame loop (draws what the source gives)
  source.js           the world from the server's stream (smoothed), or a local copy
  style.css
  state.js            game time (T), speed, clock helpers
  scene.js            scene, camera, sun and hemisphere light
  helpers.js          mesh/material helpers, seeded random
  lighting.js         day/night cycle
  controls.js         camera orbit/zoom, buttons
  hud.js              clock, what he is doing and feeling, diary, thought bubble
  particles.js        floating hearts, notes, stars and z's
  world/              Mosdorp: locations, roads, buildings, park, pond, vegetable garden,
                      fountain, ice cream stand, lookout hill, flower meadow,
                      Biscuit the cat, street lamps, trees, sky, name signs
  sim/                the simulation, without any drawing (runs on the server, or in the browser)
    simulation.js     one world: tick, snapshot for viewers, save and load
    brain.js          making choices (rules or language model), walking routes, arriving and finishing
    acts.js           all activities (texts, and time-of-day scores for the rules)
    catalog.js        activity descriptions for the language model
    cat.js            where Biscuit goes and what she does
    blocks.js         the block yard: which blocks stand where
    garden.js         how big the plants are
  clo/
    model.js          CloClo's 3D model
    animate.js        CloClo's movements per activity
server/
  sim.js              runs the one world, streams it to viewers, saves it, spending limits
  brain.js            the Claude call: prompt, JSON schema, token and cost tracking
  api.js              /api routes (used by Vite and by index.js)
  index.js            production server: dist/ + /api
```

The world is built in a fixed order (`world/index.js`) because trees, stones and clouds use a seeded random. That way the village looks the same on every start.

- **World**: CloClo's house, bakery, library, post office, ice cream stand, park with a swing, pond with ducks, vegetable garden, flower meadow with butterflies, a lookout hill with a telescope, a block yard, and a square with a fountain. With a day/night cycle. Biscuit the cat strolls around the square and naps by the fountain at night.
- **Brain**: no needs or stats. Claude Haiku 5.5 decides freely what he does, for how long and how he feels, with the hour, his diary and his own plan as context. Without the model, simple rules pick something that suits the time of day (meals at mealtimes, stargazing in the evening, sleep at night) and avoid repeats. Fifteen activities, from fishing and reading to cuddling Biscuit, writing to Grandma and stargazing at night.
- **Block yard**: a 6×6 grid where blocks stack up to 6 high, in seven colours. When CloClo goes building, the language model gets a description of what stands there and designs up to 16 steps (place a block, or take the top one off); he places them one by one and they pop into place. What he builds is saved, so he can add to it later or start over. Without the model, simple rules build towers and walls, and tidy up when the yard gets full.
- **CloClo**: his face shows the mood the brain chose (smile or frown, eyebrows, rosy cheeks, sleepy eyes), his eyes glance around, his tail wags when he is happy, he hops when he arrives somewhere, and he carries a lantern after dark. Hearts, music notes, stars and z's float up while he does things he enjoys.
- **Display**: a thought bubble, what he is doing, feeling and planning, a diary, how many people are watching, and a camera you can rotate and zoom. The local copy also has speed 1×, 5× or 20×.

## Next steps

1. **Hosting**: see [DEPLOY.md](DEPLOY.md) for an Ubuntu VPS.
2. **Longer memory**: the language model now sees CloClo's last 8 diary lines; a daily summary would let him remember yesterday.
3. **Moderation** of all text shown publicly.
4. **Better 3D models** (Blender or asset packs) and more events: weather, seasons and random happenings.
