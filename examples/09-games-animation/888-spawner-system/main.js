const worker = new Worker('worker.js');
const areaEl = document.getElementById('area');
const waveEl = document.getElementById('wave');
const countEl = document.getElementById('count');
const spawnBtn = document.getElementById('spawnBtn');
const clearBtn = document.getElementById('clearBtn');

let spawning = false;

worker.onmessage = (e) => {
  const { entities, wave, count } = e.data;
  waveEl.textContent = wave;
  countEl.textContent = count;
  areaEl.innerHTML = entities.map(ent =>
    `<div style="position:absolute;left:${ent.x}%;top:${ent.y}%;width:${ent.size}px;height:${ent.size}px;background:${ent.color};border-radius:${ent.type==='circle'?'50%':'0'};transition:all 0.3s"></div>`
  ).join('');
};

spawnBtn.onclick = () => {
  spawning = !spawning;
  spawnBtn.textContent = spawning ? 'Stop' : 'Start Spawning';
  if (spawning) worker.postMessage({ type: 'start' });
  else worker.postMessage({ type: 'stop' });
};

clearBtn.onclick = () => {
  spawning = false;
  spawnBtn.textContent = 'Start Spawning';
  worker.postMessage({ type: 'clear' });
};
