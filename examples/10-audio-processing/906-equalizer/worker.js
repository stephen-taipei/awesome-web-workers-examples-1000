const presets = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  vocal: [-2, -1, 0, 2, 4, 4, 3, 2, 1, 0]
};

let values = [...presets.flat];

onmessage = (e) => {
  if (e.data.type === 'set') values = e.data.values;
  else if (e.data.type === 'preset') values = [...presets[e.data.name]];
  postMessage({ values });
};
