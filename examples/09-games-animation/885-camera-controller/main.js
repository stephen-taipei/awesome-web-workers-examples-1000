const worker = new Worker('worker.js');
const worldEl = document.getElementById('world');
const playerEl = document.getElementById('player');
const infoEl = document.getElementById('info');

let playerX = 290, playerY = 190;

worker.onmessage = (e) => {
  const { camX, camY } = e.data;
  worldEl.style.transform = `translate(${-camX}px, ${-camY}px)`;
  infoEl.textContent = `X: ${camX.toFixed(0)}, Y: ${camY.toFixed(0)}`;
};

function updatePlayer() {
  playerEl.style.left = playerX + 'px';
  playerEl.style.top = playerY + 'px';
  worker.postMessage({ playerX, playerY, viewW: 300, viewH: 200, worldW: 600, worldH: 400 });
}

document.addEventListener('keydown', (e) => {
  const speed = 10;
  if (e.key === 'ArrowLeft') playerX = Math.max(0, playerX - speed);
  else if (e.key === 'ArrowRight') playerX = Math.min(580, playerX + speed);
  else if (e.key === 'ArrowUp') playerY = Math.max(0, playerY - speed);
  else if (e.key === 'ArrowDown') playerY = Math.min(380, playerY + speed);
  updatePlayer();
});

updatePlayer();
