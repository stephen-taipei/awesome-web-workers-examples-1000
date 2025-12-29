onmessage = (e) => {
  const { time, feedback } = e.data;
  const echoes = [];
  let level = 100;
  for (let i = 1; i <= 5 && level > 5; i++) {
    level = Math.round(level * feedback / 100);
    echoes.push({ time: time * i, level });
  }
  postMessage({ echoes });
};
