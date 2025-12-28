let interval;
onmessage = (e) => {
  if (e.data.type === 'generate') {
    clearInterval(interval);
    interval = setInterval(() => {
      const data = Array(32).fill(0).map(() => Math.random() * 100);
      postMessage(data);
    }, 50);
  }
};
