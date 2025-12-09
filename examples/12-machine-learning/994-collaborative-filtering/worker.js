self.onmessage = function(e) {
    const { command, users, items, sparsity } = e.data;

    if (command === 'train') {
        const start = performance.now();

        self.postMessage({ type: 'status', data: 'Generating Rating Matrix...' });

        // 1. Generate User-Item Matrix (Sparse)
        // Storing as simple flat array for simplicity, though sparse structure (Map or Lists) is better for huge data.
        // For 10,000 users * 500 items = 5,000,000 entries. Flat Float32Array is ~20MB. Very doable.
        const ratings = new Float32Array(users * items);
        
        // Fill with random ratings 1-5, respecting sparsity
        for (let i = 0; i < ratings.length; i++) {
            if (Math.random() > sparsity) {
                ratings[i] = Math.floor(Math.random() * 5) + 1;
            } else {
                ratings[i] = 0; // 0 means unrated
            }
        }

        // Generate Dummy Item Names
        const itemNames = Array.from({ length: items }, (_, i) => `Item ${i + 1}`);

        self.postMessage({ type: 'status', data: 'Calculating Similarity Matrix...' });

        // 2. Compute Item-Item Similarity (Cosine Similarity)
        // Sim(A, B) = Dot(A, B) / (Norm(A) * Norm(B))
        // We need to compare every pair of columns (items).
        // Since accessing columns in row-major array is slow (stride), let's transpose first?
        // Or just iterate smartly.
        // Transposing to Item-User matrix makes taking dot products easier (contiguous memory for rows in transposed matrix).

        // Transpose: rows=items, cols=users
        const itemUserMatrix = new Float32Array(items * users);
        for (let u = 0; u < users; u++) {
            for (let i = 0; i < items; i++) {
                itemUserMatrix[i * users + u] = ratings[u * items + i];
            }
        }

        // Precompute norms for each item vector
        const norms = new Float32Array(items);
        for (let i = 0; i < items; i++) {
            let sumSq = 0;
            for (let u = 0; u < users; u++) {
                const val = itemUserMatrix[i * users + u];
                if (val !== 0) sumSq += val * val;
            }
            norms[i] = Math.sqrt(sumSq);
        }

        // Compute Similarity Matrix (Items x Items)
        // Symmetric, diagonal is 1.
        const similarity = new Float32Array(items * items);

        for (let i = 0; i < items; i++) {
            similarity[i * items + i] = 1.0; // Self similarity

            for (let j = i + 1; j < items; j++) {
                // Dot product of Item i and Item j
                let dot = 0;
                
                // Optimization: Sparse dot product? 
                // Since we used dense array, we just iterate.
                // In JS, iteration overhead is high.
                for (let u = 0; u < users; u++) {
                    const valA = itemUserMatrix[i * users + u];
                    const valB = itemUserMatrix[j * users + u];
                    if (valA !== 0 && valB !== 0) {
                        dot += valA * valB;
                    }
                }

                let sim = 0;
                if (norms[i] > 0 && norms[j] > 0) {
                    sim = dot / (norms[i] * norms[j]);
                }

                similarity[i * items + j] = sim;
                similarity[j * items + i] = sim; // Symmetry
            }
            
            if (i % 10 === 0) {
                 self.postMessage({ type: 'status', data: `Computing Similarity (${Math.round(i/items*100)}%)...` });
            }
        }

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                matrix: similarity,
                itemNames,
                users,
                items,
                duration: (end - start).toFixed(2)
            }
        });
    }
};
