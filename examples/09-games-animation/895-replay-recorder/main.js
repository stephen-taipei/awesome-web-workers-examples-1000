const worker = new Worker('worker.js');
worker.onmessage = (e) => {
  const { actions, playing, current } = e.data;
  document.getElementById('replay').innerHTML = actions.map((a, i) => `<span class="tag ${i === current ? 'tag-success' : ''}">${a}</span>`).join(' ') || 'No actions';
};
function rec(action) { worker.postMessage({ type: 'record', action }); }
function cmd(type) { worker.postMessage({ type }); }
