let trainData = [];

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'generate') {
        const { count, width, height } = e.data;
        trainData = [];
        for(let i=0; i<count; i++) {
            trainData.push({
                x: Math.random() * width,
                y: Math.random() * height,
                label: Math.floor(Math.random() * 3) // 3 classes
            });
        }
        self.postMessage({ type: 'data', data: trainData });
    } 
    else if (command === 'compute') {
        const { k, width, height } = e.data;
        const start = performance.now();
        
        // Resolution downsample for speed? 
        // Full resolution 500x500 = 250k pixels. 
        // 250k * 50 points = 12.5M distances. Doable in worker.
        
        const map = new Uint8Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Find K nearest neighbors for pixel (x,y)
                // Naive linear scan O(N)
                
                // Store distances: [dist, label]
                // Since N is small (e.g. 50-100), sorting full array is fast enough.
                // Optimization: Max-heap of size K. 
                // JS Array.sort is optimized.
                
                // Optimization: Avoid sqrt, compare dist squared.
                
                const dists = [];
                for (let i = 0; i < trainData.length; i++) {
                    const p = trainData[i];
                    const dx = p.x - x;
                    const dy = p.y - y;
                    const d2 = dx*dx + dy*dy;
                    dists.push({ d2, label: p.label });
                }
                
                // Partial sort or just sort all
                dists.sort((a, b) => a.d2 - b.d2);
                
                // Count votes
                const votes = [0, 0, 0];
                for (let i = 0; i < k; i++) {
                    votes[dists[i].label]++;
                }
                
                // Argmax
                let maxVotes = -1;
                let bestLabel = 0;
                for (let i = 0; i < 3; i++) {
                    if (votes[i] > maxVotes) {
                        maxVotes = votes[i];
                        bestLabel = i;
                    }
                }
                
                map[y * width + x] = bestLabel;
            }
        }
        
        const end = performance.now();
        self.postMessage({
            type: 'result',
            data: {
                map,
                width,
                height,
                duration: (end - start).toFixed(2)
            }
        }, [map.buffer]);
    }
};
