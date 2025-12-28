const worker = new Worker('worker.js');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

worker.onmessage = (e) => {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 400, 120);
  ctx.fillStyle = '#4ecdc4';
  e.data.forEach((v, i) => {
    const h = Math.abs(v) * 50;
    ctx.fillRect(i, 60 - h, 1, h * 2);
  });
};

function generate() { worker.postMessage({ type: 'generate' }); }
generate();
