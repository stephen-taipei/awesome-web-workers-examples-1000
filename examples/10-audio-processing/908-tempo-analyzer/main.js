const worker = new Worker('worker.js');
const bpmEl = document.getElementById('bpm');
document.getElementById('tapBtn').onclick = () => worker.postMessage({ time: Date.now() });
worker.onmessage = (e) => { bpmEl.textContent = e.data.bpm ? `${e.data.bpm} BPM` : 'Keep tapping...'; };
