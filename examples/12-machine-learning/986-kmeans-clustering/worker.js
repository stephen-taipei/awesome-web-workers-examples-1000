self.onmessage = async function(e) {
    const { command, points, k, method, delay, width, height } = e.data;

    if (command === 'start') {
        self.postMessage({ type: 'status', data: 'Generating Data...' });

        // 1. Generate Data
        const data = new Float32Array(points * 2);
        const numBlobs = Math.floor(Math.random() * 3) + k; // Ensure enough spread
        
        for (let i = 0; i < points; i++) {
            // Pick a blob center
            const blobIdx = i % numBlobs;
            // Fixed locations based on blobIdx to keep it deterministic-ish per run but spread out
            // We randomize the "true" centers for variety though
            
            // To make it nice, we generate centers on the fly first
            // But simple approach:
            const angle = (blobIdx / numBlobs) * Math.PI * 2;
            const r = Math.min(width, height) * 0.35;
            const cx = width/2 + Math.cos(angle) * r;
            const cy = height/2 + Math.sin(angle) * r;
            
            const spread = 30 + Math.random() * 30;
            
            // Random Gaussian
            const u = 1 - Math.random();
            const v = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);

            data[i*2] = cx + z1 * spread;
            data[i*2+1] = cy + z2 * spread;
        }

        self.postMessage({ type: 'status', data: 'Initializing Centroids...' });

        // 2. Initialize Centroids
        const centroids = [];
        
        if (method === 'random') {
            for (let i = 0; i < k; i++) {
                const idx = Math.floor(Math.random() * points);
                centroids.push({ x: data[idx*2], y: data[idx*2+1] });
            }
        } else if (method === 'kmeans++') {
            // 1. Choose one center uniformly at random
            const firstIdx = Math.floor(Math.random() * points);
            centroids.push({ x: data[firstIdx*2], y: data[firstIdx*2+1] });

            // 2. For each data point x, compute D(x), the distance to the nearest center
            // 3. Choose one new data point at random as a new center, using a weighted probability distribution
            //    where a point x is chosen with probability proportional to D(x)^2.
            
            const distSq = new Float32Array(points);

            for (let c = 1; c < k; c++) {
                let sumDistSq = 0;
                for (let i = 0; i < points; i++) {
                    let minDist = Infinity;
                    const px = data[i*2];
                    const py = data[i*2+1];
                    
                    for (let j = 0; j < centroids.length; j++) {
                        const dx = px - centroids[j].x;
                        const dy = py - centroids[j].y;
                        const d = dx*dx + dy*dy;
                        if (d < minDist) minDist = d;
                    }
                    distSq[i] = minDist;
                    sumDistSq += minDist;
                }

                // Weighted random selection
                let r = Math.random() * sumDistSq;
                let nextCenterIdx = -1;
                for (let i = 0; i < points; i++) {
                    r -= distSq[i];
                    if (r <= 0) {
                        nextCenterIdx = i;
                        break;
                    }
                }
                if (nextCenterIdx === -1) nextCenterIdx = points - 1; // Fallback

                centroids.push({ x: data[nextCenterIdx*2], y: data[nextCenterIdx*2+1] });
            }
        }

        const assignments = new Int32Array(points).fill(-1);
        let iterations = 0;
        let changed = true;

        self.postMessage({
            type: 'step',
            data: { iteration: iterations, points: data, assignments, centroids }
        });
        if (delay > 0) await new Promise(r => setTimeout(r, delay));

        // 3. Loop
        while (changed && iterations < 100) {
            changed = false;
            iterations++;

            // Assignment Step
            for (let i = 0; i < points; i++) {
                const px = data[i*2];
                const py = data[i*2+1];
                
                let minDist = Infinity;
                let bestK = -1;

                for (let j = 0; j < k; j++) {
                    const dx = px - centroids[j].x;
                    const dy = py - centroids[j].y;
                    const d = dx*dx + dy*dy;
                    
                    if (d < minDist) {
                        minDist = d;
                        bestK = j;
                    }
                }

                if (assignments[i] !== bestK) {
                    assignments[i] = bestK;
                    changed = true;
                }
            }

            // Update Step
            const sumsX = new Float32Array(k);
            const sumsY = new Float32Array(k);
            const counts = new Int32Array(k);

            for (let i = 0; i < points; i++) {
                const cluster = assignments[i];
                if (cluster !== -1) {
                    sumsX[cluster] += data[i*2];
                    sumsY[cluster] += data[i*2+1];
                    counts[cluster]++;
                }
            }

            for (let j = 0; j < k; j++) {
                if (counts[j] > 0) {
                    centroids[j].x = sumsX[j] / counts[j];
                    centroids[j].y = sumsY[j] / counts[j];
                } else {
                    // Handle empty cluster? Re-initialize randomly?
                    // For simple demo, leave it or move to a random point.
                    const idx = Math.floor(Math.random() * points);
                    centroids[j].x = data[idx*2];
                    centroids[j].y = data[idx*2+1];
                }
            }

            self.postMessage({
                type: 'step',
                data: { iteration: iterations, points: data, assignments, centroids }
            });

            if (delay > 0) await new Promise(r => setTimeout(r, delay));
        }

        self.postMessage({ type: 'done' });
    }
};
