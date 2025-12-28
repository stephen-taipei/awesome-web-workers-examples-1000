let interval, peakL = 0, peakR = 0;
onmessage = (e) => {
  if (e.data.type === 'start') {
    clearInterval(interval);
    interval = setInterval(() => {
      const left = Math.random() * 80 + 10;
      const right = Math.random() * 80 + 10;
      peakL = Math.max(peakL * 0.95, left);
      peakR = Math.max(peakR * 0.95, right);
      postMessage({ left, right, peakL, peakR });
    }, 50);
  } else {
    clearInterval(interval);
  }
};
