const worker = new Worker('worker.js');
const meterEl = document.getElementById('meter');
let running = false;

worker.onmessage = (e) => {
  const { left, right, peakL, peakR } = e.data;
  meterEl.innerHTML = `
    <div><div style="width:30px;height:150px;background:#333;position:relative"><div style="position:absolute;bottom:0;width:100%;height:${left}%;background:linear-gradient(to top,#2ed573,#ffd700,#ff6b6b)"></div><div style="position:absolute;bottom:${peakL}%;width:100%;height:2px;background:#fff"></div></div><small>L</small></div>
    <div><div style="width:30px;height:150px;background:#333;position:relative"><div style="position:absolute;bottom:0;width:100%;height:${right}%;background:linear-gradient(to top,#2ed573,#ffd700,#ff6b6b)"></div><div style="position:absolute;bottom:${peakR}%;width:100%;height:2px;background:#fff"></div></div><small>R</small></div>`;
};

function toggle() {
  running = !running;
  worker.postMessage({ type: running ? 'start' : 'stop' });
}
