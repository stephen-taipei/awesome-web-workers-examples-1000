const worker = new Worker('worker.js');
worker.onmessage = (e) => {
  const m = Math.floor(e.data.time / 60), s = e.data.time % 60;
  document.getElementById('time').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  document.getElementById('laps').innerHTML = e.data.laps.map((l, i) => `<span class="tag">Lap ${i + 1}: ${l}s</span>`).join(' ');
};
function cmd(type) { worker.postMessage({ type }); }
