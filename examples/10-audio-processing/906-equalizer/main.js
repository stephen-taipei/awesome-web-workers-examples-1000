const worker = new Worker('worker.js');
const eqEl = document.getElementById('eq');
const bands = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
let values = Array(10).fill(0);

worker.onmessage = (e) => { values = e.data.values; render(); };

function render() {
  eqEl.innerHTML = bands.map((b, i) => `<div style="display:inline-block;text-align:center;margin:4px"><input type="range" min="-12" max="12" value="${values[i]}" orient="vertical" style="height:80px;writing-mode:bt-lr" onchange="set(${i},this.value)"><br><small>${b}Hz</small></div>`).join('');
}

function set(i, v) { values[i] = parseInt(v); worker.postMessage({ type: 'set', values }); }
function preset(name) { worker.postMessage({ type: 'preset', name }); }
render();
