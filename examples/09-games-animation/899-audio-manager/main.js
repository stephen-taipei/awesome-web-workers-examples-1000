const worker = new Worker('worker.js');
worker.onmessage = (e) => {
  document.getElementById('queue').innerHTML = e.data.queue.map(s => `<span class="tag ${s.playing ? 'tag-success' : ''}">${s.name} ${s.playing ? '▶' : ''}</span>`).join(' ') || 'Empty';
};
function play(sound) { worker.postMessage({ type: 'play', sound }); }
