const worker = new Worker('worker.js');
const echoesEl = document.getElementById('echoes');
worker.onmessage = (e) => {
  echoesEl.innerHTML = e.data.echoes.map((echo, i) => `<div style="opacity:${1 - i*0.15}">Echo ${i+1}: ${echo.time}ms @ ${echo.level}%</div>`).join('');
};
function update() {
  const time = parseInt(document.querySelector('input[type=range]').value);
  const fb = parseInt(document.querySelectorAll('input[type=range]')[1].value);
  document.getElementById('time').textContent = time;
  document.getElementById('fb').textContent = fb;
  worker.postMessage({ time, feedback: fb });
}
update();
