const worker = new Worker('worker.js');
const dialogueEl = document.getElementById('dialogue');
const choicesEl = document.getElementById('choices');

worker.onmessage = (e) => {
  const { speaker, text, choices } = e.data;
  dialogueEl.innerHTML = `<p><strong>${speaker}:</strong> ${text}</p>`;
  if (choices && choices.length) {
    choicesEl.innerHTML = choices.map((c, i) => `<button class="btn" onclick="choose(${i})">${c.text}</button>`).join(' ');
  } else {
    choicesEl.innerHTML = '<button class="btn" onclick="restart()">Start Over</button>';
  }
};

function choose(idx) { worker.postMessage({ type: 'choose', idx }); }
function restart() { worker.postMessage({ type: 'start' }); }

worker.postMessage({ type: 'start' });
