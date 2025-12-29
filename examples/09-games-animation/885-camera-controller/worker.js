onmessage = (e) => {
  const { playerX, playerY, viewW, viewH, worldW, worldH } = e.data;

  // Center camera on player
  let camX = playerX - viewW / 2 + 10;
  let camY = playerY - viewH / 2 + 10;

  // Clamp to world bounds
  camX = Math.max(0, Math.min(worldW - viewW, camX));
  camY = Math.max(0, Math.min(worldH - viewH, camY));

  postMessage({ camX, camY });
};
