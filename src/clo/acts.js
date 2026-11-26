import { night } from '../state.js';
import { garden } from '../world/garden.js';

// Needs: [key, label, colour]
export const NEEDS = [['fullness', 'Full tummy', '#ff9f1c'], ['energy', 'Energy', '#ffd166'], ['fun', 'Fun', '#ff6b6b'], ['curiosity', 'Curious', '#3fbfb0']];

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
    loc: 'home', inside: true, txt: 'is sleeping in his little house', eff: { energy: .25 },
    score: (n, h) => night(h) ? (115 - n.energy) * 1.6 + 60 : (n.energy < 18 ? 90 : 0),
    dur: h => { const m = (h < 12 ? 7 - h : 31 - h) * 60; return Math.max(60, m + Math.random() * 30); },
    why: ['Yawn… my bed is calling.', 'I’m so tired. Good night, Mosdorp.'],
    mid: ['Zzz…', 'zzz… croissants… zzz', 'Zzz… *snore*'],
    end: ['Well rested! I dreamt about clouds made of whipped cream.', 'Good morning! I dreamt I could fly.']
  },
  eat: {
    loc: 'bakery', txt: 'is feasting at the bakery', eff: { fullness: 1.8, fun: .2 },
    score: (n, h) => (n.fullness < 15 ? 300 : (100 - n.fullness) * 1.3) + ((h >= 7 && h < 9) || (h >= 12 && h < 13.5) || (h >= 18 && h < 19.5) ? 30 : 0) - (h < 6 || h > 21 ? 40 : 0),
    dur: () => 25 + Math.random() * 20,
    why: ['My tummy is rumbling. Off to the bakery!', 'I can smell fresh bread…'],
    mid: ['Mmm, a croissant!', 'Just one more…', 'Crumbs everywhere, oops.'],
    end: ['Tummy full. The baker gave me an extra cookie.', 'Yummy! I gave the crumbs to the sparrows.']
  },
  read: {
    loc: 'library', inside: true, txt: 'is reading in the library', eff: { curiosity: 1.3, fun: .3 },
    score: (n, h) => h >= 9 && h < 18 ? (100 - n.curiosity) * 1.15 : 0,
    dur: () => 50 + Math.random() * 40,
    why: ['I want to learn something new!', 'There must be a new book waiting for me.'],
    mid: ['Did you know octopuses have three hearts?', 'Page 42…', 'Ooh, a book about stars!'],
    end: ['Today I learned how rainbows form.', 'What an exciting book. I’ll read on tomorrow.']
  },
  swing: {
    loc: 'park', txt: 'is swinging in the park', eff: { fun: 2, energy: -.15 },
    score: (n, h) => (100 - n.fun) * (night(h) ? .2 : 1.05),
    dur: () => 20 + Math.random() * 20,
    why: ['I feel like swinging!', 'Higher, higher! To the park.'],
    mid: ['Wheeee!', 'Higher!', 'I can almost touch the clouds!'],
    end: ['Swinging gave me butterflies in my tummy.', 'Twenty times back and forth. A record!']
  },
  fish: {
    loc: 'pond', txt: 'is fishing at the pond', eff: { fun: .9, curiosity: .3 },
    score: (n, h) => ((100 - n.fun) * .7 + (100 - n.curiosity) * .3) * (night(h) ? .3 : 1),
    dur: () => 40 + Math.random() * 30,
    why: ['Time for some peace and quiet at the pond.', 'Will anything bite today?'],
    mid: ['Quiet… quiet…', 'The water is so smooth.', 'Come on, little fish…'],
    end: ['No fish, but I saw a pretty dragonfly.', 'A quiet hour by the water.']
  },
  ducks: {
    loc: 'pond', txt: 'is waving at the ducks', eff: { fun: 1.3 },
    score: (n, h) => ((100 - n.fun) * .6 + 12) * (night(h) ? .2 : 1),
    dur: () => 12 + Math.random() * 10,
    why: ['I’m going to say hi to the ducks.'],
    mid: ['Hello ducks!', 'Quack! (I’m practising Duck.)'],
    end: ['The ducks quacked back. I think we’re friends.']
  },
  gardening: {
    loc: 'garden', txt: 'is watering the plants', eff: { fun: .6, curiosity: .4, energy: -.1 },
    score: (n, h) => h >= 7 && h < 19 ? 30 + (100 - n.fun) * .4 + (garden.growth < 1.4 ? 15 : 0) : 0,
    dur: () => 35 + Math.random() * 25,
    why: ['My plants are thirsty.', 'Let’s see how the tomatoes are growing.'],
    mid: ['A little water here…', 'Grow, little ones.', 'I see a caterpillar! Hello caterpillar.'],
    end: ['The vegetable garden looks happy.', 'The tomatoes will be even bigger tomorrow.']
  },
  fountain: {
    loc: 'square', txt: 'is sitting by the fountain', eff: { energy: .18, fun: .4 },
    score: n => 20 + (100 - n.energy) * .35,
    dur: () => 15 + Math.random() * 15,
    why: ['Time for a sit by the fountain.', 'I’m going to listen to the splashing.'],
    mid: ['Splish, splash…', 'I’m counting the drops. A hundred… a thousand…'],
    end: ['I threw a coin in the fountain and made a wish.', 'A lovely little break.']
  },
  dance: {
    loc: 'square', txt: 'is dancing on the square', eff: { fun: 2.6, energy: -.25 },
    score: (n, h) => (100 - n.fun) * (h >= 19 && h < 22.5 ? 1.3 : .3),
    dur: () => 12 + Math.random() * 10,
    why: ['I’ve got music in my head!', 'A little dance on the square. Nobody’s watching… right?'],
    mid: ['Spin, spin!', 'Tra-la-la!', 'Hop, hop!'],
    end: ['Dizzy from dancing, hehe.', 'My new dance is called the Monster Waltz.']
  }
};
