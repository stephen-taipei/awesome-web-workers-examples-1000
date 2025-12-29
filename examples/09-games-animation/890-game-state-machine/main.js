const worker = new Worker('worker.js');
const stateEl = document.getElementById('state');
const actionsEl = document.getElementById('actions');
const historyEl = document.getElementById('history');

worker.onmessage = (e) => {
  const { current, actions, history } = e.data;
  stateEl.textContent = current;
  actionsEl.innerHTML = actions.map(a => `<button class="btn" onclick="transition('${a}')">${a}</button>`).join(' ');
  historyEl.innerHTML = history.map(h => `<span class="tag">${h}</span>`).join(' → ');
};

function transition(action) {
  worker.postMessage({ type: 'transition', action });
}

worker.postMessage({ type: 'init' });
