# CloClo

Een website waar je het leven van CloClo kunt volgen: een schattig monstertje dat als AI-agent zijn eigen leven leidt in Mosdorp, een klein 3D-stadje. Bezoekers kunnen alleen kijken. CloClo krijgt geen input en doet wat hij wil.

## Ontwikkelen

Een Vite-project met Three.js (r128, uit npm).

```bash
npm install
npm run dev      # ontwikkelserver op http://localhost:5173
npm run build    # productiebuild in dist/
npm run preview  # bekijk de build lokaal
```

### Structuur

```
index.html            pagina-opmaak (HUD, zijpaneel)
src/
  main.js             renderer, opstart en de frame-loop
  style.css
  state.js            speltijd (T), tempo, klok-helpers
  scene.js            scene, camera, zon en hemellicht
  helpers.js          mesh/materiaal-helpers, seeded random
  lighting.js         dag-en-nachtritme
  controls.js         camera draaien/zoomen, knoppen
  hud.js              klok, behoeftebalken, dagboek, gedachtewolk
  world/              Mosdorp: plekken, wegen, gebouwen, park, vijver,
                      moestuin, fontein, lantaarns, bomen, lucht, naambordjes
  clo/
    model.js          het 3D-model van CloClo
    acts.js           behoeften en alle activiteiten (scores, teksten)
    brain.js          keuzes maken, looproutes, aankomen en afronden
    animate.js        CloClo's bewegingen per activiteit
```

De wereld wordt in een vaste volgorde opgebouwd (`world/index.js`), omdat bomen, stenen en wolken een seeded random gebruiken. Zo ziet het dorp er bij elke start hetzelfde uit.

- **Wereld**: huis, bakkerij, bibliotheek, park met schommel, vijver met eendjes, moestuin en een plein met fontein. Met dag-en-nachtritme.
- **Brein**: vier behoeften (buikje vol, energie, plezier, nieuwsgierigheid) die langzaam dalen. CloClo kiest zijn volgende bezigheid met een utility-score op basis van zijn behoeften en het uur, plus wat toeval.
- **Weergave**: een tekstwolk met zijn gedachten, een dagboek, behoeftebalken, een camera die je kunt draaien en zoomen, en tempo 1×, 5× of 20×.

## Volgende stappen

1. **Server-side simulatie**: de wereld draait 24/7 op een server, en bezoekers krijgen de toestand via WebSockets, zodat iedereen hetzelfde ziet.
2. **Taalmodel als brein**: elke paar minuten een beslissing op hoog niveau, met geheugen en dagboek. De spellogica regelt het lopen en de animaties.
3. **Moderatie** van alle tekst die publiek getoond wordt.
4. **Betere 3D-modellen** (Blender of assetpakketten) en meer gebeurtenissen: weer, seizoenen en toevallige voorvallen.
