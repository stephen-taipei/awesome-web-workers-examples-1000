onmessage = (e) => {
  const { pan } = e.data;
  const left = Math.round(100 * Math.cos((pan + 100) / 200 * Math.PI / 2));
  const right = Math.round(100 * Math.sin((pan + 100) / 200 * Math.PI / 2));
  postMessage({ left, right });
};
