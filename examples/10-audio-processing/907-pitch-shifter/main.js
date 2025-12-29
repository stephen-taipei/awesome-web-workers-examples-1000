const worker = new Worker('worker.js');
document.getElementById('pitch').textContent = '0';
worker.onmessage = (e) => {
  document.getElementById('pitch').textContent = e.data.semitones;
  document.getElementById('info').innerHTML = `Ratio: ${e.data.ratio.toFixed(3)}<br>Frequency multiplier: ${e.data.ratio.toFixed(3)}x`;
};
function shift(v) { worker.postMessage({ semitones: parseInt(v) }); }
shift(0);
