const worker = new Worker('worker.js');
const mixerEl = document.getElementById('mixer');
const masterEl = document.getElementById('master');

const channels = [
  { name: 'Drums', volume: 80 },
  { name: 'Bass', volume: 70 },
  { name: 'Guitar', volume: 60 },
  { name: 'Vocals', volume: 90 }
];

worker.onmessage = (e) => { masterEl.textContent = e.data.master.toFixed(1); };

function render() {
  mixerEl.innerHTML = channels.map((c, i) => `<div style="margin:8px 0"><label>${c.name}</label><input type="range" min="0" max="100" value="${c.volume}" onchange="setVol(${i}, this.value)"><span>${c.volume}%</span></div>`).join('');
  worker.postMessage({ channels });
}

function setVol(i, v) { channels[i].volume = parseInt(v); render(); }
render();
