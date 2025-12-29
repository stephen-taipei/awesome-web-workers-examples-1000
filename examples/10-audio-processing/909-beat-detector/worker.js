let interval;
onmessage = (e) => {
  if (e.data.type === 'start') {
    clearInterval(interval);
    interval = setInterval(() => {
      const beats = Array(16).fill(0).map(() => Math.random());
      postMessage({ beats });
    }, 100);
  } else if (e.data.type === 'stop') {
    clearInterval(interval);
  }
};
