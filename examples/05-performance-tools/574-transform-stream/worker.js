// Transform Stream Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();

        let inputSum = 0;
        let outputSum = 0;
        let count = 0;

        for (let i = 0; i < param; i++) {
            const input = Math.random() * 100;
            inputSum += input;

            // Transform: normalize to 0-1 range then scale
            const normalized = input / 100;
            const scaled = normalized * 255;
            const output = Math.round(scaled);

            outputSum += output;
            count++;

            if (i % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Transforming stream...` } });
            }
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Items': count, 'Input Avg': (inputSum / count).toFixed(2), 'Output Avg': (outputSum / count).toFixed(2), 'Transform Ratio': (outputSum / inputSum).toFixed(2), 'Duration': duration } });
    }
};
