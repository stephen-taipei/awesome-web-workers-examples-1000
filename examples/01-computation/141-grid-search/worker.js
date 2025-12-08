self.onmessage = function(e) {
    const { type, funcBody, xMin, xMax, yMin, yMax, size } = e.data;

    if (type === 'start') {
        runGridSearch(funcBody, xMin, xMax, yMin, yMax, size);
    }
};

function runGridSearch(funcBody, xMin, xMax, yMin, yMax, size) {
    // Create function from string
    // Assuming variables are x and y
    // Use 'Math' inside the function body
    const f = new Function('x', 'y', 'return ' + funcBody);

    let bestX = 0, bestY = 0, bestVal = Infinity;
    const stepX = (xMax - xMin) / (size - 1);
    const stepY = (yMax - yMin) / (size - 1);
    const totalPoints = size * size;

    // We process row by row (y loop outer) to send chunks
    // This allows the UI to update progressively

    for (let j = 0; j < size; j++) {
        const y = yMin + j * stepY;
        const chunk = [];

        for (let i = 0; i < size; i++) {
            const x = xMin + i * stepX;
            let val;
            try {
                val = f(x, y);
            } catch (e) {
                val = Infinity;
            }

            if (isNaN(val)) val = Infinity;

            if (val < bestVal) {
                bestVal = val;
                bestX = x;
                bestY = y;
            }

            // Store index for 1D array on main thread
            // index = j * size + i
            chunk.push({ index: j * size + i, value: val });
        }

        // Report progress after each row
        self.postMessage({
            type: 'progress',
            completed: (j + 1) * size,
            total: totalPoints,
            chunk: chunk,
            size // Pass size back so main knows dimensions
        });
    }

    self.postMessage({
        type: 'result',
        bestX,
        bestY,
        bestVal,
        xMin, xMax, yMin, yMax // Echo back for plotting
    });
}
