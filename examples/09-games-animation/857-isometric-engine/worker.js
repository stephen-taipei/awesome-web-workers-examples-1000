/**
 * Isometric Engine - Web Worker
 */
self.onmessage = function(e) {
    if (e.data.type === 'GENERATE') {
        const size = e.data.payload.size;
        const heights = new Float32Array(size * size);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) + Math.sin((x + y) * 0.2);
                heights[y * size + x] = Math.max(0, (noise + 1) * 3);
            }
        }

        self.postMessage({ type: 'TERRAIN', payload: { heights: Array.from(heights) } });
    }
};
