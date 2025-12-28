onmessage = (e) => {
  const { channels } = e.data;
  const sum = channels.reduce((acc, c) => acc + c.volume / 100, 0);
  const master = 20 * Math.log10(sum / channels.length);
  postMessage({ master: isFinite(master) ? master : -60 });
};
