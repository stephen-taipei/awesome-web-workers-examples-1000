const worker = new Worker('worker.js');
const logEl = document.getElementById('log');

worker.onmessage = (e) => {
  const { events } = e.data;
  logEl.innerHTML = events.map(ev => `<div class="event"><span class="tag tag-${ev.type}">${ev.name}</span> <small>${ev.time}</small> ${ev.reactions.join(', ')}</div>`).join('');
};

function emit(name) {
  worker.postMessage({ type: 'emit', name });
}

// Initialize
worker.postMessage({ type: 'init' });
