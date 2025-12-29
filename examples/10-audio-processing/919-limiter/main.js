const worker = new Worker('worker.js');
const meterEl = document.getElementById('meter');
let interval;

worker.onmessage = (e) => {
  const { input, output, limiting } = e.data;
  meterEl.innerHTML = `<div>Input: ${input.toFixed(1)} dB</div><div>Output: ${output.toFixed(1)} dB</div><div style="color:${limiting ? '#ff6b6b' : '#2ed573'}">${limiting ? 'LIMITING' : 'PASSING'}</div>`;
};

function update() {
  const ceiling = parseInt(document.querySelector('input').value);
  document.getElementById('ceil').textContent = ceiling;
  clearInterval(interval);
  interval = setInterval(() => worker.postMessage({ ceiling, input: -20 + Math.random() * 25 }), 100);
}
update();
