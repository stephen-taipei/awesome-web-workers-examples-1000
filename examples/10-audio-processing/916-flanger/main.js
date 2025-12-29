const worker = new Worker('worker.js');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
worker.onmessage = (e) => {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 300, 100);
  ctx.strokeStyle = '#4ecdc4';
  ctx.beginPath();
  e.data.wave.forEach((v, i) => i === 0 ? ctx.moveTo(i, 50 + v * 40) : ctx.lineTo(i, 50 + v * 40));
  ctx.stroke();
};
function update() {
  const rate = parseFloat(document.querySelector('input').value);
  const depth = parseInt(document.querySelectorAll('input')[1].value);
  document.getElementById('rate').textContent = rate;
  document.getElementById('depth').textContent = depth;
  worker.postMessage({ rate, depth });
}
update(); setInterval(update, 50);
