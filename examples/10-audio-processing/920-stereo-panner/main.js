const worker = new Worker('worker.js');
const metersEl = document.getElementById('meters');
worker.onmessage = (e) => {
  const { left, right } = e.data;
  metersEl.innerHTML = `<div style="display:flex;gap:1rem;justify-content:center"><div><div style="width:30px;height:${left}px;background:#4ecdc4"></div><small>L: ${left}%</small></div><div><div style="width:30px;height:${right}px;background:#ffd700"></div><small>R: ${right}%</small></div></div>`;
};
function update() {
  const pan = parseInt(document.querySelector('input').value);
  worker.postMessage({ pan });
}
update();
