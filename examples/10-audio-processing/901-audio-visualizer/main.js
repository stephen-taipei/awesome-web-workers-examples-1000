const worker = new Worker('worker.js');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

worker.onmessage = (e) => {
  const data = e.data;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 400, 200);
  const barW = 400 / data.length;
  data.forEach((v, i) => {
    const h = v * 2;
    ctx.fillStyle = `hsl(${i * 5}, 70%, 50%)`;
    ctx.fillRect(i * barW, 200 - h, barW - 2, h);
  });
};

function start() { worker.postMessage({ type: 'generate' }); }
