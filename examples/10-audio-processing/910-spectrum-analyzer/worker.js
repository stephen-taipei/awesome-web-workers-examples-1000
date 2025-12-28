let interval;
onmessage = (e) => {
  if (e.data.type === 'start') {
    clearInterval(interval);
    interval = setInterval(() => {
      const data = Array(100).fill(0).map((_, i) => {
        const base = Math.sin(i / 10) * 30 + 50;
        return base + Math.random() * 40;
      });
      postMessage(data);
    }, 50);
  } else if (e.data.type === 'stop') {
    clearInterval(interval);
  }
};
