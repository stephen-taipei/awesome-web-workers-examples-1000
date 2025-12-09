self.onmessage = function(e) {
    const { text } = e.data;
    const startTime = performance.now();

    try {
        const json = JSON.parse(text);
        // Minify by omitting spacing arguments
        const result = JSON.stringify(json);

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
