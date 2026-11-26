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
  buildLamps();
  buildTrees();
  buildSky();
  buildLabels();
}

// Draws the moving parts of the world; growth and cat come from the simulation.
export function updateWorld({ anim, rd, swinging, chaseAt, growth, cat, yard }) {
  updateBlockYard(yard, anim);
  updateGarden(growth);
  updatePark(anim, rd, swinging);
  updatePond(anim);
  updateFountain(anim);
  updateMeadow(anim, rd, chaseAt);
  updateCat(cat, rd, anim);
  updateSky(rd);
}
