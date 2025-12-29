const worker = new Worker('worker.js');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let running = false;

worker.onmessage = (e) => {
  const data = e.data;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 400, 150);
  const gradient = ctx.createLinearGradient(0, 150, 0, 0);
  gradient.addColorStop(0, '#4ecdc4');
  gradient.addColorStop(0.5, '#ffd700');
  gradient.addColorStop(1, '#ff6b6b');
  ctx.fillStyle = gradient;
  data.forEach((v, i) => { ctx.fillRect(i * 4, 150 - v, 3, v); });
};

function toggle() {
  running = !running;
  worker.postMessage({ type: running ? 'start' : 'stop' });
}
