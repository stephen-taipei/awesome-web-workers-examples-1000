onmessage = () => {
  const data = Array(400).fill(0).map((_, i) => {
    const envelope = Math.sin(i / 400 * Math.PI);
    return Math.sin(i / 5) * envelope * (0.5 + Math.random() * 0.5);
  });
  postMessage(data);
};
