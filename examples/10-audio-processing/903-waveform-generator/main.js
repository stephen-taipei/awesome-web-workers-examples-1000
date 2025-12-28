const worker = new Worker('worker.js');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

worker.onmessage = (e) => {
  const data = e.data;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 400, 150);
  ctx.strokeStyle = '#4ecdc4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((v, i) => { i === 0 ? ctx.moveTo(i, 75 + v * 50) : ctx.lineTo(i, 75 + v * 50); });
  ctx.stroke();
};

function gen(type) { worker.postMessage({ type }); }
gen('sine');
