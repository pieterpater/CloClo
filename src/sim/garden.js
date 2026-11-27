// The vegetable garden's state: how big the plants are (0.5–1.6). CloClo makes them grow by watering them.
export const garden = { growth: .6 };

// Without water the plants shrink very slowly.
export function growGarden(gd) {
  garden.growth = Math.max(.5, garden.growth - gd * .0004);
}
