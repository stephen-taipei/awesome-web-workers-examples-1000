let t = 0;
onmessage = (e) => {
  const { rate, depth } = e.data;
  t += 0.05;
  const wave = Array(300).fill(0).map((_, i) => Math.sin(i / 20 + Math.sin(t * rate) * depth / 50));
  postMessage({ wave });
};
