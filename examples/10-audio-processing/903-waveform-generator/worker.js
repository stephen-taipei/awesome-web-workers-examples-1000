const generators = {
  sine: (x) => Math.sin(x * Math.PI * 2 * 4 / 400),
  square: (x) => Math.sin(x * Math.PI * 2 * 4 / 400) > 0 ? 1 : -1,
  sawtooth: (x) => ((x * 4 / 400) % 1) * 2 - 1,
  triangle: (x) => Math.abs(((x * 4 / 400) % 1) * 4 - 2) - 1
};

onmessage = (e) => {
  const fn = generators[e.data.type] || generators.sine;
  const data = Array(400).fill(0).map((_, i) => fn(i));
  postMessage(data);
};
