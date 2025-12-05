self.onmessage = function(e) {
    const { command, points, epsilon, minPts, datasetType, width, height } = e.data;

    if (command === 'run') {
        const start = performance.now();

        self.postMessage({ type: 'status', data: 'Generating Dataset...' });
        const data = generateDataset(datasetType, points, width, height);

        self.postMessage({ type: 'status', data: 'Clustering (DBSCAN)...' });
        
        // DBSCAN Algorithm
        // labels: -1 = noise, 0...N = cluster ID, undefined = unvisited
        // We use Int32Array initialized to -2 (unvisited)
        // -1 is Noise.
        const UNVISITED = -2;
        const NOISE = -1;
        const labels = new Int32Array(points).fill(UNVISITED);
        let clusterId = 0;

        // Spatial Index? For 1000 points, O(N^2) is 1M ops, totally fine in JS (approx 5-10ms).
        // For 5000 points, 25M ops, might take ~100-200ms. Still okay.
        // No KD-Tree implemented to keep code simple.
        
        const epsSq = epsilon * epsilon;

        for (let i = 0; i < points; i++) {
            if (labels[i] !== UNVISITED) continue;

            const neighbors = regionQuery(data, i, epsSq, points);

            if (neighbors.length < minPts) {
                labels[i] = NOISE;
            } else {
                // Start new cluster
                expandCluster(data, labels, i, neighbors, clusterId, epsSq, minPts, points);
                clusterId++;
            }
        }

        // Count noise
        let noiseCount = 0;
        for(let i=0; i<points; i++) if(labels[i] === NOISE) noiseCount++;

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                points: data, // Transfer?
                labels: labels,
                numClusters: clusterId,
                numNoise: noiseCount,
                duration: (end - start).toFixed(2)
            }
        });
    }
};

function regionQuery(data, pointIdx, epsSq, totalPoints) {
    const neighbors = [];
    const px = data[pointIdx * 2];
    const py = data[pointIdx * 2 + 1];

    for (let i = 0; i < totalPoints; i++) {
        // if (i === pointIdx) continue; // Self includes? DBSCAN def usually includes self in minPts
        const dx = data[i * 2] - px;
        const dy = data[i * 2 + 1] - py;
        if (dx * dx + dy * dy <= epsSq) {
            neighbors.push(i);
        }
    }
    return neighbors;
}

function expandCluster(data, labels, pointIdx, neighbors, clusterId, epsSq, minPts, totalPoints) {
    labels[pointIdx] = clusterId;

    // Use a loop instead of recursion to avoid stack overflow on large dense datasets
    // Queue based expansion
    // Note: neighbors is an array we iterate over. It might grow.
    
    let i = 0;
    while (i < neighbors.length) {
        const Pn = neighbors[i];
        
        if (labels[Pn] === -1) { // Was Noise -> Change to Border point
            labels[Pn] = clusterId;
        }
        
        if (labels[Pn] !== -2) { // Already visited (processed)
            i++;
            continue;
        }

        labels[Pn] = clusterId;
        
        const neighborsPn = regionQuery(data, Pn, epsSq, totalPoints);
        if (neighborsPn.length >= minPts) {
            // Join neighbors
            for (let j = 0; j < neighborsPn.length; j++) {
                neighbors.push(neighborsPn[j]);
            }
        }
        i++;
    }
}

function generateDataset(type, n, w, h) {
    const data = new Float32Array(n * 2);
    
    if (type === 'random') {
        for(let i=0; i<n; i++) {
            data[i*2] = Math.random() * w;
            data[i*2+1] = Math.random() * h;
        }
    } else if (type === 'blobs') {
        const centers = [[w*0.2, h*0.2], [w*0.8, h*0.8], [w*0.8, h*0.2]];
        for(let i=0; i<n; i++) {
            const c = centers[i % centers.length];
            // Gaussian
            const u = 1 - Math.random();
            const v = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
            
            data[i*2] = c[0] + z1 * (w/15);
            data[i*2+1] = c[1] + z2 * (h/15);
        }
        // Add 10% noise
        const noiseN = Math.floor(n * 0.1);
        for(let i=0; i<noiseN; i++) {
            const idx = Math.floor(Math.random() * n);
            data[idx*2] = Math.random() * w;
            data[idx*2+1] = Math.random() * h;
        }
    } else if (type === 'circles') {
        // Concentric circles
        for(let i=0; i<n; i++) {
            const r = (i % 2 === 0) ? h*0.2 : h*0.4;
            const angle = Math.random() * Math.PI * 2;
            // Noise on radius
            const noise = (Math.random() - 0.5) * 10;
            data[i*2] = w/2 + (r + noise) * Math.cos(angle);
            data[i*2+1] = h/2 + (r + noise) * Math.sin(angle);
        }
    } else if (type === 'moons') {
        // Two interleaving half circles
        const n1 = Math.floor(n/2);
        const scale = h/3;
        for(let i=0; i<n1; i++) {
            const angle = Math.PI * (i/n1);
            data[i*2] = w*0.3 + Math.cos(angle) * scale + (Math.random()-0.5)*10;
            data[i*2+1] = h*0.3 + Math.sin(angle) * scale + (Math.random()-0.5)*10;
        }
        for(let i=n1; i<n; i++) {
            const angle = Math.PI * ((i-n1)/n1);
            data[i*2] = w*0.7 - Math.cos(angle) * scale + (Math.random()-0.5)*10;
            data[i*2+1] = h*0.7 - Math.sin(angle) * scale + (Math.random()-0.5)*10;
        }
    }

    return data;
}
