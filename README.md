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

With an API key, **Claude Haiku 5.5** decides everything about CloClo's life: what he does next and for how long, how he feels (shown on his face), the thought he sets off with, a few things he says while he is busy, his diary lines, and a short plan for later. At the block yard it also designs what he builds. At bedtime it writes a short summary of his day in his own words; he remembers his last 7 days, so he can continue projects and remember friends. He has no needs or stats; only opening hours limit what he can do.

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env   # .env is git-ignored (used by npm run dev/preview)
ANTHROPIC_API_KEY=sk-ant-... npm start        # production
```

Without a key CloClo decides with his own rules. He also falls back to his rules when the model returns an error or picks something that isn't open, and when a spending limit is reached. By default the model decides around the clock, also when nobody is watching (about $0.35 per day, $10–11 per month).

Server settings (environment variables):

| Variable | Default | |
|---|---|---|
| `SIM_SPEED` | 1 | game minutes per real second; while CloClo sleeps the clock runs 6× faster, so a game day takes about 16 minutes |
| `CLOCLO_DATA` | `data/world.json` | where the world is saved |
| `BRAIN_MAX_PER_MINUTE` | 10 | language-model calls per minute |
| `BRAIN_MAX_PER_DAY` | 4000 | language-model calls per day (≈ $0.45 per day at most) |
| `BRAIN_WHEN_EMPTY` | on | `0`: only use the language model while someone watches (cheaper; the rules decide otherwise) |

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
    pip.js            Pip the puppy: where he is, walks, tricks and how well he knows them
    blocks.js         all blocks in the village: where they stand, what may go where
    walk.js           walking around blocks: pathfinding on the village grid
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

- **World**: CloClo's house (with Pip's doghouse), bakery, library, post office, ice cream stand, park with a swing, pond with ducks, vegetable garden, flower meadow with butterflies, a lookout hill with a telescope, a block yard, the Little farm, a training field, a square with a fountain and benches, and four neighbours' houses further out. Grass, wildflowers and bushes in the fields, lily pads and reeds in the pond, smoke from CloClo's chimney, birds by day and fireflies by night, and mountains on the horizon. With a soft day/night cycle. Biscuit the cat strolls around the square and naps by the fountain at night.
- **Animals**: Pip, CloClo's puppy, potters around his doghouse, sleeps in it at night, walks along with CloClo for a few hours after a walk, and learns tricks on the training field (sit, give a paw, jump over the hurdle, roll over, fetch). The more they practise, the better he gets; early on he often chases his tail instead. At the Little farm live four chickens, Wooly the sheep and the rabbits Bun and Bean; they come over when CloClo feeds or pets them, and the ducks swim over for bread.
- **Brain**: no needs or stats. Claude Haiku 5.5 decides freely what he does, for how long and how he feels, with the hour, his diary and his own plan as context. Without the model, simple rules pick something that suits the time of day (meals at mealtimes, stargazing in the evening, sleep at night) and avoid repeats. Twenty-one activities, from fishing and reading to training Pip, feeding the farm animals, writing to Grandma and stargazing at night.
- **Blocks, anywhere**: the whole village is a grid of 1-metre spots where blocks in seven colours stack up to 12 high (at most 400 blocks in total), except inside buildings, in the pond, on the fountain and on the vegetable beds. A block goes on top of a stack, or at a chosen level if it rests on a block below or touches one beside it, so bridges, arches and windows are possible. When CloClo goes building he starts at the block yard (his workshop with the crate, lit by string lights at night); the language model gets a map of the village and every block in it, and designs up to 24 steps: place, remove, move a block, or clear an area. He walks to each spot and does them one by one. What he builds stays and is saved. Without the model, simple rules build towers, walls and bridges near random places, and tidy up now and then. Blocks are solid: CloClo walks around them (pathfinding on the 1 m grid) and can walk under bridges and arches whose two lowest levels are free. If a place is walled off he walks as close as he can and gets stuck; the language model hears about it at its next decision, and he can clear blocks right where he stands if he can't reach the block yard. Without the model, he clears a way out after getting stuck twice.
- **CloClo**: his face shows the mood the brain chose (smile or frown, eyebrows, rosy cheeks, sleepy eyes), his eyes glance around, his tail wags when he is happy, he hops when he arrives somewhere, and he carries a lantern after dark. Hearts, music notes, stars and z's float up while he does things he enjoys.
- **Display**: a thought bubble, what he is doing, feeling and planning, a diary, how many people are watching, and a camera you can rotate and zoom. The local copy also has speed 1×, 5× or 20×.

## Next steps

1. **Hosting**: see [DEPLOY.md](DEPLOY.md) for an Ubuntu VPS.
2. **Perception**: tell the model more about what happens around him (where Biscuit is, weather, changes in the village).
3. **Moderation** of all text shown publicly.
4. **Better 3D models** (Blender or asset packs) and more events: weather, seasons and random happenings.
