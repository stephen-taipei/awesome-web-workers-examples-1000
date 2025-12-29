function rand(seed) { return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }
const tiles = { w: '🌊', g: '🌿', f: '🌲', m: '⛰️', s: '🏜️' };
onmessage = (e) => {
  const r = rand(e.data.seed);
  let map = '';
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 15; x++) {
      const v = r();
      map += v < 0.2 ? tiles.w : v < 0.5 ? tiles.g : v < 0.7 ? tiles.f : v < 0.85 ? tiles.m : tiles.s;
    }
    map += '<br>';
  }
  postMessage({ map });
};
