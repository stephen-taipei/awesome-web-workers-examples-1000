onmessage = (e) => {
  const { threshold, ratio } = e.data;
  const inputLevel = -10 + Math.random() * 20;
  let gainReduction = 0;
  if (inputLevel > threshold) {
    const excess = inputLevel - threshold;
    gainReduction = excess - (excess / ratio);
  }
  postMessage({ gainReduction });
};
