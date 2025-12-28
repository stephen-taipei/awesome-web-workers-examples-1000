onmessage = (e) => {
  const { drive } = e.data;
  const amount = drive / 100 * 5 + 1;
  const wave = Array(300).fill(0).map((_, i) => {
    const x = Math.sin(i / 15);
    return Math.tanh(x * amount);
  });
  postMessage({ wave });
};
