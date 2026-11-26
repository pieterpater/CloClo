# CloClo

Een website waar je het leven van CloClo kunt volgen: een schattig monstertje dat als AI-agent zijn eigen leven leidt in Mosdorp, een klein 3D-stadje. Bezoekers kunnen alleen kijken. CloClo krijgt geen input en doet wat hij wil.

## Prototype

`index.html` is een zelfstandig prototype dat volledig in de browser draait (Three.js r128 via cdnjs). Open het bestand in een browser om het te bekijken.

- **Wereld**: huis, bakkerij, bibliotheek, park met schommel, vijver met eendjes, moestuin en een plein met fontein. Met dag-en-nachtritme.
- **Brein**: vier behoeften (buikje vol, energie, plezier, nieuwsgierigheid) die langzaam dalen. CloClo kiest zijn volgende bezigheid met een utility-score op basis van zijn behoeften en het uur, plus wat toeval.
- **Weergave**: een tekstwolk met zijn gedachten, een dagboek, behoeftebalken, een camera die je kunt draaien en zoomen, en tempo 1×, 5× of 20×.

## Volgende stappen

1. **Server-side simulatie**: de wereld draait 24/7 op een server, en bezoekers krijgen de toestand via WebSockets, zodat iedereen hetzelfde ziet.
2. **Taalmodel als brein**: elke paar minuten een beslissing op hoog niveau, met geheugen en dagboek. De spellogica regelt het lopen en de animaties.
3. **Moderatie** van alle tekst die publiek getoond wordt.
4. **Betere 3D-modellen** (Blender of assetpakketten) en meer gebeurtenissen: weer, seizoenen en toevallige voorvallen.
