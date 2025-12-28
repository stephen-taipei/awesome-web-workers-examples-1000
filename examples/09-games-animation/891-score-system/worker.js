let score = 0, multiplier = 1.0, combo = 0, lastTime = Date.now();
const pts = { kill: 100, collect: 50 };
onmessage = (e) => {
  if (e.data.type === 'reset') { score = 0; multiplier = 1.0; combo = 0; }
  else if (pts[e.data.type]) {
    const now = Date.now();
    if (now - lastTime < 2000) { combo++; multiplier = Math.min(1 + combo * 0.1, 5); } else { combo = 0; multiplier = 1; }
    lastTime = now;
    score += Math.floor(pts[e.data.type] * multiplier);
  }
  postMessage({ score, multiplier, combo });
};
