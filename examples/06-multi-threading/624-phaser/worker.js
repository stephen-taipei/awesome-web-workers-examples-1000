/**
 * #624 Phaser Worker
 */
self.onmessage = function(e) {
    if (e.data.type === 'start') {
        for (let phase = 1; phase <= 10; phase++) {
            const delay = 200 + Math.random() * 500;
            const start = performance.now();
            while (performance.now() - start < delay) {}
            self.postMessage({ type: 'phase', phase });
        }
    }
};
