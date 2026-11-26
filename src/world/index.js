import { buildGround, buildRoads } from './ground.js';
import { buildBuildings } from './buildings.js';
import { buildPark, updatePark } from './park.js';
import { buildPond, updatePond } from './pond.js';
import { buildGarden, updateGarden } from './garden.js';
import { buildFountain, updateFountain } from './fountain.js';
import { buildLamps } from './lamps.js';
import { buildTrees } from './trees.js';
import { buildSky, updateSky } from './sky.js';
import { buildLabels } from './labels.js';

// De volgorde is belangrijk: de seeded rnd() wordt in deze volgorde gebruikt.
export function buildWorld() {
  buildGround();
  buildRoads();
  buildBuildings();
  buildPark();
  buildPond();
  buildGarden();
  buildFountain();
  buildLamps();
  buildTrees();
  buildSky();
  buildLabels();
}

export function updateWorld({ anim, rd, gd, swinging }) {
  updateGarden(gd);
  updatePark(anim, rd, swinging);
  updatePond(anim);
  updateFountain(anim);
  updateSky(rd);
}
