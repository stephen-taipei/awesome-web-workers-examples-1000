const worker = new Worker('worker.js');
document.getElementById('score').textContent = '0';
worker.onmessage = (e) => {
  const { score, multiplier, combo } = e.data;
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('mult').textContent = multiplier.toFixed(1);
  document.getElementById('combo').textContent = combo;
};
function action(type) { worker.postMessage({ type }); }
