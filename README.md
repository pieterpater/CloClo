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
    model.js          CloClo's 3D model
    acts.js           needs and all activities (scores, texts)
    brain.js          making choices, walking routes, arriving and finishing
    animate.js        CloClo's movements per activity
```

The world is built in a fixed order (`world/index.js`) because trees, stones and clouds use a seeded random. That way the village looks the same on every start.

- **World**: CloClo's house, bakery, library, post office, ice cream stand, park with a swing, pond with ducks, vegetable garden, flower meadow with butterflies, a lookout hill with a telescope, and a square with a fountain. With a day/night cycle. Biscuit the cat strolls around the square and naps by the fountain at night.
- **Brain**: five needs (full tummy, energy, fun, curiosity, company) that slowly drop. CloClo picks his next activity with a utility score based on his needs and the hour, plus some randomness. He avoids repeating what he just did. Fourteen activities, from fishing and reading to cuddling Biscuit, writing to Grandma and stargazing at night.
- **CloClo**: his face shows his mood (smile or frown, eyebrows, rosy cheeks), his eyes glance around, his tail wags when he is happy, he hops when he arrives somewhere, and he carries a lantern after dark. Hearts, music notes, stars and z's float up while he does things he enjoys.
- **Display**: a thought bubble, a diary, need bars, a camera you can rotate and zoom, and speed 1×, 5× or 20×.

## Next steps

1. **Server-side simulation**: the world runs 24/7 on a server, and visitors receive the state over WebSockets, so everyone sees the same thing.
2. **Language model as the brain**: a high-level decision every few minutes, with memory and a diary. The game logic handles walking and animations.
3. **Moderation** of all text shown publicly.
4. **Better 3D models** (Blender or asset packs) and more events: weather, seasons and random happenings.
