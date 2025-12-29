const worker = new Worker('worker.js');
const vizEl = document.getElementById('viz');
worker.onmessage = (e) => {
  vizEl.innerHTML = e.data.phases.map((p, i) => `<span class="tag" style="transform:rotate(${p}deg);display:inline-block">Stage ${i+1}</span>`).join(' ');
};
function update() {
  const stages = parseInt(document.querySelector('input').value);
  const speed = parseInt(document.querySelectorAll('input')[1].value);
  document.getElementById('stages').textContent = stages;
  document.getElementById('speed').textContent = speed;
  worker.postMessage({ stages, speed });
}
update(); setInterval(() => worker.postMessage({ stages: parseInt(document.querySelector('input').value), speed: parseInt(document.querySelectorAll('input')[1].value) }), 100);
