const worker = new Worker('worker.js');
const vizEl = document.getElementById('viz');
worker.onmessage = (e) => {
  vizEl.innerHTML = e.data.voices.map((v, i) => `<span class="tag" style="background:hsl(${i*60},70%,50%)">Voice ${i+1}: ${v.delay}ms, ${v.detune}ct</span>`).join(' ');
};
function update() {
  const voices = parseInt(document.querySelector('input').value);
  const depth = parseInt(document.querySelectorAll('input')[1].value);
  document.getElementById('voices').textContent = voices;
  document.getElementById('depth').textContent = depth;
  worker.postMessage({ voices, depth });
}
update();
