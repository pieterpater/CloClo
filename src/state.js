// Shared simulation time. T = minutes since day 1, 00:00.
export const world = { T: 7 * 60 + 30, speed: 1 };

export const hour = () => (world.T % 1440) / 60;
export const night = h => h >= 21.5 || h < 6.5;
export const fmt = t => {
  const m = Math.floor(t % 1440);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
export const dayLabel = t => 'Day ' + (Math.floor(t / 1440) + 1) + ' · ' + fmt(t);
