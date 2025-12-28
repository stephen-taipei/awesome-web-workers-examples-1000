// Chunk Processor Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();

        const chunkSize = 100;
        const totalChunks = Math.ceil(param / chunkSize);
        let processedChunks = 0;
        let totalItems = 0;

        for (let chunk = 0; chunk < totalChunks; chunk++) {
            const start = chunk * chunkSize;
            const end = Math.min(start + chunkSize, param);

            // Process chunk
            for (let i = start; i < end; i++) {
                Math.sqrt(i) * Math.sin(i);
                totalItems++;
            }

            processedChunks++;
            postMessage({ type: 'PROGRESS', payload: { percent: Math.round(processedChunks / totalChunks * 100), message: `Chunk ${processedChunks}/${totalChunks}` } });
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total Items': totalItems, 'Chunks': totalChunks, 'Chunk Size': chunkSize, 'Items/ms': (totalItems / duration).toFixed(2), 'Duration': duration } });
    }
};
