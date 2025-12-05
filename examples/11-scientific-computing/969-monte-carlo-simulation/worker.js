self.onmessage = async function(e) {
    const { command, batchSize, delay } = e.data;

    if (command === 'start') {
        let total = 0;
        let inside = 0;
        
        while (true) {
            const points = new Float32Array(batchSize * 3); // x, y, status
            let batchInside = 0;

            for (let i = 0; i < batchSize; i++) {
                const x = Math.random() * 2 - 1; // -1 to 1
                const y = Math.random() * 2 - 1;
                
                const isInside = (x*x + y*y) <= 1;
                if (isInside) batchInside++;
                
                points[i*3] = x;
                points[i*3+1] = y;
                points[i*3+2] = isInside ? 1 : 0;
            }

            total += batchSize;
            inside += batchInside;
            
            const estimate = 4 * (inside / total);

            self.postMessage({
                type: 'update',
                data: {
                    total,
                    inside,
                    estimate,
                    points // Transferable? Float32Array is efficient.
                }
            }, [points.buffer]);

            if (delay > 0) {
                await new Promise(r => setTimeout(r, delay));
            } else {
                // Yield momentarily to check for termination/messages
                await new Promise(r => setTimeout(r, 0)); 
            }
        }
    }
};
