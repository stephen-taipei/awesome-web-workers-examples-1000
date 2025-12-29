let t = 0;
onmessage = (e) => {
  const { stages, speed } = e.data;
  t += speed * 0.1;
  const phases = Array(stages).fill(0).map((_, i) => Math.sin(t + i * Math.PI / stages) * 45);
  postMessage({ phases });
};
