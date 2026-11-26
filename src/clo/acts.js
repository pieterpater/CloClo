import { night } from '../state.js';
import { garden } from '../world/garden.js';

// Behoeften: [sleutel, label, kleur]
export const NEEDS = [['buik', 'Buikje vol', '#ff9f1c'], ['energie', 'Energie', '#ffd166'], ['plezier', 'Plezier', '#ff6b6b'], ['nieuws', 'Nieuwsgierig', '#3fbfb0']];

// Hoe snel elke behoefte per spelminuut daalt.
export const DECAY = { buik: .11, energie: .055, plezier: .09, nieuws: .07 };

// Alles wat CloClo kan doen.
//   loc:    plek in LOC
//   inside: CloClo verdwijnt naar binnen
//   eff:    verandering van behoeften per spelminuut
//   score:  hoe graag hij dit nu wil (n = behoeften, h = uur)
//   dur:    duur in spelminuten
//   why/mid/end: gedachten bij vertrek, tijdens en na afloop
export const ACTS = {
  slapen: {
    loc: 'huis', inside: true, txt: 'slaapt in zijn huisje', eff: { energie: .25 },
    score: (n, h) => night(h) ? (115 - n.energie) * 1.6 + 60 : (n.energie < 18 ? 90 : 0),
    dur: h => { const m = (h < 12 ? 7 - h : 31 - h) * 60; return Math.max(60, m + Math.random() * 30); },
    why: ['Gaap… mijn bedje roept.', 'Ik ben zo moe. Welterusten, Mosdorp.'],
    mid: ['Zzz…', 'zzz… croissants… zzz', 'Zzz… *snurk*'],
    end: ['Uitgeslapen! Ik droomde over wolken van slagroom.', 'Goeiemorgen! Ik droomde dat ik kon vliegen.']
  },
  eten: {
    loc: 'bakkerij', txt: 'smult bij de bakkerij', eff: { buik: 1.8, plezier: .2 },
    score: (n, h) => (n.buik < 15 ? 300 : (100 - n.buik) * 1.3) + ((h >= 7 && h < 9) || (h >= 12 && h < 13.5) || (h >= 18 && h < 19.5) ? 30 : 0) - (h < 6 || h > 21 ? 40 : 0),
    dur: () => 25 + Math.random() * 20,
    why: ['Mijn buik rommelt. Op naar de bakkerij!', 'Ik ruik versgebakken brood…'],
    mid: ['Mmm, een croissant!', 'Nog eentje dan…', 'Kruimels overal, oeps.'],
    end: ['Buikje rond. De bakker gaf me een extra koekje.', 'Lekker! De kruimels heb ik aan de mussen gegeven.']
  },
  lezen: {
    loc: 'bieb', inside: true, txt: 'leest in de bibliotheek', eff: { nieuws: 1.3, plezier: .3 },
    score: (n, h) => h >= 9 && h < 18 ? (100 - n.nieuws) * 1.15 : 0,
    dur: () => 50 + Math.random() * 40,
    why: ['Ik wil iets nieuws leren!', 'Er ligt vast een nieuw boek op me te wachten.'],
    mid: ['Wist je dat octopussen drie harten hebben?', 'Bladzijde 42…', 'Ooh, een boek over sterren!'],
    end: ['Vandaag geleerd hoe regenbogen ontstaan.', 'Wat een spannend boek. Morgen lees ik verder.']
  },
  schommelen: {
    loc: 'park', txt: 'schommelt in het park', eff: { plezier: 2, energie: -.15 },
    score: (n, h) => (100 - n.plezier) * (night(h) ? .2 : 1.05),
    dur: () => 20 + Math.random() * 20,
    why: ['Ik heb zin om te schommelen!', 'Hoger, hoger! Naar het park.'],
    mid: ['Wiiieee!', 'Hoger!', 'Ik raak bijna de wolken!'],
    end: ['Mijn buik kriebelde van het schommelen.', 'Twintig keer heen en weer. Een record!']
  },
  vissen: {
    loc: 'vijver', txt: 'vist aan de vijver', eff: { plezier: .9, nieuws: .3 },
    score: (n, h) => ((100 - n.plezier) * .7 + (100 - n.nieuws) * .3) * (night(h) ? .3 : 1),
    dur: () => 40 + Math.random() * 30,
    why: ['Tijd voor wat rust aan de vijver.', 'Zou er vandaag iets bijten?'],
    mid: ['Stil… stil…', 'Het water is zo glad.', 'Kom maar, visje…'],
    end: ['Geen vis, wel een mooie libel gezien.', 'Een rustig uurtje aan het water.']
  },
  eenden: {
    loc: 'vijver', txt: 'zwaait naar de eendjes', eff: { plezier: 1.3 },
    score: (n, h) => ((100 - n.plezier) * .6 + 12) * (night(h) ? .2 : 1),
    dur: () => 12 + Math.random() * 10,
    why: ['Ik ga de eendjes gedag zeggen.'],
    mid: ['Hallo eendjes!', 'Kwak! (Ik oefen eends.)'],
    end: ['De eendjes kwaakten terug. Volgens mij zijn we vrienden.']
  },
  tuinieren: {
    loc: 'tuin', txt: 'geeft de plantjes water', eff: { plezier: .6, nieuws: .4, energie: -.1 },
    score: (n, h) => h >= 7 && h < 19 ? 30 + (100 - n.plezier) * .4 + (garden.groei < 1.4 ? 15 : 0) : 0,
    dur: () => 35 + Math.random() * 25,
    why: ['Mijn plantjes hebben dorst.', 'Eens kijken hoe de tomaten groeien.'],
    mid: ['Een beetje water hier…', 'Groei maar, kleintjes.', 'Ik zie een rups! Hallo rups.'],
    end: ['De moestuin ziet er blij uit.', 'Morgen zijn de tomaten vast nog groter.']
  },
  fontein: {
    loc: 'plein', txt: 'zit bij de fontein', eff: { energie: .18, plezier: .4 },
    score: n => 20 + (100 - n.energie) * .35,
    dur: () => 15 + Math.random() * 15,
    why: ['Even zitten bij de fontein.', 'Ik ga naar het klateren luisteren.'],
    mid: ['Plons, plons…', 'Ik tel de druppels. Honderd… duizend…'],
    end: ['Ik gooide een muntje in de fontein en deed een wens.', 'Een fijn rustmomentje.']
  },
  dansen: {
    loc: 'plein', txt: 'danst op het plein', eff: { plezier: 2.6, energie: -.25 },
    score: (n, h) => (100 - n.plezier) * (h >= 19 && h < 22.5 ? 1.3 : .3),
    dur: () => 12 + Math.random() * 10,
    why: ['Ik heb muziek in mijn hoofd!', 'Dansje op het plein. Niemand kijkt… toch?'],
    mid: ['Draaien, draaien!', 'Tralala!', 'Hop, hop!'],
    end: ['Duizelig van het dansen, hihi.', 'Mijn nieuwe dans heet de Monsterwals.']
  }
};
