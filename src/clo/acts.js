import { night } from '../state.js';
import { garden } from '../world/garden.js';

// Needs: [key, label, colour]
export const NEEDS = [['fullness', 'Buikje vol', '#ff9f1c'], ['energy', 'Energie', '#ffd166'], ['fun', 'Plezier', '#ff6b6b'], ['curiosity', 'Nieuwsgierig', '#3fbfb0']];

// How fast each need drops per game minute.
export const DECAY = { fullness: .11, energy: .055, fun: .09, curiosity: .07 };

// Everything CloClo can do.
//   loc:    location in LOC
//   inside: CloClo disappears indoors
//   eff:    change in needs per game minute
//   score:  how much he wants this right now (n = needs, h = hour)
//   dur:    duration in game minutes
//   why/mid/end: thoughts when setting off, during, and afterwards
export const ACTS = {
  sleep: {
    loc: 'home', inside: true, txt: 'slaapt in zijn huisje', eff: { energy: .25 },
    score: (n, h) => night(h) ? (115 - n.energy) * 1.6 + 60 : (n.energy < 18 ? 90 : 0),
    dur: h => { const m = (h < 12 ? 7 - h : 31 - h) * 60; return Math.max(60, m + Math.random() * 30); },
    why: ['Gaap… mijn bedje roept.', 'Ik ben zo moe. Welterusten, Mosdorp.'],
    mid: ['Zzz…', 'zzz… croissants… zzz', 'Zzz… *snurk*'],
    end: ['Uitgeslapen! Ik droomde over wolken van slagroom.', 'Goeiemorgen! Ik droomde dat ik kon vliegen.']
  },
  eat: {
    loc: 'bakery', txt: 'smult bij de bakkerij', eff: { fullness: 1.8, fun: .2 },
    score: (n, h) => (n.fullness < 15 ? 300 : (100 - n.fullness) * 1.3) + ((h >= 7 && h < 9) || (h >= 12 && h < 13.5) || (h >= 18 && h < 19.5) ? 30 : 0) - (h < 6 || h > 21 ? 40 : 0),
    dur: () => 25 + Math.random() * 20,
    why: ['Mijn buik rommelt. Op naar de bakkerij!', 'Ik ruik versgebakken brood…'],
    mid: ['Mmm, een croissant!', 'Nog eentje dan…', 'Kruimels overal, oeps.'],
    end: ['Buikje rond. De bakker gaf me een extra koekje.', 'Lekker! De kruimels heb ik aan de mussen gegeven.']
  },
  read: {
    loc: 'library', inside: true, txt: 'leest in de bibliotheek', eff: { curiosity: 1.3, fun: .3 },
    score: (n, h) => h >= 9 && h < 18 ? (100 - n.curiosity) * 1.15 : 0,
    dur: () => 50 + Math.random() * 40,
    why: ['Ik wil iets nieuws leren!', 'Er ligt vast een nieuw boek op me te wachten.'],
    mid: ['Wist je dat octopussen drie harten hebben?', 'Bladzijde 42…', 'Ooh, een boek over sterren!'],
    end: ['Vandaag geleerd hoe regenbogen ontstaan.', 'Wat een spannend boek. Morgen lees ik verder.']
  },
  swing: {
    loc: 'park', txt: 'schommelt in het park', eff: { fun: 2, energy: -.15 },
    score: (n, h) => (100 - n.fun) * (night(h) ? .2 : 1.05),
    dur: () => 20 + Math.random() * 20,
    why: ['Ik heb zin om te schommelen!', 'Hoger, hoger! Naar het park.'],
    mid: ['Wiiieee!', 'Hoger!', 'Ik raak bijna de wolken!'],
    end: ['Mijn buik kriebelde van het schommelen.', 'Twintig keer heen en weer. Een record!']
  },
  fish: {
    loc: 'pond', txt: 'vist aan de vijver', eff: { fun: .9, curiosity: .3 },
    score: (n, h) => ((100 - n.fun) * .7 + (100 - n.curiosity) * .3) * (night(h) ? .3 : 1),
    dur: () => 40 + Math.random() * 30,
    why: ['Tijd voor wat rust aan de vijver.', 'Zou er vandaag iets bijten?'],
    mid: ['Stil… stil…', 'Het water is zo glad.', 'Kom maar, visje…'],
    end: ['Geen vis, wel een mooie libel gezien.', 'Een rustig uurtje aan het water.']
  },
  ducks: {
    loc: 'pond', txt: 'zwaait naar de eendjes', eff: { fun: 1.3 },
    score: (n, h) => ((100 - n.fun) * .6 + 12) * (night(h) ? .2 : 1),
    dur: () => 12 + Math.random() * 10,
    why: ['Ik ga de eendjes gedag zeggen.'],
    mid: ['Hallo eendjes!', 'Kwak! (Ik oefen eends.)'],
    end: ['De eendjes kwaakten terug. Volgens mij zijn we vrienden.']
  },
  gardening: {
    loc: 'garden', txt: 'geeft de plantjes water', eff: { fun: .6, curiosity: .4, energy: -.1 },
    score: (n, h) => h >= 7 && h < 19 ? 30 + (100 - n.fun) * .4 + (garden.growth < 1.4 ? 15 : 0) : 0,
    dur: () => 35 + Math.random() * 25,
    why: ['Mijn plantjes hebben dorst.', 'Eens kijken hoe de tomaten groeien.'],
    mid: ['Een beetje water hier…', 'Groei maar, kleintjes.', 'Ik zie een rups! Hallo rups.'],
    end: ['De moestuin ziet er blij uit.', 'Morgen zijn de tomaten vast nog groter.']
  },
  fountain: {
    loc: 'square', txt: 'zit bij de fontein', eff: { energy: .18, fun: .4 },
    score: n => 20 + (100 - n.energy) * .35,
    dur: () => 15 + Math.random() * 15,
    why: ['Even zitten bij de fontein.', 'Ik ga naar het klateren luisteren.'],
    mid: ['Plons, plons…', 'Ik tel de druppels. Honderd… duizend…'],
    end: ['Ik gooide een muntje in de fontein en deed een wens.', 'Een fijn rustmomentje.']
  },
  dance: {
    loc: 'square', txt: 'danst op het plein', eff: { fun: 2.6, energy: -.25 },
    score: (n, h) => (100 - n.fun) * (h >= 19 && h < 22.5 ? 1.3 : .3),
    dur: () => 12 + Math.random() * 10,
    why: ['Ik heb muziek in mijn hoofd!', 'Dansje op het plein. Niemand kijkt… toch?'],
    mid: ['Draaien, draaien!', 'Tralala!', 'Hop, hop!'],
    end: ['Duizelig van het dansen, hihi.', 'Mijn nieuwe dans heet de Monsterwals.']
  }
};
