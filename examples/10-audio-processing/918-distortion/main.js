const worker = new Worker('worker.js');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
worker.onmessage = (e) => {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 300, 100);
  ctx.strokeStyle = '#ff6b6b';
  ctx.beginPath();
  e.data.wave.forEach((v, i) => i === 0 ? ctx.moveTo(i, 50 - v * 40) : ctx.lineTo(i, 50 - v * 40));
  ctx.stroke();
};
function update() {
  const drive = parseInt(document.querySelector('input').value);
  document.getElementById('drive').textContent = drive;
  worker.postMessage({ drive });
}
update();
