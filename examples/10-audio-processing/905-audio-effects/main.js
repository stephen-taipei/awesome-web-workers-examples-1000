const worker = new Worker('worker.js');
const effectsEl = document.getElementById('effects');
const pathEl = document.getElementById('path');

const effects = [
  { name: 'Reverb', enabled: true },
  { name: 'Delay', enabled: false },
  { name: 'Chorus', enabled: true },
  { name: 'Compressor', enabled: true }
];

worker.onmessage = (e) => { pathEl.innerHTML = e.data.path.map(p => `<span class="tag tag-success">${p}</span>`).join(' → '); };

function render() {
  effectsEl.innerHTML = effects.map((e, i) => `<label><input type="checkbox" ${e.enabled ? 'checked' : ''} onchange="toggle(${i})"> ${e.name}</label>`).join(' ');
  worker.postMessage({ effects });
}

function toggle(i) { effects[i].enabled = !effects[i].enabled; render(); }
render();
