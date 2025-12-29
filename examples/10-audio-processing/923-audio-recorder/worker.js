let recording = false, time = 0, interval;
onmessage = (e) => {
  if (e.data.type === 'record') {
    recording = true;
    time = 0;
    clearInterval(interval);
    interval = setInterval(() => { time++; postMessage({ recording, time }); }, 1000);
  } else if (e.data.type === 'stop') {
    recording = false;
    clearInterval(interval);
  }
  postMessage({ recording, time });
};
