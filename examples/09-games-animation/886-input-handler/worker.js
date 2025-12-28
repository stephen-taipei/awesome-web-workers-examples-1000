const comboDefs = [
  { keys: ['Control', 'Shift'], name: 'Ctrl+Shift' },
  { keys: ['ArrowUp', 'ArrowUp'], name: 'Double Up' },
  { keys: ['a', 's', 'd', 'f'], name: 'ASDF' }
];

const history = [];

onmessage = (e) => {
  const { keys } = e.data;

  // Track key presses
  if (keys.length > 0) {
    const keyStr = keys.join('+');
    if (history[history.length - 1] !== keyStr) history.push(keyStr);
  }

  // Detect combos
  const combos = comboDefs.filter(c => c.keys.every(k => keys.includes(k))).map(c => c.name);

  postMessage({ activeKeys: keys, combos, history });
};
