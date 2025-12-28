const worker = new Worker('worker.js');
const controlsEl = document.getElementById('controls');
const grEl = document.getElementById('gr');
const settings = { threshold: -20, ratio: 4, attack: 10, release: 100 };

worker.onmessage = (e) => { grEl.textContent = e.data.gainReduction.toFixed(1); };

function render() {
  controlsEl.innerHTML = `
    <div>Threshold: <input type="range" min="-60" max="0" value="${settings.threshold}" onchange="set('threshold',this.value)"> ${settings.threshold}dB</div>
    <div>Ratio: <input type="range" min="1" max="20" value="${settings.ratio}" onchange="set('ratio',this.value)"> ${settings.ratio}:1</div>
    <div>Attack: <input type="range" min="1" max="100" value="${settings.attack}" onchange="set('attack',this.value)"> ${settings.attack}ms</div>
    <div>Release: <input type="range" min="10" max="1000" value="${settings.release}" onchange="set('release',this.value)"> ${settings.release}ms</div>`;
  worker.postMessage(settings);
}

function set(k, v) { settings[k] = parseInt(v); render(); }
render();
