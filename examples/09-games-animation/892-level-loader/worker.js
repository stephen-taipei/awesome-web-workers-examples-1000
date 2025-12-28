const levels = { 1: { name: 'Forest', w: 100, h: 50, enemies: 15 }, 2: { name: 'Cave', w: 80, h: 80, enemies: 25 }, 3: { name: 'Castle', w: 120, h: 60, enemies: 30 } };
onmessage = async (e) => {
  for (let i = 0; i <= 100; i += 10) { postMessage({ type: 'progress', data: i }); await new Promise(r => setTimeout(r, 80)); }
  postMessage({ type: 'loaded', data: levels[e.data.id] });
};
