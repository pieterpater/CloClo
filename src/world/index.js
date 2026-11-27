import { buildGround, buildRoads } from './ground.js';
import { buildBuildings } from './buildings.js';
import { buildPark, updatePark } from './park.js';
import { buildPond, updatePond } from './pond.js';
import { buildGarden, updateGarden } from './garden.js';
import { buildFountain, updateFountain } from './fountain.js';
import { buildIceCream } from './icecream.js';
import { buildHill } from './hill.js';
import { buildMeadow, updateMeadow } from './meadow.js';
import { buildCat, updateCat } from './cat.js';
import { buildBlockYard, updateBlockYard } from './blocks.js';
import { buildLamps } from './lamps.js';
import { buildTrees } from './trees.js';
import { buildSky, updateSky } from './sky.js';
import { buildLabels } from './labels.js';
import { buildDetails, updateDetails } from './details.js';
import { buildFarm, updateFarm } from './farm.js';
import { buildPip, updatePip } from './pip.js';

// Order matters: the seeded rnd() is consumed in this order.
export function buildWorld() {
  buildGround();
  buildRoads();
  buildBuildings();
  buildPark();
  buildPond();
  buildGarden();
  buildFountain();
  buildIceCream();
  buildHill();
  buildMeadow();
  buildCat();
  buildBlockYard();
  buildFarm();
  buildPip();
  buildLamps();
  buildTrees();
  buildSky();
  buildDetails(); // after the trees and clouds, so their places don't change
  buildLabels();
}

// Draws the moving parts of the world; growth and cat come from the simulation.
export function updateWorld({ anim, rd, swinging, chaseAt, growth, cat, pip, yard, isNight, act, doing, cloPos }) {
  updateFarm(anim, rd, act, doing, cloPos);
  if (pip) updatePip(pip, rd, anim);
  updateDetails(anim, rd, isNight);
  updateBlockYard(yard, anim);
  updateGarden(growth);
  updatePark(anim, rd, swinging);
  updatePond(anim, rd, doing && act === 'feed_ducks' ? cloPos : null);
  updateFountain(anim);
  updateMeadow(anim, rd, chaseAt);
  updateCat(cat, rd, anim);
  updateSky(rd);
}
