let px = 5, py = 5;
const world = Array(20).fill().map(() => Array(20).fill().map(() => Math.random() < 0.3 ? '█' : '·'));
onmessage = (e) => {
  px = Math.max(2, Math.min(17, px + e.data.dx));
  py = Math.max(2, Math.min(17, py + e.data.dy));
  let minimap = '';
  for (let y = py - 2; y <= py + 2; y++) {
    for (let x = px - 2; x <= px + 2; x++) {
      minimap += (x === px && y === py) ? '<span style="color:#ffd700">@</span>' : world[y][x];
    }
    minimap += '<br>';
  }
  postMessage({ minimap });
};
