const worker = new Worker('worker.js');
worker.onmessage = (e) => {
  const { type, data } = e.data;
  if (type === 'progress') document.getElementById('progress').innerHTML = `<progress value="${data}" max="100"></progress> ${data}%`;
  else if (type === 'loaded') {
    document.getElementById('progress').innerHTML = '<span class="tag tag-success">Loaded!</span>';
    document.getElementById('level').innerHTML = `<strong>${data.name}</strong><br>Size: ${data.w}x${data.h} | Enemies: ${data.enemies}`;
  }
};
function load(id) { worker.postMessage({ id }); }
