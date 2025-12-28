const states = {
  menu: { actions: { start: 'playing', settings: 'settings', quit: 'quit' } },
  settings: { actions: { back: 'menu', apply: 'menu' } },
  playing: { actions: { pause: 'paused', win: 'victory', lose: 'gameover' } },
  paused: { actions: { resume: 'playing', quit: 'menu' } },
  victory: { actions: { next: 'playing', menu: 'menu' } },
  gameover: { actions: { retry: 'playing', menu: 'menu' } },
  quit: { actions: {} }
};

let current = 'menu';
const history = ['menu'];

onmessage = (e) => {
  const { type, action } = e.data;
  if (type === 'transition') {
    const next = states[current]?.actions[action];
    if (next) {
      current = next;
      history.push(current);
      if (history.length > 10) history.shift();
    }
  }
  postMessage({
    current,
    actions: Object.keys(states[current]?.actions || {}),
    history
  });
};
