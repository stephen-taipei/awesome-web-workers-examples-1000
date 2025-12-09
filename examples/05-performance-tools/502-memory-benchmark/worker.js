self.onmessage = function(e) {
    const { sizeMB, type } = e.data;

    try {
        const sizeBytes = sizeMB * 1024 * 1024;
        const length = sizeBytes / 4; // 32-bit integers

        // Allocation
        const buffer = new ArrayBuffer(sizeBytes);
        const view = new Int32Array(buffer);

        const start = performance.now();
        let sum = 0;

        if (type === 'write') {
            for (let i = 0; i < length; i++) {
                view[i] = i;
            }
            sum = view[length - 1]; // Dummy use
        } else if (type === 'read') {
            // Fill first
            for (let i = 0; i < length; i++) view[i] = i;

            const readStart = performance.now();
            for (let i = 0; i < length; i++) {
                sum += view[i];
            }
            // Adjust start time to only count read phase?
            // Actually usually benchmark includes iteration overhead.
            // But let's restart time for pure read.
            // The allocation and fill time shouldn't count for 'read' speed.
            // So we re-measure.
        } else if (type === 'random') {
            // Random access is tricky to measure without overhead of RNG.
            // Pre-calculate indices? That consumes memory.
            // Simple LCG or xorshift for indices.

            // Xorshift
            let x = 123456789;
            let idx = 0;
            const mask = length - 1; // Require power of 2 length for fast mask
            // But length might not be power of 2 (MB is, 32-bit array length is).
            // 1MB = 256k Int32. Power of 2.

            for (let i = 0; i < length; i++) {
                x ^= x << 13;
                x ^= x >> 17;
                x ^= x << 5;
                idx = (x >>> 0) & mask;
                view[idx] = i;
            }
            sum = view[0];
        }

        const end = performance.now();
        const duration = end - start;
        const speedMBps = sizeMB / (duration / 1000);

        // Correct time for read (since we had init overhead inside the block logic above? No, I put logic in if/else)
        // Wait, for 'read', I put init code. I should measure only read part.

        // Refined measurement logic
        let measureStart = start;
        if (type === 'read') {
            measureStart = performance.now();
            for (let i = 0; i < length; i++) {
                sum += view[i];
            }
        }

        const measureEnd = performance.now();
        const finalDuration = measureEnd - measureStart;
        const finalSpeed = sizeMB / (finalDuration / 1000);

        self.postMessage({
            speedMBps: finalSpeed,
            duration: finalDuration,
            sum
        });

    } catch (err) {
        self.postMessage({ error: err.message });
    }
};
