const worker = new Worker('worker.js');
worker.onmessage = (e) => { document.getElementById('minimap').innerHTML = e.data.minimap; };
function move(dx, dy) { worker.postMessage({ dx, dy }); }
worker.postMessage({ dx: 0, dy: 0 });
