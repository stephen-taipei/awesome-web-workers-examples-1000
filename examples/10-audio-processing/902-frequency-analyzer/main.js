const worker = new Worker('worker.js');
const bandsEl = document.getElementById('bands');

worker.onmessage = (e) => {
  const { bands } = e.data;
  bandsEl.innerHTML = bands.map(b => `<div style="display:inline-block;width:60px;margin:4px;text-align:center"><div style="height:${b.level}px;background:${b.color};margin-bottom:4px"></div><small>${b.name}</small></div>`).join('');
};

function analyze() { worker.postMessage({ type: 'analyze' }); }
analyze();
