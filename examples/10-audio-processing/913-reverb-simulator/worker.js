const rooms = {
  small: { name: 'Small Room', decay: 0.5, predelay: 10, wet: 30 },
  hall: { name: 'Concert Hall', decay: 2.5, predelay: 30, wet: 50 },
  cathedral: { name: 'Cathedral', decay: 5.0, predelay: 50, wet: 70 }
};
onmessage = (e) => { postMessage(rooms[e.data.type]); };
