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

### The language-model brain

CloClo's choices, the thought he sets off with, and his diary lines are written by **Claude Haiku 5.5**. The browser asks the server (`/api/decide`) each time CloClo finishes something; the server calls Claude, so the API key never reaches the browser.

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env   # .env is git-ignored
npm run dev                                   # the brain also runs in dev and preview

# production: one Node server for the site and the API
npm run build
ANTHROPIC_API_KEY=sk-ant-... npm start        # http://localhost:8080 (PORT to change)
```

Without a key, or on static hosting without the server, CloClo decides with his own rules, exactly as before. He also falls back to his rules when the model is slow (8 s), returns an error, picks something that isn't open, at 20× speed, and when a spending limit is reached.

Spending limits, for all visitors together (environment variables on the server):

| Variable | Default | |
|---|---|---|
| `BRAIN_MAX_PER_MINUTE` | 20 | decisions per minute |
| `BRAIN_MAX_PER_DAY` | 2000 | decisions per day (≈ $0.25 per day at most) |

The server logs every decision with its tokens and cost, and `GET /api/brain` shows the running totals.

### Structure

```
index.html            page markup (HUD, side panel)
src/
  main.js             renderer, startup and the frame loop
  style.css
  state.js            game time (T), speed, clock helpers
  scene.js            scene, camera, sun and hemisphere light
  helpers.js          mesh/material helpers, seeded random
  lighting.js         day/night cycle
  controls.js         camera orbit/zoom, buttons
  hud.js              clock, need bars, diary, thought bubble
  particles.js        floating hearts, notes, stars and z's
  world/              Mosdorp: locations, roads, buildings, park, pond, vegetable garden,
                      fountain, ice cream stand, lookout hill, flower meadow,
                      Biscuit the cat, street lamps, trees, sky, name signs
  clo/
    catalog.js        activity descriptions for the language model (shared with the server)
    llm.js            asks the server's language-model brain, with fallback
    model.js          CloClo's 3D model
    acts.js           needs and all activities (scores, texts)
    brain.js          making choices, walking routes, arriving and finishing
    animate.js        CloClo's movements per activity
server/
  brain.js            the Claude call: prompt, JSON schema, token and cost tracking
  api.js              /api routes with spending limits (used by Vite and by index.js)
  index.js            production server: dist/ + /api
```

The world is built in a fixed order (`world/index.js`) because trees, stones and clouds use a seeded random. That way the village looks the same on every start.

- **World**: CloClo's house, bakery, library, post office, ice cream stand, park with a swing, pond with ducks, vegetable garden, flower meadow with butterflies, a lookout hill with a telescope, and a square with a fountain. With a day/night cycle. Biscuit the cat strolls around the square and naps by the fountain at night.
- **Brain**: five needs (full tummy, energy, fun, curiosity, company) that slowly drop. Claude Haiku 5.5 picks his next activity from his needs, the hour, his recent activities and diary, and writes his thoughts and diary. Without the model he uses a utility score based on his needs and the hour, plus some randomness, and avoids repeating what he just did. Fourteen activities, from fishing and reading to cuddling Biscuit, writing to Grandma and stargazing at night.
- **CloClo**: his face shows his mood (smile or frown, eyebrows, rosy cheeks), his eyes glance around, his tail wags when he is happy, he hops when he arrives somewhere, and he carries a lantern after dark. Hearts, music notes, stars and z's float up while he does things he enjoys.
- **Display**: a thought bubble, a diary, need bars, a camera you can rotate and zoom, and speed 1×, 5× or 20×.

## Next steps

1. **Server-side simulation**: the world runs 24/7 on a server, and visitors receive the state over WebSockets, so everyone sees the same thing.
2. **Longer memory**: the language model now sees CloClo's last 8 diary lines; a daily summary would let him remember yesterday.
3. **Moderation** of all text shown publicly.
4. **Better 3D models** (Blender or asset packs) and more events: weather, seasons and random happenings.
