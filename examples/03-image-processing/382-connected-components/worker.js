// Connected Components Worker
// Implements Two-Pass Algorithm (Rosenfeld and Pfaltz) with Union-Find

self.onmessage = function(e) {
    const { imageData, connectivity } = e.data;
    const { width, height, data } = imageData;

    try {
        const startTime = performance.now();

        // 1. Prepare data (ensure binary 0 or 1)
        self.postMessage({ type: 'progress', progress: 10, message: '準備資料...' });
        const binaryMap = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            // Assume white (255) is foreground, black (0) is background
            // The input imageData is already thresholded visual binary, but let's be safe
            // Check Red channel
            binaryMap[i] = data[i * 4] > 128 ? 1 : 0;
        }

        // 2. First Pass: Assign temporary labels and record equivalences
        self.postMessage({ type: 'progress', progress: 20, message: '第一次掃描...' });

        const labels = new Int32Array(width * height); // 0 means background or unlabeled
        let nextLabel = 1;
        const parent = [0]; // Union-Find structure, index 0 is background

        function find(i) {
            while (parent[i] !== i) {
                // Path compression
                parent[i] = parent[parent[i]];
                i = parent[i];
            }
            return i;
        }

        function union(i, j) {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) {
                // Simple union (always attach higher index to lower to keep labels small? or vice versa?)
                // Actually usually rank-based is better, but here simple link is fine
                if (rootI < rootJ) parent[rootJ] = rootI;
                else parent[rootI] = rootJ;
            }
        }

        // Neighbors offsets based on connectivity
        // For 4-way: North, West
        // For 8-way: North-West, North, North-East, West

        for (let y = 0; y < height; y++) {
            // Progress update
            if (y % 50 === 0) {
                self.postMessage({ type: 'progress', progress: 20 + (y/height)*30, message: '第一次掃描...' });
            }

            for (let x = 0; x < width; x++) {
                const idx = y * width + x;

                if (binaryMap[idx] === 0) continue; // Background

                const neighbors = [];

                // Check West
                if (x > 0 && binaryMap[idx - 1] === 1) {
                    neighbors.push(labels[idx - 1]);
                }

                // Check North
                if (y > 0 && binaryMap[idx - width] === 1) {
                    neighbors.push(labels[idx - width]);
                }

                if (connectivity === 8) {
                    // Check North-West
                    if (x > 0 && y > 0 && binaryMap[idx - width - 1] === 1) {
                        neighbors.push(labels[idx - width - 1]);
                    }
                    // Check North-East
                    if (x < width - 1 && y > 0 && binaryMap[idx - width + 1] === 1) {
                        neighbors.push(labels[idx - width + 1]);
                    }
                }

                // Filter 0 labels (shouldn't happen if binaryMap check is correct but labels array is init to 0)
                const validNeighbors = neighbors.filter(l => l > 0);

                if (validNeighbors.length === 0) {
                    // New component
                    labels[idx] = nextLabel;
                    parent[nextLabel] = nextLabel;
                    nextLabel++;
                } else {
                    // Find smallest label
                    let minLabel = validNeighbors[0];
                    for (let i = 1; i < validNeighbors.length; i++) {
                        if (validNeighbors[i] < minLabel) minLabel = validNeighbors[i];
                    }

                    labels[idx] = minLabel;

                    // Record equivalences (Union)
                    for (let i = 0; i < validNeighbors.length; i++) {
                        union(minLabel, validNeighbors[i]);
                    }
                }
            }
        }

        // 3. Second Pass: Replace labels with their root
        self.postMessage({ type: 'progress', progress: 60, message: '第二次掃描 (合併區域)...' });

        // Optimize: Flatten the parent array first so find() is O(1)
        for (let i = 1; i < nextLabel; i++) {
            parent[i] = find(i);
        }

        // Relabel to contiguous range 1..N
        const labelMap = new Int32Array(nextLabel); // maps old root -> new contiguous label
        let finalLabelCount = 0;

        for (let i = 1; i < nextLabel; i++) {
            if (parent[i] === i) {
                finalLabelCount++;
                labelMap[i] = finalLabelCount;
            }
        }

        // Apply to image
        for (let i = 0; i < width * height; i++) {
            if (labels[i] > 0) {
                const root = parent[labels[i]];
                labels[i] = labelMap[root];
            }
        }

        self.postMessage({ type: 'progress', progress: 90, message: '生成結果...' });

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                labeledData: labels,
                count: finalLabelCount,
                colorMap: {} // We generate colors in main thread to keep worker light or pass count
            },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};
