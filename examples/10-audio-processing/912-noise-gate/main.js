const worker = new Worker('worker.js');
const statusEl = document.getElementById('status');
let interval;

worker.onmessage = (e) => {
  statusEl.textContent = e.data.open ? 'OPEN' : 'CLOSED';
  statusEl.style.color = e.data.open ? '#2ed573' : '#ff6b6b';
};

function update() {
  const thresh = parseInt(document.getElementById('thresh').value);
  document.getElementById('threshVal').textContent = thresh;
  clearInterval(interval);
  interval = setInterval(() => worker.postMessage({ threshold: thresh, level: -60 + Math.random() * 60 }), 100);
}
update();
