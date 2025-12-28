onmessage = (e) => {
  const { ceiling, input } = e.data;
  const output = Math.min(input, ceiling);
  postMessage({ input, output, limiting: input > ceiling });
};
