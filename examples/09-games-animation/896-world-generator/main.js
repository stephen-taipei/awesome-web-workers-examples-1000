const worker = new Worker('worker.js');
worker.onmessage = (e) => { document.getElementById('map').innerHTML = e.data.map; };
function generate() { worker.postMessage({ seed: parseInt(document.getElementById('seed').value) }); }
generate();
