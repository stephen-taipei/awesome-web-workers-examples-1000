const worker = new Worker('worker.js');
const infoEl = document.getElementById('info');
worker.onmessage = (e) => {
  const r = e.data;
  infoEl.innerHTML = `<strong>${r.name}</strong><br>Decay: ${r.decay}s<br>Pre-delay: ${r.predelay}ms<br>Wet/Dry: ${r.wet}%`;
};
function setRoom(type) { worker.postMessage({ type }); }
setRoom('small');
