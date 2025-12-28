let pos = 0, checkpoints = [];
onmessage = (e) => {
  const { type, d } = e.data;
  if (type === 'move') pos += d;
  else if (type === 'save') { if (!checkpoints.includes(pos)) checkpoints.push(pos); }
  else if (type === 'respawn') pos = checkpoints.length ? checkpoints[checkpoints.length - 1] : 0;
  postMessage({ pos, checkpoints });
};
