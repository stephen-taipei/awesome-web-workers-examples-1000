const entities = [];
let wave = 1, intervalId = null;

const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffd93d'];
const types = ['circle', 'square'];

function spawn() {
  const count = Math.min(3 + wave, 10);
  for (let i = 0; i < count; i++) {
    entities.push({
      x: Math.random() * 90,
      y: Math.random() * 90,
      size: 10 + Math.random() * 15,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: types[Math.floor(Math.random() * types.length)]
    });
  }
  wave++;
  postMessage({ entities, wave, count: entities.length });
}

onmessage = (e) => {
  const { type } = e.data;
  if (type === 'start') {
    spawn();
    intervalId = setInterval(spawn, 2000);
  } else if (type === 'stop') {
    clearInterval(intervalId);
  } else if (type === 'clear') {
    clearInterval(intervalId);
    entities.length = 0;
    wave = 1;
    postMessage({ entities: [], wave, count: 0 });
  }
};
