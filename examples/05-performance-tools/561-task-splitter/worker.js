// Task Splitter Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const chunkSize = Math.ceil(param / 10);
        let processed = 0;

        // Split task into chunks
        const chunks = [];
        for (let i = 0; i < param; i += chunkSize) {
            chunks.push({ start: i, end: Math.min(i + chunkSize, param) });
        }

        // Process each chunk
        chunks.forEach((chunk, idx) => {
            let sum = 0;
            for (let i = chunk.start; i < chunk.end; i++) {
                sum += Math.sqrt(i) * Math.sin(i);
            }
            processed += chunk.end - chunk.start;
            postMessage({ type: 'PROGRESS', payload: { percent: Math.round(processed / param * 100), message: `Processing chunk ${idx + 1}/${chunks.length}` } });
        });

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total Items': param, 'Chunks': chunks.length, 'Chunk Size': chunkSize, 'Duration': duration } });
    }
};
