let actions = [], current = -1;
onmessage = async (e) => {
  if (e.data.type === 'record') { actions.push(e.data.action); postMessage({ actions, current }); }
  else if (e.data.type === 'clear') { actions = []; current = -1; postMessage({ actions, current }); }
  else if (e.data.type === 'play') {
    for (let i = 0; i < actions.length; i++) { current = i; postMessage({ actions, current }); await new Promise(r => setTimeout(r, 500)); }
    current = -1; postMessage({ actions, current });
  }
};
