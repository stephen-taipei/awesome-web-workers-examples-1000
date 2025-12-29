const worker = new Worker('worker.js');
const beatsEl = document.getElementById('beats');

worker.onmessage = (e) => {
  beatsEl.innerHTML = e.data.beats.map(b => `<div style="width:20px;height:${b*50}px;background:${b>0.7?'#ff6b6b':'#4ecdc4'};border-radius:4px"></div>`).join('');
};

function start() { worker.postMessage({ type: 'start' }); }
function stop() { worker.postMessage({ type: 'stop' }); }
