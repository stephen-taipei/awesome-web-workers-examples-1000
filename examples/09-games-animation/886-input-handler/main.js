const worker = new Worker('worker.js');
const currentEl = document.getElementById('current');
const historyEl = document.getElementById('history');

const keys = new Set();

worker.onmessage = (e) => {
  const { activeKeys, combos, history } = e.data;
  currentEl.innerHTML = activeKeys.length ? activeKeys.map(k => `<span class="tag">${k}</span>`).join(' ') : 'No keys pressed';
  if (combos.length) currentEl.innerHTML += `<br><strong>Combo: ${combos.join(', ')}</strong>`;
  historyEl.innerHTML = history.slice(-10).map(h => `<span class="tag tag-secondary">${h}</span>`).join(' ');
};

document.addEventListener('keydown', (e) => {
  keys.add(e.key);
  worker.postMessage({ type: 'update', keys: [...keys] });
});

document.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  worker.postMessage({ type: 'update', keys: [...keys] });
});
