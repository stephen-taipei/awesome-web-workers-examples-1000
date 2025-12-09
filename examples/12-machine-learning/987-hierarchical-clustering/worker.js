self.onmessage = async function(e) {
    const { command, points, linkage, targetK, delay, width, height } = e.data;

    if (command === 'start') {
        self.postMessage({ type: 'status', data: 'Generating Data...' });

        // 1. Generate Data (Blobs)
        const data = new Float32Array(points * 2);
        const centers = [[width*0.3, height*0.3], [width*0.7, height*0.7], [width*0.3, height*0.7], [width*0.7, height*0.3]];
        
        for(let i=0; i<points; i++) {
            const c = centers[Math.floor(Math.random() * centers.length)];
            // Gaussian scatter
            const u = 1 - Math.random();
            const v = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
            
            data[i*2] = c[0] + z1 * (width/12);
            data[i*2+1] = c[1] + z2 * (height/12);
        }

        // 2. Initialize Clusters
        // Initially, each point is its own cluster
        let clusters = [];
        for(let i=0; i<points; i++) {
            clusters.push([i]); // Cluster contains point indices
        }

        // Distance Matrix
        // We calculate full distance matrix once? 
        // Or calculate cluster distances on the fly.
        // O(N^2) initially.
        // For 200 points, 40000 comparisons. Fast.
        
        // Helper: Distance between two points
        function dist(idx1, idx2) {
            const dx = data[idx1*2] - data[idx2*2];
            const dy = data[idx1*2+1] - data[idx2*2+1];
            return Math.sqrt(dx*dx + dy*dy);
        }

        // Helper: Distance between two clusters (Linkage)
        function clusterDist(c1, c2) {
            if (linkage === 'centroid') {
                // Centroid of c1
                let sx1=0, sy1=0;
                for(let idx of c1) { sx1 += data[idx*2]; sy1 += data[idx*2+1]; }
                sx1 /= c1.length; sy1 /= c1.length;

                let sx2=0, sy2=0;
                for(let idx of c2) { sx2 += data[idx*2]; sy2 += data[idx*2+1]; }
                sx2 /= c2.length; sy2 /= c2.length;

                const dx = sx1 - sx2;
                const dy = sy1 - sy2;
                return Math.sqrt(dx*dx + dy*dy);
            } 
            
            let d = (linkage === 'single') ? Infinity : (linkage === 'complete' ? -Infinity : 0);
            let count = 0;

            for (let i of c1) {
                for (let j of c2) {
                    const currentDist = dist(i, j);
                    if (linkage === 'single') {
                        if (currentDist < d) d = currentDist;
                    } else if (linkage === 'complete') {
                        if (currentDist > d) d = currentDist;
                    } else if (linkage === 'average') {
                        d += currentDist;
                        count++;
                    }
                }
            }
            
            if (linkage === 'average') return d / count;
            return d;
        }

        self.postMessage({ type: 'status', data: 'Clustering...' });

        // Agglomerative Loop
        while (clusters.length > targetK) {
            let minD = Infinity;
            let mergePair = [-1, -1];

            // Find closest pair of clusters
            // Note: Efficient implementation uses a priority queue or updates distance matrix.
            // Naive O(C^2) per step is fine for small N (e.g. 200).
            for (let i = 0; i < clusters.length; i++) {
                for (let j = i + 1; j < clusters.length; j++) {
                    const d = clusterDist(clusters[i], clusters[j]);
                    if (d < minD) {
                        minD = d;
                        mergePair = [i, j];
                    }
                }
            }

            const [idx1, idx2] = mergePair;
            
            // Merge clusters[idx2] into clusters[idx1]
            // We merge into the lower index and remove the higher index to keep indices stable-ish
            // actually splice shifts indices.
            
            const newCluster = [...clusters[idx1], ...clusters[idx2]];
            
            // Remove the two old clusters
            // Remove higher index first to avoid shifting the lower index
            clusters.splice(idx2, 1);
            clusters.splice(idx1, 1);
            
            // Add new cluster
            clusters.push(newCluster);

            // Report step
            self.postMessage({
                type: 'step',
                data: {
                    currentClusters: clusters.length,
                    points: data,
                    clusters: clusters,
                    merged: mergePair // indices in the *previous* array state, strictly speaking
                }
            });

            if (delay > 0) {
                await new Promise(r => setTimeout(r, delay));
            }
        }

        self.postMessage({ type: 'done' });
    }
};
