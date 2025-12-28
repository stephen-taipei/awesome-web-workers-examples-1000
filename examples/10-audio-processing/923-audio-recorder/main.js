const worker = new Worker('worker.js');
const statusEl = document.getElementById('status');
const timeEl = document.getElementById('time');

worker.onmessage = (e) => {
  const { recording, time } = e.data;
  statusEl.textContent = recording ? 'RECORDING' : 'STOPPED';
  statusEl.style.color = recording ? '#ff6b6b' : '#6c757d';
  const m = Math.floor(time / 60).toString().padStart(2, '0');
  const s = (time % 60).toString().padStart(2, '0');
  timeEl.textContent = `${m}:${s}`;
};

function cmd(type) { worker.postMessage({ type }); }
