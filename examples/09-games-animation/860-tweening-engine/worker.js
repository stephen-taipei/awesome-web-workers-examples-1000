/**
 * Tweening Engine - Web Worker
 */
const easings = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOutBounce: t => {
        if (t < 1/2.75) return 7.5625 * t * t;
        if (t < 2/2.75) return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
        if (t < 2.5/2.75) return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
        return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
    },
    easeOutElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1
};

let startTime, duration, easeFn, interval;
let history = [];

self.onmessage = function(e) {
    if (e.data.type === 'START') {
        startTime = Date.now();
        duration = e.data.payload.duration;
        easeFn = easings[e.data.payload.ease] || easings.linear;
        history = [];
        if (interval) clearInterval(interval);
        interval = setInterval(update, 1000 / 60);
    }
};

function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeFn(progress);

    const x = 100 + eased * 600;
    const y = 200;

    history.push({ x, y });
    if (history.length > 30) history.shift();

    self.postMessage({
        type: 'TWEEN',
        payload: { x, y, progress, history: [...history] }
    });

    if (progress >= 1) clearInterval(interval);
}
