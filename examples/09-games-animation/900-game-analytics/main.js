const worker = new Worker('worker.js');
worker.onmessage = (e) => {
  const s = e.data.stats;
  document.getElementById('stats').innerHTML = Object.entries(s).map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`).join('');
};
function track(event) { worker.postMessage({ event }); }
worker.postMessage({ event: 'init' });
