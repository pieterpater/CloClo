import { night } from '../state.js';

// Everything CloClo can do. With the language model, it decides freely what he does and for how long
// (see server/brain.js); `score` and `dur` are only used by the simple rules when the model isn't.
//   loc:    location in LOC
//   inside: CloClo disappears indoors
//   score:  how well this fits the hour h for the rules; CLOSED when it can't happen at all
//   dur:    duration in game minutes for the rules
//   why/mid/end: thoughts when setting off, during, and afterwards
//   item:   what he holds in his right hand
//   fx:     [particle type, seconds between particles] while doing it
//   mood:   how he feels doing it, when the rules decide
// Score for activities that can’t happen at this hour (closed, too dark, …).
const CLOSED = -1000;
// Possible (the language model may choose it), but the rules won't: a nap at noon, a swing at midnight.
const AWKWARD = -100;
const day = h => h >= 7 && h < 21;

export const ACTS = {
  sleep: {
    loc: 'home', inside: true, txt: 'is sleeping in his little house', fx: ['zzz', 1.4],
    score: h => night(h) ? 300 : AWKWARD, mood: 'sleepy',
    dur: h => { const m = (h < 12 ? 7 - h : 31 - h) * 60; return Math.max(60, m + Math.random() * 30); },
    why: ['Yawn… my bed is calling.', 'I’m so tired. Good night, Mosdorp.'],
    mid: ['Zzz…', 'zzz… croissants… zzz', 'Zzz… *snore*'],
    end: ['Well rested! I dreamt about clouds made of whipped cream.', 'Good morning! I dreamt I could fly.']
  },
  eat: {
    loc: 'bakery', txt: 'is feasting at the bakery', fx: ['heart', 4],
    score: h => (h >= 7 && h < 9) || (h >= 12 && h < 13.5) || (h >= 18 && h < 19.5) ? 90 : day(h) ? 15 : CLOSED, mood: 'happy',
    dur: () => 20 + Math.random() * 15,
    why: ['My tummy is rumbling. Off to the bakery!', 'I can smell fresh bread…'],
    mid: ['Mmm, a croissant!', 'Just one more…', 'Crumbs everywhere, oops.'],
    end: ['Tummy full. The baker gave me an extra cookie.', 'Yummy! I gave the crumbs to the sparrows.']
  },
  read: {
    loc: 'library', inside: true, txt: 'is reading in the library', fx: ['sparkle', 2.5],
    score: h => h >= 9 && h < 18 ? 45 : CLOSED, mood: 'calm',
    dur: () => 50 + Math.random() * 40,
    why: ['I want to learn something new!', 'There must be a new book waiting for me.'],
    mid: ['Did you know octopuses have three hearts?', 'Page 42…', 'Ooh, a book about stars!'],
    end: ['Today I learned how rainbows form.', 'What an exciting book. I’ll read on tomorrow.']
  },
  swing: {
    loc: 'park', txt: 'is swinging in the park',
    score: h => day(h) ? 45 : AWKWARD, mood: 'delighted',
    dur: () => 20 + Math.random() * 20,
    why: ['I feel like swinging!', 'Higher, higher! To the park.'],
    mid: ['Wheeee!', 'Higher!', 'I can almost touch the clouds!'],
    end: ['Swinging gave me butterflies in my tummy.', 'Twenty times back and forth. A record!']
  },
  fish: {
    loc: 'pond', txt: 'is fishing at the pond', item: 'rod',
    score: h => day(h) ? 35 : AWKWARD, mood: 'calm',
    dur: () => 40 + Math.random() * 30,
    why: ['Time for some peace and quiet at the pond.', 'Will anything bite today?'],
    mid: ['Quiet… quiet…', 'The water is so smooth.', 'Come on, little fish…'],
    end: ['No fish, but I saw a pretty dragonfly.', 'A quiet hour by the water.']
  },
  ducks: {
    loc: 'pond', txt: 'is waving at the ducks', fx: ['note', 1.5],
    score: h => day(h) ? 35 : AWKWARD, mood: 'happy',
    dur: () => 12 + Math.random() * 10,
    why: ['I’m going to say hi to the ducks.'],
    mid: ['Hello ducks!', 'Quack! (I’m practising Duck.)'],
    end: ['The ducks quacked back. I think we’re friends.']
  },
  gardening: {
    loc: 'garden', txt: 'is watering the plants', item: 'can',
    score: h => h >= 7 && h < 19 ? 40 : CLOSED, mood: 'calm',
    dur: () => 35 + Math.random() * 25,
    why: ['My plants are thirsty.', 'Let’s see how the tomatoes are growing.'],
    mid: ['A little water here…', 'Grow, little ones.', 'I see a caterpillar! Hello caterpillar.'],
    end: ['The vegetable garden looks happy.', 'The tomatoes will be even bigger tomorrow.']
  },
  fountain: {
    loc: 'square', txt: 'is sitting by the fountain',
    score: () => 30, mood: 'calm',
    dur: () => 15 + Math.random() * 15,
    why: ['Time for a sit by the fountain.', 'I’m going to listen to the splashing.'],
    mid: ['Splish, splash…', 'I’m counting the drops. A hundred… a thousand…'],
    end: ['I threw a coin in the fountain and made a wish.', 'A lovely little break.']
  },
  dance: {
    loc: 'square', txt: 'is dancing on the square', fx: ['note', .45],
    score: h => h >= 18.5 && h < 22.5 ? 60 : day(h) ? 15 : AWKWARD, mood: 'delighted',
    dur: () => 12 + Math.random() * 10,
    why: ['I’ve got music in my head!', 'A little dance on the square. Nobody’s watching… right?'],
    mid: ['Spin, spin!', 'Tra-la-la!', 'Hop, hop!'],
    end: ['Dizzy from dancing, hehe.', 'My new dance is called the Monster Waltz.']
  },
  icecream: {
    loc: 'icecream', txt: 'is licking an ice cream', item: 'icecream', fx: ['heart', 2.5],
    score: h => h >= 12 && h < 18.5 ? 50 : CLOSED, mood: 'delighted',
    dur: () => 15 + Math.random() * 12,
    why: ['Ice cream time! Strawberry or blueberry?', 'It’s the perfect weather for an ice cream.'],
    mid: ['Lick, lick… cold!', 'Two scoops, because I deserve it.', 'Brain freeze! Ow, ow.'],
    end: ['Strawberry with a blueberry hat. The best.', 'I got sprinkles for free because I said please.']
  },
  stargaze: {
    loc: 'hill', txt: 'is looking at the stars', fx: ['star', 1.6],
    score: h => h >= 20.5 && h < 22.6 ? 120 : CLOSED, mood: 'happy',
    dur: () => 35 + Math.random() * 25,
    why: ['The stars are coming out. To the lookout hill!', 'I want to find the Big Spoon tonight.'],
    mid: ['One, two, three… so many stars!', 'Is that a planet? I think it waved.', 'Hello moon!'],
    end: ['I saw a shooting star and made a wish. It’s a secret.', 'I named a star after Biscuit.']
  },
  letter: {
    loc: 'post', txt: 'is posting a letter to Grandma', item: 'letter', fx: ['heart', 3],
    score: h => h >= 9 && h < 17 ? 35 : CLOSED, mood: 'happy',
    dur: () => 15 + Math.random() * 10,
    why: ['I’m going to write a letter to Grandma.', 'Grandma would love to hear about the ducks.'],
    mid: ['Dear Grandma… how do you spell “croissant”?', 'I drew a little picture of me.', 'Stamp: check!'],
    end: ['Letter posted! I hope it gets there quickly.', 'I told Grandma all about my tomatoes.']
  },
  butterflies: {
    loc: 'meadow', txt: 'is chasing butterflies', item: 'net', fx: ['sparkle', 2],
    score: h => h >= 8 && h < 19 ? 45 : CLOSED, mood: 'delighted',
    dur: () => 15 + Math.random() * 15,
    why: ['The flowers in the meadow are open. Butterfly time!', 'I want to see the blue butterfly again.'],
    mid: ['Almost got you!', 'So many colours…', 'I don’t want to catch them, just say hello.'],
    end: ['A butterfly sat on my nose! Best day ever.', 'I counted five butterflies. One was blue.']
  },
  cat: {
    loc: 'square', txt: 'is cuddling Biscuit the cat', fx: ['heart', .8],
    score: h => day(h) ? 45 : AWKWARD, mood: 'happy',
    dur: () => 12 + Math.random() * 12,
    why: ['Biscuit! Where are you, Biscuit?', 'I miss my friend Biscuit.'],
    mid: ['Purrrr… she’s purring!', 'Who’s a soft kitty? You are!', 'Her nose is so tiny.'],
    end: ['Biscuit gave me a headbutt. That means she loves me.', 'Biscuit and I watched the fountain together.']
  }
};
