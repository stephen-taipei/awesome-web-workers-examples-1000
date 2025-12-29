const worker = new Worker('worker.js');
worker.onmessage = (e) => {
  document.getElementById('pos').textContent = e.data.pos;
  document.getElementById('cps').innerHTML = e.data.checkpoints.length ? e.data.checkpoints.map(c => `<span class="tag">${c}</span>`).join(' ') : 'None';
};
function move(d) { worker.postMessage({ type: 'move', d }); }
function save() { worker.postMessage({ type: 'save' }); }
function respawn() { worker.postMessage({ type: 'respawn' }); }
worker.postMessage({ type: 'init' });
