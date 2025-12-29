let time = 0, running = false, laps = [], interval;
function tick() { if (running) { time++; postMessage({ time, laps }); } }
onmessage = (e) => {
  if (e.data.type === 'start') { running = true; if (!interval) interval = setInterval(tick, 1000); }
  else if (e.data.type === 'pause') running = false;
  else if (e.data.type === 'reset') { time = 0; laps = []; running = false; }
  else if (e.data.type === 'lap') laps.push(time);
  postMessage({ time, laps });
};
