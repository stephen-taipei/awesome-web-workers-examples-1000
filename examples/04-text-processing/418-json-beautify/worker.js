self.onmessage = function(e) {
    const { text, indent } = e.data;
    const startTime = performance.now();

    try {
        const json = JSON.parse(text);
        const result = JSON.stringify(json, null, indent);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            text: result,
            time: Math.round(endTime - startTime)
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};
