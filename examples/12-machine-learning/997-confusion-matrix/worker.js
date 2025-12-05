self.onmessage = function(e) {
    const { command, sampleSize, classes, errorRate } = e.data;

    if (command === 'compute') {
        const start = performance.now();

        // 1. Generate Synthetic Data and Compute Matrix on the fly
        // To save memory, we don't necessarily need to store 1M predicted/actual arrays
        // We can just increment the matrix directly.
        
        self.postMessage({ type: 'status', data: 'Processing Data...' });

        // Matrix flattened: index = actual * classes + predicted
        const matrix = new Int32Array(classes * classes);

        // Batch processing simulation to avoid blocking the worker thread completely (optional, but good practice)
        // Since we are in a worker, blocking is fine, but we split to show progress logic if needed.
        
        for (let i = 0; i < sampleSize; i++) {
            // Generate Actual Label
            const actual = Math.floor(Math.random() * classes);
            
            let predicted;
            
            // Simulate Prediction
            if (Math.random() > errorRate) {
                // Correct prediction
                predicted = actual;
            } else {
                // Incorrect prediction (pick a random other class)
                // Bias errors towards adjacent classes to look interesting (like 4 looks like 9)
                // or just random. Let's do simple random for generic demo.
                predicted = Math.floor(Math.random() * classes);
                // Make sure it's actually different if we are forcing an error state? 
                // The 'errorRate' logic above implies 1-errorRate is accuracy.
                // If we picked the same by random chance, it becomes correct.
                // Let's force different.
                if (predicted === actual) {
                    predicted = (predicted + 1) % classes;
                }
            }

            // Update Matrix
            // Row: Actual, Col: Predicted
            const index = actual * classes + predicted;
            matrix[index]++;
        }

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                matrix: matrix, // Transferable? TypedArrays are transferable if buffer is used
                classes: classes,
                duration: (end - start).toFixed(2)
            }
        }, [matrix.buffer]); // Transfer buffer ownership
    }
};
