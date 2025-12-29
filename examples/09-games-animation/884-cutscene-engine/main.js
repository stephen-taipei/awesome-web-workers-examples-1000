const worker = new Worker('worker.js');
const sceneEl = document.getElementById('scene');
const playBtn = document.getElementById('playBtn');

worker.onmessage = (e) => {
  const { type, data } = e.data;
  if (type === 'frame') {
    sceneEl.style.background = data.bg || '#1a1a2e';
    sceneEl.innerHTML = `<p style="color:${data.color || '#fff'};font-size:${data.size || 16}px">${data.text}</p>`;
  } else if (type === 'end') {
    sceneEl.innerHTML = '<p>Cutscene ended</p>';
    playBtn.disabled = false;
  }
};

playBtn.onclick = () => {
  playBtn.disabled = true;
  worker.postMessage({ type: 'play' });
};
